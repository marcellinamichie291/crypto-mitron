var express = require('express');
var router = express.Router();
const userSchema = require('../models/userModel');
const userKyc = require('../models/userKyc');
const { generateAccessToken, generateRefreshToken, authenticateToken } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');
const userWallet = require('../models/userWallet');
const instance = require('../services/razorpay-setup');
const bodySchema = require('../models/bodyData');
const userAccount = require('../models/userAccount');



/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});
//, address, city, state, country, age, adharNo 
router.post('/signUpOld', async (req, res, next) => {
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
      return res.status(409).json({ isSuccess: false, data: null, messsage: "user already exist" });
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

    let depositBonus = new userWallet({
      userId: userIs._id,
      type: "BONUS",
      amount: process.env.SIGNUP_BONUS,
      currency: "INR",
      time: Date.now()
    })

    await depositBonus.save();

    let user = {
      name: name,
      mobileNo: mobileNo
    }

    return res.status(200).json({
      isSuccess: true, data: {
        user: {
          id: userIs._id, name: userIs.name, role: userIs.role, email: userIs.email, message: {
            header: "Congratulations!",
            body: "You got a signup bonus of Rs " + depositBonus.amount
          }
        }
      }, message: "user successfully signed up"
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
  }
})
router.post('/signUp', async (req, res, next) => {
  try {
    const { name, email, password, mobileNo, role } = req.body;

    // let customerIs = await instance.customers.fetch("cust_JTYPnUKVXipDOS");
    // console.log(customerIs);
    // return;

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
      return res.status(409).json({ isSuccess: false, data: null, messsage: "user already exist" });
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

    let depositBonus = new userWallet({
      userId: userIs._id,
      type: "BONUS",
      amount: process.env.SIGNUP_BONUS,
      currency: "INR",
      time: Date.now()
    })

    await depositBonus.save();

    let user = {
      name: name,
      mobileNo: mobileNo
    }

    if (process.env.RAZORPAY != undefined && process.env.RAZORPAY != false) {

      let customerIs = await instance.customers.create({
        name: name,
        fail_existing: 0,
        notes: {
          userId: userIs._id
        }
      })
      // console.log(customerIs);

      let virtualAccountIs = await instance.virtualAccounts.create({
        receivers: {
          types: [
            "bank_account"
          ]
        },
        customer_id: customerIs.id
      })

      let createUserAccount = await new userAccount({
        userId: userIs._id,
        vaId: virtualAccountIs.id,
        custId: customerIs.id,
        bank: {
          name: virtualAccountIs.receivers[0].name,
          ifsc: virtualAccountIs.receivers[0].ifsc,
          bankName: virtualAccountIs.receivers[0].bank_name,
          accountNumber: virtualAccountIs.receivers[0].account_number
        }
      });

      await createUserAccount.save();

    }
    return res.status(200).json({
      isSuccess: true, data: {
        user: {
          id: userIs._id, name: userIs.name, role: userIs.role, email: userIs.email, message: {
            header: "Congratulations!",
            body: "You got a signup bonus of Rs " + depositBonus.amount
          }
        }
      }, message: "user successfully signed up"
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
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
        return res.status(409).json({ isSuccess: false, data: null, messsage: "kyc detail already submitted" });
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
      return res.status(200).json({ isSuccess: true, data: { userId: userId, kycDetails: kyc }, message: "kyc detail added" });
    }
    return res.status(404).json({ isSuccess: false, data: null, messsage: "user not found" });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
  }
})
router.post('/updateUser', authenticateToken, async (req, res, next) => {
  try {
    const { name, email, password, mobileNo } = req.body;

    const userId = req.user._id;
    let checkExist = await userSchema.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(userId)
        }
      }
    ]);

    if (checkExist.length == 0) {
      return res.status(404).json({ isSuccess: false, data: null, messsage: "user not found" });
    }
    const userIs = {
      name: name != undefined && name != "" ? name : checkExist[0].name,
      email: email != undefined && email != "" ? email : checkExist[0].email,
      mobileNo: mobileNo != undefined && mobileNo != "" ? mobileNo : checkExist[0].mobileNo,
      password: password != undefined && password != "" ? password : checkExist[0].password
    };

    let updateUser = await userSchema.findByIdAndUpdate(userId, userIs, { new: true });
    return res.status(200).json({ isSuccess: true, data: { user: { id: updateUser._id, email: updateUser.email, role: updateUser.role, name: updateUser.name } }, messsage: "user details updated successfully" });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
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
        return res.status(401).json({ isSuccess: false, data: null, messsage: "Incorrect Password" });
      }
      let user = {
        _id: checkExist[0]._id,
        timestamp: Date.now()
      }

      const { generatedToken, refreshToken } = await generateAccessToken(user);
      // console.log(generatedToken + refreshToken);
      return res.status(200).json({ isSuccess: true, data: { user: { email: checkExist[0].email, name: checkExist[0].name, id: checkExist[0]._id, role: checkExist[0].role }, token: generatedToken, refreshToken: refreshToken }, messsage: "user successully found" });
      // return res.status(200).json({ isSuccess: true, data: checkExist, role: checkExist[0].role, token: generatedToken, refreshToken: refreshToken, Messsage: "user found" });
    }
    return res.status(404).json({ isSuccess: false, data: null, message: "user not found" });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
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
    return res.status(200).json({ isSuccess: true, data: { userId: userId, transactionDetails: deposit }, messsage: "your trasaction stored" });
  }
  catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
  }
})
router.get('/getAccount', authenticateToken, async (req, res) => {
  try {
    // const userId = req.query.userId;
    const userId = req.user._id
    let getTrans = await userAccount.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId)
        }
      },
      {
        $addFields: {
          id: "$_id"
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          userId: 0
        }
      }
    ]);

    if (getTrans.length > 0) {
      return res.status(200).json({ isSuccess: true, data: { userId: userId, userAccount: getTrans }, messsage: "account details found" });
    }
    return res.status(200).json({ isSuccess: false, data: null, messsage: "no any account details found" });
  }
  catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
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
      return res.status(200).json({ isSuccess: true, data: { userId: userId, transactionDetails: getTrans }, messsage: "transaction found" });
    }
    return res.status(404).json({ isSuccess: false, data: null, messsage: "no any transaction found" });
  }
  catch (error) {
    return res.status(500).json({ isSuccess: false, data: null, message: error.message || "Having issue is server" })
  }
})

router.post('/refresh-token', generateRefreshToken(), async (req, res, next) => {
  console.log("api called");
})


module.exports = router;
