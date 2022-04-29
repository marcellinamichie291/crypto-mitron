var express = require('express');
var router = express.Router();
const constants = require('../utils/constants');
const axios = require('axios')
const cron = require('node-cron');
const Binance = require('node-binance-api');
const binance = new Binance().options();
const symbolSchema = require('../models/symbolModel');
const { uploadJson, uploadBackUp } = require('../utils/aws-uploads');
const client = require('../services/redis-service');
const path = require('path');

require("dotenv").config();
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/getTokenDetails', async (req, res) => {
    try {
        const response = await getTokensJson();
        if (response.status == 0) {
            return res.status(200).json({ isSuccess: true, data: response.resp, messsage: "All Token Details Fetched Successfully" });
        }
        else {
            return res.status(200).json({ isSuccess: true, data: null, messsage: "Cannot construct json for tokens" });
        }
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})
router.get('/getTopGainers', async (req, res) => {
    try {
        let tokens = constants.TOKENS;
        // let tokenIs = (tokens.map(a => a.token)).toString();
        // tokenPrices = await getBinance24Change(tokens.toString())

        let tokenIs = [];
        for (i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const tokenName = token.toUpperCase();
            const tokenPair = (token + "usdt").toUpperCase();
            const tokenPrices = await getBinance24Change(tokenPair)
            // console.log(tokenPrices)
            if (tokenPrices.data.priceChangePercent > 0) {
                let tokenObj = {
                    "token": token,
                    "token_pair": token + "usdt",
                    "name": tokenName,
                    // "label": "Bitcoin",
                    "icon": constants.ICON_BASE_URL + token + ".png",
                    last_price: tokenPrices.data.lastPrice,
                    priceChange: tokenPrices.data.priceChange,
                    change_24h_per: tokenPrices.data.priceChangePercent
                }
                tokenIs.push(tokenObj)
            }
        }

        // console.log(tokenIs.length)
        // console.log(tokenIs)
        // console.log(tokens)
        // console.log(tokens)

        // resp = tokenIs.sort((a, b) => parseFloat(a.change_24h_per) - parseFloat(b.change_24h_per));
        tokensData = tokenIs.sort((a, b) => parseFloat(b.change_24h_per) - parseFloat(a.change_24h_per));
        let resp = {
            currency: constants.CURRENCY,
            banners: constants.BANNER,
            tokens: tokensData
        }
        return res.status(200).json({ isSuccess: true, data: resp, messsage: "top gainers by 24 hour change" });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: [], message: error.message || "Having issue is server" })
    }
})
router.get('/getTopLoosers', async (req, res) => {
    try {
        let tokens = constants.TOKENS;
        // let tokenIs = (tokens.map(a => a.token)).toString();
        // tokenPrices = await getBinance24Change(tokens.toString())

        let tokenIs = [];
        for (i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const tokenName = token.toUpperCase();
            const tokenPair = (token + "usdt").toUpperCase();
            const tokenPrices = await getBinance24Change(tokenPair)
            if (tokenPrices.data.priceChangePercent < 0) {
                // console.log(tokenPrices)
                let tokenObj = {
                    "token": token,
                    "token_pair": token + "usdt",
                    "name": tokenName,
                    // "label": "Bitcoin",
                    "icon": constants.ICON_BASE_URL + token + ".png",
                    last_price: tokenPrices.data.lastPrice,
                    priceChange: tokenPrices.data.priceChange,
                    change_24h_per: tokenPrices.data.priceChangePercent
                }
                tokenIs.push(tokenObj)
            }
        }

        tokensData = tokenIs.sort((a, b) => parseFloat(a.change_24h_per) - parseFloat(b.change_24h_per));
        let resp = {
            currency: constants.CURRENCY,
            banners: constants.BANNER,
            tokens: tokensData
        }
        // resp = tokenIs.sort((a, b) => parseFloat(b.change_24h_per) - parseFloat(a.change_24h_per));
        return res.status(200).json({ isSuccess: true, data: resp, messsage: "top loosers by 24 hour change" });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})
router.get('/getTokens', async (req, res) => {
    try {
        const response = await getTokensJson();
        if (response.status == 0) {
            const resp = response.resp;
            var buf = Buffer.from(JSON.stringify(resp));
            const responseIs = await uploadJson(buf)
            // console.log(responseIs)
            return res.status(200).json({ isSuccess: true, data: resp, messsage: "top loosers by 24 hour change" });
        }
        else {
            return res.status(500).json({ isSuccess: false, data: [], messsage: response.Message || "Having issue is server" })
        }

        // resp = tokenIs.sort((a, b) => parseFloat(b.change_24h_per) - parseFloat(a.change_24h_per));

    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: [], messsage: error.message || "Having issue is server" })
    }
})
//for upload all token data to s3 every 10 second
//for 10 minute==*/10 * * * *
const spawn = require('child_process').spawn;

