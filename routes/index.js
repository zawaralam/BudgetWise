var express = require('express');
var router = express.Router();
var db = require("../db");

router.get('/login', async function(req, res){
  res.render('login', { title: 'Login'})
});

router.post('/login', async function(req, res){
  var {username, password,register} = req.body;
  if(register){
    res.redirect('/register', { title: 'Register'})}
  else{
    await db.login(username, password);
    req.session.username = username;
    res.redirect('/index', { title: 'Index'})}
});

router.get('/register', async function(req, res){
  res.render('register', { title: 'Register'})
});

router.post('/register', async function(req, res){
  var { username, password,firstname, lastname, register} = req.body;
  if(register){
    await db.register(username, password,firstname,lastname);
    res.redirect('/login');
  }
});

function ensureLoggedIn(req, res, next){
  if(!req.session.username){
    res.redirect('/login');
  }
  else{
    next();
  }
}

router.use(ensureLoggedIn);
router.get('/register', async function(req, res){
  res.render('register', { title: 'Register'})
});

router.get('/index', async function(req, res){
  var {username} = req.session;
  res.render('index', { 
  username,
  transactions : await db.getTransaction(username),
  });
});

router.post('/addtransaction', async function(req, res){
  var {SpendingCategory,cost} = req.body;
  var {username} = req.session;
  console.log(username)
  console.log(req.body);
  await db.addTransaction(username, cost, SpendingCategory);
  res.redirect('/index');
});

router.post('/logout', async function(req, res){
  req.session.username = '';
  res.redirect('/login');
});

module.exports = router;
