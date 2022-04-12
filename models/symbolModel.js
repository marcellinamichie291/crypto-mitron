const mongoose = require('mongoose');
const symbolSchema = mongoose.Schema({
    token: String,
    label: String,
    description: String
}, { timestamps: true });

module.exports = mongoose.model("symbol", symbolSchema);