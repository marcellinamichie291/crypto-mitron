const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
const userSchema = mongoose.Schema({
    name: {
        type: String
    },
    mobileNo: {
        type: String
    },
    email: {
        type: String
    },
    //0-host
    //1-client
    role: {
        type: String,
        enum: ["host", "client", "user"],
        default: "user"
    },
    password: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model("users", userSchema);