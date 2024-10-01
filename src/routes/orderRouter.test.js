const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

test('getMenu', async () => {
    const registerRes = await request(app).get('/api/auth/menu');
    expect(registerRes.status).toBe(200);
});