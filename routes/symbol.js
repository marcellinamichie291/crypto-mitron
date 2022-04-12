var express = require('express');
var router = express.Router();
const symbolSchema = require('../models/symbolModel');

/* GET home page. */
router.get('/get', async function (req, res, next) {
    try {
        const { symbol } = req.query;

        if (symbol == undefined) {
            let getAllSymbol = await symbolSchema.aggregate([
                {
                    $match: {

                    }
                }
            ]);
            if (getAllSymbol.length > 0) {
                return res.status(200).json({ isSuccess: true, data: getAllSymbol, message: "Symbol Found" })
            }
            return res.status(200).json({ isSuccess: true, data: getAllSymbol, message: "no any symbol found" })

        }

        let getAllSymbol = await symbolSchema.aggregate([
            {
                $match: {
                    token: symbol
                }
            }
        ]);
        if (getAllSymbol.length > 0) {
            return res.status(200).json({ isSuccess: true, data: getAllSymbol, message: "Symbol Found" })
        }
        return res.status(200).json({ isSuccess: true, data: getAllSymbol, message: "no any symbol found" })

    }
    catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
});

const getSymbol = async (name) => {
    let getAllSymbol = await symbolSchema.aggregate([
        {
            $match: {
                token: symbol
            }
        }
    ]);

    return getAllSymbol;
}

router.get('/config', (req, res) => {
    return res.status(200).json({
        supported_resolutions: ['1', '5', '15', '30', '60', '1D', '1W', '1M'],
        supports_group_request: false,
        supports_marks: false,
        supports_search: true,
        supports_timescale_marks: false,
    })
})
router.post('/add', async (req, res, next) => {
    try {
        const { name, fullForm, description } = req.body;

        let checkExist = await symbolSchema.aggregate([
            {
                $match: {
                    name: name
                }
            }
        ])

        if (checkExist.length > 0) {
            return res.status(200).json({ isSuccess: true, data: { token: checkExist[0].token }, message: "Symbol Details Already Exist" })
        }
        let symbolIs = new symbolSchema({
            token: name,
            label: fullForm,
            description: description
        });

        await symbolIs.save();

        return res.status(200).json({ isSuccess: true, data: { token: symbolIs.token }, message: "Symbol Details Added" })
    }
    catch (error) {
        return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
    }
})
module.exports = router;
