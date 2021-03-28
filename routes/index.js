var express = require('express');
var router = express.Router();
var db = require("../db");

router.get('/', async function(req, res){
  res.render('login', { title: 'Login'})
});


router.post('/', async function(req, res){
  var { username, password,register} = req.body;

  if(register){
    res.render('register', { title: 'Register'})}
  else{
    await db.login(username, password);
    req.session.username = username;
    res.render('index', { title: 'Transactions'})}
  });

  router.post('/register', async function(req, res){
    var { username, password,firstname, lastname, register} = req.body;
    if(register)
      console.log('it worked');
    await db.register(username, password,firstname,lastname);
    res.redirect('/');
  });

 function ensureLoggedIn(req, res, next){
   if(!req.session.username){
     res.redirect('/login');
   }else{
     next();
   }
 }
 router.use(ensureLoggedIn);

 router.get('/transaction', async function(req, res){
   var { username } = req.session;
   res.render('index', { 
     username,
     transactions: await db.getTransaction(username),
   });
  });

 router.post('/transaction', async function(req, res){
   var { username,addtransaction, SpendingCategory,cost  } = req.session;
   if(addtransaction){
     await db.addSpendingCategory(username, SpendingCategory,body.text);
     await db.addTransactionCost(username, cost, req.body.text);}
     res.redirect('/index');
});

router.post('/logout', async function(req, res){
  req.session.username = '';
  res.redirect('/login');
});

module.exports = router;
