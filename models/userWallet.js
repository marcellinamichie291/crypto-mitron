const mongoose = require('mongoose');
const userRefToken = mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    type: {
        type: String,
        enum: ["WITHDRAW", "DEPOSIT"]
    },
    amount: Number,
    currency: String,
    orderId: String,
    time: String
}, { timestamps: true });

module.exports = mongoose.model("userWallet", userRefToken);