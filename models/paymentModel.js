const mongoose = require('mongoose');
const paymentModel = mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "user"
    },
    amount: Number,
    type: { type: String, enum: ["Sync", "Async"] },
    status: { type: String, enum: ["Created", "Confirmed", "Declined", "Cancelled"] },
    transactionId: { type: String, index: true }, //alphanumeric 16/32 chars
    mode: {
        type: String,
        enum: ["Netbanking", "UPI"]
    },
    adminId: {
        type: mongoose.Types.ObjectId,
        ref: "user"
    },
}, { timestamps: true });

module.exports = mongoose.model("payment", paymentModel);