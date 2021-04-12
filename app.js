var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const hbs = require('hbs');

require("express-async-errors");
var session = require("express-session");
var MongoStore = require('connect-mongo')(session);
var db = require("./db");

var indexRouter = require('./routes/index');
const { Db } = require('mongodb');

var app = express();

// used to reset mongodb available times
var CronJob = require('cron').CronJob;
var schedule = new CronJob('* * 0 * * *', async() => {
  // reset the available times of financial managers and appointment times
  await db.resetFinancialTimes();
  await db.resetAppointments();
});
schedule.start();

// const schedule = require('node-schedule');

// const job = schedule.scheduleJob("0 0 * * *", async() => {
//   // reset the available times of financial managers and appointment times
//   await db.resetFinancialTimes();
//   await db.resetAppointments();
// });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + "/views/partials");

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public/images/', express.static('./public/images'));

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'my secret string',
  store: new MongoStore({ url: db.url })
}))

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;