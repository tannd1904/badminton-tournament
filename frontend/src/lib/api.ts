import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Interceptor to attach JWT token if present in localStorage / cookies
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor to handle responses and unwrapping
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data;
    return Promise.reject(errorData || { success: false, message: error.message });
  }
);

