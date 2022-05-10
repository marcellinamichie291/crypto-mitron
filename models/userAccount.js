const mongoose = require('mongoose');
const userAccount = mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    custId: String,
    vaId: String,
    bank: {
        ifsc: String,
        bankName: String,
        name: String,
        accountNumber: String
    },
    vpa: String
}, { timestamps: true });

module.exports = mongoose.model("useraccount", userAccount);