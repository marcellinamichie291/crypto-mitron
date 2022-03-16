var express = require('express');
const { default: mongoose } = require('mongoose');
var router = express.Router();
const transactionSchema = require('../models/transactionModel');
const { authenticateToken } = require('../middleware/auth');
const userSchema = require('../models/userModel');
const userWallet = require('../models/userWallet');
const binance = require('../services/binance');
const app_access_key = '621db3d4692b6d05230a0870';
const app_secret = '_01RbLt1WIU0SP4BwR3pgIxFZI_1l857wCZqksdMdYwY_sTbhZdvsXpI7Pc4qUZrVCpeB0Eano7iRm00P_CMddtwMT97tdHIOyAq2rQf9yb0LzW767zq1lPEcVzdafdEiFgQOZtH4o98kB8vXYgTdiCq5nIpz4QZfpz18kqQTYM=';

/* GET home page. */

let currency = [
  {
    token: "BTC",
    price: 3267360.43
  },
  {
    token: "ETH",
    price: 199527.05
  }
]
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

var jwt = require('jsonwebtoken');
var uuid4 = require('uuid4');


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
      expiresIn: '30d',
      jwtid: uuid4()
    },
    function (err, token) {
      console.log(token);
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
      return res.status(200).json({ IsSuccess: true, Data: token, Messsage: "no user found" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "no user found" });
  }
  catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})

router.post('/create', authenticateToken, async function (req, res) {
  try {

    const { debitToken, creditToken, debitAmount, transactionDate, status } = req.body;

    const userId = req.user._id;
    const checkQuantityIs = await calculateQuantity(debitToken, debitAmount, creditToken)

    let createTransaction = new transactionSchema({ userId: userId, debitToken: debitToken, debitAmount: debitAmount, creditToken: creditToken, creditAmount: checkQuantityIs, transactionDate: transactionDate, status: status });

    await createTransaction.save();
    return res.status(200).json({ IsSuccess: true, Data: [createTransaction], Messsage: "Transaction stored successfully" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
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
        transactions: getAllTransactions
      }
      // let getResultsFor = toTransRes(userId, getAllTransactions);
      return res.status(200).json({ IsSuccess: true, Data: getResults, Messsage: "Transaction stored successfully" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "No any transactions found" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
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
      let getResults = await toWalletRes(userId, getAllTransactions);
      return res.status(200).json({ IsSuccess: true, Data: getResults, Messsage: "Transaction Found successfully" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "No any transactions found" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
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
      return res.status(200).json({ IsSuccess: true, Data: finalToken, Messsage: "Transaction Found successfully" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "No any transactions found" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
});

router.post('/buyFromInr', async function (req, res) {
  try {

    const { amount, creditToken } = req.body;

    const quantity = calculateQuantity(amount, creditToken);

    if (quantity > 0) {
      const responseIs = await binance.marketBuy("USDBTC", quantity.toFixed(10), (error, response) => {
        console.info("Market Buy response", response);
        console.info("order id: " + response.orderId);
        console.log(error)
        // Now you can limit sell with a stop loss, etc.
      });
      return res.status(200).json({ IsSuccess: true, Data: quantity.toFixed(10), result: responseIs, Messsage: "Transaction stored successfully" });
    }
    return res.status(200).json({ IsSuccess: true, Data: [], Messsage: "Transaction stored successfully" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})

router.post('/convertCurrency', async function (req, res) {
  try {
    const { price, fromToken, toToken } = req.body;

    const quantity = convertCurrency(fromToken, price, toToken);

    return res.status(200).json({ IsSuccess: true, Data: [], Messsage: "Transaction stored successfully" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})

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
      INR = USDT * 75;
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
          INR: tokenIs[keys[i]] * 75
        }
      }
      else {
        obj = {
          token: keys[i],
          quantity: tokenIs[keys[i]],
          USDT: tokenIs[keys[i]] / 75,
          INR: tokenIs[keys[i]]
        }
      }

    }

    allAsset.push(obj);
  }
  console.log(allAsset)
  return allAsset;
}
async function getAssetPrice() {
  let price = await binance.prices((error, price) => {
    // console.log(price)
    // // return price;
  });
  console.log(price)
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

async function calculateQuantity(debitToken, debitAmount, creditToken) {
  try {

    if (debitToken == "INR") {
      //convert to INR and do transaction

      const priceIs = debitAmount / 75;
      console.log(priceIs)
      const exchange = `${creditToken}USDT`
      const priceToken = await binance.prices(exchange);
      // console.log(priceToken)
      const quantity = priceIs / parseFloat(priceToken[exchange]);
      // console.log(quantity)
      return quantity.toFixed(5);
    }
    else {
      //just convert debittoken to credittoken
      const exchange = `${creditToken}${debitToken}`
      const priceToken = await binance.prices(exchange);
      const quantity = debitAmount / parseFloat(priceToken[exchange]);
      // console.log(quantity)
      return quantity.toFixed(5);
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
  var tokenMap = new Map();
  var transRes = {};
  transRes.userId = userId;
  var transactions = [];
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
      if (getTrans[i].type == "DEPOSIT") {
        amount += getTrans[i].amount
      }
      else {
        amount -= getTrans[i].amount
      }
    }
    console.log(amount)
    // const amount = getTrans.map(item => item.amount).reduce((prev, curr) => prev + curr, 0);
    return amount;
  }
  return 0;
}
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
