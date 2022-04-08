var express = require('express');
var router = express.Router();
const Binance = require('node-binance-api');
const binance = new Binance().options({
  APIKEY: process.env.BINANCE_APIKEY,
  APISECRET: process.env.BINANCE_APISECRET
});

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/history', async (req, res) => {
  try {
    const { symbol, to } = req.query;
    const binance = new Binance().options();
    binance.candlesticks(symbol, "1d", (error, ticks, symbol) => {
      if (error || (ticks == undefined || ticks.length == 0)) {
        return res.status(200).json({
          s: "no_data",
          nextTime: 1386493512
        });
      }
      var t1 = new Date().getTime();
      console.info("candlesticks()", ticks);
      let last_tick = ticks[ticks.length - 1];
      // let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
      var t2 = new Date().getTime();
      // console.info(symbol + " last close: " + close);
      var t = t2 - t1;
      console.info(t1 + "...." + t2 + "....." +
        t)
      time = ticks.map(function (x) {
        return x[0];
      });
      close = ticks.map(function (x) {
        return x[4];
      });
      open = ticks.map(function (x) {
        return x[1];
      });
      high = ticks.map(function (x) {
        return x[2];
      });
      low = ticks.map(function (x) {
        return x[3];
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

    }, { limit: 500, endTime: to });
  } catch (err) { console.log(err.message) }
})

module.exports = router;
