import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getVersion, getBuildNumber } from 'react-native-device-info';
import {
  authApi,
  meApi,
  setAuthToken,
  setStoredToken,
  setStoredRefreshToken,
  getStoredToken,
  type ApiError,
} from '../api';
import {
  enableBiometric,
  disableBiometric,
  getBiometricToken,
  isBiometricAvailable,
  getBiometryTypeName,
  isBiometricEnabled,
} from '../utils/biometric';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricAvailable: boolean;
  biometricType: string;
  biometricEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithBiometric: () => Promise<boolean>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  enableBiometricLogin: () => Promise<boolean>;
  disableBiometricLogin: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (u: User) => Promise<void>;
}

const STORAGE_KEY = '@nayaka_cctv_user';
const INSTALLATION_ID_KEY = '@nayaka_cctv_installation_id';

// Generate or retrieve installation ID
async function getInstallationId(): Promise<string> {
  let id = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (!id) {
    id = `mobile-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    await AsyncStorage.setItem(INSTALLATION_ID_KEY, id);
  }
  return id;
}

// Convert Customer to legacy User format
function customerToUser(customer: {
  id: string;
  full_name: string;
  email: string;
  status: string;
}): User {
  return {
    id: customer.id,
    name: customer.full_name,
    email: customer.email,
    role: customer.status,
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometrik');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await getBiometryTypeName();
        setBiometricType(type);
        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);
      }
    };
    checkBiometric();
  }, []);

  // Hydrate from storage on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const storedToken = parsed.token ?? null;

          if (storedToken) {
            setAuthToken(storedToken);
            // Validate token by fetching /me
            try {
              const customer = await meApi.get();
              const u = customerToUser(customer);
              setUser(u);
              await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ token: storedToken, user: u }),
              );
              return;
            } catch (e) {
              // Token invalid/expired - clear storage
              console.warn('Token invalid, clearing session');
              await AsyncStorage.removeItem(STORAGE_KEY);
              setAuthToken(null);
            }
          }
        }
      } catch (e) {
        console.warn('Gagal memuat sesi', e);
      } finally {
        setIsLoading(false);
      }
    };
    hydrate();
  }, []);

  const persist = async (accessToken: string, refreshToken: string, customer: {
    id: string;
    full_name: string;
    email: string;
    status: string;
  }) => {
    setAuthToken(accessToken);
    await setStoredToken(accessToken);
    await setStoredRefreshToken(refreshToken);
    const u = customerToUser(customer);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: accessToken, user: u }));
    setUser(u);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email || !password) throw new Error('Email dan password wajib diisi.');

    const installationId = await getInstallationId();
    const platform = Platform.OS;
    const appVersion = (() => {
      try { return getVersion(); } catch { return '1.0.0'; }
    })();

    const response = await authApi.login({
      email,
      password,
      installation_id: installationId,
      platform,
      app_version: appVersion,
    });

    await persist(
      response.access_token,
      response.refresh_token,
      response.customer,
    );

    // Update biometric enabled state
    const enabled = await isBiometricEnabled();
    setBiometricEnabled(enabled);
  }, []);

  // Biometric login - read token from secure storage
  const signInWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!biometricAvailable) return false;

    try {
      const token = await getBiometricToken();
      if (!token) return false;

      // Set token and validate
      setAuthToken(token);
      const customer = await meApi.get();
      const u = customerToUser(customer);

      await setStoredToken(token);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: u }));
      setUser(u);
      return true;
    } catch (e) {
      console.warn('Biometric login failed:', e);
      setAuthToken(null);
      return false;
    }
  }, [biometricAvailable]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (!name || !email || !password)
        throw new Error('Semua kolom wajib diisi.');

      const installationId = await getInstallationId();
      const platform = Platform.OS;
      const appVersion = (() => {
        try { return getVersion(); } catch { return '1.0.0'; }
      })();

      const response = await authApi.register({
        full_name: name,
        email,
        password,
        installation_id: installationId,
        platform,
        app_version: appVersion,
      });

      await persist(
        response.access_token,
        response.refresh_token,
        response.customer,
      );
    },
    [],
  );

  // Enable biometric login - stores current token with biometric protection
  const enableBiometricLogin = useCallback(async (): Promise<boolean> => {
    if (!biometricAvailable) return false;

    const token = await getStoredToken();
    if (!token) return false;

    const success = await enableBiometric(token);
    if (success) {
      setBiometricEnabled(true);
    }
    return success;
  }, [biometricAvailable]);

  // Disable biometric login - removes stored token
  const disableBiometricLogin = useCallback(async () => {
    await disableBiometric();
    setBiometricEnabled(false);
  }, []);

  // Sign out - keep biometric token, only clear regular session
  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore errors on logout
    }
    // Clear regular session but KEEP biometric token
    await AsyncStorage.removeItem(STORAGE_KEY);
    await setStoredToken(null);
    await setStoredRefreshToken(null);
    setAuthToken(null);
    setUser(null);
    // Keep biometric enabled state as is - biometric token remains
  }, []);

  const updateUser = useCallback(async (u: User) => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : { token: null };
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: parsed.token, user: u }),
    );
    setUser(u);

    // If biometric is enabled, update the stored token too
    if (biometricEnabled) {
      const token = parsed.token;
      if (token) {
        await enableBiometric(token);
      }
    }
  }, [biometricEnabled]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      biometricAvailable,
      biometricType,
      biometricEnabled,
      signIn,
      signInWithBiometric,
      signUp,
      enableBiometricLogin,
      disableBiometricLogin,
      signOut,
      updateUser,
    }),
    [
      user,
      isLoading,
      biometricAvailable,
      biometricType,
      biometricEnabled,
      signIn,
      signInWithBiometric,
      signUp,
      enableBiometricLogin,
      disableBiometricLogin,
      signOut,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
