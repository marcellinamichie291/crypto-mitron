var express = require('express');
var router = express.Router();
const axios = require('axios')
const roomSchema = require('../models/roomModel');
const getCurrentDateTime = require('../utils/timeFunctions');
const { authenticateToken, checkRole } = require('../middleware/auth');
let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3Nfa2V5IjoiNjIxZGIzZDQ2OTJiNmQwNTIzMGEwODcwIiwidHlwZSI6Im1hbmFnZW1lbnQiLCJ2ZXJzaW9uIjoyLCJpYXQiOjE2NDYxMTQ4NDcsIm5iZiI6MTY0NjExNDg0NywiZXhwIjoxNjQ2MjAxMjQ3LCJqdGkiOiJjMjU2ZjUwOS0yMDNlLTQ0ZTktYmI3Zi01MGZkYjI5NTExMDcifQ.0FnaPcG2AG_kNfUWRhqIQkdIUhlB7fi5fWMCY1atTrM"
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
router.post('/100ms-events', async (req, res) => {
    try {
        console.log(req.body);
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
                name: name,
                description: description,
                roomId: response.data.name,
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

async function createRoom100Ms(name, description) {
    const url = `https://prod-in2.100ms.live/api/v2/rooms`

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'JWT fefege...'
    }
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