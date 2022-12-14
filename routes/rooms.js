var express = require('express');
var router = express.Router();
const axios = require('axios')
const roomSchema = require('../models/roomModel');
const getCurrentDateTime = require('../utils/timeFunctions');
const { authenticateToken, authenticateTokenHost, checkRole } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');
var jwt = require('jsonwebtoken');
var uuid4 = require('uuid4');
const cron = require('node-cron');
const pusher = require('../services/pusher');
MARKET_CAP_SYMBOLS = "btc,ae";

require('dotenv').config
const client = require('../services/redis-service');
const app_access_key = process.env.APP_100_ACCESS_KEY;
const app_secret = process.env.APP_100_SECRET
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
jwt.sign(
    {
        access_key: app_access_key,
        type: 'management',
        version: 2,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000)
    },
    app_secret,
    {
        algorithm: 'HS256',
        expiresIn: '24h',
        jwtid: uuid4()
    },
    function (err, token) {
        client.set('100ms-token', token, function (err, reply) {
            console.log(err.message)
            // console.log(reply);
        });
    }
);

console.log("token updated")

// console.log(process.env.APP_100MS_WEBHOOK)
router.post('/100ms-events', async (req, res) => {
    try {
        const event = req.body;
        // console.log(event)

        if (req.headers['authorization'] == process.env.APP_100MS_WEBHOOK) {
            console.log("valid payload");
            if (event.type == "peer.join.success") {
                // console.log(event.data.room_id)
                const getRooms = await roomSchema.aggregate([
                    {
                        $match: {
                            $and: [
                                { userId: mongoose.Types.ObjectId(event.data.user_id) },
                                { _id: mongoose.Types.ObjectId(event.data.room_id) }
                            ]
                        }
                    }
                ]);
                // console.log(getRooms.length);
                if (getRooms.length > 0) {
                    let updateStatus = await roomSchema.findByIdAndUpdate(getRooms[0]._id, { status: "ONGOING" }, { new: true });
                    // console.log(updateStatus);
                }
            }
            else if (event.type == "peer.leave.success") {
                const getRooms = await roomSchema.aggregate([
                    {
                        $match: {
                            $and: [
                                { userId: mongoose.Types.ObjectId(event.data.user_id) },
                                { _id: mongoose.Types.ObjectId(event.data.room_id) }
                            ]
                        }
                    }
                ]);
                // console.log(getRooms.length);
                if (getRooms.length > 0) {
                    let updateStatus = await roomSchema.findByIdAndUpdate(getRooms[0]._id, { status: "FINISHED" }, { new: true });
                    // console.log(updateStatus);
                }
            }
            else if (event.type == "room.end.success") {
                const getRooms = await roomSchema.aggregate([
                    {
                        $match: {
                            $and: [
                                { userId: mongoose.Types.ObjectId(event.data.user_id) },
                                { _id: mongoose.Types.ObjectId(event.data.room_id) }
                            ]
                        }
                    }
                ]);
                // console.log(getRooms.length);
                if (getRooms.length > 0) {
                    let updateStatus = await roomSchema.findByIdAndUpdate(getRooms[0]._id, { status: "FINISHED" }, { new: true });
                    // console.log(updateStatus);
                }
            }
        }
        else {
            console.log("invalid payload");
        }
        res.send("success")
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, message: err.message || "Having issue is server" })
    }
})
router.post('/trigger-event', async (req, res) => {
    try {
        const marketCapResponse = await getCoinMarketCapData();
        t1 = Date.now();
        if (marketCapResponse.status == 0) {
            allSymbol = [];
            for (const symbol in marketCapResponse.data.data) {
                allPrice = [];
                for (const price in marketCapResponse.data.data[symbol].quote) {
                    let priceIs = {
                        currency: price,
                        price: marketCapResponse.data.data[symbol].quote[price].price,
                        percentage: marketCapResponse.data.data[symbol].quote[price].percent_change_24h
                    }
                    allPrice.push(priceIs)
                }
                let symbolIs = {
                    token: marketCapResponse.data.data[symbol].symbol,
                    tokenName: marketCapResponse.data.data[symbol].name,
                    price: allPrice
                }

                allSymbol.push(symbolIs)
            }

            const response = await pusher.trigger("market_data", "price_data", {
                symbol: allSymbol,
            }).then(resp => {
                // console.log(resp);
            }).catch(err => {
                console.log(err);
                console.log(err.message)
            });
            t2 = Date.now();
            console.log(t2 - t1);
            res.status(200).json({ isSuccess: true, data: allSymbol, message: "Data found" })
        }
        else {
            res.status(200).json({ isSuccess: false, data: null, message: "Data Not Found" })
        }
    }
    catch (err) {
        console.log(err.message);
    }
})
router.post('/createRoom', authenticateToken, checkRole(["host"]), async (req, res) => {
    try {
        const { name, description } = req.body;
        const response = await createRoom100Ms(name, description);
        if (response.status == 0) {
            console.log(response.data)
            let roomIs = new roomSchema({
                _id: response.data.id,
                name: name,
                description: description,
                roomName: response.data.name,
                userId: req.user._id,
                createdTime: getCurrentDateTime()
            });

            await roomIs.save();
            return res.status(200).json({ isSuccess: true, data: { userId: req.user._id, roomDetails: roomIs }, message: "New Room Created Successfully" });
        }
        else {
            return res.status(400).json({ isSuccess: false, data: null, message: "cannot create room right now try after some time" });
        }
        // await roomIs.save();
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, message: err.message || "Having issue is server" })
    }
})
router.post('/createRoomHost', authenticateTokenHost, checkRole(["host"]), async (req, res) => {
    try {
        const { name, description } = req.body;
        const response = await createRoom100Ms(name, description);
        if (response.status == 0) {
            console.log(response.data)
            let roomIs = new roomSchema({
                _id: response.data.id,
                name: name,
                description: description,
                roomName: response.data.name,
                userId: req.user._id,
                createdTime: getCurrentDateTime()
            });

            await roomIs.save();
            return res.status(200).json({ isSuccess: true, data: { userId: req.user._id, roomDetails: roomIs }, message: "New Room Created Successfully" });
        }
        else {
            return res.status(400).json({ isSuccess: false, data: null, message: "cannot create room right now try after some time" });
        }
        // await roomIs.save();
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, message: err.message || "Having issue is server" })
    }
})
router.post('/getMyRooms', authenticateToken, checkRole(["host"]), async (req, res) => {
    try {

        let getRooms = await roomSchema.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(req.user._id)
                }
            }
        ]);

        if (getRooms.length == 0) {
            return res.status(200).json({ isSuccess: true, data: [], messsage: "no any room found" });
        }

        return res.status(200).json({ isSuccess: true, data: { userId: req.user._id, roomDetails: getRooms }, messsage: "All Previous Rooms Found" });
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, messsage: err.message || "Having issue is server" })
    }
})
router.get('/getAllRooms', async (req, res) => {
    try {

        let getRooms = await roomSchema.aggregate([
            {
                $match: {
                    status: "ONGOING"
                }
            }
        ]);

        if (getRooms.length == 0) {
            return res.status(200).json({ isSuccess: true, data: [], messsage: "no any room found" });
        }

        return res.status(200).json({ isSuccess: true, data: getRooms, messsage: "All Previos Rooms Found" });
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, messsage: err.message || "Having issue is server" })
    }
})

