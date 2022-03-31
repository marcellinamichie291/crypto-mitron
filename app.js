var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var transactionRoute = require('./routes/transactions');
const roomRoute = require('./routes/rooms');
const walletRoute = require('./routes/wallet')
const tokenRouter = require('./routes/tokens')
const responseTime = require('./response-time');
const authRoute = require('./routes/auth');
const passport = require('passport');
var session = require('express-session')
var userProfile;
require('./config');
// require('./routes/binanceSocket')
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(session({
  key: "mysite.sid.uid.whatever",
  secret: process.env.ACCESS_TOKEN_SECRET,
  cookie: {
    maxAge: 2678400000 // 31 days
  },
}))
app.use(passport.initialize());
app.use(passport.session());

app.get('/success', (req, res) => res.send(userProfile));
app.get('/error', (req, res) => res.send("error logging in"));

app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(responseTime);
app.use('/', indexRouter);
app.use('/auth', authRoute)
app.use('/users', usersRouter);
app.use('/transactions', transactionRoute);
app.use('/rooms', roomRoute);
app.use('/wallet', walletRoute);
app.use('/tokens', tokenRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});
module.exports = app;
