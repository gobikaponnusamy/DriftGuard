import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { login as loginRequest } from '../api/endpoints';
import {
  clearStoredAccessToken,
  clearStoredApiKey,
  getStoredAccessToken,
  getStoredApiKey,
  setStoredAccessToken,
  setStoredApiKey,
} from '../api/client';

const AUTH_STORAGE = 'driftguard_authenticated';

interface AuthContextValue {
  isAuthenticated: boolean;
  apiKey: string;
  login: (email: string, password: string, apiKey?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setAuthenticated] = useState(
    () => localStorage.getItem(AUTH_STORAGE) === 'true' && Boolean(getStoredAccessToken()),
  );
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated,
    apiKey,
    login: async (email, password, nextApiKey) => {
      const session = await loginRequest({ email, password });
      localStorage.setItem(AUTH_STORAGE, 'true');
      setStoredAccessToken(session.accessToken);
      if (nextApiKey?.trim()) {
        setStoredApiKey(nextApiKey.trim());
        setApiKey(nextApiKey.trim());
      }
      setAuthenticated(true);
    },
    logout: () => {
      localStorage.removeItem(AUTH_STORAGE);
      clearStoredAccessToken();
      clearStoredApiKey();
      setApiKey('');
      setAuthenticated(false);
    },
  }), [apiKey, isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
