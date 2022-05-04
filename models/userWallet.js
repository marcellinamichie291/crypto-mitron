const mongoose = require('mongoose');
const userRefToken = mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    type: {
        type: String,
        enum: ["WITHDRAW", "DEPOSIT", "BONUS"]
    },
    amount: Number,
    currency: String,
    orderId: String,
    transactionId: { type: mongoose.Types.ObjectId, ref: "payment" },
    time: String
}, { timestamps: true });

module.exports = mongoose.model("userWallet", userRefToken);