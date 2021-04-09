var { MongoClient } = require("mongodb");
var bcrypt = require("bcrypt");
var url = 'mongodb+srv://dbUser:cps888project@cluster0.pxcu4.mongodb.net/cps888?retryWrites=true&w=majority';

if(process.env.TEST){
    url = 'mongodb+srv://dbUser:cps888project@cluster0.pxcu4.mongodb.net/cps888-test?retryWrites=true&w=majority';
}

var db = null;
var client = null;

async function connect(){
    if(db == null){
        var options = {
            useUnifiedTopology: true,
        };
        var client = await MongoClient.connect(url, options);
        db = await client.db("cps888");
    }
    return db;
}

async function register(username, password, email, firstname, lastname, income, expenses, appointmentTimes){
    var conn = await connect();
    var existingUser = await conn.collection('users').findOne({username});
    var role = "Client";
    var budgetGoal = 0;

    if(existingUser != null && username.toLowerCase() === "admin") {
        throw new Error('Cannot create a new Admin user');
    }

    if(existingUser != null){
        throw new Error('User already exists');
    } 

    if(username.toLowerCase() === "admin") {
        role = "Admin";
    }

    var SALT_ROUNDS = 10;
    var passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // If user is client, add income/expenses fields
    if(role === "Admin"){
        await conn.collection('users').insertOne({username, passwordHash, email, firstname, lastname, role});
    }else{
        await conn.collection('users').insertOne({username, passwordHash, email, firstname, lastname, role, income, expenses, budgetGoal, appointmentTimes});
    }
}

async function login(username, password){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});

    if(user == null){
        throw new Error('User does not exist');
    }

    var valid = await bcrypt.compare(password, user.passwordHash);
    
    if(!valid){
        throw new Error("Invalid password");
    }
    console.log("Login successful");
}

async function getFirstName(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    var firstname = user.firstname;
    return firstname;
}

async function getIncome(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    var income = user.income;
    return income;
}

async function getExpense(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    var expenses = user.expenses;
    return expenses;
}

async function deleteTransactionItem(username, cost){
    var conn = await connect();
    await conn.collection('users').updateOne(
        {username},
        {
            $pull: {
                transactions: cost,
            }
        }
    )
}

// ADMIN STUFF
async function registerFM(fullname,email,companyName,contactNum, availableTime) {
    var conn = await connect();
    await conn.collection('financialManagers').insertOne({
        fullname: fullname,
        email: email,
        companyName: companyName,
        contactNum: contactNum,
        availableTime: availableTime,
    });
}

async function registerWM(companyName,email,contactNum) {
    var conn = await connect();
    await conn.collection('WealthManagementCompanies').insertOne({
        companyName: companyName,
        email: email,
        contactNum: contactNum
    });
}

async function addIncome(username, type, amount, date){
    var conn = await connect();
    await conn.collection('users').updateOne(
        {username},
        {
            $push:{
                income:{
                    type: type,
                    amount: amount,
                    date: date,
                }
            }
        }
    );
}

async function addExpense(username, type, amount, date){
    var conn = await connect();
    console.log(username,type, amount,date)
    await conn.collection('users').updateOne(
        {username},
        {
            $push:{
                expenses:{
                    type: type,
                    amount: amount,
                    date: date,
                }
            }
        }
    );
}
async function modifyExpense(username,transactionNum, usertype, useramount, userdate){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    var userexpenses = user.expenses;
    var origtype = userexpenses[transactionNum].type;
    var origamount = userexpenses[transactionNum].amount;
    var origdate = userexpenses[transactionNum].date;

    await conn.collection('users').updateOne(
        {username},
        {
            $pull: {
                expenses:{type:origtype,amount:origamount,date:origdate}
            }
        }
    )
    await conn.collection('users').updateOne(
        {username},
        {
            $push: {
                expenses:{
                    $each:[{type:usertype,amount:useramount,date:userdate}],
                    $position: parseInt(transactionNum)
            }
        }

    })
}

async function setBudgetingGoal(username, budgetAmount){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    console.log(username, budgetAmount)
    await conn.collection('users').updateOne(
        {username},
        {
            $pull:{
                budgetAmount: user.budgetAmount[0],
            }
        }
    );
    await conn.collection('users').updateOne(
        {username},
        {
            $push:{
                budgetAmount: budgetAmount,
            }
        }
    );    
}

async function getBudgetingGoal(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    var budgetAmount = user.budgetAmount;
    return budgetAmount;     
}

// services related
async function getFinancialManagers(){
    var conn = await connect();
    let financialManagers = await conn.collection('financialManagers').find().toArray();
    return financialManagers;
}

async function getWealthManagementCompanies(){
    var conn = await connect();
    let WealthManagementCompanies = await conn.collection('WealthManagementCompanies').find().toArray();
    return WealthManagementCompanies;
}

// booking time
async function bookTime(bookingTime, email, username) {
    var conn = await connect();
    const financialuser = await conn.collection('financialManagers').findOne(
        {email: email},
    );

    const financialUsername = (financialuser.fullname);

    // remove the chosen time
    await conn.collection('financialManagers').updateOne(
        {email: email},
        {$pull: {"availableTime": bookingTime}},
    );
    // need to add this time to the users database
    await conn.collection('users').updateOne(
        {username: username},
        {$push: {"appointmentTimes": {bookingTime, email, financialUsername}}}
    );
}

// check booking time
async function checkAvailableTime(bookingTime) {
    var conn = await connect();
    let available = await conn.collection('users').find(
        {appointmentTimes: {$elemMatch: {bookingTime: bookingTime}}}
    ).toArray();
    return available;
}

async function resetFinancialTimes() {
    // repopulate the availableTimes array
    var conn = await connect();
    await conn.collection('financialManagers').updateMany(
        {},
        {$set: {availableTime: ['8:00-8:55','9:00-9:55','10:00-10:55','11:00-11:55','12:00-12:55','13:00-13:55','14:00-14:55','15:00-15:55']}}
    );
}

async function resetAppointments() {
    // repopulate the availableTimes array
    var conn = await connect();
    await conn.collection('users').updateMany(
        {},
        {$set: {appointmentTimes: []}}
    );
}

async function suggestBudgetingGoal(username){
    var suggestedAmount = Math.floor(Math.random() * 6000) + 1;
    var conn = await connect();
    //return suggestedAmount;
    await conn.collection('users').updateOne(
        {username},
        {
            $push:{
                suggestedAmount: suggestedAmount,
            }
        }
    )
}

async function getSuggestedBudgetingGoal(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    var suggestedAmount = user.suggestedAmount;
    return suggestedAmount;     
}

async function feedback(username, note){
    var conn = await connect();
    console.log(username);
    await conn.collection('users').updateOne(
        {username},
        {
            $push:{
                feedback: note,
            }
        }
    );   
}

async function close(){
    await client.close();
}

module.exports = {
    url,
    login,
    register,
    deleteTransactionItem,
    getFirstName,
    getIncome,
    getExpense,
    registerFM,
    registerWM,
    addIncome,
    addExpense,
    modifyExpense,
    setBudgetingGoal,
    getBudgetingGoal,
    getFinancialManagers,
    getWealthManagementCompanies,
    checkAvailableTime,
    bookTime,
    suggestBudgetingGoal,
    getSuggestedBudgetingGoal,
    feedback,
    resetFinancialTimes,
    resetAppointments,
    close,
};

async function wipe(){
    var conn = await connect();
    await conn.collection("users").drop();
}

if(process.env.TEST){
    module.exports.wipe = wipe;
}