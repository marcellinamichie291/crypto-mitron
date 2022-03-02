const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
const roomSchema = mongoose.Schema({
    name: String,
    description: String,
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "user"
    },
    createdTime: [
        String
    ],
    roomId:
        String
});

module.exports = mongoose.model("rooms", roomSchema);