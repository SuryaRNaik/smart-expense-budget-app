import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../../api/client';
import { AuthProvider } from '../../auth/AuthContext';
import { TransactionsPage } from '../transactions/TransactionsPage';
import { LoginPage } from './LoginPage';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function renderLoginFlow(initialEntry = '/login') {
  return render(
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      initialEntries={[initialEntry]}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the login token into AuthContext for transaction requests', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((path) => {
      if (path === '/auth/login') {
        return Promise.resolve({
          token: 'access-token-from-login',
          refreshToken: 'refresh-token-from-login',
          tokenType: 'Bearer',
          user: {
            userId: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
          },
        });
      }
      if (path === '/transactions') {
        return Promise.resolve({
          transactionId: 'transaction-1',
          accountId: 'account-1',
          categoryId: 'category-expense',
          amount: 10,
          type: 'expense',
          date: '2026-10-28',
          newBalance: 90,
          createdAt: '2026-10-28T10:00:00.000Z',
        });
      }
      throw new Error(`Unexpected API path: ${path}`);
    });
    api.get.mockImplementation((path) => {
      if (path === '/accounts') {
        return Promise.resolve({
          accounts: [{
            accountId: 'account-1',
            accountName: 'Daily account',
            accountType: 'bank',
            balance: 100,
          }],
        });
      }
      if (path === '/transactions/categories') {
        return Promise.resolve({
          categories: [{ categoryId: 'category-expense', name: 'Groceries', type: 'expense' }],
        });
      }
      if (path === '/transactions') return Promise.resolve({ transactions: [] });
      throw new Error(`Unexpected API path: ${path}`);
    });

    renderLoginFlow();
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'secure-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Transactions' })).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'secure-password',
    });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          headers: { Authorization: 'Bearer access-token-from-login' },
          signal: expect.any(AbortSignal),
        }),
      );
    });

    await user.type(screen.getByLabelText('Amount'), '10');
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          accountId: 'account-1',
          categoryId: 'category-expense',
          amount: 10,
          type: 'expense',
        }),
        expect.objectContaining({
          headers: { Authorization: 'Bearer access-token-from-login' },
        }),
      );
    });
  });

  it('shows login failures without authenticating', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new Error('Invalid email or password.'));
    renderLoginFlow();

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Invalid email or password.');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
  });
});
