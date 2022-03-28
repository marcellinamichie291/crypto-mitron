var express = require('express');
var router = express.Router();
const constants = require('../utils/constants');
const axios = require('axios')
const cron = require('node-cron');
const { uploadJson } = require('../utils/aws-uploads');
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/getTokenDetails', async (req, res) => {
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

        console.log(tokenIs.length)
        // console.log(tokenIs)
        // console.log(tokens)
        // console.log(tokens)
        let resp = {
            currency: constants.CURRENCY,
            banners: constants.BANNER,
            tokens: tokenIs
        }
        return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "All Token Details Fetched Successfully" });
    } catch (error) {
        return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
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

        console.log(tokenIs.length)
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
        return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "top gainers by 24 hour change" });
    } catch (error) {
        return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
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
        return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "top loosers by 24 hour change" });
    } catch (error) {
        return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
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
            return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "top loosers by 24 hour change" });
        }
        else {
            return res.status(500).json({ IsSuccess: false, Data: [], Message: response.Message || "Having issue is server" })
        }

        // resp = tokenIs.sort((a, b) => parseFloat(b.change_24h_per) - parseFloat(a.change_24h_per));

    } catch (error) {
        return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
    }
})
//for upload all token data to s3 every 10 second
//for 10 minute==*/10 * * * *
// cron.schedule('*/10 * * * * *', async () => {
//     try {
//         const response = await getTokensJson();
//         if (response.status == 0) {
//             const resp = response.resp;
//             var buf = Buffer.from(JSON.stringify(resp));
//             const responseIs = await uploadJson(buf)
//             console.log("uploaded")
//             // console.log(responseIs)
//             // return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "top loosers by 24 hour change" });
//         }
//         else {
//             console.log("json data cannot construct")
//             // return res.status(500).json({ IsSuccess: false, Data: [], Message: response.Message || "Having issue is server" })
//         }

//         // resp = tokenIs.sort((a, b) => parseFloat(b.change_24h_per) - parseFloat(a.change_24h_per));

//     } catch (error) {
//         console.log(error.message ||
//             "Having issue")
//     }
//     // const resp = response.resp;
//     // var buf = Buffer.from(JSON.stringify(resp));
//     // const responseIs = await uploadJson(buf)
//     console.log('running on Sundays of January and September');
// });
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
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${tokens}`
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
        console.log(err.message)
    }
}
async function getTokensJson() {
    try {
        let tokens = constants.TOKENS;
        // let tokenIs = (tokens.map(a => a.token)).toString();
        // tokenPrices = await getBinance24Change(tokens.toString())

        let tokenIs = [];
        let gainers = [];
        let feautured = [];
        let loosers = [];
        for (i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const tokenName = token.toUpperCase();
            const tokenPair = (token + "usdt").toUpperCase();
            const tokenPrices = await getBinance24Change(tokenPair)

            // console.log(tokenPrices)
            let tokenObj = {
                "token": token,
                "token_pair": token + "usdt",
                "name": tokenName,
                "label": "Bitcoin",
                "icon": constants.ICON_BASE_URL + token + ".png",
                last_price: tokenPrices.data.lastPrice,
                priceChange: tokenPrices.data.priceChange,
                change_24h_per: tokenPrices.data.priceChangePercent
            }

            let tokenRupee = {
                "token": token,
                "token_pair": token + "usdt",
                "name": tokenName,
                "label": "Bitcoin",
                "icon": constants.ICON_BASE_URL + token + ".png",
                last_price: tokenPrices.data.lastPrice * 75,
                priceChange: tokenPrices.data.priceChange * 75,
                change_24h_per: tokenPrices.data.priceChangePercent
            }
            let tokenfeautured = {
                "token": token,
                "token_pair": token + "usdt",
                "name": tokenName,
                "label": "Bitcoin",
                "icon": constants.ICON_BASE_URL + token + ".png",
                last_price: tokenPrices.data.lastPrice * 75,
                priceChange: tokenPrices.data.priceChange * 75,
                change_24h_per: tokenPrices.data.priceChangePercent,
                "data": [0.0, 0.5, 0.9, 1.4, 2.2, 1.0, 3.3, 0.0, -0.5, -1.0, -0.5, 0.0, 0.0]
            }
            // 
            tokenIs.push(tokenObj);

            feautured.push(tokenfeautured);
            if (tokenPrices.data.priceChangePercent > 0) {
                gainers.push(tokenRupee)
            }
            if (tokenPrices.data.priceChangePercent < 0) {
                loosers.push(tokenRupee)
            }
        }

        tokensLoosers = loosers.sort((a, b) => parseFloat(a.change_24h_per) - parseFloat(b.change_24h_per));
        tokensGainers = gainers.sort((a, b) => parseFloat(b.change_24h_per) - parseFloat(a.change_24h_per));
        console.log(loosers.length)
        let resp = {
            currency: constants.CURRENCY,
            banners: constants.BANNER,
            tokens: tokenIs,
            feautured: feautured,
            gainers: tokensGainers,
            losers: tokensLoosers
        };
        return { status: 0, resp: resp };
    }
    catch (error) {
        return { status: 1, Message: error.message || "Having issue is server" }
    }
}
module.exports = router;