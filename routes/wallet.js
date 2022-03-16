var express = require('express');
var router = express.Router();
const { default: mongoose } = require('mongoose');
const binance = require('../services/binance');
const userSchema = require('../models/userModel');
const userWallet = require('../models/userWallet');
const { authenticateToken } = require('../middleware/auth');
const transactionSchema = require('../models/transactionModel');
//wallet token 
router.get('/get', authenticateToken, async function (req, res) {
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

//wallet token with their current inr and usdt price
router.get('/getDetails', authenticateToken, async function (req, res) {
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


//
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

//
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
module.exports = router;