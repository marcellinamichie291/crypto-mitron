var express = require('express');
const { default: mongoose } = require('mongoose');
var router = express.Router();
const transactionSchema = require('../models/transactionModel');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/create', async function (req, res) {
  try {

    const { userId, debitCurrency, creditCurrency, creditAmount, debitAmount, transactionDate, status } = req.body;

    let createTransaction = new transactionSchema({ userId: userId, debitCurrency: debitCurrency, debitAmount: debitAmount, creditCurrency: creditCurrency, creditAmount: creditAmount, transactionDate: transactionDate, status: status });

    await createTransaction.save();
    return res.status(200).json({ IsSuccess: true, Data: [createTransaction], Messsage: "Transaction stored successfully" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})

router.get('/get/:userId', async function (req, res) {
  try {

    const userId = req.params.userId;

    let getAllTransactions = await transactionSchema.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      },
      {
        $project: {
          userId: 0
        }
      }
    ]);

    if (getAllTransactions.length > 0) {
      let getResults = {
        userId: userId,
        transactions: getAllTransactions
      }
      // let getResults = toTransRes(userId, getAllTransactions);
      return res.status(200).json({ IsSuccess: true, Data: getResults, Messsage: "Transaction stored successfully" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "No any transactions found" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
});

router.get('/wallet/:userId', async function (req, res) {
  try {
    var userId = req.params.userId;

    let getAllTransactions = await transactionSchema.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      }
    ]);

    if (getAllTransactions.length > 0) {
      let getResults = toWalletRes(userId, getAllTransactions);
      return res.status(200).json({ IsSuccess: true, Data: getResults, Messsage: "Transaction Found successfully" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "No any transactions found" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
});
module.exports = router;

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


function toWalletRes(userId, dbResult) {
  var tokenMap = new Map();
  var transRes = {};
  transRes.userId = userId;
  var transactions = [];
  for (var i = 0; i < dbResult.length; i++) {
    console.log(dbResult);
    var transaction = {};
    var debitToken = dbResult[i].debitCurrency;
    var creditToken = dbResult[i].creditCurrency;
    var debitAmount = dbResult[i].debitAmount;
    var creditAmount = dbResult[i].creditAmount;

    var debitTokenAmount = tokenMap.has(debitToken) ? (tokenMap.get(debitToken) - debitAmount) : -debitAmount;
    var creditTokenAmount = tokenMap.has(creditToken) ? (tokenMap.get(creditToken) + creditAmount) : creditAmount;

    tokenMap.set(debitToken, debitTokenAmount);
    tokenMap.set(creditToken, creditTokenAmount);
  }
  var tokens = Object.fromEntries(tokenMap);
  transRes.tokens = tokens;
  console.log(transRes);
  return transRes;
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
