var express = require('express');
var router = express.Router();
const { default: mongoose } = require('mongoose');
const Binance = require('node-binance-api');
const cron = require('node-cron');
const binance = new Binance().options({
    APIKEY: process.env.BINANCE_APIKEY,
    APISECRET: process.env.BINANCE_APISECRET
});
let pricesToken = {};
const userSchema = require('../models/userModel');
const userWallet = require('../models/userWallet');
const { authenticateToken } = require('../middleware/auth');
const transactionSchema = require('../models/transactionModel');
const constants = require('../utils/constants');
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
            return res.status(200).json({ isSuccess: true, data: getResults, message: "Transaction Found successfully" });
        }
        return res.status(200).json({ isSuccess: true, data: { userId: userId, tokens: {} }, message: "No any transactions found" });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
});

//wallet token with their current inr and usdt price
router.get('/getDetailsSlow', authenticateToken, async function (req, res) {
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
            console.log("data find" + Date.now());
            let getResults = await toWalletRes(userId, getAllTransactions);
            console.log(getResults);
            console.log("token" + Date.now())
            const finalToken = await getAssetWithUSDTINR(getResults.tokens)
            console.log("calculatedDone" + Date.now());
            // console.log(finalTokenPrice)
            return res.status(200).json({ isSuccess: true, data: finalToken, message: "Transaction Found successfully" });
        }
        return res.status(404).json({ isSuccess: false, data: null, message: "No any transactions found" });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
});

router.get('/getDetails', authenticateToken, async function (req, res) {
    try {
        // var userId = req.params.userId;

        const userId = req.user._id;
        console.log("data find first" + Date.now());
        let getDebitTransactions = await transactionSchema.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $addFields: {
                    debitAmountIs: { $subtract: [0, '$debitAmount'] }
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
        console.log("data find second" + Date.now());
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

        if (getCreditTransactions.length > 0 && getDebitTransactions.length > 0) {
            const balance = await getWalletBalance(userId);
            console.log("data find" + Date.now());
            const results = [...getCreditTransactions, ...getDebitTransactions];
            const resultIs = results.reduce(function (res, value) {
                if (!res[value._id.token]) {
                    if (value._id.token == "INR") {
                        res[value._id.token] = balance
                    } else {
                        res[value._id.token] = 0
                    }

                }
                res[value._id.token] += value.total;
                return res;
            }, {});
            // console.log(results)
            // console.log(resultIs)

            // let getResults = await toWalletRes(userId, getAllTransactions);
            // console.log(getResults);
            console.log("token" + Date.now())
            const finalToken = await getAssetWithUSDTINR(resultIs)
            console.log("calculatedDone" + Date.now());
            // console.log(finalTokenPrice)
            return res.status(200).json({ isSuccess: true, data: { userId: userId, ...finalToken }, message: "Transaction Found successfully" });
        }
        return res.status(200).json({ isSuccess: true, data: { userId: userId, USDT: 0, INR: 0, tokens: [] }, message: "No any transactions found" });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
});

async function getAssetWithUSDTINR(tokenIs) {
    // console.log("get inr and usdt")
    allAsset = []
    console.log("before binance" + Date.now());
    //get binance prices
    const prices = pricesToken;
    console.log("after binance" + Date.now());
    //getting token 
    const keys = Object.keys(tokenIs)
    // console.log(keys)
    let usdt = 0;
    let inr = 0;
    //loop for finding usdt and inr prices
    for (i = 0; i < keys.length; i++) {
        token = keys[i] + "USDT";
        console.log(token)
        // console.log(prices)
        if (token in prices) {
            console.log("price is")
            console.log(prices[token])
            USDT = prices[token] * tokenIs[keys[i]]
            INR = USDT * 75;
            usdt += USDT;
            inr += INR;
            obj = {
                token: keys[i],
                quantity: tokenIs[keys[i]],
                USDT: USDT,
                INR: INR,
                icon: constants.ICON_BASE_URL + keys[i].toLowerCase() + ".png"
            }
        }
        else {
            // console.log(keys[i])
            if (keys[i] == "USDT") {
                usdt += tokenIs[keys[i]];
                inr += tokenIs[keys[i]] * 75
                obj = {
                    token: keys[i],
                    quantity: tokenIs[keys[i]],
                    USDT: tokenIs[keys[i]],
                    INR: tokenIs[keys[i]] * 75,
                    icon: constants.ICON_BASE_URL + keys[i].toLowerCase() + ".png"
                }
            }
            else {
                usdt += tokenIs[keys[i]] / 75;
                inr += tokenIs[keys[i]]
                obj = {
                    token: keys[i],
                    quantity: tokenIs[keys[i]],
                    USDT: tokenIs[keys[i]] / 75,
                    INR: tokenIs[keys[i]],
                    icon: constants.ICON_BASE_URL + keys[i].toLowerCase() + ".png"
                }
            }

        }

        allAsset.push(obj);
    }
    console.log("final arr" + Date.now());
    // console.log(allAsset)
    return { USDT: usdt, INR: inr, tokens: allAsset };
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
cron.schedule('*/10 * * * * *', async () => {
    try {
        pricesToken = await binance.prices();
        console.log("prices updated  " + Date.now())
    } catch (error) {
        console.log(error.message ||
            "Having issue")
    }
});
module.exports = router;