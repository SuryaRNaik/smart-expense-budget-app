import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { AuthProvider, useAuth } from '../../auth/AuthContext';
import { AccountsPage } from './AccountsPage';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function AuthControls() {
  const { setUser, setAccessToken, clearUser } = useAuth();

  return (
    <div>
      <button
        onClick={() => {
          setUser({ userId: 'user-1' });
          setAccessToken('test-token');
        }}
        type="button"
      >
        Sign in
      </button>
      <button onClick={clearUser} type="button">Sign out</button>
    </div>
  );
}

function renderAccountsPage() {
  return render(
    <AuthProvider>
      <AuthControls />
      <AccountsPage />
    </AuthProvider>,
  );
}

describe('AccountsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists and creates accounts with the bearer token', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({
      accounts: [{
        accountId: 'account-existing',
        accountName: 'Savings',
        accountType: 'bank',
        balance: 450,
      }],
    });
    api.post.mockResolvedValue({
      account: {
        accountId: 'account-1',
        accountName: 'Everyday checking',
        accountType: 'bank',
        balance: 125,
      },
    });
    renderAccountsPage();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Savings')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(
      '/accounts',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
        signal: expect.any(AbortSignal),
      }),
    );

    await user.type(screen.getByLabelText('Account name'), 'Everyday checking');
    await user.selectOptions(screen.getByLabelText('Account type'), 'bank');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Everyday checking')).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith(
      '/accounts',
      { accountType: 'bank', accountName: 'Everyday checking' },
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('does not request or create accounts without a token', async () => {
    const user = userEvent.setup();
    renderAccountsPage();

    expect(screen.getByRole('button', { name: 'Create account' }).disabled).toBe(true);
    expect(api.get).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('ignores a pending account response after sign out', async () => {
    const user = userEvent.setup();
    let resolveRequest;
    let requestSignal;
    api.get.mockImplementation((_path, options) => {
      requestSignal = options.signal;
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    });
    renderAccountsPage();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(requestSignal.aborted).toBe(true);
    await act(async () => {
      resolveRequest({
        accounts: [{
          accountId: 'late-account',
          accountName: 'Stale account',
          accountType: 'cash',
          balance: 50,
        }],
      });
    });
    expect(screen.queryByText('Stale account')).toBeNull();
    expect(screen.getByText('Your accounts will appear here after you sign in.')).toBeTruthy();
  });
});
