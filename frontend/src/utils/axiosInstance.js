import axios from "axios";
import { BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

//Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

//Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    //Handle common errors globally
    if (error.response) {
      if (error.response.status === 401) {
        // Check if it's a token expiration error
        if (error.response.data.expired) {
          // Try to refresh the token
          const refreshToken = localStorage.getItem("refreshToken");
          if (refreshToken) {
            try {
              const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh-token`, {
                refreshToken
              });
              
              // Store new access token
              localStorage.setItem("accessToken", refreshResponse.data.accessToken);
              
              // Retry original request with new token
              const originalRequest = error.config;
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
              return axiosInstance(originalRequest);
            } catch (refreshError) {
              // Refresh failed, redirect to login
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              window.location.href = "/login";
            }
          } else {
            // No refresh token, redirect to login
            window.location.href = "/login";
          }
        } else {
          // Invalid token, redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
      } else if (error.response.status === 500) {
        console.error("Server error, Please try again later");
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timeout, Please try again");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
