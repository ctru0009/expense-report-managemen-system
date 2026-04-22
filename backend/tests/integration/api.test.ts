import request from 'supertest';
import { app, prisma } from '../../src/app';
import bcrypt from 'bcrypt';

const TEST_ADMIN = { email: 'test-admin@integration.com', password: 'testpass123456' };
const TEST_USER = { email: 'test-user@integration.com', password: 'testpass123456' };

let adminToken: string;
let userToken: string;
let adminId: string;
let userId: string;

beforeAll(async () => {
  const adminPasswordHash = await bcrypt.hash(TEST_ADMIN.password, 10);
  const userPasswordHash = await bcrypt.hash(TEST_USER.password, 10);

  const admin = await prisma.user.create({
    data: { email: TEST_ADMIN.email, password: adminPasswordHash, role: 'ADMIN' },
  });
  const user = await prisma.user.create({
    data: { email: TEST_USER.email, password: userPasswordHash, role: 'USER' },
  });

  adminId = admin.id;
  userId = user.id;

  const adminLogin = await request(app).post('/api/auth/login').send(TEST_ADMIN);
  adminToken = adminLogin.body.token;

  const userLogin = await request(app).post('/api/auth/login').send(TEST_USER);
  userToken = userLogin.body.token;
});

afterAll(async () => {
  await prisma.expenseItem.deleteMany({});
  await prisma.expenseReport.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
});

describe('Auth: 401 and 403', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-admin accesses admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 when non-admin tries to approve', async () => {
    const res = await request(app)
      .post('/api/admin/reports/some-id/approve')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('allows admin to access admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Happy path: DRAFT → SUBMITTED → APPROVED', () => {
  it('creates, populates, submits, and approves a report', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Integration Test Report' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('DRAFT');
    const reportId = createRes.body.id;

    const addItemRes = await request(app)
      .post(`/api/reports/${reportId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        merchantName: 'Test Merchant',
        amount: 42.5,
        currency: 'USD',
        category: 'MEALS',
        transactionDate: new Date().toISOString(),
      });
    expect(addItemRes.status).toBe(201);

    const submitRes = await request(app)
      .post(`/api/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.status).toBe('SUBMITTED');

    const approveRes = await request(app)
      .post(`/api/admin/reports/${reportId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
  });
});

describe('Rejection cycle: DRAFT → SUBMITTED → REJECTED → DRAFT → SUBMITTED', () => {
  it('handles the full rejection-reopen-resubmit cycle', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Rejection Cycle Report' });
    const reportId = createRes.body.id;

    await request(app)
      .post(`/api/reports/${reportId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        merchantName: 'Cycle Merchant',
        amount: 10,
        currency: 'USD',
        category: 'TRAVEL',
        transactionDate: new Date().toISOString(),
      });

    await request(app)
      .post(`/api/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${userToken}`);

    const rejectRes = await request(app)
      .post(`/api/admin/reports/${reportId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('REJECTED');

    const reopenRes = await request(app)
      .post(`/api/reports/${reportId}/reopen`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.status).toBe('DRAFT');

    const resubmitRes = await request(app)
      .post(`/api/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.status).toBe('SUBMITTED');
  });
});

describe('Item CRUD locked in SUBMITTED/APPROVED status', () => {
  let reportId: string;

  beforeAll(async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Locked Items Report' });
    reportId = createRes.body.id;

    await request(app)
      .post(`/api/reports/${reportId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        merchantName: 'Initial Item',
        amount: 5,
        currency: 'USD',
        category: 'OFFICE_SUPPLIES',
        transactionDate: new Date().toISOString(),
      });

    await request(app)
      .post(`/api/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${userToken}`);
  });

  it('returns 400 when creating item on SUBMITTED report', async () => {
    const res = await request(app)
      .post(`/api/reports/${reportId}/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        merchantName: 'New Item',
        amount: 1,
        currency: 'USD',
        category: 'OTHER',
        transactionDate: new Date().toISOString(),
      });
    expect(res.status).toBe(400);
  });

  it('returns 400 when updating item on SUBMITTED report', async () => {
    const itemsRes = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${userToken}`);
    const itemId = itemsRes.body.items[0].id;

    const res = await request(app)
      .put(`/api/reports/${reportId}/items/${itemId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ merchantName: 'Updated' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when deleting item on SUBMITTED report', async () => {
    const itemsRes = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${userToken}`);
    const itemId = itemsRes.body.items[0].id;

    const res = await request(app)
      .delete(`/api/reports/${reportId}/items/${itemId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });
});

describe('Admin routes: param validation', () => {
  it('returns 400 for invalid UUID in admin get', async () => {
    const res = await request(app)
      .get('/api/admin/reports/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid UUID in admin approve', async () => {
    const res = await request(app)
      .post('/api/admin/reports/not-a-uuid/approve')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});