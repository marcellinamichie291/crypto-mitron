const mongoose = require('mongoose');
const userRefToken = mongoose.Schema({
    token: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("userRefreshToken", userRefToken);