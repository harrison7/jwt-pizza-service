const request = require('supertest');
const app = require('../service');
const { StatusCodeError } = require('../endpointHelper.js');

const { Role, DB } = require('../database/database.js');

const testUsers = [
  { name: 'jeffery', email: 'reg1@test.com', password: 'a' },
  { name: 'asdf', email: 'reg2@test.com', password: 'a' },
  { name: 'qwer', email: 'reg3@test.com', password: 'a' },
  { name: 'hjkl', email: 'reg4@test.com', password: 'a' }
];
let testUserAuthToken = new Array(4);
let testUserId = new Array(4);
let adminUser;
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
  adminUser = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  adminUser.name = 'adminF';
  adminUser.email = adminUser.name + '@jwt.com';

  await DB.addUser(adminUser);

  adminUser.password = 'toomanysecrets';
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

test('getFranchises', async () => {
    const registerRes = await request(app).get('/api/franchise');
    expect(registerRes.status).toBe(200);
});

test('getUserFranchises', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUsers[0]);
    testUserAuthToken[0] = loginRes.body.token;

    const registerRes = await request(app).get(`/api/franchise/${testUserId[0]}`).set('Authorization', `Bearer ${testUserAuthToken[0]}`);;
    expect(registerRes.status).toBe(200);

    await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken[0]}`);
});

test('createFranchise', async () => {
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    testAdminAuthToken = loginRes.body.token;

    const franchiseData = {name: "pizzaPocket", admins: [{email: "adminF@jwt.com"}]};

    const registerRes = await request(app).post('/api/franchise').send(franchiseData).set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(registerRes.status).toBe(200);

    const franchiseID = registerRes.body.id;

    await request(app).delete(`/api/franchise/${franchiseID}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    await request(app).delete('/api/auth').set('Authorization', `Bearer ${testAdminAuthToken}`);
});

test('createStore', async () => {
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    testAdminAuthToken = loginRes.body.token;

    const franchiseData = {name: "pizzaPocket2", admins: [{email: "a@jwt.com"}]};

    const registerRes = await request(app).post('/api/franchise').send(franchiseData).set('Authorization', `Bearer ${testAdminAuthToken}`);
    const franchiseID = registerRes.body.id;
    const storeData = {franchiseId: franchiseID, name:"SLC"};

    const storeRes = await request(app).post(`/api/franchise/${franchiseID}/store`).send(storeData).set('Authorization', `Bearer ${testAdminAuthToken}`);
    const storeID = storeRes.body.id;

    await request(app).delete(`/api/franchise/${franchiseID}/store/${storeID}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    await request(app).delete(`/api/franchise/${franchiseID}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    await request(app).delete('/api/auth').set('Authorization', `Bearer ${testAdminAuthToken}`);
});