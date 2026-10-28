import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatAmount = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function BudgetsPage() {
  const { accessToken } = useAuth();
  const [period, setPeriod] = useState(currentPeriod);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [dataToken, setDataToken] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories],
  );

  useEffect(() => {
    if (!accessToken) {
      setCategories([]);
      setBudgets([]);
      setDataToken(null);
      setCategoryId('');
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    const options = {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    };

    Promise.all([
      api.get('/transactions/categories', options),
      api.get(`/budgets/progress?period=${encodeURIComponent(period)}`, options),
    ])
      .then(([categoriesResponse, progressResponse]) => {
        if (controller.signal.aborted) return;
        const expenses = categoriesResponse.categories.filter(
          (category) => category.type === 'expense',
        );
        setCategories(expenses);
        setBudgets(progressResponse.budgets);
        setDataToken(accessToken);
        setCategoryId((current) =>
          expenses.some((category) => category.categoryId === current)
            ? current
            : expenses[0]?.categoryId || '',
        );
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, period, refreshVersion]);

  const visibleBudgets = dataToken === accessToken ? budgets : [];

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!accessToken) {
      setError('Sign in before creating a budget.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      await api.post(
        '/budgets',
        {
          category_id: categoryId || null,
          period,
          limit_amount: Number(limitAmount),
          alert_threshold: Number(alertThreshold),
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      setLimitAmount('');
      setNotice('Budget created.');
      setRefreshVersion((version) => version + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="budgets-page">
      <section className="content-panel" aria-labelledby="budgets-title">
        <div className="accounts-heading">
          <div>
            <p className="eyebrow">Plan your spending</p>
            <h2 id="budgets-title">Monthly budgets</h2>
          </div>
          <button
            className="secondary-button"
            disabled={loading || !accessToken}
            onClick={() => setRefreshVersion((version) => version + 1)}
            type="button"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {!accessToken && (
          <p className="inline-message" role="status">
            <Link to="/login">Sign in</Link> to view or create budgets.
          </p>
        )}
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {notice && <p className="form-message success-message" role="status">{notice}</p>}

        <form className="account-form" onSubmit={handleSubmit}>
          <h3>Create a budget</h3>
          <div className="account-form-grid">
            <label>
              Month
              <input
                name="period"
                onChange={(event) => setPeriod(event.target.value)}
                required
                type="month"
                value={period}
              />
            </label>
            <label>
              Expense category <span className="field-note">(optional for overall budget)</span>
              <select
                name="categoryId"
                onChange={(event) => setCategoryId(event.target.value)}
                value={categoryId}
              >
                <option value="">Overall budget</option>
                {expenseCategories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Limit
              <input
                min="0.01"
                name="limitAmount"
                onChange={(event) => setLimitAmount(event.target.value)}
                required
                step="0.01"
                type="number"
                value={limitAmount}
              />
            </label>
            <label>
              Alert threshold (%)
              <input
                max="100"
                min="0"
                name="alertThreshold"
                onChange={(event) => setAlertThreshold(event.target.value)}
                required
                step="1"
                type="number"
                value={alertThreshold}
              />
            </label>
          </div>
          <button
            className="primary-button"
            disabled={!accessToken || submitting || loading}
            type="submit"
          >
            {submitting ? 'Creating…' : 'Create budget'}
          </button>
        </form>

        <div className="account-list">
          <div className="account-list-heading">
            <h3>Budget progress</h3>
            <span>{period}</span>
          </div>
          {!accessToken ? (
            <p className="empty-state">Your budgets will appear here after you sign in.</p>
          ) : loading ? (
            <p className="empty-state">Loading budget progress…</p>
          ) : visibleBudgets.length === 0 ? (
            <p className="empty-state">No budgets for this month yet. Create one above.</p>
          ) : (
            <ul className="budget-list">
              {visibleBudgets.map((budget) => {
                const percentage = Number(budget.percentage_used);
                return (
                  <li className="budget-item" key={budget.budget_id}>
                    <div className="budget-item-heading">
                      <strong>{budget.category_name}</strong>
                      <span>
                        {formatAmount(budget.spent)} of {formatAmount(budget.limit_amount)}
                      </span>
                    </div>
                    <progress
                      aria-label={`${budget.category_name} budget used`}
                      max="100"
                      value={Math.min(percentage, 100)}
                    />
                    <div className="budget-item-footer">
                      <span>{percentage.toFixed(2)}% used</span>
                      <span>{formatAmount(budget.remaining)} remaining</span>
                    </div>
                    {budget.is_alert_triggered && (
                      <p className="budget-alert" role="status">
                        Alert threshold reached{budget.is_exceeded ? ' — budget exceeded' : ''}.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