router.get('/backUp', async (req, res) => {
    try {
        let backupProcess = spawn('mongodump', [
            '--uri=mongodb+srv://admin:admin123@cluster0.cggyq.mongodb.net',
            '--db=crypto',
            '--gzip'
        ]);

        backupProcess.on('exit', (code, signal) => {
            console.log(code, signal)
            if (code)
                console.log('Backup process exited with code ', code);
            else if (signal)
                console.error('Backup process was killed with singal ', signal);
            else {
                const testFolder = path.join(__dirname, '../', 'dump', 'crypto');
                const fs = require('fs');
                // console.log(testFolder)
                fs.readdir(testFolder, async (err, files) => {
                    // console.log(files);
                    for (i = 0; i < files.length; i++) {
                        await uploadBackUp(files[i])
                    }
                });
                console.log('Successfully backedup the database')
            }
        });

        backupProcess.on('error', (data) => { console.log(data) })
        return res.status(200).json({ isSuccess: true, data: [], messsage: "back up done" });

    } catch (error) {
        console.log(error.message ||
            "Having issue")
        return res.status(500).json({ isSuccess: false, data: [], messsage: error.message || "Having issue is server" })

    }

})

cron.schedule('0 * * * *', async () => {
    try {
        const response = await getTokensJson();
        if (response.status == 0) {
            const resp = response.resp;
            var buf = Buffer.from(JSON.stringify(resp));
            const responseIs = await uploadJson(buf)
            console.log("uploaded")
            // console.log(responseIs)
            // return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "top loosers by 24 hour change" });
        }
        else {
            console.log("json data cannot construct")
            // return res.status(500).json({ IsSuccess: false, Data: [], Message: response.Message || "Having issue is server" })
        }

        // resp = tokenIs.sort((a, b) => parseFloat(b.change_24h_per) - parseFloat(a.change_24h_per));

    } catch (error) {
        console.log(error.message ||
            "Having issue")
    }
    // const resp = response.resp;
    // var buf = Buffer.from(JSON.stringify(resp));
    // const responseIs = await uploadJson(buf)
    // console.log('running on Sundays of January and September');
});
//========FUNCTIONS============
async function getCoinMarketCapData(tokens) {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${tokens}`
    // console.log(url)
    const response = await axios.get(url, { headers: { "X-CMC_PRO_API_KEY": process.env.MARKET_CAP_KEY } })
    // console.log(response)
    if (response.status == 200) {
        return { status: 0, data: response.data };
    }
    else {
        return { status: 1 };;
    }
}
async function getBinance24Change(tokens) {
    try {
        const url = `https://api.binance.com/api/v3/ticker/24hr`
        // console.log(url)
        const response = await axios.get(url)
        // console.log(response)
        if (response.status == 200) {
            return { status: 0, data: response.data };
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

async function getTokensJson() {
    try {
        // let tokens = constants.TOKENS;
        let tokens = await symbolSchema.aggregate([
            {
                $match: {

                }
            },
            {
                $project: {
                    token: 1,
                    label: 1
                }
            }
        ]);
        // console.log(tokens.length);
        let featuredIs = constants.FEATURED;
        // console.log(featuredIs)
        // let tokens = getTokens.map(a => a.token);
        // console.log(tokens)

        // let tokenIs = (tokens.map(a => a.token)).toString();
        // tokenPrices = await getBinance24Change(tokens.toString())

        let tokenIs = [];
        let gainers = [];
        let feautured = [];
        let loosers = [];
        const response24Ticker = await getBinance24Change("BTCUSDT")
        if (response24Ticker.status == 0) {

            for (i = 0; i < tokens.length; i++) {
                const token = tokens[i].token;
                const label = tokens[i].label;
                const tokenName = token.toUpperCase();
                const tokenPair = (token + "usdt").toUpperCase();
                const tokenPrices = response24Ticker.data.find((e) => { return e.symbol == tokenPair })
                // console.log("data")
                // console.log(tokenPrices)
                if (tokenPrices != undefined) {

                    tokenPrices.data = tokenPrices;
                    // console.log(tokenPrices)
                    // console.log(tokenPrices)
                    let tokenObj = {
                        "token": token,
                        "token_pair": token + "usdt",
                        "name": tokenName,
                        "label": label,
                        "icon": constants.ICON_BASE_URL + token + ".png",
                        last_price: tokenPrices.data.lastPrice,
                        priceChange: tokenPrices.data.priceChange,
                        change_24h_per: tokenPrices.data.priceChangePercent
                    }

                    let tokenRupee = {
                        "token": token,
                        "token_pair": token + "usdt",
                        "name": tokenName,
                        "label": label,
                        "icon": constants.ICON_BASE_URL + token + ".png",
                        last_price: tokenPrices.data.lastPrice * parseInt(process.env.USDT_PRICE),
                        priceChange: tokenPrices.data.priceChange * parseInt(process.env.USDT_PRICE),
                        change_24h_per: tokenPrices.data.priceChangePercent
                    }

                    // console.log(token in featuredIs);
                    if (featuredIs.includes(token)) {
                        const response = JSON.parse(await client.get(tokenPair));
                        if (response != null) {
                            let tokenfeautured = {
                                "token": token,
                                "token_pair": token + "usdt",
                                "name": tokenName,
                                "label": label,
                                "icon": constants.ICON_BASE_URL + token + ".png",
                                last_price: tokenPrices.data.lastPrice * parseInt(process.env.USDT_PRICE),
                                priceChange: tokenPrices.data.priceChange * parseInt(process.env.USDT_PRICE),
                                change_24h_per: tokenPrices.data.priceChangePercent,
                                "data": response
                            }
                            // return tokenfeautured;
                            feautured.push(tokenfeautured);

                        }
                        // console.log("found " + token)
                    }

                    //
                    tokenIs.push(tokenObj);

                    if (tokenPrices.data.priceChangePercent > 0) {
                        gainers.push(tokenRupee)
                    }
                    if (tokenPrices.data.priceChangePercent < 0) {
                        loosers.push(tokenRupee)
                    }

                }
            }

            tokensLoosers = loosers.sort((a, b) => parseFloat(a.change_24h_per) - parseFloat(b.change_24h_per));
            tokensGainers = gainers.sort((a, b) => parseFloat(b.change_24h_per) - parseFloat(a.change_24h_per));

            tokensLoosers.splice(process.env.GAINER_LOOSER - 1, (tokensLoosers.length - process.env.GAINER_LOOSER));
            tokensGainers.splice(process.env.GAINER_LOOSER - 1, (tokensGainers.length - process.env.GAINER_LOOSER));
            // console.log(loosers.length)
            // console.log(feautured.length)
            let resp = {
                currency: constants.CURRENCY,
                rate: process.env.USDT_PRICE,
                banners: constants.BANNER,
                tokens: tokenIs,
                featured: feautured,
                gainers: tokensGainers,
                losers: tokensLoosers
            };
            return { status: 0, resp: resp };

        }
        return { status: 2, resp: {} }
    }
    catch (error) {
        console.log(error.message)
        return { status: 1, Message: error.message || "Having issue is server" }
    }
}
module.exports = router;