async function createRoom100Ms(name, description) {
    try {
        const url = `https://prod-in2.100ms.live/api/v2/rooms`
        let token = await client.get('100ms-token');
        console.log(token)
        // let token = process.env.APP_100_TOKEN
        // console.log(token)
        const response = await axios.post(url, { description: name }, { headers: { Authorization: `Bearer ${token}` } })


        if (response.status == 200) {
            return { status: 0, data: response.data };
        }
        else {
            return { status: 1 };;
        }

    }
    catch (error) {
        console.log(error.message)
    }
}
async function getCoinMarketCapData() {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${MARKET_CAP_SYMBOLS}`
    // console.log(url)
    const response = await axios.get(url, { headers: { "X-CMC_PRO_API_KEY": process.env.MARKET_CAP_KEY } })
    // console.log(response)
    if (response.status == 200) {
        return { status: 0, data: response.data };
    }
    else {
        return { status: 1 };;
    }
}
cron.schedule('0 */12 * * *', async () => {
    try {
        jwt.sign(
            {
                access_key: app_access_key,
                type: 'management',
                version: 2,
                iat: Math.floor(Date.now() / 1000),
                nbf: Math.floor(Date.now() / 1000)
            },
            app_secret,
            {
                algorithm: 'HS256',
                expiresIn: '24h',
                jwtid: uuid4()
            },
            function (err, token) {
                client.set('100ms-token', token, function (err, reply) {
                    console.log(err.message)
                    // console.log(reply);
                });
            }
        );

        console.log("token updated")
    } catch (error) {
        console.log(error.message ||
            "Having issue")
    }
});
module.exports = router;