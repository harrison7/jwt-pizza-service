const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUsers = [
  { name: 'login', email: 'reg1@test.com', password: 'a' },
  { name: 'logout', email: 'reg2@test.com', password: 'a' },
  { name: 'updateUser', email: 'reg3@test.com', password: 'a' },
  { name: 'updateUser unauthorized', email: 'reg4@test.com', password: 'a' },
  { name: 'updateUser self', email: 'reg5@test.com', password: 'a' }
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

test('register fail', async () => {
  const failUser = { name: '', email: '', password: '' };
  const registerRes = await request(app).post('/api/auth').send(failUser);
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUsers[0]);
  testUserAuthToken[0] = loginRes.body.token;
  expect(loginRes.status).toBe(200);
  //expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUsers[0], roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
  await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken[0]}`);
});

test('logout', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUsers[1]);
  testUserAuthToken[1] = loginRes.body.token;
  
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken[1]}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('updateUser admin', async () => {
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  testAdminAuthToken = loginRes.body.token;
  const updateUserData = { email: 'newemail@test.com', password: 'newpassword' };
  
  const updateRes = await request(app).put(`/api/auth/${testUserId[2]}`).send(updateUserData).set('Authorization', `Bearer ${testAdminAuthToken}`);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(updateUserData.email);
  await request(app).delete('/api/auth').set('Authorization', `Bearer ${testAdminAuthToken}`);
});

test('updateUser unauthorized', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUsers[3]);
  testUserAuthToken[3] = loginRes.body.token;

  const originalEmail = loginRes.body.email;
  const updateUserData = { email: 'unauthorized@test.com', password: 'badpassword' };
  
  const updateRes = await request(app).put(`/api/auth/${testUserId[2]}`).send(updateUserData).set('Authorization', `Bearer ${testUserAuthToken[3]}`);

  expect(updateRes.status).toBe(403);
  expect(updateRes.body.email).toBe(originalEmail);
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken[3]}`);
});

test('updateUser self', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUsers[4]);
  testUserAuthToken[3] = loginRes.body.token;

  const originalEmail = loginRes.body.email;
  const updateUserData = { email: 'unauthorized@test.com', password: 'badpassword' };
  
  const updateRes = await request(app).put(`/api/auth/${testUserId[4]}`).send(updateUserData).set('Authorization', `Bearer ${testUserAuthToken[3]}`);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(updateUserData.email);
  await request(app).delete('/api/auth').set('Authorization', `Bearer ${testAdminAuthToken}`);
});