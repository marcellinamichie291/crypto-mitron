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
    roomName: String,
    guest: {
        type: Number,
        default: 0
    },
    //UPCOMING, ONGOING, FINISHED
    status: { type: Number, default: 0 }
});

module.exports = mongoose.model("rooms", roomSchema);