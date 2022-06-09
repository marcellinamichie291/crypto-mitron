var express = require('express');
var router = express.Router();
require("dotenv").config();
const axios = require('axios');
const channelModel = require('../models/channelModel');
const { authenticateToken } = require('../middleware/auth');
const channelUsers = require('../models/channelUsers');
const { default: mongoose } = require('mongoose');
const cron = require('node-cron');
const { uploadJson } = require('../utils/aws-uploads')
//authenticateToken
router.post('/addChannel', authenticateToken, async (req, res, next) => {
    try {
        const { url } = req.body;
        const userId = req.user._id;

        if (url == undefined) {
            return res.status(200).json({
                isSuccess: true, data: null, message: "url is not defined"
            });

        }

        // let pattern = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.be)\/c\/.+$/;
        let pattern = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.be)\/+[a-zA-Z0-9+_.-]+\/.+$/;
        let result = pattern.test(url);

        if (!result) {
            return res.status(200).json({
                isSuccess: true, data: null, message: "url is not valid"
            });
        }

        let channelName = (url.split("/"))[url.split("/").length - 1];
        console.log(channelName)
        let checkExistChannel = await channelModel.aggregate([{
            $match: {
                channelName: channelName
            }
        }]);
        console.log(checkExistChannel.length)
        if (checkExistChannel.length == 0) {
            let getChannelDataIs = await getChannelData(channelName);
            // console.log(getChannelDataIs)
            if (getChannelDataIs.status == 0) {
                let channelId = "";
                console.log(getChannelDataIs.data.items.length);
                for (i = 0; i < getChannelDataIs.data.items.length; i++) {
                    // console.log(getChannelDataIs.data.items[i].snippet);
                    if (channelName == getChannelDataIs.data.items[i].snippet.customUrl) {
                        channelId = getChannelDataIs.data.items[i].id
                    }
                }

                if (channelId.length == 0) {
                    channelId = getChannelDataIs.data.items[0].id;
                }

                if (channelId.length == 0) {
                    return res.status(200).json({
                        isSuccess: true, data: null, message: "can not find channel data from youtube"
                    });
                }
                let addChannel = new channelModel({
                    channelName: channelName,
                    channelId: channelId,
                    youtubeData: getChannelDataIs.data.items,
                    isSuggest: true
                });
                await addChannel.save();

                let addUserChannel = new channelUsers({
                    userId: userId,
                    channelId: channelId
                });
                await addUserChannel.save();
                let getVideoInfo = await getVideos(channelId);
                console.log(getVideoInfo.data.items.length);
                if (getVideoInfo.data.items.length == 0) {
                    return res.status(200).json({
                        isSuccess: true, data: null, message: "no any live video found"
                    });
                }
                else {
                    return res.status(200).json({
                        isSuccess: true, data: getVideoInfo.data.items, message: "Video information found"
                    });
                }
            }
            else {
                return res.status(200).json({
                    isSuccess: true, data: null, message: "can not find channel data from youtube"
                });
            }
        }

        let checkUserChannel = await channelUsers.aggregate([
            {
                $match: {
                    $and: [
                        { channelId: checkExistChannel[0].channelId },
                        { userId: mongoose.Types.ObjectId(userId) }
                    ]
                }
            }
        ]);

        if (checkUserChannel.length == 0) {
            let addUserChannel = new channelUsers({
                userId: userId,
                channelId: checkExistChannel[0].channelId
            });
            await addUserChannel.save();
        }

        let getVideoInfo = await getVideos(checkExistChannel[0].channelId);
        console.log(getVideoInfo);
        if (getVideoInfo.data.items.length == 0) {
            return res.status(200).json({
                isSuccess: true, data: null, message: "no any live video found"
            });
        }
        else {
            return res.status(200).json({
                isSuccess: true, data: getVideoInfo.data.items, message: "Video information found"
            });
        }

    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})

router.post('/getVideoFromChannelId', authenticateToken, async (req, res, next) => {
    try {
        const { channelId } = req.body;
        const userId = req.user._id;


        let checkExistChannel = await channelModel.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId(channelId)
                }
            }
        ]);

        if (checkExistChannel.length == 0) {
            return res.status(200).json({
                isSuccess: true, data: null, message: "no any channel found"
            });
        }


        let getVideoInfo = await getVideos(checkExistChannel[0].channelId);
        // console.log(getVideoInfo);
        if (getVideoInfo.data.items.length == 0) {
            return res.status(200).json({
                isSuccess: true, data: null, message: "no any live video found"
            });
        }
        else {
            return res.status(200).json({
                isSuccess: true, data: getVideoInfo.data.items, message: "Video information found"
            });
        }

    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})

router.get('/getChannel', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user._id;
        // const { userId } = req.query;
        let getChannelData = await channelUsers.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "channels",
                    localField: "channelId",
                    foreignField: "channelId",
                    as: "channels"
                }
            },
            {
                $project: {
                    "channels.createdAt": 0,
                    "channels.updateAt": 0
                }
            }
        ]);


        return res.status(200).json({
            isSuccess: true, data: getChannelData, message: "channels information found"
        });


    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})

