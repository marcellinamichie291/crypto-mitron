const mongoose = require('mongoose');
const userRefToken = mongoose.Schema({
    token: {
        type: String,
        default: ""
    }
});

module.exports = mongoose.model("userRefreshToken", userRefToken);