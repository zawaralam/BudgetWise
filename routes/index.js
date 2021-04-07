var express = require('express');
var router = express.Router();
var db = require("../db");
const CSVtoJSON = require("csvtojson");
const multer = require('multer');
const path = require('path');

router.get('/', async function(req, res){
  res.render('main', { title: 'Main'})
});

router.get('/login', async function(req, res){
  res.render('login', { title: 'Login'})
});
router.post('/loginmain', async function(req, res){
  res.redirect('login')
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

router.get('/register', async function(req,res){
  res.render('register');
});

router.post('/register', async function(req, res){
  var { username, password, confirm, email, firstname, lastname, register} = req.body;
  var income = [];
  var expenses = [];
  if(register){
    if(password === confirm){
      await db.register(username, password, email, firstname, lastname, income, expenses);
      res.redirect('/');
    }else{
      console.log("Passwords do not match");
      res.redirect('/register');
    }
  }
  res.redirect('/register');
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

router.get('/home', async function(req,res){
  var {username} = req.session;
  res.render('home', { 
  username,
  });
});

router.get('/transaction', async function(req, res){
  var {username} = req.session;
  firstname =  await db.getFirstName(username);
  transactions = await db.getExpense(username);
  res.render('transaction', { title: 'Transactions', transactions,firstname})
});

router.post('/addtransaction', async function(req, res){
  var {SpendingCategory,amount, date} = req.body;
  var {username} = req.session;
  console.log(username)
  console.log(SpendingCategory, amount, date);
  await db.addExpense(username,SpendingCategory, amount, date);
  res.redirect('/transaction');
});

router.post('/addincome', async function(req, res){
  var {IncomeCategory,income, date} = req.body;
  var {username} = req.session;
  console.log(username)
  console.log(req.body);
  await db.addIncome(username,IncomeCategory, income, date);
  res.redirect('/transaction');
});

router.post('/getIncome', async function(req, res){
  var {username} = req.session;
  console.log(req.body);
  await db.getIncome(username);
  res.redirect('/home');
});

router.post('/getExpense', async function(req, res){
  var {username} = req.session;
  console.log(req.body);
  await db.getExpense(username);
  res.redirect('/home');
});

router.post('/modify', async function(req, res){
  var {transactionNum,ChangedSpendingCategory, changeAmount, changeDate} = req.body;
  var {username} = req.session;
  await db.modifyExpense(username,transactionNum, ChangedSpendingCategory, changeAmount, changeDate);
  res.redirect('/transaction');
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
const storage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, './uploads/')
  },

  filename: function(req, file, cb){
    cb(null, file.fieldname + path.extname(file.originalname));
  }
});

router.post('/import', multer({storage: storage, dest: './uploads/'}).single('myFile'), function(req,res){
  var username = req.session.username;

  CSVtoJSON().fromFile(req.file.path)
  .then(jsonObj =>{
    for(var key in jsonObj){
      if(jsonObj[key].hasOwnProperty('Income')){
        db.addIncome(username, jsonObj[key].Income, jsonObj[key].Amount, jsonObj[key].Date);
      }else if(jsonObj[key].hasOwnProperty('Expenses')){
        db.addExpense(username, jsonObj[key].Expenses, jsonObj[key].Amount, jsonObj[key].Date);
      }
    }
  });
  res.redirect('/transaction');
});

// SERVICES
router.get('/services', async function(req,res){
  res.render('services');
});

router.post('/services', async function(req,res){
  res.redirect('/services');
});

// SERVICES/
router.get('/services/financial-managers', async function(req,res){
  let financialManagers = await db.getFinancialManagers();
  res.render('financialManagers', {financialManagers});
});

router.post('/services/financial-managers', async function(req,res){
  res.redirect('/services/financial-managers');
});

router.get('/services/wealth-management', async function(req,res){
  let WealthManagementCompanies = await db.getWealthManagementCompanies();
  res.render('wealthManagement', {WealthManagementCompanies});
});

router.post('/services/wealth-management', async function(req,res){
  res.redirect('/services/wealth-management');
}); 

// LOGOUT
router.post('/logout', async function(req, res){
  req.session.username = '';
  res.redirect('/login');
});

module.exports = router;
