const mongoose = require('mongoose');
const stockSchema = mongoose.Schema({
    symbol: String,
    name: String
}, { timestamps: true });

module.exports = mongoose.model("stock", stockSchema);