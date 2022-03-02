var express = require('express');
var router = express.Router();
const axios = require('axios')
const roomSchema = require('../models/roomModel');
const getCurrentDateTime = require('../utils/timeFunctions');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');
let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3Nfa2V5IjoiNjIxZGIzZDQ2OTJiNmQwNTIzMGEwODcwIiwidHlwZSI6Im1hbmFnZW1lbnQiLCJ2ZXJzaW9uIjoyLCJpYXQiOjE2NDYyMTgzNjMsIm5iZiI6MTY0NjIxODM2MywiZXhwIjoxNjQ2MzA0NzYzLCJqdGkiOiI1ODJhMDUxMy03ZWQ3LTRlN2YtYThlNi1mMDk1NDc5ODg5ZmYifQ.34bIhJq0E04ajZ_WNu9ydH-e5k_GCDusIih2BQ3ZUIQ"
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
router.post('/100ms-events', async (req, res) => {
    try {
        const event = req.body;
        if (event.type == "peer.join.success") {
            const getRooms = await roomSchema.aggregate([
                {
                    $match: {
                        $and: [
                            // { userId: mongoose.Types.ObjectId(event.data.user_id) },
                            { _id: mongoose.Types.ObjectId(event.data.room_id) }
                        ]
                    }
                }
            ]);

            if (getRooms.length > 0) {
                let updateStatus = await roomSchema.findOneAndUpdate(event.data.room_id, { status: 1 }, { new: true });
                console.log(updateStatus);
            }
        }
        else if (event.type == "peer.leave.success") {
            const getRooms = await roomSchema.aggregate([
                {
                    $match: {
                        $and: [
                            // { userId: mongoose.Types.ObjectId(event.data.user_id) },
                            { _id: mongoose.Types.ObjectId(event.data.room_id) }
                        ]
                    }
                }
            ]);

            if (getRooms.length > 0) {
                let updateStatus = await roomSchema.findOneAndUpdate(event.data.room_id, { status: 2 }, { new: true });
                console.log(updateStatus);
            }
        }
        else if (event.type == "room.end.success") {
            const getRooms = await roomSchema.aggregate([
                {
                    $match: {
                        $and: [
                            // { userId: mongoose.Types.ObjectId(event.data.user_id) },
                            { _id: mongoose.Types.ObjectId(event.data.room_id) }
                        ]
                    }
                }
            ]);

            if (getRooms.length > 0) {
                let updateStatus = await roomSchema.findOneAndUpdate(event.data.room_id, { status: 2 }, { new: true });
                console.log(updateStatus);
            }
        }
        res.send("success")
    }
    catch (err) {
        return res.status(500).json({ IsSuccess: false, Data: [], Message: err.message || "Having issue is server" })
    }
})
router.post('/createRoom', authenticateToken, checkRole([0]), async (req, res) => {
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
            return res.status(200).json({ IsSuccess: true, Data: [roomIs], Messsage: "New Room Created Successfully" });
        }
        else {
            return res.status(400).json({ IsSuccess: true, Data: [], Messsage: "cannot create room right now try after some time" });
        }
        // await roomIs.save();
    }
    catch (err) {
        return res.status(500).json({ IsSuccess: false, Data: [], Message: err.message || "Having issue is server" })
    }
})
async function getRoomData(userId, roomId) {


    return JSON.stringify(getRooms);
}

// {
//     version: '2.0',
//         id: '4dadeca8-afb8-44a8-a529-9de23f57a9e3',
//             account_id: '621db3d4692b6d05230a086e',
//                 app_id: '621db3d4692b6d05230a086f',
//                     timestamp: '2022-03-02T10:42:43Z',
//                         type: 'peer.join.success',
//                             data: {
//         account_id: '621db3d4692b6d05230a086e',
//             app_id: '621db3d4692b6d05230a086f',
//                 joined_at: '2022-03-02T10:42:43.491696322Z',
//                     peer_id: '46d4a2e7-e251-4526-af6e-cd65a09725d8',
//                         role: 'host',
//                             room_id: '621f0933692b6d05230a0edd',
//                                 room_name: '22f6ad5a-8cf0-4d74-968b-a9e48724c567',
//                                     session_id: '621f4a237b5f07ce8fe5f2a4',
//                                         user_data: '',
//                                             user_id: '621db3d4692b6d05230a086d',
//                                                 user_name: 'jainik'

//     }
// }
async function createRoom100Ms(name, description) {
    const url = `https://prod-in2.100ms.live/api/v2/rooms`

    // const headers = {
    //     'Content-Type': 'application/json',
    //     'Authorization': 'JWT fefege...'
    // }
    const response = await axios.post(url, { description: description }, { headers: { Authorization: `Bearer ${token}` } })
    // console.log(response);
    if (response.status == 200) {
        return { status: 0, data: response.data };
    }
    else {
        return { status: 1 };;
    }
}
module.exports = router;