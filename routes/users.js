var express = require('express');
var router = express.Router();
const userSchema = require('../models/userModel');
const userKyc = require('../models/userKyc');
const { generateAccessToken, generateRefreshToken, authenticateToken } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');
const userWallet = require('../models/userWallet');
const CLIENT_ID = "525460832991-afsdffsq6liot36lmlfpuk6ir9fldtdn.apps.googleusercontent.com"
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);
const bodySchema = require('../models/bodyData');



/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});
//, address, city, state, country, age, adharNo 
router.post('/signUp', async (req, res, next) => {
  try {
    const { name, email, password, mobileNo, role } = req.body;

    let checkExist = await userSchema.aggregate([
      {
        $match: {
          $or: [
            { mobileNo: mobileNo },
            { email: email }
          ]
        }
      }
    ]);

    if (checkExist.length > 0) {
      return res.status(409).json({ IsSuccess: true, Data: [], Messsage: "user already exist" });
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

    let user = {
      name: name,
      mobileNo: mobileNo
    }

    return res.status(200).json({ IsSuccess: true, Data: [user], Messsage: "user successfully signed up" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.post('/signUpWithGoogle', async (req, res, next) => {
  try {
    const { name, email, password, mobileNo, role } = req.body;

    let checkExist = await userSchema.aggregate([
      {
        $match: {
          $or: [
            { mobileNo: mobileNo },
            { email: email }
          ]
        }
      }
    ]);

    if (checkExist.length > 0) {
      let user = {
        _id: checkExist[0]._id,
        timestamp: Date.now()
      }

      const { generatedToken, refreshToken } = await generateAccessToken(user);
      return res.status(200).json({ IsSuccess: true, Data: [user], token: generatedToken, refreshToken: refreshToken, Messsage: "user successully found" });
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

    let user = {
      _id: userIs._id,
      timestamp: Date.now()
    }
    const { generatedToken, refreshToken } = await generateAccessToken(user);
    return res.status(200).json({ IsSuccess: true, Data: [user], token: generatedToken, refreshToken: refreshToken, Messsage: "user successfully signed up" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.post('/storeData', async (req, res) => {
  const data = req.body;

  let addData = new bodySchema({
    data: data
  });
  await addData.save();
  return res.status(200).json({ status: 0 })
})
// address: address,
//   city: city,
//     state: state,
//       country: country,
//         age: age,
//           adharNo: adharNo,
// router.post('/mitron/signUp', authenticateToken, async (req, res, next) => {
//   try {
//     const { name, email, mobileNo, role, address, city, state, country, age, adharNo } = req.body;

//     const partnerId = req.user._id

//     let checkExist = await userSchema.aggregate([
//       {
//         $match: {
//           mobileNo: mobileNo
//         }
//       }
//     ]);

//     if (checkExist.length > 0) {
//       return res.status(409).json({ IsSuccess: true, Data: [], Messsage: "user already exist" });
//     }

//     const userIs = new userSchema({
//       name: name,
//       email: email,
//       mobileNo: mobileNo,
//       role: role,
//       address: address,
//       city: city,
//       state: state,
//       country: country,
//       age: age,
//       adharNo: adharNo,
//       partner: "Mitron",
//       partnerId: partnerId
//     });

//     await userIs.save();

//     return res.status(200).json({ IsSuccess: true, Data: [userIs], Messsage: "user successfully signed up" });
//   } catch (error) {
//     return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
//   }
// })
router.post('/addKyc', authenticateToken, async (req, res, next) => {
  try {
    const { address, city, state, country, age, adharNo } = req.body;

    const userId = req.user._id;

    let checkExist = await userSchema.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(userId)
        }
      }
    ]);
    if (checkExist.length > 0) {
      let checkKyc = await userKyc.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(userId)
          }
        }
      ])
      if (checkKyc.length > 0) {
        return res.status(409).json({ IsSuccess: true, Data: [], Messsage: "kyc detail already submitted" });
      }
      let kyc = new userKyc({
        address: address,
        city: city,
        state: state,
        country: country,
        age: age,
        adharNo: adharNo,
        userId: userId
      });

      await kyc.save();
      let user = {
        name: checkExist[0].name,
        mobileNo: checkExist[0].mobileNo
      }
      // let user = {
      //   _id: checkExist[0]._id,
      //   timestamp: Date.now()
      // }
      // const { generatedToken, refreshToken } = await generateAccessToken(user);
      // console.log(generatedToken + refreshToken);
      return res.status(200).json({ IsSuccess: true, Data: user, role: checkExist[0].role, Messsage: "kyc detail added" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "user not found" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.post('/signInWithGoogle', async (req, res, next) => {
  try {
    const { token } = req.body;

    verify(token).catch(console.error);
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
        timestamp: Date.now()
      }

      const { generatedToken, refreshToken } = await generateAccessToken(user);
      // console.log(generatedToken + refreshToken);
      return res.status(200).json({ IsSuccess: true, Data: checkExist, role: checkExist[0].role, token: generatedToken, refreshToken: refreshToken, Messsage: "user found" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "user not found" });
  } catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.post('/updateWallet', authenticateToken, async (req, res) => {
  try {
    const {
      type,
      amount,
      currency,
      orderId
    } = req.body;
    const userId = req.user._id
    let storeDeposit = new userWallet({
      userId: userId,
      type: type,
      amount: amount,
      currency: currency,
      orderId: orderId,
      time: Date.now()
    })

    await storeDeposit.save();
    let deposit = {
      userId: userId,
      type: type,
      amount: amount,
      currency: currency,
      orderId: orderId,
      time: storeDeposit.time,
      createdAt: storeDeposit.createdAt,
      updatedAt: storeDeposit.updatedAt,
      id: storeDeposit._id
    }
    return res.status(200).json({ IsSuccess: true, Data: [deposit], Messsage: "your trasaction stored" });
  }
  catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.get('/wallet', authenticateToken, async (req, res) => {
  try {
    // const userId = req.query.userid;
    const userId = req.user._id
    let getTrans = await userWallet.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      },
      {
        $project: {
          id: "$_id",
          type: 1,
          amount: 1,
          currency: 1,
          _id: 0
        }
      }
    ]);

    if (getTrans.length > 0) {
      return res.status(200).json({ IsSuccess: true, Data: getTrans, Messsage: "transaction found" });
    }
    return res.status(404).json({ IsSuccess: true, Data: [], Messsage: "no any transaction found" });
  }
  catch (error) {
    return res.status(500).json({ IsSuccess: false, Data: [], Message: error.message || "Having issue is server" })
  }
})
router.post('/refresh-token', generateRefreshToken(), async (req, res, next) => {
  console.log("api called");
})


async function verify(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
    // Or, if multiple clients access the backend:
    //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
  });
  const payload = ticket.getPayload();
  const userid = payload['sub'];
  // If request specified a G Suite domain:
  // const domain = payload['hd'];
}

module.exports = router;
