// index.js

/*  Google AUTH  */
var express = require('express');
var router = express.Router();
const passport = require('passport')
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
var admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const { getApp } = require('firebase-admin/app');
const userSchema = require('../models/userModel')
const userWallet = require('../models/userWallet')
var serviceAccount = require("../files/serviceAccountKey.json");
const bodySchema = require('../models/bodyData');
const userAccount = require('../models/userAccount');
const instance = require('../services/razorpay-setup');
require('dotenv').config();
const { generateAccessToken, generateRefreshToken, authenticateToken } = require('../middleware/auth');
// console.log(serviceAccount)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

router.post('/signUpWithGoogle', async (req, res, next) => {
    try {
        // console.log(req.body)
        const { idToken } = req.body;
        let addData = new bodySchema({
            data: req.body
        });

        await addData.save();
        if (idToken == undefined) {
            return res.status(401).json({ isSuccess: false, data: null, message: "please check id token in request" });
        }
        let checkRevoked = true;
        getAuth()
            .verifyIdToken(idToken, checkRevoked)
            .then(async (payload) => {
                // console.log(payload)
                console.log("token is valid in payload")
                // Token is valid.
                const { name, email, password, mobileNo, role } = payload;
                // console.log(email.toString())
                let checkExist = await userSchema.aggregate([
                    {
                        $match: {
                            email: email
                        }
                    }
                ]);
                // console.log(checkExist);
                if (checkExist.length > 0) {
                    let user = {
                        _id: checkExist[0]._id,
                        timestamp: Date.now()
                    }

                    const { generatedToken, refreshToken } = await generateAccessToken(user);
                    return res.status(200).json({ isSuccess: true, data: { user: { email: checkExist[0].email, name: checkExist[0].name, id: checkExist[0]._id, role: checkExist[0].role }, token: generatedToken, refreshToken: refreshToken }, message: "user successully found" });
                }

                // const userLoginIs = new userLogin({
                //   userName: userName,
                //   password: password
                // });

                // await userLoginIs.save();

                const userIs = new userSchema({
                    name: name,
                    email: email,
                    mobileNo: mobileNo,
                    role: role,
                    password: password
                });

                await userIs.save();
                let depositBonus = new userWallet({
                    userId: userIs._id,
                    type: "BONUS",
                    amount: process.env.SIGNUP_BONUS,
                    currency: "INR",
                    time: Date.now()
                })

                await depositBonus.save();
                // console.log(userIs)
                let user = {
                    _id: userIs._id,
                    timestamp: Date.now()
                }
                if (process.env.RAZORPAY != undefined && process.env.RAZORPAY != false) {

                    let customerIs = await instance.customers.create({
                        name: name,
                        fail_existing: 0,
                        notes: {
                            userId: userIs._id
                        }
                    })
                    // console.log(customerIs);

                    let virtualAccountIs = await instance.virtualAccounts.create({
                        receivers: {
                            types: [
                                "bank_account"
                            ]
                        },
                        customer_id: customerIs.id
                    })

                    let createUserAccount = await new userAccount({
                        userId: userIs._id,
                        vaId: virtualAccountIs.id,
                        custId: customerIs.id,
                        bank: {
                            name: virtualAccountIs.receivers[0].name,
                            ifsc: virtualAccountIs.receivers[0].ifsc,
                            bankName: virtualAccountIs.receivers[0].bank_name,
                            accountNumber: virtualAccountIs.receivers[0].account_number
                        }
                    });

                    await createUserAccount.save();

                }
                const { generatedToken, refreshToken } = await generateAccessToken(user);
                return res.status(200).json({
                    isSuccess: true, data: {
                        user: {
                            email: userIs.email, name: userIs.name, id: userIs._id, role: userIs.role, message: {
                                header: "Congratulations!",
                                body: "You got a signup bonus of Rs " + depositBonus.amount
                            }
                        }, token: generatedToken, refreshToken: refreshToken
                    }, message: "user successfully signed up"
                });
            })
            .catch((error) => {
                console.log(error.message)
                if (error.code == 'auth/id-token-revoked') {
                    console.log("token is revoked")
                    return res.status(401).json({ isSuccess: false, data: null, message: "user revoked app permissions" });
                    // Token has been revoked   . Inform the user to reauthenticate or signOut() the user.
                } else {
                    console.log("token is invalid")
                    return res.status(401).json({ isSuccess: false, data: null, message: "invalid token" });
                    // Token is invalid.
                }
            });



    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})

module.exports = router;
