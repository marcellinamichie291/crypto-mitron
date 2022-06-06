var express = require('express');
const { default: mongoose } = require('mongoose');
var router = express.Router();
const transactionSchema = require('../models/transactionModel');
const { authenticateToken } = require('../middleware/auth');
const userSchema = require('../models/userModel');
const userWallet = require('../models/userWallet');
const binance = require('../services/binance');
const constants = require('../utils/constants');
const axios = require('axios')
const client = require('../services/redis-service');
const app_access_key = process.env.APP_100_ACCESS_KEY;
const app_secret = process.env.APP_100_SECRET;
require("dotenv").config();
/* GET home page. */

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

var jwt = require('jsonwebtoken');
var uuid4 = require('uuid4');
const e = require('express');


router.post('/token-generate', async (req, res) => {
  jwt.sign(
    {
      access_key: app_access_key,
      type: 'management',
      version: 2,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000)
    },
    app_secret,
    {
      algorithm: 'HS256',
      expiresIn: '365d',
      jwtid: uuid4()
    },
    function (err, token) {
      // console.log(token);
      client.set('100ms-token', token, function (err, reply) {
        console.log(err.message)
        console.log(reply);
      });
    }
  );

})
router.post('/token-generate-app', async (req, res) => {
  try {
    const { userId, roomId } = req.body;

    checkUser = await userSchema.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(userId)
        }
      }
    ]);
    if (checkUser.length > 0) {
      var payload = {
        access_key: app_access_key,
        room_id: roomId,
        user_id: userId,
        role: checkUser[0].role,
        type: 'app',
        version: 2,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000)
      };
      const token = jwt.sign(
        payload,
        app_secret,
        {
          algorithm: 'HS256',
          expiresIn: '20d',
          jwtid: uuid4()
        }
      );
      return res.status(200).json({ isSuccess: true, data: token, messsage: "use found and token generated" });
    }
    return res.status(404).json({ isSuccess: false, data: null, messsage: "no user found" });
  }
  catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, messsage: error.message || "Having issue is server" })
  }
})
router.post('/token-generate-app-token', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user._id;
    checkUser = await userSchema.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(userId)
        }
      }
    ]);
    if (checkUser.length > 0) {
      var payload = {
        access_key: app_access_key,
        room_id: roomId,
        user_id: userId,
        role: checkUser[0].role,
        type: 'app',
        version: 2,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000)
      };
      const token = jwt.sign(
        payload,
        app_secret,
        {
          algorithm: 'HS256',
          expiresIn: '20d',
          jwtid: uuid4()
        }
      );
      return res.status(200).json({ isSuccess: true, data: token, messsage: "use found and token generated" });
    }
    return res.status(404).json({ isSuccess: false, data: null, messsage: "no user found" });
  }
  catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, messsage: error.message || "Having issue is server" })
  }
})
router.post('/create', authenticateToken, async function (req, res) {
  try {
    const { debitToken, creditToken, debitAmount, transactionDate, status } = req.body;

    const userId = req.user._id;
    var fullUrl = req.protocol + '://' + req.get('host');

    const checkQuantityIs = await calculateQuantity(debitToken, debitAmount, creditToken)
    // console.log(checkQuantityIs)
    // return;
    if (checkQuantityIs == undefined) {
      return res.status(200).json({ isSuccess: false, data: null, message: "Sorry can not convert currency pairs please contact help desk" });
    }
    // return res.json({ data: checkQuantityIs });
    //check for creditToken if it is INR then get as creditToken and check for qty of debitToken 




    //check for 

    // return;
    // if (debitToken != "INR") {
    console.log("check for balance" + Date.now())
    let getAllTransactions = await transactionSchema.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      }
    ]);
    const userWalletBalance = (await toWalletRes(userId, getAllTransactions)).tokens;
    // console.log(userWalletBalance);
    // return;
    if (userWalletBalance[debitToken] == undefined) {
      return res.status(400).json({ isSuccess: false, data: null, message: "User does not have sufficient balance" });
    }
    if (userWalletBalance[debitToken] < debitAmount) {
      return res.status(400).json({ isSuccess: false, data: null, message: "User does not have sufficient balance" });
    }

    let createTransaction = new transactionSchema({ userId: userId, debitToken: debitToken, debitAmount: debitAmount, creditToken: creditToken, creditAmount: checkQuantityIs, transactionDate: transactionDate, status: status });

    await createTransaction.save();
    return res.status(200).json({
      isSuccess: true, data: {
        "userId": createTransaction.userId,
        "debitToken": createTransaction.debitToken,
        "debitAmount": createTransaction.debitAmount,
        "creditToken": createTransaction.creditToken,
        "creditAmount": createTransaction.creditAmount,
        "id": createTransaction._id,
      }, message: "transaction created successfully"
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
  }
})
router.post('/createWithDetails', authenticateToken, async function (req, res) {
  try {
    const { debitToken, creditToken, debitAmount, transactionDate, status } = req.body;

    const userId = req.user._id;
    var fullUrl = req.protocol + '://' + req.get('host');

    const checkQuantityIs = await calculateQuantity(debitToken, debitAmount, creditToken)
    if (checkQuantityIs == undefined) {
      return res.status(200).json({ isSuccess: false, data: null, message: "Sorry can not convert currency pairs please contact help desk" });
    }
    // return;
    // if (debitToken != "INR") {
    console.log("check for balance" + Date.now())
    let getAllTransactions = await transactionSchema.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      }
    ]);
    const userWalletBalance = (await toWalletRes(userId, getAllTransactions)).tokens;

    if (userWalletBalance[debitToken] == undefined) {
      return res.status(400).json({ isSuccess: false, data: null, message: "User does not have sufficient balance" });
    }
    if (userWalletBalance[debitToken] < debitAmount) {
      return res.status(400).json({ isSuccess: false, data: null, message: "User does not have sufficient balance" });
    }
    // }
    // else {
    //   const balanceIs = await getWalletBalanceMongo(userId);
    //   // console.log(balanceIs)
    //   if (balanceIs[0].totalAmount < debitAmount) {
    //     return res.status(400).json({ isSuccess: false, data: null, message: "User does not have sufficient balance" });
    //   }

    // }

    let createTransaction = new transactionSchema({ userId: userId, debitToken: debitToken, debitAmount: debitAmount, creditToken: creditToken, creditAmount: checkQuantityIs, transactionDate: transactionDate, status: status });

    await createTransaction.save();
    let transactionIs = {
      debitToken: createTransaction.debitToken,
      debitAmount: createTransaction.debitAmount,
      creditToken: createTransaction.creditToken,
      creditAmount: createTransaction.creditAmount,
      id: createTransaction._id
    }
    const authHeader = req.headers.authorization;
    const tokenIs = authHeader && authHeader.split(' ')[1];
    const response = await getUserDetails(fullUrl, tokenIs);
    if (response.status == 0) {
      return res.status(200).json({ isSuccess: true, data: { ...response.data.data, transaction: transactionIs }, message: "Transaction stored successfully" });
    }
    else {
      return res.status(200).json({ isSuccess: true, data: { userId: userId, transactions: createTransaction }, message: "Balance Updated And cannot get details of user" });
    }
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
  }
})

