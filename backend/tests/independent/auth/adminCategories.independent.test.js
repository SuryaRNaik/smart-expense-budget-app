/**
 * Independent verification - S2-04 Admin: manage predefined categories (supports SEBM-F-013; RBAC SEBM-SR-005)
 */
const h = require('./helpers/harness');
const { signTestToken } = require('../../../src/auth/jwt');

let app; let admin; let userTok; let userId;
const A = (t) => ({ Authorization: `Bearer ${t}` });
const nm = (p) => `IND ${p} ${h.runId}-${Math.random().toString(36).slice(2, 6)}`;

beforeAll(async () => {
  await h.migrate(); app = h.getApp();
  const { res } = await h.registerAndLogin(app);
  userTok = res.body.token; userId = res.body.user.userId;
  const adminEmail = h.uniqueEmail('adm');
  await h.register(app, { email: adminEmail });
  await h.db.query("UPDATE users SET role='admin' WHERE email=$1", [adminEmail]);
  const lg = await h.request(app).post('/api/auth/login').send({ email: adminEmail, password: 'Str0ngPassw0rd!' });
  admin = lg.body.token;
});
afterAll(async () => {
  await h.cleanupIndependentUsers(); // cascades to accounts and transactions first
  await h.db.query("DELETE FROM categories WHERE user_id IS NULL AND name LIKE $1", [`IND %${h.runId}%`]);
  await h.db.closePool();
});

describe('S2-04 access control (SEBM-SR-005)', () => {
  test.each([
    ['GET', '/api/admin/categories'], ['POST', '/api/admin/categories'],
    ['PUT', '/api/admin/categories/x'], ['DELETE', '/api/admin/categories/x'],
  ])('IND-ADM-01 %s %s without token gives 401', async (m, p) => {
    expect((await h.request(app)[m.toLowerCase()](p).send({})).status).toBe(401);
  });

  test.each([
    ['GET', '/api/admin/categories'], ['POST', '/api/admin/categories'],
    ['PUT', '/api/admin/categories/x'], ['DELETE', '/api/admin/categories/x'],
  ])('IND-ADM-02 %s %s as ordinary user gives 403', async (m, p) => {
    expect((await h.request(app)[m.toLowerCase()](p).set(A(userTok)).send({ name: 'x', type: 'expense' })).status).toBe(403);
  });

  test('IND-ADM-03 ordinary user cannot create a predefined category (and nothing is stored)', async () => {
    const name = nm('blocked');
    await h.request(app).post('/api/admin/categories').set(A(userTok)).send({ name, type: 'expense' });
    const r = await h.db.query('SELECT 1 FROM categories WHERE name=$1', [name]);
    expect(r.rows).toHaveLength(0);
  });

  test('IND-ADM-04 a role claim in a request body or query cannot elevate a user', async () => {
    const res = await h.request(app).post('/api/admin/categories?role=admin').set(A(userTok)).send({ name: nm('elev'), type: 'expense', role: 'admin' });
    expect(res.status).toBe(403);
  });
});

