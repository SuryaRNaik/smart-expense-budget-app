const config = require("../../src/config");
const request = require("supertest");
const app = require("../../src/app");
const { getPool, closePool } = require("../../src/db");
const originalJwtSecret = config.jwtSecret;

describe("S1-09: Full PostgreSQL flow (TC-E2E-01)", () => {
  const email = `s109-${Date.now()}@example.com`;
  const password = "S1-09-Test-Password-2026!";

  beforeAll(() => {
    config.jwtSecret = "s1-09-integration-test-secret";
  });

  afterAll(async () => {
    const pool = getPool();

    try {
      const result = await pool.query(
        "SELECT user_id FROM users WHERE email = $1",
        [email],
      );

      const userId = result.rows[0]?.user_id;

      if (userId) {
        await pool.query(
          `DELETE FROM transactions
           WHERE account_id IN (
             SELECT account_id FROM accounts WHERE user_id = $1
           )`,
          [userId],
        );
        await pool.query("DELETE FROM budgets WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM accounts WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM users WHERE user_id = $1", [userId]);
      }
    } finally {
      config.jwtSecret = originalJwtSecret;
      await closePool();
    }
  });

  test("registers, logs in, creates an account, records transactions and checks budget progress", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const period = today.slice(0, 7);

    // 1. Register a new user.
    const registration = await request(app)
      .post("/api/auth/register")
      .send({
        name: "S1-09 Test User",
        email,
        password,
      })
      .expect(201);

    expect(registration.body.user.email).toBe(email);

    // 2. Log in and obtain an access token.
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password })
      .expect(200);

    const token = login.body.token;
    expect(token).toBeTruthy();

    const auth = { Authorization: `Bearer ${token}` };

    // 3. Create an account with an opening balance.
    const accountResponse = await request(app)
      .post("/api/accounts")
      .set(auth)
      .send({
        accountName: "S1-09 Test Account",
        accountType: "checking",
        openingBalance: 1000,
      })
      .expect(201);

    const accountId = accountResponse.body.account.accountId;

    expect(accountResponse.body.account.balance).toBe(1000);

    // 4. Get valid expense and income categories.
    const categoriesResponse = await request(app)
      .get("/api/transactions/categories")
      .set(auth)
      .expect(200);

    const expenseCategory = categoriesResponse.body.categories.find(
      (category) => category.type === "expense",
    );

    const incomeCategory = categoriesResponse.body.categories.find(
      (category) => category.type === "income",
    );

    expect(expenseCategory).toBeDefined();
    expect(incomeCategory).toBeDefined();

    // 5. Record an expense; balance should decrease to 880.
    const expense = await request(app)
      .post("/api/transactions")
      .set(auth)
      .send({
        accountId,
        categoryId: expenseCategory.categoryId,
        amount: 120,
        type: "expense",
        date: today,
        notes: "S1-09 test expense",
      })
      .expect(201);

    expect(expense.body.newBalance).toBe(880);

    // 6. Record income; balance should increase to 930.
    const income = await request(app)
      .post("/api/transactions")
      .set(auth)
      .send({
        accountId,
        categoryId: incomeCategory.categoryId,
        amount: 50,
        type: "income",
        date: today,
        notes: "S1-09 test income",
      })
      .expect(201);

    expect(income.body.newBalance).toBe(930);

    // 7. Create an expense budget.
    await request(app)
      .post("/api/budgets")
      .set(auth)
      .send({
        category_id: expenseCategory.categoryId,
        period,
        limit_amount: 500,
        alert_threshold: 80,
      })
      .expect(201);

    // 8. Verify spending and remaining budget.
    const progress = await request(app)
      .get(`/api/budgets/progress?period=${period}`)
      .set(auth)
      .expect(200);

    const budget = progress.body.budgets.find(
      (item) => item.category_id === expenseCategory.categoryId,
    );

    expect(budget).toBeDefined();
    expect(Number(budget.spent)).toBe(120);
    expect(Number(budget.remaining)).toBe(380);
  });
});
