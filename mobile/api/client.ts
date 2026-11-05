import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://connect.houseofgrace.ph/api/mobile';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Platform': Platform.OS,
  },
});

client.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('hgf_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore SecureStore read error on web
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let signOutHandler: (() => void) | null = null;

export const setSignOutHandler = (handler: () => void) => {
  signOutHandler = handler;
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        await SecureStore.deleteItemAsync('hgf_token');
        await SecureStore.deleteItemAsync('hgf_user');
        if (signOutHandler) {
          signOutHandler();
        }
      } catch {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export default client;
