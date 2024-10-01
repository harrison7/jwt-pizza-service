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

const adminUser = { name: '常用名字', email: 'a@jwt.com', password: 'admin' };
let testAdminAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test('register fail', async () => {
  const failUser = { name: '', email: '', password: '' };
  const registerRes = await request(app).post('/api/auth').send(failUser);
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  testUserAuthToken = loginRes.body.token;
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
  await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
});

test('logout', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  testUserAuthToken = loginRes.body.token;
  
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('updateUser', async () => {
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  testAdminAuthToken = loginRes.body.token;
  const updateUserData = { email: 'newemail@test.com', password: 'newpassword' };
  
  const updateRes = await request(app).put(`/api/auth/2`).send(updateUserData).set('Authorization', `Bearer ${testAdminAuthToken}`);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(updateUserData.email);
  await request(app).delete('/api/auth').set('Authorization', `Bearer ${testAdminAuthToken}`);
});

test('updateUser unauthorized', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  testUserAuthToken = loginRes.body.token;

  const originalEmail = loginRes.body.email;
  const updateUserData = { email: 'unauthorized@test.com', password: 'newpassword' };
  
  const updateRes = await request(app).put(`/api/auth/2`).send(updateUserData).set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(updateRes.status).toBe(403);
  expect(updateRes.body.email).toBe(originalEmail);
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
});