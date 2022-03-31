// index.js

/*  Google AUTH  */
var express = require('express');
var router = express.Router();
const passport = require('passport')
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
var admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
var serviceAccount = require("../files/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
// const { google } = require('googleapis');
// const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
// const GOOGLE_CLIENT_ID = "525460832991-afsdffsq6liot36lmlfpuk6ir9fldtdn.apps.googleusercontent.com"
// const GOOGLE_CLIENT_SECRET = "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"
// const GOOGLE_CLIENT_ID_IS = '203059031947-quvurj84p8slfm92h53vumb9s2adc5ob.apps.googleusercontent.com';
// const GOOGLE_CLIENT_SECRET_IS = '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';
// const oauth2Client = new google.auth.OAuth2(
//     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, "http://localhost:3000/auth/google/callback"
// );
// passport.use(new GoogleStrategy({
//     clientID: GOOGLE_CLIENT_ID,
//     clientSecret: GOOGLE_CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/google/callback"
// },
//     function (accessToken, refreshToken, profile, done) {
//         // console.log(accessToken)
//         userProfile = profile;
//         console.log(userProfile)
//         return done(null, userProfile);
//     }
// ));

// router.get('/google',
//     passport.authenticate('google', { scope: ['profile', 'email'] }));

// router.get('/google/callback',

//     // passport.authenticate('google', { failureRedirect: '/error' }),
//     async function (req, res) {
//         try {
//             const { code } = req.query;

//             const { tokens } = await oauth2Client.getToken(code)
//             oauth2Client.setCredentials(tokens);
//             // Successful authentication, redirect success.
//             res.redirect('/success');
//         }
//         catch (error) {
//             console.log(error.message)
//         }
//     });
// router.post('/signupgoogle', async function (req, res) {
//     console.log("called")
//     const { code } = req.body;

//     oauth2Client.getToken(code, function (err, tokens) {
//         console.log(err)
//         // Now tokens contains an access_token and an optional refresh_token. Save them.
//         if (!err) {
//             console.log(tokens)
//             // oauth2Client.setCredentials(tokens);
//         }
//     });
// })
router.post('/signUpGoogleToken', async function (req, res) {
    // idToken comes from the client app
    const idToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjU4YjQyOTY2MmRiMDc4NmYyZWZlZmUxM2MxZWIxMmEyOGRjNDQyZDAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1MjU0NjA4MzI5OTEtaWgwdnMzbDQ4cGw2aWVrZjR0MzRmODR2cnQ0NW1pc3IuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1MjU0NjA4MzI5OTEtYWZzZGZmc3E2bGlvdDM2bG1sZnB1azZpcjlmbGR0ZG4uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDAxOTc1MTUyMjAyNjA4Njk3MTIiLCJlbWFpbCI6IndlYmRlY29kZTMzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiV2ViIERlY29kZSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS0vQU9oMTRHZ0xRVk5rSWNQd3lMV18tNVpLVzBwM2Rtc05CWW9sdnY2dHFIbnY9czk2LWMiLCJnaXZlbl9uYW1lIjoiV2ViIiwiZmFtaWx5X25hbWUiOiJEZWNvZGUiLCJsb2NhbGUiOiJlbi1HQiIsImlhdCI6MTY0ODcyODExNCwiZXhwIjoxNjQ4NzMxNzE0fQ.j10mgM2Ea7Z9mfr0QjgDyiUU6x4XXPaQWjdMN8Dt4wi7fSMPkgMIFo9ZzYTgW8aopZGvr_Vj7bYviU3z4aiqX5KdyhRcnC9gn648LooaeasAcADs8lhr_cvhLTkddknjR0bkjpD78SBZqz4mt-fcGuCuA15cG7dIRp-t3Isxnv9ZdtFFA6XAU4lqyz_Pkwq_GZX1oyKBaDHK5chDRGXmZNH9EcmkKuawgdDAOs1KDd6NvU"
    let checkRevoked = true;
    getAuth()
        .verifyIdToken(idToken, checkRevoked)
        .then((payload) => {
            console.log(payload)
            console.log("token is valid")
            // Token is valid.
        })
        .catch((error) => {
            console.log(error.message)
            if (error.code == 'auth/id-token-revoked') {
                console.log("token is revoked")
                // Token has been revoked. Inform the user to reauthenticate or signOut() the user.
            } else {
                console.log("token is invalid")
                // Token is invalid.
            }
        });
})
module.exports = router;
