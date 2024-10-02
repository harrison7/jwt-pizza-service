const request = require('supertest');
const app = require('../service');

const { Role, DB } = require('../database/database.js');

const testUsers = [
  { name: 'login', email: 'reg1@test.com', password: 'a' },
  { name: 'logout', email: 'reg2@test.com', password: 'a' },
  { name: 'updateUser', email: 'reg3@test.com', password: 'a' },
  { name: 'updateUser unauthorized', email: 'reg4@test.com', password: 'a' }
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

test('getFranchises', async () => {
    const registerRes = await request(app).get('/api/franchise');
    expect(registerRes.status).toBe(200);
});