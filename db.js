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
        db = client.db("cps888");
    }
    return db;
}

async function register(username, password, firstname, lastname){
    var conn = await connect();
    var existingUser = await conn.collection('users').findOne({username});
    var role = "Client";

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

    await conn.collection('users').insertOne({username, passwordHash,firstname, lastname, role});
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


async function getTransaction(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    return transactions;
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
    console.log(type, amount,date);
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

async function close(){
    await client.close();
}

module.exports = {
    url,
    login,
    register,
    deleteTransactionItem,
    getTransaction,
    registerFM,
    registerWM,
    addIncome,
    addExpense,
    close,
};

async function wipe(){
    var conn = await connect();
    await conn.collection("users").drop();
}

if(process.env.TEST){
    module.exports.wipe = wipe;
}