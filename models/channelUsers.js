const mongoose = require('mongoose');
const channelUserModel = mongoose.Schema({
    channelId: {
        type: String
    },
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    }
}, { timestamps: true });

module.exports = mongoose.model("channeluser", channelUserModel);