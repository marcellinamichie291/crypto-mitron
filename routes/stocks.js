var express = require('express');
var router = express.Router();
const userSchema = require('../models/userModel');
const userKyc = require('../models/userKyc');
const { generateAccessToken, generateRefreshToken, authenticateToken, generateAccessTokenHost } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');
const stockModel = require('../models/stockModel');

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});
//, address, city, state, country, age, adharNo 
router.post('/create', async (req, res, next) => {
    try {
        const { symbol, name } = req.body;

        let checkExist = await stockModel.aggregate([
            {
                $match: {
                    $and: [{ symbol: symbol, name: name }]
                }
            }
        ]);

        if (checkExist.length > 0) {
            return res.status(200).json({ isSuccess: true, data: null, messsage: "symbol already exist" });

        }

        let symbolIs = new stockModel({
            name: name,
            symbol: symbol
        })
        await symbolIs.save();
        return res.status(200).json({
            isSuccess: true, data: { id: symbolIs._id, name: symbolIs.name, symbol: symbolIs.symbol }, message: "user successfully signed up"
        });
    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})
router.get('/wallet', authenticateToken, async (req, res) => {
    try {

        return res.status(404).json({ isSuccess: false, data: null, messsage: "no any transaction found" });
    }
    catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})


module.exports = router;
