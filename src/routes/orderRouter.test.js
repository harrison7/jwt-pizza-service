const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = Math.random().toString(36).substring(2, 12);
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

let adminUser;
let testAdminAuthToken;

beforeAll(async () => {
    // testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    // const registerRes = await request(app).post('/api/auth').send(testUser);
    // testUserAuthToken = registerRes.body.token;
    // await request(app).put('/api/auth').send(testUser);

    
});

test('getMenu', async () => {
    const registerRes = await request(app).get('/api/order/menu');
    expect(registerRes.status).toBe(200);
});

test('addMenuItem', async () => {
    const adminUser = await createAdminUser();
    const adminRegisterRes = await request(app).post('/api/auth').send(adminUser);
    testAdminAuthToken = adminRegisterRes.body.token;
    await request(app).put('/api/auth').send(adminUser);

    const newItem = { title: "Student", description: "No topping, no sauce, just carbs", image: "pizza9.png", price: 0.0001 }
    const registerRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testAdminAuthToken}`).send(newItem);
    expect(registerRes.status).toBe(200);
});