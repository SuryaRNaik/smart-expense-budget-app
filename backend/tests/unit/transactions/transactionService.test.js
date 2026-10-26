const TransactionService = require('../../../src/transactions/transactionService');

const validInput = {
  accountId: 'account-1',
  categoryId: 'category-1',
  amount: 25.5,
  type: 'Expense',
  date: '2026-10-20',
};

describe('TransactionService', () => {
  it('validates and persists a transaction for the authenticated user', async () => {
    const repository = {
      createAndUpdateBalance: jest.fn().mockResolvedValue({
        transaction: {
          transactionId: 'transaction-1',
          accountId: 'account-1',
          categoryId: 'category-1',
          amount: 25.5,
          type: 'Expense',
          date: '2026-10-20',
          notes: null,
          createdAt: '2026-10-20T10:00:00.000Z',
        },
        newBalance: 74.5,
      }),
    };
    const service = new TransactionService(repository);

    await expect(service.createTransaction('user-1', validInput)).resolves.toMatchObject({
      transactionId: 'transaction-1',
      newBalance: 74.5,
    });
    expect(repository.createAndUpdateBalance).toHaveBeenCalledWith({
      userId: 'user-1',
      accountId: 'account-1',
      categoryId: 'category-1',
      amount: 25.5,
      type: 'Expense',
      date: '2026-10-20',
      notes: null,
    });
  });

  it('accepts common two-decimal transaction amounts without floating-point errors', async () => {
    const repository = {
      createAndUpdateBalance: jest.fn().mockResolvedValue({
        transaction: {
          transactionId: 'transaction-1',
          accountId: 'account-1',
          categoryId: 'category-1',
          amount: 0.29,
          type: 'Expense',
          date: '2026-10-20',
          notes: null,
          createdAt: '2026-10-20T10:00:00.000Z',
        },
        newBalance: 0.71,
      }),
    };
    const service = new TransactionService(repository);

    await expect(service.createTransaction('user-1', {
      ...validInput,
      amount: 0.29,
    })).resolves.toMatchObject({ amount: 0.29 });
  });

  it.each([
    [{ ...validInput, amount: 0 }],
    [{ ...validInput, amount: 1.234 }],
    [{ ...validInput, type: 'Transfer' }],
    [{ ...validInput, date: '2026-02-30' }],
    [{ ...validInput, categoryId: '' }],
  ])('rejects invalid transaction input %#', async (input) => {
    const repository = { createAndUpdateBalance: jest.fn() };
    const service = new TransactionService(repository);

    await expect(service.createTransaction('user-1', input)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
    expect(repository.createAndUpdateBalance).not.toHaveBeenCalled();
  });
});
