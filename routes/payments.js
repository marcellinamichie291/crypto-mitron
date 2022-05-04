var express = require('express');
var router = express.Router();
require("dotenv").config();
const crypto = require('crypto');
const constants = require('../utils/constants');
const paymentModel = require('../models/paymentModel');
const { authenticateToken, checkRole } = require('../middleware/auth');
const userWallet = require('../models/userWallet');
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
router.post('/createPayment', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const transactionId = crypto.randomBytes(16).toString('hex');
        let url = `upi://pay?pa=shivank@upi&pn=Shivank&mc=6012&tr=456&tn=${transactionId}&am=${amount}&cu=INR&refUrl=refUrl`
        // console.log(transactionId)
        let createTransaction = new paymentModel({
            userId: req.user._id,
            amount: amount,
            type: constants.PAYMENT_VERIFY,
            status: "Created",
            transactionId: transactionId,
            mode: constants.MODE,
        });

        await createTransaction.save();

        return res.status(200).json({ isSuccess: true, data: { userId: createTransaction.userId, amount: createTransaction.amount, upiLink: url, type: createTransaction.type, timer: constants.TIMER_PAYMENT }, messsage: "Please make payment" });
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, messsage: err.message || "Having issue is server" })
    }
})
router.post('/confirmPayment', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { transactionId, status } = req.body;

        if (!(["Confirmed", "Declined"].includes(status))) {
            return res.status(400).json({ isSuccess: true, data: null, messsage: "Please pass valid transaction status" });
        }

        let getTransaction = await paymentModel.aggregate([
            {
                $match: {
                    $and: [
                        { transactionId: transactionId },
                        { status: "Created" }
                    ]
                }
            }
        ]);

        if (getTransaction.length > 0) {
            let update = await paymentModel.findByIdAndUpdate(getTransaction[0]._id, { status: status, adminId: req.user._id }, { new: true });
            if (status == "Confirmed") {
                message = "The Payment is Confirmed";
                let storeDeposit = new userWallet({
                    userId: getTransaction[0].userId,
                    type: "DEPOSIT",
                    amount: getTransaction[0].amount,
                    currency: "INR",
                    orderId: transactionId,
                    transactionId: getTransaction[0]._id,
                    time: Date.now()
                })
                await storeDeposit.save();
            }
            else {
                message = "The Payment is Declined"
            }
            console.log(message)
            return res.status(200).json({ isSuccess: true, data: { transactionId: update.transactionId, status: update.status }, messsage: message });

        }
        return res.status(200).json({ isSuccess: true, data: null, messsage: "no any transaction found" });
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, messsage: err.message || "Having issue is server" })
    }
})
router.post('/cancelPayment', authenticateToken, async (req, res) => {
    try {
        const { transactionId } = req.body;
        let getTransaction = await paymentModel.aggregate([
            {
                $match: {
                    $and: [
                        { transactionId: transactionId },
                        { status: "Created" }
                    ]
                }
            }
        ]);

        if (getTransaction.length > 0) {
            if (req.user._id != getTransaction[0].userId) {
                return res.status(401).json({ isSuccess: true, data: null, messsage: "You does not have permission to cancel payment" });
            }
            let update = await paymentModel.findByIdAndUpdate(getTransaction[0]._id, { status: "Cancelled" }, { new: true });
            return res.status(200).json({ isSuccess: true, data: { transactionId: update.transactionId, status: update.status }, messsage: "The payment is cancelled" });

        }
        return res.status(200).json({ isSuccess: true, data: null, messsage: "no any transaction found" });
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, messsage: err.message || "Having issue is server" })
    }
})
router.get('/checkPaymentStatus', authenticateToken, async (req, res) => {
    try {
        const { transactionId } = req.query;
        let getTransaction = await paymentModel.aggregate([
            {
                $match: {
                    transactionId: transactionId
                }
            }
        ]);

        if (getTransaction.length > 0) {
            if (req.user._id != getTransaction[0].userId) {
                return res.status(401).json({ isSuccess: true, data: null, messsage: "You does not have permission to cancel payment" });
            }
            return res.status(200).json({ isSuccess: true, data: { transactionId: getTransaction[0].transactionId, status: getTransaction[0].status }, messsage: `The payment is ${getTransaction[0].status}` });

        }
        return res.status(200).json({ isSuccess: true, data: null, messsage: "no any transaction found" });
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, messsage: err.message || "Having issue is server" })
    }
})
module.exports = router;