router.get('/getVideoInfo', async (req, res, next) => {
    try {
        // const userId = req.user._id;
        const { videoId } = req.query;

        if (videoId == undefined) {
            return res.status(200).json({
                isSuccess: true, data: null, message: "please pass video id"
            });

        }

        let getVideoInfo = await getFullVideoInfo(videoId);
        // console.log(getVideoInfo);
        if (getVideoInfo.data.items.length == 0) {
            return res.status(200).json({
                isSuccess: true, data: null, message: "no any live video found"
            });
        }
        else {
            return res.status(200).json({
                isSuccess: true, data: getVideoInfo.data.items, message: "Video information found"
            });
        }

    } catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})
router.get('/getVideoJsonUpdate', async (req, res, next) => {
    try {

        const getResponse = await getTradingLive();

        if (getResponse.status == 0 && getResponse.data.items.length > 0) {
            let allVideos = [];
            let allData = getResponse.data.items;
            for (i = 0; i < allData.length; i++) {
                let obj = {
                    "video_id": allData[i].id.videoId,
                    "channel_name": allData[i].snippet.channelTitle,
                    "video_title": allData[i].snippet.title,
                    "channel_title": allData[i].snippet.channelTitle,
                    "type": allData[i].snippet.liveBroadcastContent,
                    "thumbnails": allData[i].snippet.thumbnails
                };
                allVideos.push(obj);
            }
            let uploadDataIs = {
                "yt_videos": allVideos
            }
            var buf = Buffer.from(JSON.stringify(uploadDataIs));
            const responseIs = await uploadJson(buf, 'token-details/yt.json')
            console.log("api responsed and json update")
            // return res.status(200).json({ isSuccess: false, data: allVideos, message: "video found" })

        }
        else {
            console.log("no youtube api respond")
            // return res.status(200).json({ isSuccess: false, data: null, message: "having issue in youtube load data" })

        }


    } catch (error) {
        console.log(error.message);
        // return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})

async function getChannelData(channelName) {
    try {
        const url = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&forUsername=${channelName}&key=${process.env.YOUTUBE_KEY}`
        // console.log(url)
        const response = await axios.get(url)
        // console.log(response)
        if (response.status == 200) {
            return { status: 0, data: response.data };
        }
        else {
            return { status: 1 };;
        }
    }
    catch (err) {
        return { status: 2, data: err.message };
    }
}

async function getVideos(channelId) {
    try {
        const videosUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&maxResults=25&q=news&type=video&key=${process.env.YOUTUBE_KEY}`
        // console.log(url)
        const response = await axios.get(videosUrl)
        // console.log(response)
        if (response.status == 200) {
            return { status: 0, data: response.data };
        }
        else {
            return { status: 1 };;
        }
    }
    catch (err) {
        return { status: 2, data: err.message };
    }
}
async function getFullVideoInfo(videoId) {
    try {
        const videosUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics%2CliveStreamingDetails&id=${videoId}&key=${process.env.YOUTUBE_KEY}`
        // console.log(url)
        const response = await axios.get(videosUrl)
        // console.log(response)
        if (response.status == 200) {
            return { status: 0, data: response.data };
        }
        else {
            return { status: 1 };;
        }
    }
    catch (err) {
        return { status: 2, data: err.message };
    }
}
async function getTradingLive() {
    try {
        const videosUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&eventType=live&maxResults=25&q=trading%20live&type=video&key=${process.env.YOUTUBE_KEY}`
        // console.log(url)
        const response = await axios.get(videosUrl)
        // console.log(response)
        if (response.status == 200) {
            return { status: 0, data: response.data };
        }
        else {
            return { status: 1 };;
        }
    }
    catch (err) {
        return { status: 2, data: err.message };
    }
}

cron.schedule('*/5 * * * *', async () => {
    try {

        const getResponse = await getTradingLive();

        if (getResponse.status == 0 && getResponse.data.items.length > 0) {
            let allVideos = [];
            let allData = getResponse.data.items;
            for (i = 0; i < allData.length; i++) {
                let obj = {
                    "video_id": allData[i].id.videoId,
                    "channel_name": allData[i].snippet.channelTitle,
                    "video_title": allData[i].snippet.title,
                    "channel_title": allData[i].snippet.channelTitle,
                    "type": allData[i].snippet.liveBroadcastContent,
                    "thumbnails": allData[i].snippet.thumbnails
                };
                allVideos.push(obj);
            }
            let uploadDataIs = {
                "yt_videos": allVideos
            }
            var buf = Buffer.from(JSON.stringify(uploadDataIs));
            const responseIs = await uploadJson(buf, 'token-details/yt.json')
            console.log("api responsed and json update")
            // return res.status(200).json({ isSuccess: false, data: allVideos, message: "video found" })

        }
        else {
            console.log("no youtube api respond")
            // return res.status(200).json({ isSuccess: false, data: null, message: "having issue in youtube load data" })

        }


    } catch (error) {
        console.log(error.message);
        // return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
});
module.exports = router;