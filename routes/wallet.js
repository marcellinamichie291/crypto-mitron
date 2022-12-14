var express = require('express');
var router = express.Router();
const { default: mongoose } = require('mongoose');
const Binance = require('node-binance-api');
const cron = require('node-cron');
const axios = require('axios')
const binance = new Binance().options({
    APIKEY: process.env.BINANCE_APIKEY,
    APISECRET: process.env.BINANCE_APISECRET
});
let pricesToken = {};
const constants = require('../utils/constants');
const userSchema = require('../models/userModel');
const userWallet = require('../models/userWallet');
const { authenticateToken } = require('../middleware/auth');
const transactionSchema = require('../models/transactionModel');
const client = require('../services/redis-service');
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
        const balance = await getWalletBalance(userId);
        if (balance > 0) {
            return res.status(200).json({ isSuccess: true, data: { userId: userId, tokens: { INR: balance }, message: "Transaction Found successfully" } });
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
            // console.log(getResults);
            console.log("token" + Date.now())
            const finalToken = await getAssetWithUSDTINR(getResults.tokens)
            console.log("calculatedDone" + Date.now());
            // console.log(finalTokenPrice)
            return res.status(200).json({ isSuccess: true, data: finalToken, message: "Transaction Found successfully" });
        }
        return res.status(200).json({ isSuccess: false, data: null, message: "No any transactions found" });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
});

router.get('/getDetails', authenticateToken, async function (req, res) {
    try {
        // var userId = req.query.userId;
        // console.log(userId)
        const userId = req.user._id;
        console.log("data find first" + Date.now());
        let getAllTransactions = await transactionSchema.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId)
                }
            }
        ])
        // let getDebitTransactions = await transactionSchema.aggregate([
        //     {
        //         $match: {
        //             userId: mongoose.Types.ObjectId(userId)
        //         }
        //     },
        //     {
        //         $addFields: {
        //             debitAmountIs: { $subtract: [0, '$debitAmount'] }
        //         }
        //     },
        //     {
        //         $group:
        //         {
        //             _id: { token: "$debitToken" },
        //             total: { $sum: "$debitAmountIs" }
        //         }
        //     }
        // ]);
        // console.log("data find second" + Date.now());
        // let getCreditTransactions = await transactionSchema.aggregate([
        //     {
        //         $match: {
        //             userId: mongoose.Types.ObjectId(userId)
        //         }
        //     },
        //     {
        //         $group:
        //         {
        //             _id: { token: "$creditToken" },
        //             total: { $sum: "$creditAmount" }
        //         }
        //     }
        // ]);

        if (getAllTransactions.length > 0) {
            // const balance = await getWalletBalance(userId);
            // console.log("data find" + Date.now());
            // const results = [...getCreditTransactions, ...getDebitTransactions];
            // const resultIs = results.reduce(function (res, value) {
            //     if (!res[value._id.token]) {
            //         if (value._id.token == "INR") {
            //             res[value._id.token] = balance
            //         } else {
            //             res[value._id.token] = 0
            //         }

            //     }
            //     res[value._id.token] += value.total;
            //     return res;
            // }, {});
            // console.log(results)
            // console.log(resultIs)

            let getResults = await toWalletRes(userId, getAllTransactions);
            // console.log(getResults);
            // console.log(getResults);
            console.log("token" + Date.now())
            const finalToken = await getAssetWithUSDTINR(getResults.tokens)
            console.log("calculatedDone" + Date.now());
            // console.log(finalTokenPrice)
            return res.status(200).json({ isSuccess: true, data: { userId: userId, ...finalToken }, message: "Transaction Found successfully" });
        }
        const balance = await getWalletBalance(userId);
        if (balance > 0) {
            return res.status(200).json({ isSuccess: true, data: { userId: userId, USDT: balance / parseInt(process.env.USDT_PRICE), INR: balance, tokens: [{ token: "INR", quantity: balance, USDT: balance / parseInt(process.env.USDT_PRICE), INR: balance, icon: constants.ICON_BASE_URL + "inr.png" }] }, message: "Transaction Found successfully" });
        }
        return res.status(200).json({ isSuccess: true, data: { userId: userId, USDT: 0, INR: 0, tokens: [] }, message: "No any transactions found" });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
});

