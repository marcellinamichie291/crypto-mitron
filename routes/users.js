var express = require('express');
var router = express.Router();
const userSchema = require('../models/userModel');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');
/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

router.post('/signUp', async (req, res, next) => {
  try {
    const { name, email, password, mobileNo, role } = req.body;

    let checkExist = await userSchema.aggregate([
      {
        $match: {
          mobileNo: mobileNo
        }
      }
    ]);

    if (checkExist.length > 0) {
      return res.status(409).json({ IsSuccess: true, Data: [], Messsage: "user already exist" });
    }
    const userIs = new userSchema({
      name: name,
      email: email,
      mobileNo: mobileNo,
      password: password,
      role: role
    });

    await userIs.save();

    return res.status(200).json({ IsSuccess: true, Data: [userIs], Messsage: "user successfully signed up" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.post('/updateUser', async (req, res, next) => {
  try {
    const { name, email, password, mobileNo, userId } = req.body;

    let checkExist = await userSchema.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(userId)
        }
      }
    ]);

    if (checkExist.length == 0) {
      return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "user not found" });
    }
    const userIs = {
      name: name != undefined && name != "" ? name : checkExist[0].name,
      email: email != undefined && email != "" ? email : checkExist[0].email,
      mobileNo: mobileNo != undefined && mobileNo != "" ? mobileNo : checkExist[0].mobileNo,
      password: password != undefined && password != "" ? password : checkExist[0].password
    };

    let updateUser = await userSchema.findByIdAndUpdate(userId, userIs, { new: true });
    return res.status(200).json({ IsSuccess: true, Data: [updateUser], Messsage: "user details updated successfully" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.post('/login', async (req, res, next) => {
  try {
    const { password, mobileNo } = req.body;

    let checkExist = await userSchema.aggregate([
      {
        $match: {
          mobileNo: mobileNo
        }
      }
    ]);

    if (checkExist.length > 0) {
      if (checkExist[0].password != password) {
        return res.status(401).json({ IsSuccess: true, Data: [], Messsage: "Incorrect Password" });
      }
      let user = {
        _id: checkExist[0]._id,
        mobileNo: mobileNo,
        password: password
      }

      const { generatedToken, refreshToken } = await generateAccessToken(user);
      console.log(generatedToken + refreshToken);
      return res.status(200).json({ IsSuccess: true, Data: checkExist, role: checkExist[0].role, token: generatedToken, refreshToken: refreshToken, Messsage: "user found" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "user not found" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.post('/refresh-token', generateRefreshToken(), async (req, res, next) => {
  console.log("api called");
})
module.exports = router;
