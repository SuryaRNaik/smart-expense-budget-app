const AccountService = require('../../../src/accounts/accountService');

describe('AccountService', () => {
  it('defaults the opening balance to zero and uses the authenticated user ID', async () => {
    const repository = { create: jest.fn().mockResolvedValue({ accountId: 'account-1' }) };
    const service = new AccountService(repository);

    await expect(service.createAccount('user-1', {
      accountType: 'cash',
      accountName: 'Wallet',
      userId: 'user-2',
    })).resolves.toEqual({ accountId: 'account-1' });

    expect(repository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      accountType: 'cash',
      accountName: 'Wallet',
      openingBalance: 0,
    });
  });

  it('accepts common two-decimal opening balances without floating-point errors', async () => {
    const repository = { create: jest.fn().mockResolvedValue({ accountId: 'account-1' }) };
    const service = new AccountService(repository);

    await service.createAccount('user-1', {
      accountType: 'cash',
      accountName: 'Wallet',
      openingBalance: 0.29,
    });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ openingBalance: 0.29 }));
  });

  it.each([
    [{ accountType: '', accountName: 'Wallet' }],
    [{ accountType: 'cash', accountName: '' }],
    [{ accountType: 'cash', accountName: 'Wallet', openingBalance: 'not-money' }],
    [{ accountType: 'cash', accountName: 'Wallet', openingBalance: 1.239 }],
  ])('rejects invalid account input %#', async (input) => {
    const repository = { create: jest.fn() };
    const service = new AccountService(repository);

    await expect(service.createAccount('user-1', input)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });
});
