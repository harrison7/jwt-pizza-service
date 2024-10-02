const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { StatusCodeError } = require('../endpointHelper.js');

const testUsers = [
  { name: 'joe', email: 'reg1@test.com', password: 'a' },
  { name: 'mama', email: 'reg2@test.com', password: 'a' },
  { name: 'jospeh', email: 'reg3@test.com', password: 'a' },
  { name: 'mother', email: 'reg4@test.com', password: 'a' }
];
let testUserAuthToken = new Array(4);
let testUserId = new Array(4);
const adminUser = { name: '常用名字', email: 'a@jwt.com', password: 'admin' };
let testAdminAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
  for (let i = 0; i < testUsers.length; i++) {
    testUsers[i].email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUsers[i]);
    testUserAuthToken[i] = registerRes.body.token;
    testUserId[i] = registerRes.body.user.id;
  }
});

afterAll(async () => {
  for (let i = 0; i < testUsers.length; i++) {
    const connection = await DB.getConnection();
    try {
      await connection.beginTransaction();
      try {
        await DB.query(connection, `DELETE FROM userRole WHERE userId = ?`, [testUserId[i]]);
        await DB.query(connection, `DELETE FROM user WHERE id = ?`, [testUserId[i]]);
        await connection.commit();
      } catch {
        await connection.rollback();
        throw new StatusCodeError('unable to delete user', 500);
      }
    } finally {
      connection.end();
    }
  }
});

test('getMenu', async () => {
    const registerRes = await request(app).get('/api/order/menu');
    expect(registerRes.status).toBe(200);
});

test('addMenuItem', async () => {
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    testAdminAuthToken = loginRes.body.token;

    const newItem = { title: "Student", description: "No topping, no sauce, just carbs", image: "pizza9.png", price: 0.0001 }
    const registerRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testAdminAuthToken}`).send(newItem);
    expect(registerRes.status).toBe(200);

    await request(app).delete('/api/auth').set('Authorization', `Bearer ${testAdminAuthToken}`);
});

test('getOrders', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUsers[0]);
    testUserAuthToken[0] = loginRes.body.token;

    const registerRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken[0]}`);
    expect(registerRes.status).toBe(200);

    await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken[0]}`);
});

// test('createOrders', async () => {
//     const newOrder = {franchiseId: 1, storeId:1, items:[{ menuId: 1, description: "Veggie", price: 0.0038 }]};
//     const registerRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testAdminAuthToken}`).send(newOrder);
//     expect(registerRes.status).toBe(200);
// });