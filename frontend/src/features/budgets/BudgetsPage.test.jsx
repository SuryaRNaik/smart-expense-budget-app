import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../../api/client';
import { AuthProvider, useAuth } from '../../auth/AuthContext';
import { BudgetsPage } from './BudgetsPage';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function SetAuthenticatedUser() {
  const { setAccessToken, setUser } = useAuth();

  useEffect(() => {
    setUser({ userId: 'user-1', name: 'Demo User' });
    setAccessToken('demo-access-token');
  }, [setAccessToken, setUser]);

  return null;
}

function renderBudgetsPage({ authenticated = true } = {}) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AuthProvider>
        {authenticated && <SetAuthenticatedUser />}
        <BudgetsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('BudgetsPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => {
      if (path === '/transactions/categories') {
        return Promise.resolve({
          categories: [
            { categoryId: 'food-category', name: 'Food', type: 'expense' },
            { categoryId: 'salary-category', name: 'Salary', type: 'income' },
          ],
        });
      }
      if (path.startsWith('/budgets/progress?period=')) {
        return Promise.resolve({
          budgets: [{
            budget_id: 'budget-1',
            category_name: 'Food',
            limit_amount: '5000.00',
            spent: '250.00',
            remaining: '4750.00',
            percentage_used: 5,
            alert_threshold: '80.00',
            is_alert_triggered: false,
            is_exceeded: false,
          }],
        });
      }
      throw new Error(`Unexpected API path: ${path}`);
    });
  });

  it('loads authenticated progress and creates a category budget', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ message: 'Budget created successfully' });

    renderBudgetsPage();

    expect(await screen.findByText('₹250.00 of ₹5,000.00')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(
      '/budgets/progress?period=' + new Date().toISOString().slice(0, 7),
      expect.objectContaining({
        headers: { Authorization: 'Bearer demo-access-token' },
        signal: expect.any(AbortSignal),
      }),
    );

    await user.selectOptions(screen.getByLabelText(/Expense category/), 'food-category');
    await user.type(screen.getByLabelText('Limit'), '5000');
    await user.click(screen.getByRole('button', { name: 'Create budget' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/budgets',
        {
          category_id: 'food-category',
          period: new Date().toISOString().slice(0, 7),
          limit_amount: 5000,
          alert_threshold: 80,
        },
        { headers: { Authorization: 'Bearer demo-access-token' } },
      );
    });
    expect((await screen.findByRole('status')).textContent).toContain('Budget created.');
  });

  it('prompts unauthenticated users and hides budget creation', () => {
    renderBudgetsPage({ authenticated: false });

    expect(screen.getByRole('status').textContent).toContain('Sign in to view or create budgets.');
    expect(screen.getByRole('button', { name: 'Create budget' }).disabled).toBe(true);
    expect(api.get).not.toHaveBeenCalled();
  });
});
