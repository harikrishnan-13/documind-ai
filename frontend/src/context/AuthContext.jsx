import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = (tokens) => {
    setAccessToken(tokens.access);
    setRefreshToken(tokens.refresh);
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const value = {
    accessToken,
    refreshToken,
    user,
    setUser,
    login,
    logout,
    isAuthenticated: Boolean(accessToken),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
