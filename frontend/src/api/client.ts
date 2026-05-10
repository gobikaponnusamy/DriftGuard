import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '../types/api';

const API_KEY_STORAGE = 'driftguard_api_key';
const JWT_STORAGE = 'driftguard_access_token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(JWT_STORAGE);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const apiKey = localStorage.getItem(API_KEY_STORAGE);
  if (apiKey) {
    config.headers.set('X-API-Key', apiKey);
  }
  return config;
});

export async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const response = await request;
    if (!response.data.success) {
      throw new Error(response.data.error?.message ?? 'Request failed');
    }
    return response.data.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      const apiResponse = err.response?.data as ApiResponse<T> | undefined;
      throw new Error(apiResponse?.error?.message ?? err.message);
    }
    throw err;
  }
}

export function getStoredApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function setStoredApiKey(apiKey: string) {
  localStorage.setItem(API_KEY_STORAGE, apiKey);
}

export function clearStoredApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}

export function getStoredAccessToken() {
  return localStorage.getItem(JWT_STORAGE) ?? '';
}

export function setStoredAccessToken(token: string) {
  localStorage.setItem(JWT_STORAGE, token);
}

export function clearStoredAccessToken() {
  localStorage.removeItem(JWT_STORAGE);
}