router.get('/getUserDetails', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user._id;
        // const userId = req.query.userId
        let userDetails = await userSchema.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId(userId)
                }
            }
        ]);
        //get users wallet transaction
        let getTrans = await userWallet.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $project: {
                    id: "$_id",
                    type: 1,
                    amount: 1,
                    currency: 1,
                    _id: 0
                }
            }
        ]);

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
        ])
        finalToken = { USDT: 0, INR: 0, tokens: [] }
        if (getAllTransactions.length > 0) {
            let getResults = await toWalletRes(userId, getAllTransactions);
            finalToken = await getAssetWithUSDTINR(getResults.tokens)
            // console.log(finalToken);
        }
        const balance = await getWalletBalance(userId);
        if (getAllTransactions.length == 0 && balance > 0) {
            finalToken = { userId: userId, USDT: balance / parseInt(process.env.USDT_PRICE), INR: balance, tokens: [{ token: "INR", quantity: balance, USDT: balance / parseInt(process.env.USDT_PRICE), INR: balance, icon: constants.ICON_BASE_URL + "inr.png" }] };
        }
        return res.status(200).json({ isSuccess: true, data: { userId: userId, name: userDetails[0].name, email: userDetails[0].email, USDT: finalToken.USDT, INR: finalToken.INR, walletDetails: finalToken.tokens, walletTransactions: getTrans, tokenTransactions: getAllTransactions }, message: "user details found" });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})

async function getAssetWithUSDTINR(tokenIs) {
    // console.log("get inr and usdt")
    allAsset = []
    console.log("before binance" + Date.now());
    //get binance prices
    const prices = JSON.parse(await client.get('token-data'));
    // const prices = pricesToken;
    console.log("after binance" + Date.now());
    //getting token 
    const keys = Object.keys(tokenIs)
    // console.log(keys)
    let usdt = 0;
    let inr = 0;
    //loop for finding usdt and inr prices
    for (i = 0; i < keys.length; i++) {
        token = keys[i] + "USDT";
        // console.log(token)
        // console.log(prices)
        if (token in prices) {
            console.log("price is")
            // console.log(prices[token])
            USDT = prices[token] * tokenIs[keys[i]]
            INR = USDT * parseInt(process.env.USDT_PRICE);
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
                inr += tokenIs[keys[i]] * parseInt(process.env.USDT_PRICE)
                obj = {
                    token: keys[i],
                    quantity: tokenIs[keys[i]],
                    USDT: tokenIs[keys[i]],
                    INR: tokenIs[keys[i]] * parseInt(process.env.USDT_PRICE),
                    icon: constants.ICON_BASE_URL + keys[i].toLowerCase() + ".png"
                }
            }
            else {
                usdt += tokenIs[keys[i]] / parseInt(process.env.USDT_PRICE);
                inr += tokenIs[keys[i]]
                obj = {
                    token: keys[i],
                    quantity: tokenIs[keys[i]],
                    USDT: tokenIs[keys[i]] / parseInt(process.env.USDT_PRICE),
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
    console.log(balance)
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
    if (dbResult.length == 0) {
        tokenMap.has("INR") ? "" : tokenMap.set("INR", balance)
    }
    var tokens = Object.fromEntries(tokenMap);
    transRes.tokens = tokens;
    // console.log(transRes);
    return transRes;
}
async function setFeaturedData() {
    let featuredIs = constants.FEATURED;
    let data = featuredIs.map((e) => { return e.toUpperCase() + "USDT" });
    for (i = 0; i < data.length; i++) {
        await binance.candlesticks(data[i], "1d", (error, ticks, symbol) => {
            if (error || (ticks == undefined || ticks.length == 0)) {
                console.log(error.message)
                return;
            }

            open = ticks.map(function (x) {
                return (x[1] * process.env.USDT_PRICE);
            });

            client.set(symbol, JSON.stringify(open), function (err, reply) {
                console.log(err.message)
                // console.log(reply);
            });
        }, { limit: 15 });
    }
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
        // console.log("amount")
        // console.log(amount)
        // const amount = getTrans.map(item => item.amount).reduce((prev, curr) => prev + curr, 0);
        return amount;
    }
    return 0;
}
async function setSymbolData(tokens) {
    try {
        const url = `https://api.binance.com/api/v3/ticker/24hr`
        // console.log(url)
        const response = await axios.get(url)
        // console.log(response)
        if (response.status == 200) {
            client.set("tokenInformationsLast", JSON.stringify(response.data), function (err, reply) {
                console.log(err.message)
                console.log(reply);
            });
        }
        else {
            return { status: 1 };;
        }
    }
    catch (err) {
        // console.log(tokens)
        console.log(err.message)
    }
}
cron.schedule('*/10 * * * * *', async () => {
    try {
        pricesToken = await binance.prices();
        client.set('token-data', JSON.stringify(pricesToken), function (err, reply) {
            console.log(err.message)
            console.log(reply);
        });
        await setFeaturedData();
        await setSymbolData();
        console.log("prices updated  " + Date.now())
    } catch (error) {
        console.log(error.message ||
            "Having issue")
    }
});
module.exports = router;
