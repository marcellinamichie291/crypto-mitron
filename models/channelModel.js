const mongoose = require('mongoose');
const channelModel = mongoose.Schema({
    channelName: String,
    channelId: String,
    youtubeData: {
        type: mongoose.Schema.Types.Array
    },
    isSuggest: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("channel", channelModel);