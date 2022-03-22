var express = require('express');
var router = express.Router();
const constants = require('../utils/constants');
const axios = require('axios')

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
        return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "Transaction stored successfully" });
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
        return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "Transaction stored successfully" });
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
        return res.status(200).json({ IsSuccess: true, Data: resp, Messsage: "Transaction stored successfully" });
    } catch (error) {
        return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
    }
})
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
module.exports = router;