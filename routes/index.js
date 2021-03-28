var express = require('express');
var router = express.Router();
var db = require("../db");

router.get('/login', async function(req, res){
  res.render('login', { title: 'Login'})
});


router.post('/login', async function(req, res){
  var { username, password,register} = req.body;

  if(register){
    res.render('register', { title: 'Register'})}
  else{
    await db.login(username, password);
  }

  req.session.username = username;
  res.redirect('/');
});

function ensureLoggedIn(req, res, next){
  if(!req.session.username){
    res.redirect('/login');
  } else{
    next();
  }
}

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

 router.get('/reportview', async function(req, res){
   var { username } = req.session;
   res.render('index', { 
     username,
     items: await db.getTransaction(username),
   });
  });

 router.post('/reportview', async function(req, res){
   var { username } = req.session;

   if(req.body.delete){
     await db.deleteListItem(username, req.body.delete);
   }else{
     await db.addSpendingCategory(username, req.body.text);
     await db.addTransactionCost(username, req.body.text);
   }
    res.redirect('/');
});

router.post('/logout', async function(req, res){
  req.session.username = '';
  res.redirect('/login');
});

module.exports = router;
