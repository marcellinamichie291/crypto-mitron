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
    password: {
        type: String
    },
    //0-host
    //1-client
    role: {
        type: Number
    }
});

module.exports = mongoose.model("users", userSchema);