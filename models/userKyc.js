const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
const userKyc = mongoose.Schema({
    address: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    country: {
        type: String
    },
    age: {
        type: Number
    },
    adharNo: {
        type: String
    },
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    }
}, { timestamps: true });
// userName: {
//     type: String
// },
// password: {
//     type: String
// }
// userLogin.pre('save', async function (next) {
//     try {
//         const salt = await bcrypt.genSalt(10);
//         const hashedpassword = await bcrypt.hash(this.password, salt);
//         this.password = hashedpassword;
//         next();
//         //console.log("before called");
//     }
//     catch (error) {
//         next(error)
//     }
// });

module.exports = mongoose.model("userkyc", userKyc);