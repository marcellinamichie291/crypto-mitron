require('dotenv').config()
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
const userSchema = require('../models/userModel');
const userRefToken = require('../models/userToken');
function generateRefreshToken() {
    return async function (req, res, next) {
        const authHeader = req.headers.authorization;
        const refreshToken = authHeader && authHeader.split(' ')[1]
        // console.log(refreshToken);
        if (refreshToken == null) return res.sendStatus(401)
        let checkRefreshToken = await userRefToken.aggregate([
            {
                $match: {
                    token: refreshToken
                }
            }
        ]);
        if (checkRefreshToken.length == 0) {
            return res.sendStatus(403)
        }
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, user) => {
            if (err) return res.sendStatus(403)
            const accessToken = await generateAccessTokenOnly({
                _id: user._id,
                timestamp: Date.now()
            })
            // console.log(accessToken)
            return res.status(200).json({ isSuccess: true, data: { token: accessToken }, message: "Here is your token" });
            next();
        })
    }
}
function checkRole(roles) {
    return async function (req, res, next) {
        const userId = req.user._id

        let checkUser = await userSchema.aggregate([
            {
                $match: {
                    $and: [
                        { _id: mongoose.Types.ObjectId(userId) },
                        { role: { $in: roles } }
                    ]
                }
            }
        ]);

        if (checkUser.length == 0) {
            return res.status(403).json({ isSuccess: true, data: null, message: "You does not have permission to access this feauture" });
        }

        next();
    }

}
function authenticateToken(req, res, next) {
    // console.log(req.headers)
    const authHeader = req.headers['authorization']
    // console.log(authHeader)
    const token = authHeader && authHeader.split(' ')[1] || req.signedCookies.access_token
    // console.log(token);
    if (token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ isSuccess: false, data: null, message: "JWT Token Expired" });
        // console.log(user);
        req.user = user
        next()
    })
}
async function generateAccessToken(user) {
    const generatedToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10d' })
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
    let tokenIs = new userRefToken({
        token: refreshToken
    });
    await tokenIs.save();
    return { generatedToken: generatedToken, refreshToken: refreshToken };
}
function generateAccessTokenOnly(user) {
    const generatedToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10d' })
    return generatedToken;
}
function generateAccessTokenOnly(user) {
    const generatedToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10d' })
    return generatedToken;
}
module.exports = {
    authenticateToken: authenticateToken,
    generateAccessToken: generateAccessToken,
    generateRefreshToken: generateRefreshToken,
    checkRole: checkRole
}
module.exports