router.get('/get/', authenticateToken, async function (req, res) {
  try {

    // const userId = req.params.userId;
    const userId = req.user._id;
    // console.log(userId)
    let getAllTransactions = await transactionSchema.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      },
      {
        $addFields: {
          id: "$_id"
        }
      },
      {
        $project: {
          userId: 0,
          _id: 0,
          __v: 0
        }
      }
    ]);

    if (getAllTransactions.length > 0) {
      let getResults = {
        userId: userId,
        transactions: getAllTransactions.reverse()
      }
      // let getResultsFor = toTransRes(userId, getAllTransactions);
      return res.status(200).json({ isSuccess: true, data: getResults, messsage: "Transaction stored successfully" });
    }
    return res.status(200).json({
      isSuccess: true, data: {
        userId: userId,
        transactions: {}
      }, messsage: "No any transactions found"
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, messsage: error.message || "Having issue is server" })
  }
});
router.get('/wallet/', authenticateToken, async function (req, res) {
  try {
    // var userId = req.params.userId;
    const userId = req.user._id;

    let getAllTransactions = await transactionSchema.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      }
    ]);
    if (getAllTransactions.length > 0) {
      let getResults = await toWalletRes(userId, getAllTransactions.reverse());
      // console.log(getResultIs);
      return res.status(200).json({ isSuccess: true, data: getResults, messsage: "Transaction Found successfully" });
    }
    return res.status(200).json({ isSuccess: true, data: { userId: userId, tokens: {} }, messsage: "No any transactions found" });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, messsage: error.message || "Having issue is server" })
  }
});
router.get('/wallet/v1/', authenticateToken, async function (req, res) {
  try {
    // var userId = req.params.userId;

    const userId = req.user._id;
    let getAllTransactions = await transactionSchema.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      }
    ]);
    if (getAllTransactions.length > 0) {
      let getResults = await toWalletRes(userId, getAllTransactions);
      const finalToken = await getAssetWithUSDTINR(getResults.tokens)
      // console.log(finalTokenPrice)
      return res.status(200).json({ isSuccess: true, data: finalToken, messsage: "Transaction Found successfully" });
    }
    return res.status(200).json({ isSuccess: true, data: [], messsage: "No any transactions found" });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, messsage: error.message || "Having issue is server" })
  }
});

