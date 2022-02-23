const mongoose = require('mongoose');
const registrationTypes = mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    debitCurrency: String,
    debitAmount: Number,
    creditCurrency: String,
    creditAmount: Number,
    transactionDate: String,
    //0-pending
    //1-executed
    status: Number
});

module.exports = mongoose.model("transactions", registrationTypes);