const request = require('supertest');
const app = require('../service');

const adminUser = { name: '常用名字', email: 'a@jwt.com', password: 'admin' };
let testAdminAuthToken;

