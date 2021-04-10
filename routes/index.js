var express = require('express');
var router = express.Router();
var db = require("../db");
const CSVtoJSON = require("csvtojson");
const multer = require('multer');
const path = require('path');
let updated_financial = false;

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
  // if(register){
  //   res.redirect('/register');
  // } else {
  //   await db.login(username, password);
  // }
  await db.login(username, password);
  // if user was found and logged in, then redirect them to the dashboard

  req.session.username = username;
  if (username.toLowerCase() === "admin"){
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
  var appointmentTimes = [];



  if(register){
    // check for valid password strength
    if(password.length >= 6) {
      // check if passwords match
      if(password === confirm){
        await db.register(username, password, email, firstname, lastname, income, expenses, appointmentTimes);
        res.redirect('/home');
      } else{
        throw new Error("Passwords do not match.");
        // res.redirect('/register');
      }
    } else {
      throw new Error("Minimum password length is 6 digits.");
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
  var firstname =  await db.getFirstName(username);
  var income = await db.getIncome(username);
  var expenses = await db.getExpense(username);
  var budgetGoal = await db.getBudgetingGoal(username);
  let time = new Date().getHours();
  let msge = "";

  // check if user has any appoints
  let appointments = await db.getAppointments(username);
  if (appointments.length <= 0 || time > 17) {
    appointments = [];
  }

  income = JSON.stringify(income);
  expenses = JSON.stringify(expenses);
  res.render('home', { 
    title: 'Home',
    username,
    firstname,
    income,
    expenses,
    budgetGoal,
    appointments,
  });
});

router.get('/transaction', async function(req, res){
  res.render('transaction')
});

router.post('/addtransaction', async function(req, res){
  var {SpendingCategory,amount, date} = req.body;
  var {username} = req.session;
  await db.addExpense(username,SpendingCategory, '$'+amount, date);
  res.redirect('/transaction');
});

router.get('/view-transactions', async function(req, res){
  let transactions_arr = [];
  let income_arr = [];
  let month = new Date().getMonth() + 1;
  let year = new Date().getFullYear();
  var {username} = req.session;
  let transactions = await db.getExpense(username);
  let income = await db.getIncome(username);

  transactions.forEach(transaction => {
    if (new Date(transaction.date).getFullYear() === year) {
      if ((new Date(transaction.date).getMonth() + 1) === month) {
        transactions_arr.push(transaction);
      }
    }
  });

  income.forEach(transaction => {
    if (new Date(transaction.date).getFullYear() === year) {
      if ((new Date(transaction.date).getMonth() + 1) === month) {
        income_arr.push(transaction);
      }
    }
  });

  res.render('viewTransactions', {title: 'Transactions', transactions_arr: transactions_arr, income_arr: income_arr});
});

router.post('/addincome', async function(req, res){
  var {IncomeCategory,income, date} = req.body;
  var {username} = req.session;
  await db.addIncome(username,IncomeCategory, '$' + income, date);
  res.redirect('/transaction');
});

router.post('/getIncome', async function(req, res){
  var {username} = req.session;
  await db.getIncome(username);
  res.redirect('/home');
});

router.post('/getExpense', async function(req, res){
  var {username} = req.session;
  await db.getExpense(username);
  res.redirect('/home');
});

router.post('/setBudgetingGoal', async function(req, res){
  var {budgetAmount} = req.body;
  var {username} = req.session;
  await db.setBudgetingGoal(username, budgetAmount);
  res.redirect('/transaction');
});

router.post('/getBudgetingGoal', async function(req, res){
  var {username} = req.session;
  await db.getBudgetingGoal(username);
  res.redirect('/transaction');
});

router.post('/feedback', async function(req, res){
  var {username} = req.session;
  var {note} = req.body;
  await db.feedback(username, note);
  res.redirect('/home');
});

router.post('/suggestBudgetingGoal', async function(req, res){
  var {username} = req.session;
  await db.suggestBudgetingGoal(username);
  res.redirect('/services');
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
  var {username} = req.session;
  var suggestedAmount = await db.getSuggestedBudgetingGoal(username);
  res.render('services', {suggestedAmount});
});

router.post('/services', async function(req,res){
  res.redirect('/services');
});

// SERVICES/
router.get('/services/financial-managers', async function(req,res){
  // else just read from the db
  let financialManagers = await db.getFinancialManagers();
  let time = new Date().getHours();
  if (time > 17) {
    financialManagers.forEach(manager => {
      manager.availableTime = [];
    });
  }
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

// booking times
router.post('/services/financial-managers/book-time', async function(req,res) {
  // get the value of the chosen time
  // need to see if value is valid or unavailable
  const {bookingTimes} = req.body;
  const email = req.body.bookTime;
  const {username} = req.session;

  console.log(bookingTimes);

  // if user already has a booking time at the specified time, then don't book at all
  const available = await db.checkAvailableTime(bookingTimes);
  let userStatus = true;
  available.forEach(user => {
    if(user.username === username) {
      // time slot already taken, can't book
      userStatus = false;
    }
  });

  if (userStatus === false) {
    throw new Error("You already have an appointment at the selected time. Please select another time.");
  } else {
    if(bookingTimes !== "unavailable") {
      await db.bookTime(bookingTimes, email, username);
    } else {
      throw new Error("No times available for booking.");
    }
  }
  res.redirect('/services/financial-managers');
});

// LOGOUT
router.post('/logout', async function(req, res){
  req.session.username = '';
  res.redirect('/login');
});

module.exports = router;