// router.post('/buyFromInr', async function (req, res) {
//   try {

//     const { amount, creditToken } = req.body;

//     const quantity = calculateQuantity(amount, creditToken);

//     if (quantity > 0) {
//       const responseIs = await binance.marketBuy("USDBTC", quantity.toFixed(10), (error, response) => {
//         console.info("Market Buy response", response);
//         console.info("order id: " + response.orderId);
//         console.log(error)
//         // Now you can limit sell with a stop loss, etc.
//       });
//       return res.status(200).json({ isSuccess: true, data: quantity.toFixed(10), result: responseIs, messsage: "Transaction stored successfully" });
//     }
//     return res.status(200).json({ isSuccess: true, data: null, messsage: "Transaction stored successfully" });
//   } catch (error) {
//     return res.status(500).json({ isSuccess: false, data: null, messsage: error.message || "Having issue is server" })
//   }
// })

// router.post('/convertCurrency', async function (req, res) {
//   try {
//     const { price, fromToken, toToken } = req.body;

//     const quantity = convertCurrency(fromToken, price, toToken);

//     return res.status(200).json({ isSuccess: true, data: null, messsage: "Transaction stored successfully" });
//   } catch (error) {
//     return res.status(500).json({ isSuccess: false, data: null, messsage: error.message || "Having issue is server" })
//   }
// })

