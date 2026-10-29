import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const INACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll', 'pointerdown'];

const AuthContext = createContext(null);

const decodeJwtPayload = (token) => {
  if (typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) {
      return null;
    }

    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const getAccessTokenExpiryMs = (token) => {
  const payload = decodeJwtPayload(token);
  if (payload && typeof payload.exp === 'number') {
    return payload.exp * 1000;
  }

  return Date.now() + SESSION_TIMEOUT_MS;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());

  const clearUser = useCallback(() => {
    setUser(null);
    setAccessTokenState(null);
    setLastActivityAt(Date.now());
  }, []);

  const setAccessToken = useCallback((nextToken) => {
    setAccessTokenState(nextToken || null);
    setLastActivityAt(Date.now());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    const tokenExpiresAt = getAccessTokenExpiryMs(accessToken);
    const inactivityDeadline = lastActivityAt + SESSION_TIMEOUT_MS;
    const timeoutAt = Math.min(tokenExpiresAt, inactivityDeadline);
    const timeoutMs = timeoutAt - Date.now();

    if (timeoutMs <= 0) {
      clearUser();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      clearUser();
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [accessToken, clearUser, lastActivityAt]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    const handleActivity = () => setLastActivityAt(Date.now());

    INACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    return () => {
      INACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [accessToken]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: user !== null,
      setUser,
      setAccessToken,
      clearUser,
    }),
    [accessToken, clearUser, setAccessToken, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
