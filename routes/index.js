var express = require('express');
var router = express.Router();
var db = require("../db");
const CSVtoJSON = require("csvtojson");
const fs = require("fs");

router.get('/login', async function(req, res){
  res.render('login', { title: 'Login'})
});

router.post('/login', async function(req, res){
  var { username, password, register} = req.body;
  if(register){
    res.redirect('/register');
  } else {
    await db.login(username, password);
  }
  // if user was found and logged in, then redirect them to the dashboard
  req.session.username = username;
  if (username.toLowerCase() === "admin") {
    res.redirect('/admin');
  } else {
    res.redirect('/home');
  }
});

router.get('/home', async function(req,res){
  var {username} = req.session;
  res.render('index', { 
  username,
  //transactions : await db.getTransaction(username),
  });
});

router.get('/register', async function(req,res){
  res.render('register');
});

router.post('/register', async function(req, res){
  var { username, password, firstname, lastname, register} = req.body;
  var income = [];
  var expenses = [];
  if(register)
    console.log('it worked');
  await db.register(username, password, firstname, lastname, income, expenses);
  res.redirect('/');
});

function ensureLoggedIn(req, res, next){
  // if a user isn't logged in, then automatically redirect to login page
  if(!req.session.username){
    res.redirect('/login');
  } else{
    next();
  }
}

router.use(ensureLoggedIn);

router.post('/addtransaction', async function(req, res){
  var {type,amount, date} = req.body;
  var {username} = req.session;
  console.log(username)
  console.log(req.body);
  await db.addExpense(username,type, amount, date);
  res.redirect('/home');
});

router.post('/addincome', async function(req, res){
  var {IncomeCategory,income, date} = req.body;
  var {username} = req.session;
  console.log(username)
  console.log(req.body);
  await db.addIncome(username,IncomeCategory, income, date);
  res.redirect('/home');
});

// ADMIN STUFF
router.get('/admin', async function(req,res){
  res.render('admin');
});

router.post('/register-FM', async function(req,res){
  var fullname = req.body.FMname[0];
  var email = req.body.FMname[1];
  var companyName = req.body.FMname[2];
  var contactNum = req.body.FMname[3];
  var availableTime = ['8:00-8:55','9:00-9:55','10:00-10:55','11:00-11:55','12:00-12:55','13:00-13:55','14:00-14:55','15:00-15:55'];
  // register the financial manager
  await db.registerFM(fullname, email, companyName, contactNum, availableTime);
  res.redirect('/admin');
});

router.post('/register-WM', async function(req,res){
  var companyName = req.body.FMname[0];
  var email = req.body.FMname[1];
  var contactNum = req.body.FMname[2];
  // register the financial manager
  await db.registerWM(companyName, email, contactNum);
  res.redirect('/admin');
});

// IMPORT DATA FROM CSV
router.post('/import', async function(req,res){
  var {username} = req.session;
  CSVtoJSON().fromFile(req.body.myFile)
  .then(jsonObj =>{
    for(var key in jsonObj){
      if(jsonObj[key].hasOwnProperty('Income')){
        db.addIncome(username, jsonObj[key].Income, jsonObj[key].Amount, jsonObj[key].Date);
      }else if(jsonObj[key].hasOwnProperty('Expense')){
        db.addExpense(username, jsonObj[key].Expense, jsonObj[key].Amount, jsonObj[key].Date);
      }
    }
  });
  res.redirect('/home');
});

router.post('/logout', async function(req, res){
  req.session.username = '';
  res.redirect('/login');
});

module.exports = router;
