const mongoose = require('mongoose');
const bodySchema = mongoose.Schema({
    data: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model("bodyDataSchema", bodySchema);