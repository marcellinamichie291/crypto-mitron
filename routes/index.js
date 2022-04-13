var express = require('express');
var router = express.Router();
const Binance = require('node-binance-api');
const binance = new Binance().options({
  APIKEY: process.env.BINANCE_APIKEY,
  APISECRET: process.env.BINANCE_APISECRET
});

const symbolSchema = require('../models/symbolModel');
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/config', (req, res) => {
  return res.status(200).json({
    supported_resolutions: ['1', '5', '15', '30', '60', '1D', '1W', '1M'],
    supports_group_request: false,
    supports_marks: false,
    supports_search: true,
    supports_timescale_marks: false,
  })
})

router.get('/symbols', async (req, res) => {
  const { symbol } = req.query;

  let checkSymbol = await symbolSchema.aggregate([
    {
      $match: {
        token: symbol
      }
    }
  ]);
  console.log(checkSymbol.length)
  if (checkSymbol.length > 0) {
    return res.status(200).json(
      {
        "symbol": req.query.symbol,
        "full_name": checkSymbol[0].fullName, // e.g. BTCE:BTCUSD
        "description": checkSymbol[0].description,
        "exchange": "BINANCE",
        "pricescale": 100,
        "ticker": req.query.symbol,
        "type": "crypto" // or "futures" or "crypto" or "forex" or "index"
      }
    )
  }
  return res.status(200).json(
    {
      "symbol": req.query.symbol,
      "full_name": req.query.symbol, // e.g. BTCE:BTCUSD
      "description": req.query.symbol,
      "exchange": "BINANCE",
      "ticker": req.query.symbol,
      "type": "crypto" // or "futures" or "crypto" or "forex" or "index"
    }
  )
})

router.get('/history', async (req, res) => {
  try {
    const { symbol, from, to } = req.query;

    const fromIs = from * 1000;
    const toIs = to * 1000;
    const binance = new Binance().options();
    binance.candlesticks(symbol.toUpperCase() + "USDT", "1d", (error, ticks, symbol) => {
      if (error || (ticks == undefined || ticks.length == 0)) {
        return res.status(200).json({
          s: "no_data",
          nextTime: 1386493512
        });
      }
      var t1 = new Date().getTime();
      // console.info("candlesticks()", ticks);
      let last_tick = ticks[ticks.length - 1];
      // let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
      var t2 = new Date().getTime();
      // console.info(symbol + " last close: " + close);
      var t = t2 - t1;
      console.info(t1 + "...." + t2 + "....." +
        t)
      time = ticks.map(function (x) {
        return x[0] / 1000;
      });
      close = ticks.map(function (x) {
        return x[4] * 75;
      });
      open = ticks.map(function (x) {
        return x[1] * 75;
      });
      high = ticks.map(function (x) {
        return x[2] * 75;
      });
      low = ticks.map(function (x) {
        return x[3] * 75;
      });
      volume = ticks.map(function (x) {
        return x[5];
      });
      let response = {
        s: "ok",
        t: time,
        c: close,
        o: open,
        h: high,
        l: low,
        v: volume
      }
      return res.status(200).json(response);

    }, { limit: 500, startTime: fromIs, endTime: toIs });
  } catch (err) { console.log(err.message) }
})

module.exports = router;
