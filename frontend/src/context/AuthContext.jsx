import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { setupInterceptors } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = useCallback((tokens) => {
    setAccessToken(tokens.access);
    setRefreshToken(tokens.refresh);
  }, []);

  const updateTokens = useCallback((tokens) => {
    setAccessToken(tokens.access);
    setRefreshToken(tokens.refresh);
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const ejectInterceptors = setupInterceptors(
      accessToken,
      refreshToken,
      updateTokens,
      logout,
    );

    return ejectInterceptors;
  }, [accessToken, refreshToken, updateTokens, logout]);

  const value = {
    accessToken,
    refreshToken,
    user,
    setUser,
    login,
    logout,
    updateTokens,
    isAuthenticated: Boolean(accessToken),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
