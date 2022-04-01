var express = require('express');
var router = express.Router();
const axios = require('axios')
const roomSchema = require('../models/roomModel');
const getCurrentDateTime = require('../utils/timeFunctions');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');
const pusher = require('../services/pusher');
MARKET_CAP_SYMBOLS = "btc,ae";
let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3Nfa2V5IjoiNjIxZGIzZDQ2OTJiNmQwNTIzMGEwODcwIiwidHlwZSI6Im1hbmFnZW1lbnQiLCJ2ZXJzaW9uIjoyLCJpYXQiOjE2NDY2MjkxMTEsIm5iZiI6MTY0NjYyOTExMSwiZXhwIjoxNjQ5MjIxMTExLCJqdGkiOiJjNjhkMzg5NC01NjA3LTQ5MzEtYjVhNi03ZDUyMzY4ZDJmYmEifQ.eY2Zrv6N74GF55zkAgvmqjPgtuM40UAmq8ZmaB2T4DQ"
require('dotenv').config

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});


router.post('/100ms-events', async (req, res) => {
    try {
        const event = req.body;
        console.log(event)
        if (event.type == "peer.join.success") {
            console.log(event.data.room_id)
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
            return res.status(404).json({ isSuccess: false, data: null, messsage: "no any room found" });
        }

        return res.status(200).json({ isSuccess: true, data: { userId: req.user._id, roomDetails: getRooms }, messsage: "All Previos Rooms Found" });
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
            return res.status(404).json({ isSuccess: false, data: null, messsage: "no any room found" });
        }

        return res.status(200).json({ isSuccess: true, data: getRooms, messsage: "All Previos Rooms Found" });
    }
    catch (err) {
        return res.status(500).json({ isSuccess: false, data: null, messsage: err.message || "Having issue is server" })
    }
})

async function createRoom100Ms(name, description) {
    const url = `https://prod-in2.100ms.live/api/v2/rooms`

    const response = await axios.post(url, { description: description }, { headers: { Authorization: `Bearer ${token}` } })


    if (response.status == 200) {
        return { status: 0, data: response.data };
    }
    else {
        return { status: 1 };;
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
module.exports = router;