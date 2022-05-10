const userAccount = require('../models/userAccount');
const userWallet = require('../models/userWallet');
const bodyData = require('../models/bodyData');
const router = require('express').Router();
require('dotenv').config();

router.post('/razorpay-wb', async (req, res) => {
    try {
        const event = req.body;
        // let saveBody = await new bodyData({
        //     data: event,
        //     header: req.headers
        // });
        // await saveBody.save();
        const secret = process.env.RAZORPAY_WEBHOOK;

        const crypto = require('crypto');

        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest('hex');

        if (digest == req.headers['x-razorpay-signature']) {
            console.log("valid");
            // console.log(req.body);
            // console.log(event.payload.payment.entity.id);
            // console.log(event.payload.payment.entity.amount);
            // console.log(event.payload.payment.entity.customer_id);
            // console.log(event.payload.payment.entity)
            // console.log(event.payload.virtual_account.entity);
            // console.log(event.payload.bank_transfer.entity);

            let checkExist = await userAccount.aggregate([
                {
                    $match: {
                        custId: event.payload.payment.entity.customer_id
                    }
                }
            ]);
            if (checkExist.length > 0) {
                let storeDeposit = new userWallet({
                    userId: checkExist[0].userId,
                    type: "DEPOSIT",
                    amount: (event.payload.payment.entity.amount / 100),
                    currency: "INR",
                    orderId: event.payload.payment.entity.id,
                    time: Date.now()
                })
                await storeDeposit.save();
            }

        }
        else {
            console.log("invalid");
            // console.log(event);
        }

        // console.log(event)

        res.send("success");
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, message: err.message || "Having issue is server" })
    }
})
module.exports = router;