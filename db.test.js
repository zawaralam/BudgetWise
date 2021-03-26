var db = require("./db");

beforeAll(async function(){
    await db.wipe();
});

afterAll(async function(){
    await db.close();
});

test('registration and login', async function(){
    await db.register('testuser', 'testpass');
    await db.login('testuser', 'testpass');
});

test('password verification', async function(){
    await db.register('baduser', 'pass');
    await expect(db.login('baduser', 'wrongpass')).rejects.toThrow("Invalid password");
});

test('items', async function(){
    await db.register('itemuser', 'pass');
    await db.addListItem('itemuser', 'dummy1');
    await db.addListItem('itemuser', 'dummy2');
    await db.addListItem('itemuser', 'dummy3');
    await db.deleteListItem('itemuser', 'dummy2');
    var items = await db.getListItem('itemuser');
    var expected = ['dummy1','dummy3'];

    expect(items).toEqual(expect.arrayContaining(expected));
})