describe('S2-04 admin category management', () => {
  test('IND-ADM-05 seeded predefined categories are listed, all with no owner and not custom', async () => {
    const res = await h.request(app).get('/api/admin/categories').set(A(admin));
    expect(res.status).toBe(200);
    const names = res.body.categories.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Groceries', 'Salary']));
    res.body.categories.forEach((c) => { expect(c.userId).toBeNull(); expect(c.isCustom).toBe(false); });
  });

  test('IND-ADM-06 list can be filtered by type, invalid type gives 400', async () => {
    const inc = await h.request(app).get('/api/admin/categories?type=income').set(A(admin));
    expect(inc.status).toBe(200);
    inc.body.categories.forEach((c) => expect(c.type).toBe('income'));
    expect((await h.request(app).get('/api/admin/categories?type=bogus').set(A(admin))).status).toBe(400);
  });

  test('IND-ADM-07 create, then it appears in the list and in the database as predefined', async () => {
    const name = nm('create');
    const res = await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name, type: 'expense' });
    expect(res.status).toBe(201);
    const list = await h.request(app).get('/api/admin/categories').set(A(admin));
    expect(list.body.categories.map((c) => c.name)).toContain(name);
    const r = await h.db.query('SELECT user_id, is_custom FROM categories WHERE name=$1', [name]);
    expect(r.rows[0]).toEqual({ user_id: null, is_custom: false });
  });

  test('IND-ADM-08 newly created predefined category is visible to ordinary users when adding transactions (F-013)', async () => {
    const name = nm('visible');
    await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name, type: 'expense' });
    const r = await h.db.query("SELECT category_id FROM categories WHERE name=$1 AND user_id IS NULL", [name]);
    expect(r.rows).toHaveLength(1);
    const acc = await h.request(app).post('/api/accounts').set(A(userTok)).send({ accountName: 'IND acc', accountType: 'cash', balance: 100 });
    expect([200, 201]).toContain(acc.status);
    const accountId = acc.body.account?.accountId || acc.body.accountId || acc.body.account?.account_id;
    const tx = await h.request(app).post('/api/transactions').set(A(userTok)).send({ accountId, categoryId: r.rows[0].category_id, amount: 5, type: 'expense', date: '2026-10-20' });
    expect(tx.status).toBe(201);
  });

  test('IND-ADM-09 duplicate name+type is rejected 409, case-insensitively; same name with the other type is allowed', async () => {
    const name = nm('dup');
    expect((await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name, type: 'expense' })).status).toBe(201);
    expect((await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name: name.toUpperCase(), type: 'expense' })).status).toBe(409);
    expect((await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name, type: 'income' })).status).toBe(201);
  });

  test.each([
    ['blank name', { name: '  ', type: 'expense' }],
    ['missing name', { type: 'expense' }],
    ['bad type', { name: 'x', type: 'savings' }],
    ['missing type', { name: 'x' }],
    ['non-string name', { name: 123, type: 'expense' }],
  ])('IND-ADM-10 create with %s gives 400', async (_l, body) => {
    expect((await h.request(app).post('/api/admin/categories').set(A(admin)).send(body)).status).toBe(400);
  });

  test('IND-ADM-11 edit renames a category; duplicate rename gives 409; unknown id gives 404', async () => {
    const a = nm('edA'); const b = nm('edB');
    const ca = await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name: a, type: 'expense' });
    await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name: b, type: 'expense' });
    const id = ca.body.category.categoryId;
    const renamed = nm('edC');
    const ok = await h.request(app).put(`/api/admin/categories/${id}`).set(A(admin)).send({ name: renamed, type: 'expense' });
    expect(ok.status).toBe(200);
    expect(ok.body.category.name).toBe(renamed);
    expect((await h.request(app).put(`/api/admin/categories/${id}`).set(A(admin)).send({ name: b, type: 'expense' })).status).toBe(409);
    expect((await h.request(app).put('/api/admin/categories/does-not-exist').set(A(admin)).send({ name: 'x', type: 'expense' })).status).toBe(404);
  });

  test('IND-ADM-12 admin cannot edit or delete a user\'s custom category through the admin endpoints', async () => {
    const cname = nm('custom');
    const created = await h.request(app).post('/api/transactions/categories').set(A(userTok)).send({ name: cname, type: 'expense' });
    expect([200, 201]).toContain(created.status);
    const row = await h.db.query('SELECT category_id FROM categories WHERE name=$1 AND user_id=$2', [cname, userId]);
    expect(row.rows).toHaveLength(1); // setup must persist the custom category; fail explicitly instead of skipping
    const id = row.rows[0].category_id;
    expect((await h.request(app).put(`/api/admin/categories/${id}`).set(A(admin)).send({ name: 'hijack', type: 'expense' })).status).toBe(400);
    expect((await h.request(app).delete(`/api/admin/categories/${id}`).set(A(admin))).status).toBe(404);
    const still = await h.db.query('SELECT name FROM categories WHERE category_id=$1', [id]);
    expect(still.rows[0].name).toBe(cname);
  });

  test('IND-ADM-13 delete removes an unused category; deleting it twice gives 404', async () => {
    const name = nm('del');
    const c = await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name, type: 'income' });
    const id = c.body.category.categoryId;
    expect((await h.request(app).delete(`/api/admin/categories/${id}`).set(A(admin))).status).toBe(200);
    expect((await h.request(app).delete(`/api/admin/categories/${id}`).set(A(admin))).status).toBe(404);
  });

  test('IND-ADM-14 a category used by a transaction cannot be deleted (409) and existing data is preserved', async () => {
    const name = nm('inuse');
    const c = await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name, type: 'expense' });
    const id = c.body.category.categoryId;
    const acc = await h.request(app).post('/api/accounts').set(A(userTok)).send({ accountName: 'IND acc2', accountType: 'cash', balance: 50 });
    const accountId = acc.body.account?.accountId || acc.body.accountId || acc.body.account?.account_id;
    const tx = await h.request(app).post('/api/transactions').set(A(userTok)).send({ accountId, categoryId: id, amount: 5, type: 'expense', date: '2026-10-20' });
    expect(tx.status).toBe(201);
    const del = await h.request(app).delete(`/api/admin/categories/${id}`).set(A(admin));
    expect(del.status).toBe(409);
    const chg = await h.request(app).put(`/api/admin/categories/${id}`).set(A(admin)).send({ name, type: 'income' });
    expect(chg.status).toBe(409);
    const still = await h.db.query('SELECT 1 FROM categories WHERE category_id=$1', [id]);
    expect(still.rows).toHaveLength(1);
  });

  test('IND-ADM-15 SQL-injection style name is stored literally', async () => {
    const name = nm("x'); DROP TABLE categories;--");
    const res = await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name, type: 'expense' });
    expect(res.status).toBe(201);
    const count = await h.db.query('SELECT count(*)::int n FROM categories');
    expect(count.rows[0].n).toBeGreaterThan(0);
  });

  // DEFECT BUG-AUTH-04
  test.failing('IND-ADM-16 very long category name does not cause a 500', async () => {
    const res = await h.request(app).post('/api/admin/categories').set(A(admin)).send({ name: 'x'.repeat(200), type: 'expense' });
    expect(res.status).toBeLessThan(500);
  });
});
