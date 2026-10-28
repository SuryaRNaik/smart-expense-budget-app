import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export function AccountsPage() {
  const { accessToken } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [accountsToken, setAccountsToken] = useState(null);
  const [accountType, setAccountType] = useState('cash');
  const [accountName, setAccountName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestControllers = useRef(new Set());

  const loadAccounts = useCallback(async () => {
    if (!accessToken) {
      setAccounts([]);
      setAccountsToken(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    requestControllers.current.add(controller);
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setAccounts(response.accounts);
        setAccountsToken(accessToken);
      }
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      requestControllers.current.delete(controller);
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    setSubmitting(false);
    loadAccounts();
    return () => {
      for (const controller of requestControllers.current) {
        controller.abort();
      }
      requestControllers.current.clear();
    };
  }, [loadAccounts]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!accessToken) {
      setError('Sign in before creating an account.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');
    const controller = new AbortController();
    requestControllers.current.add(controller);
    try {
      const payload = { accountType, accountName };
      if (openingBalance !== '') payload.openingBalance = Number(openingBalance);

      const response = await api.post('/accounts', payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setAccounts((currentAccounts) => [response.account, ...currentAccounts]);
      setAccountsToken(accessToken);
      setAccountName('');
      setOpeningBalance('');
      setNotice('Account created.');
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      requestControllers.current.delete(controller);
      if (!controller.signal.aborted) setSubmitting(false);
    }
  };

  const visibleAccounts = accountsToken === accessToken ? accounts : [];

  return (
    <div className="accounts-page">
      <section className="content-panel" aria-labelledby="accounts-title">
        <div className="accounts-heading">
          <div>
            <p className="eyebrow">Your money sources</p>
            <h2 id="accounts-title">Accounts</h2>
          </div>
          <button className="secondary-button" type="button" onClick={loadAccounts} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {!accessToken && (
          <p className="inline-message" role="status">
            Sign in to view or create your accounts. Account requests use your authenticated session.
          </p>
        )}
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {notice && <p className="form-message success-message" role="status">{notice}</p>}

        <form className="account-form" onSubmit={handleSubmit}>
          <h3>Add an account</h3>
          <div className="account-form-grid">
            <label>
              Account name
              <input
                autoComplete="organization"
                maxLength={100}
                name="accountName"
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="e.g. Everyday checking"
                required
                value={accountName}
              />
            </label>
            <label>
              Account type
              <select
                name="accountType"
                onChange={(event) => setAccountType(event.target.value)}
                value={accountType}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="digital wallet">Digital wallet</option>
              </select>
            </label>
            <label>
              Opening balance <span className="field-note">(optional)</span>
              <input
                inputMode="decimal"
                min="0"
                name="openingBalance"
                onChange={(event) => setOpeningBalance(event.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={openingBalance}
              />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={submitting || !accessToken}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="account-list" aria-live="polite">
          <div className="account-list-heading">
            <h3>Your accounts</h3>
            <span>{visibleAccounts.length} {visibleAccounts.length === 1 ? 'account' : 'accounts'}</span>
          </div>
          {!accessToken ? (
            <p className="empty-state">Your accounts will appear here after you sign in.</p>
          ) : loading ? (
            <p className="empty-state">Loading accounts…</p>
          ) : visibleAccounts.length === 0 ? (
            <p className="empty-state">
              No accounts yet. Create one above to get started.
            </p>
          ) : (
            <ul className="account-list-items">
              {visibleAccounts.map((account) => (
                <li className="account-list-item" key={account.accountId}>
                  <span className="account-avatar" aria-hidden="true">
                    {account.accountName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="account-details">
                    <strong>{account.accountName}</strong>
                    <span>{account.accountType}</span>
                  </span>
                  <strong className="account-balance">
                    ₹{Number(account.balance).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
