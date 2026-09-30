import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { alertsApi, camerasApi, getStoredToken } from '../api';
import type { Alert, Camera } from '../types';

interface DataContextValue {
  cameras: Camera[];
  alerts: Alert[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAlertRead: (id: string) => Promise<void>;
  markAllAlertsRead: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [camRes, alertRes] = await Promise.all([
        camerasApi.list({ limit: 50 }),
        alertsApi.list({ limit: 50 }),
      ]);
      // Debug: lihat URL stream/thumbnail persis seperti yang dikirim backend.
      if (Array.isArray(camRes)) {
        camRes.forEach(c =>
          console.log(
            `[camera] ${c.name} | stream=${c.stream_url} | thumbnail=${c.thumbnail_url ?? '-'}`,
          ),
        );
        if (__DEV__) {
          getStoredToken().then(t =>
            console.log(`[camera] token=${t ?? '-'}`),
          );
        }
      }
      setCameras(Array.isArray(camRes) ? camRes : []);
      setAlerts(Array.isArray(alertRes) ? alertRes : []);
      setUnreadCount(Array.isArray(alertRes) ? alertRes.filter(a => !a.read).length : 0);
    } catch (e) {
      console.warn('Gagal memuat data dashboard', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      refresh();
    } else {
      setCameras([]);
      setAlerts([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [isAuthenticated, refresh]);

  const markAlertRead = useCallback(async (id: string) => {
    try {
      await alertsApi.markRead(id);
      setAlerts(prev =>
        prev.map(a => (a.id === id ? { ...a, read: true } : a)),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.warn('Gagal menandai alert', e);
    }
  }, []);

  const markAllAlertsRead = useCallback(async () => {
    try {
      await alertsApi.markAllRead();
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.warn('Gagal menandai semua alert', e);
    }
  }, []);

  const value = useMemo(
    () => ({
      cameras,
      alerts,
      unreadCount,
      loading,
      refresh,
      markAlertRead,
      markAllAlertsRead,
    }),
    [
      cameras,
      alerts,
      unreadCount,
      loading,
      refresh,
      markAlertRead,
      markAllAlertsRead,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData harus dipakai di dalam DataProvider');
  return ctx;
}
