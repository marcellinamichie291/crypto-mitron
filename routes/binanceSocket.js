const WebSocket = require('ws');

const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
ws.on('open', () => {
    console.log('Connected!')
})
ws.on('message', function (data) {
    console.log(data.toString());
});

module.exports = ws;