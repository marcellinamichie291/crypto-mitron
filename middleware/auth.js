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
                mobileNo: user.mobileNo,
                password: user.password,

            })
            // console.log(accessToken)
            res.json({ accessToken: accessToken });
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
            return res.status(403).json({ IsSuccess: true, Data: [], Messsage: "You does not have permission to access this feauture" });
        }

        next();
    }

}
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    // console.log(authHeader)
    const token = authHeader && authHeader.split(' ')[1] || req.signedCookies.access_token
    // console.log(token);
    if (token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        console.log(err)
        if (err) return res.status(403).json({ Message: "JWT Token Expired" });
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