module.exports = router;
async function getAssetWithUSDTINR(tokenIs) {

  allAsset = []

  //get binance prices
  const prices = await binance.prices();

  //getting token 
  const keys = Object.keys(tokenIs)
  // console.log(keys)

  //loop for finding usdt and inr prices
  for (i = 0; i < keys.length; i++) {
    token = keys[i] + "USDT";
    // console.log(prices)
    if (token in prices) {
      USDT = prices[token] * tokenIs[keys[i]]
      INR = USDT * parseInt(process.env.USDT_PRICE);
      obj = {
        token: keys[i],
        quantity: tokenIs[keys[i]],
        USDT: USDT,
        INR: INR
      }
    }
    else {
      if (keys == "USDT") {
        obj = {
          token: keys[i],
          quantity: tokenIs[keys[i]],
          USDT: tokenIs[keys[i]],
          INR: tokenIs[keys[i]] * parseInt(process.env.USDT_PRICE)
        }
      }
      else {
        obj = {
          token: keys[i],
          quantity: tokenIs[keys[i]],
          USDT: tokenIs[keys[i]] / parseInt(process.env.USDT_PRICE),
          INR: tokenIs[keys[i]]
        }
      }

    }

    allAsset.push(obj);
  }
  // console.log(allAsset)
  return allAsset;
}
async function getUserDetails(urlIs, token) {
  try {
    const url = `${urlIs}/wallet/getUserDetails`
    // console.log(url)
    const response = await axios.get(url, { headers: { Authorization: "Bearer " + token } })
    // console.log(response)
    if (response.status == 200) {
      return { status: 0, data: response.data };
    }
    else {
      return { status: 1 };
    }
  }
  catch (err) {
    // console.log(tokens)
    return { status: 2 };
  }
}
async function getAssetPrice() {
  let price = await binance.prices((error, price) => {
    // console.log(price)
    // // return price;
  });
  // console.log(price)
  return price;
}
function toTransRes(userId, dbResult) {
  var transRes = {};
  transRes.userId = userId;
  var transactions = [];
  for (var i = 0; i < dbResult.length; i++) {
    var transaction = {};
    transaction.id = dbResult[i]._id;
    transaction.debitToken = dbResult[i].debitToken;
    transaction.creditToken = dbResult[i].creditToken;
    transaction.debitAmount = dbResult[i].debitAmount;
    transaction.creditAmount = dbResult[i].creditAmount;
    transactions[i] = transaction;
  }
  transRes.transactions = transactions;
  transRes.userId = userId;
  return transRes;
}
async function calculateQuantity(debitToken, debitAmount, creditToken) {
  try {
    // console.log(debitToken + "  " + debitAmount + " " + creditToken)
    if (debitToken == "INR") {
      //convert to INR and do transaction

      const priceIs = debitAmount / parseInt(process.env.USDT_PRICE);//usdt convertion
      // console.log(priceIs)
      const exchange = `${creditToken}USDT`//price binance get pair
      const priceToken = await binance.prices(exchange);
      console.log(priceToken)
      const quantity = priceIs / parseFloat(priceToken[exchange]);
      // console.log(quantity)
      return quantity.toFixed(5);
    }
    else {
      //just convert debittoken to credittoken
      // console.log(debitToken + "  " + debitAmount + " " + creditToken)
      if (creditToken == "INR") {
        const priceIs = debitAmount;
        // console.log(priceIs)
        const exchange = `${debitToken}USDT`
        const priceToken = await binance.prices(exchange);
        // console.log(priceToken[exchange])
        const quantity = (priceIs * parseFloat(priceToken[exchange])) * parseInt(process.env.USDT_PRICE);
        // console.log(quantity)
        return quantity.toFixed(5);
      }
      console.log("no any inr")
      let exchangeIs = creditToken + "" + debitToken;
      // console.log(exchangeIs)

      const priceToken = await binance.prices();
      // return priceToken;

      if (exchangeIs in priceToken) {
        // console.log(`${creditToken} to ${debitToken}`)
        // 1 creditToken=how many debitToken
        //1 ATOM=0.0050 BTC 
        // console.log(priceToken[exchangeIs])
        const quantity = debitAmount / parseFloat(priceToken[exchangeIs]);
        // console.log(quantity)
        return quantity.toFixed(5);
      }
      else if (`${debitToken}${creditToken}` in priceToken) {
        //1 creditToken = how many debitToken

        // console.log(`${debitToken} to ${creditToken}`)
        // console.log(priceToken[`${debitToken}${creditToken}`])
        const quantity = debitAmount * parseFloat(priceToken[`${debitToken}${creditToken}`]);
        // console.log(quantity)
        return quantity.toFixed(5);
      }
      else {
        return;
      }
      // console.log(priceToken)
      // return priceToken

    }
    // let checkCurrency = currency.find((curr) => { return curr.token == toCurrency });
    // const responseIs = await binance.marketBuy("USDBTC", quantity.toFixed(10), (error, response) => {
    //   console.info("Market Buy response", response);
    //   console.info("order id: " + response.orderId);
    //   console.log(error)
    //   // Now you can limit sell with a stop loss, etc.
    // });
    // // console.log(checkCurrency);
    // if (checkCurrency != undefined) {
    //   let quantity = price / checkCurrency.price;
    //   // console.log(quantity)
    //   return quantity;
    // }
    return 0;
  }
  catch (err) {
    console.log(err.message)
  }
}
function convertCurrency(fromCurrency, price, toCurrency) {
  //check for available balance

}
async function toWalletRes(userId, dbResult) {
  const balance = await getWalletBalance(userId);
  console.log(balance)
  // const balance=0
  var tokenMap = new Map();
  var transRes = {};
  transRes.userId = userId;
  var transactions = [];
  if (dbResult.length == 0) {
    tokenMap.has("INR") ? "" : tokenMap.set("INR", balance)
  }
  for (var i = 0; i < dbResult.length; i++) {


    var transaction = {};
    var debitToken = dbResult[i].debitToken;
    var creditToken = dbResult[i].creditToken;
    var debitAmount = dbResult[i].debitAmount;
    var creditAmount = dbResult[i].creditAmount;

    tokenMap.has("INR") ? "" : tokenMap.set("INR", balance)

    var debitTokenAmount = tokenMap.has(debitToken) ? (tokenMap.get(debitToken) - debitAmount) : -debitAmount;
    var creditTokenAmount = tokenMap.has(creditToken) ? (tokenMap.get(creditToken) + creditAmount) : creditAmount;
    // console.log(debitTokenAmount)
    // console.log(creditTokenAmount)
    tokenMap.set(debitToken, debitTokenAmount);
    tokenMap.set(creditToken, creditTokenAmount);
    // console.log(tokenMap)
  }
  var tokens = Object.fromEntries(tokenMap);
  transRes.tokens = tokens;
  // console.log(transRes);
  return transRes;
}


