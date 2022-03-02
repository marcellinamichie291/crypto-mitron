const Binance = require('node-binance-api');
const binance = new Binance().options({
    APIKEY: 'Ari3GacRdt3IJpM90Lj5vlHQXCNaCCEXLZWofvEA6WtEx74PJdK8SBBNTfvgnDoz',
    APISECRET: 'vAaK3KI1nf5DF1EJiiRbFDVqAgBeOV3vnzsaEqoL4FRkoxPExhrbVp8N8NGw4MRY'
});
module.exports = binance;