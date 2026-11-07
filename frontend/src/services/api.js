import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Shared promise prevents multiple simultaneous refresh requests.
let refreshPromise = null;

export function setupInterceptors(
  accessToken,
  refreshToken,
  updateTokens,
  onAuthFailure,
) {
  // REQUEST INTERCEPTOR
  const requestInterceptor = api.interceptors.request.use(
    (config) => {
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  // RESPONSE INTERCEPTOR
  const responseInterceptor = api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (!originalRequest || error.response?.status !== 401) {
        return Promise.reject(error);
      }

      // Do not retry the same request indefinitely.
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      // Login and refresh errors should not trigger another refresh.
      const requestUrl = originalRequest.url || "";

      if (
        requestUrl.includes("/auth/login/") ||
        requestUrl.includes("/auth/token/refresh/") ||
        requestUrl.includes("/auth/token/verify/")
      ) {
        return Promise.reject(error);
      }

      if (!refreshToken) {
        onAuthFailure();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${baseURL}/auth/token/refresh/`, {
              refresh: refreshToken,
            })
            .then((response) => response.data)
            .finally(() => {
              refreshPromise = null;
            });
        }

        const tokens = await refreshPromise;

        // SimpleJWT rotation may return a new refresh token too.
        const newTokens = {
          access: tokens.access,
          refresh: tokens.refresh || refreshToken,
        };

        updateTokens(newTokens);

        // Retry the original request with the new access token.
        originalRequest.headers = originalRequest.headers || {};

        originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;

        return api(originalRequest);
      } catch (refreshError) {
        onAuthFailure();
        return Promise.reject(refreshError);
      }
    },
  );

  // Remove these interceptors when their configuration changes.
  return () => {
    api.interceptors.request.eject(requestInterceptor);
    api.interceptors.response.eject(responseInterceptor);
  };
}

export default api;