async function getWalletBalance(userId) {
  let getTrans = await userWallet.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId)
      }
    }
  ]);

  if (getTrans.length > 0) {
    amount = 0
    for (i = 0; i < getTrans.length; i++) {
      if (getTrans[i].type == "DEPOSIT" || getTrans[i].type == "BONUS") {
        amount += getTrans[i].amount
      }
      else {
        amount -= getTrans[i].amount
      }
    }
    // console.log(amount)
    // const amount = getTrans.map(item => item.amount).reduce((prev, curr) => prev + curr, 0);
    return amount;
  }
  return 0;
}
async function getWalletBalanceMongo(userId) {
  let getBalance = await userWallet.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId)
      }
    },
    {
      $addFields: {
        amountIs: {
          $cond: {
            if: {
              $or: [{
                $eq: ['$type', 'DEPOSIT']
              }, { $eq: ['$type', 'BONUS'] }]
            }, then: '$amount', else: { $subtract: [0, '$amount'] }
          }
        }
      }
    }
    , {
      $group:
      {
        _id: {},
        totalAmount: { $sum: "$amountIs" },
        count: { $sum: 1 }
      }
    }
  ])
  if (getBalance.length > 0) {
    return getBalance;
  }
  return [{ _id: {}, totalAmount: 0, count: 0 }];
}

//for get token and quantities
async function getWalletBalanceV1(userId) {
  console.log("function start time  " + Date.now())
  const balanceIs = await getWalletBalanceMongo(userId);
  console.log("wallet balance  " + Date.now())
  // console.log(balanceIs)
  balanceUser = balanceIs[0].totalAmount;
  // console.log(balanceUser)
  console.log("before mongo  " + Date.now())
  let getDebitTransactions = await transactionSchema.aggregate([
    {
      $addFields: {
        debitAmountIs: { $subtract: [0, '$debitAmount'] }
      }
    },
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group:
      {
        _id: { token: "$debitToken" },
        total: { $sum: "$debitAmountIs" }
      }
    }
  ]);
  let getCreditTransactions = await transactionSchema.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group:
      {
        _id: { token: "$creditToken" },
        total: { $sum: "$creditAmount" }
      }
    }
  ]);
  console.log("after mongo  " + Date.now())
  if (getCreditTransactions.length > 0 && getDebitTransactions.length > 0) {
    console.log("reduceing start  " + Date.now())
    console.log("data find" + Date.now());
    const results = [...getCreditTransactions, ...getDebitTransactions];
    const resultIs = results.reduce(function (res, value) {
      if (!res[value._id.token]) {
        if (value._id.token == "INR") {
          res[value._id.token] = balanceUser
        }
        else {
          res[value._id.token] = 0
        }
      }
      res[value._id.token] += value.total;
      console.log("computing start  " + Date.now())
      return res;
    }, {});
    return resultIs;
  }
  return {}
}
//This responds a POST request for the homepage
// app.post('/users/insert', function (req, res) {
//   console.log("Got a POST1 request for the homepage" + req.body.id);
//   var name = req.body.name;
//   var email = req.body.email;
//   var phone = req.body.phone;
//   var age = req.body.age;

//   var user = { phone: phone, name: name, email: email, age: age };

//   const token = jwt.sign(
//     { name: name, email },
//     "djdnkdnknknkn",
//     {
//       expiresIn: "365d",
//     }
//   );
// app.get('/transactions/get/:userId', function(req, res) {
//   var userId = req.params.userId;
//   var query = { userId: userId};
//   dbo.collection("transactions").find(query).toArray(function(err, dbResult) {
//     if (err) throw err;
//     var transRes = toTransRes(userId, dbResult);
//     res.send(transRes);
//   }
//   );
// });


// app.get('/wallet/:userId', function(req, res) {
//   var userId = req.params.userId;
//   var query = { userId: userId};
//   dbo.collection("transactions").find(query).toArray(function(err, dbResult) {
//     if (err) throw err;
//     var transRes = toWalletRes(userId, dbResult);
//     res.send(transRes);
//   }
//   );
// });
