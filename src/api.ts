/**
 * Nayaka Mobile API Client
 * Base URL: https://nayaka-admin.vercel.app/api/v1/mobile
 *
 * Response envelope: { data, meta }
 * Error envelope: { error: { code, message, details, request_id } }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Base URL & Config ────────────────────────────────────────────────────
export const BASE_URL = 'https://nayaka-admin.vercel.app/api/v1';

// ── Storage Keys ─────────────────────────────────────────────────────────
export const TOKEN_KEY = '@nayaka_cctv_token';
export const REFRESH_TOKEN_KEY = '@nayaka_cctv_refresh_token';
export const USER_KEY = '@nayaka_cctv_user';

// ── Token Storage ────────────────────────────────────────────────────────
export function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): Promise<void> {
  if (token) return AsyncStorage.setItem(TOKEN_KEY, token);
  return AsyncStorage.removeItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string | null): Promise<void> {
  if (token) return AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  return AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── Error Types ─────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Error code → human-readable message
const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Data yang dikirim tidak valid.',
  INVALID_CREDENTIALS: 'Email atau kata sandi salah.',
  TOKEN_EXPIRED: 'Sesi Anda telah berakhir. Silakan login ulang.',
  TOKEN_REVOKED: 'Sesi Anda telah dicabut. Silakan login ulang.',
  CUSTOMER_SUSPENDED: 'Akun Anda ditangguhkan. Hubungi tim kami.',
  RESOURCE_NOT_FOUND: 'Data tidak ditemukan.',
  EMAIL_ALREADY_REGISTERED: 'Email sudah terdaftar.',
  WEAK_PASSWORD: 'Kata sandi terlalu lemah.',
  VERIFICATION_EXPIRED: 'Kode sudah kadaluarsa.',
  INVALID_VERIFICATION_CODE: 'Kode yang dimasukkan salah.',
  VERIFICATION_ATTEMPTS_EXCEEDED: 'Terlalu banyak percobaan. Coba lagi nanti.',
  RATE_LIMITED: 'Terlalu banyak permintaan. Coba lagi nanti.',
  INTERNAL_ERROR: 'Terjadi kesalahan server.',
};

function getErrorMessage(code: string, fallback: string): string {
  return ERROR_MESSAGES[code] ?? fallback;
}

// ── Auth Token ──────────────────────────────────────────────────────────
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// ── API Core ────────────────────────────────────────────────────────────
interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
}

interface ApiResponse<T> {
  data: T;
  meta: {
    request_id?: string;
    pagination?: { cursor: string; has_more: boolean };
  };
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, authenticated = true } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authenticated && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Tidak dapat terhubung ke server.');
  }

  // Parse response
  let parsed: ApiResponse<unknown> | ApiErrorResponse | null = null;
  let rawData: Record<string, unknown> = {};

  try {
    rawData = await res.json();
    // Check if it's an error envelope
    if (rawData.error) {
      const err = rawData as unknown as ApiErrorResponse;
      const status = err.error.code === 'TOKEN_EXPIRED' || err.error.code === 'TOKEN_REVOKED' ? 401 : res.status;
      throw new ApiError(status, err.error.code, getErrorMessage(err.error.code, err.error.message));
    }
    parsed = rawData as unknown as ApiResponse<T>;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    // Non-JSON response or parse error
    if (!res.ok) {
      throw new ApiError(res.status, 'UNKNOWN_ERROR', `Gagal (${res.status})`);
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, 'UNKNOWN_ERROR', getErrorMessage('UNKNOWN_ERROR', `Gagal (${res.status})`));
  }

  // Return the data portion of the envelope
  if (parsed && 'data' in parsed) {
    return parsed.data as T;
  }

  return rawData as T;
}

// ── Customer Types ───────────────────────────────────────────────────────
export interface Customer {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: 'active' | 'suspended' | 'inactive';
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ── Auth API ────────────────────────────────────────────────────────────
export const authApi = {
  register: (params: {
    full_name: string;
    email: string;
    password: string;
    installation_id: string;
    platform: string;
    app_version: string;
  }) =>
    api<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      onboarding_required: boolean;
      customer: Customer;
    }>('/mobile/auth/register', {
      method: 'POST',
      body: params,
      authenticated: false,
    }),

  login: (params: {
    email: string;
    password: string;
    installation_id: string;
    platform: string;
    app_version: string;
  }) =>
    api<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      onboarding_required: boolean;
      customer: Customer;
    }>('/mobile/auth/login', {
      method: 'POST',
      body: params,
      authenticated: false,
    }),

  refresh: (refresh_token: string, installation_id: string) =>
    api<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    }>('/mobile/auth/refresh', {
      method: 'POST',
      body: { refresh_token, installation_id },
      authenticated: false,
    }),

  logout: () =>
    api<{ meta: { request_id: string } }>('/mobile/auth/logout', {
      method: 'POST',
    }),

  logoutAll: () =>
    api<{ meta: { request_id: string } }>('/mobile/auth/logout-all', {
      method: 'POST',
    }),

  forgotPassword: (email: string) =>
    api<{ data: { sent: boolean; expires_in: number }; meta: { request_id: string } }>(
      '/mobile/auth/forgot-password',
      { method: 'POST', body: { email }, authenticated: false },
    ),

  resetPassword: (email: string, code: string, new_password: string) =>
    api<void>('/mobile/auth/reset-password', {
      method: 'POST',
      body: { email, code, new_password },
      authenticated: false,
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api<{ meta: { request_id: string } }>('/mobile/auth/change-password', {
      method: 'POST',
      body: { old_password: oldPassword, new_password: newPassword },
    }),
};

// ── Me / Profile API ─────────────────────────────────────────────────────
export const meApi = {
  get: () => api<{ data: Customer; meta: { request_id: string } }>('/mobile/me'),
  update: (params: { full_name?: string; avatar_url?: string }) =>
    api<{ data: Customer; meta: { request_id: string } }>('/mobile/me', {
      method: 'PATCH',
      body: params,
    }),
};

// ── Dashboard API ────────────────────────────────────────────────────────
export interface DashboardStats {
  total_cameras: number;
  active_cameras: number;
  recording_cameras: number;
  offline_cameras: number;
  unknown_cameras: number;
  alert_unread: number;
  recent_active_cameras: Array<{
    id: string;
    name: string;
    status: string;
    is_recording: boolean;
  }>;
  recent_alerts: Array<{
    id: string;
    camera_id: string;
    camera_name: string;
    type: string;
    severity: string;
    message: string;
    time: string;
  }>;
}

export const dashboardApi = {
  get: () => api<{ data: DashboardStats; meta: { request_id: string } }>('/mobile/dashboard'),
};

// ── Camera API ──────────────────────────────────────────────────────────
export type CameraStatus = 'online' | 'offline' | 'recording';
export type CameraType = 'indoor' | 'outdoor' | 'ptz' | 'doorbell';

export interface Camera {
  id: string;
  name: string;
  location: string;
  ip: string;
  status: CameraStatus;
  type: CameraType;
  resolution: string;
  fov: number;
  battery?: number | null;
  is_recording: boolean;
  has_alert: boolean;
}

export const camerasApi = {
  list: (params?: {
    status?: string;
    recording_status?: string;
    q?: string;
    limit?: number;
    cursor?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.recording_status) q.set('recording_status', params.recording_status);
    if (params?.q) q.set('q', params.q);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return api<{
      data: Camera[];
      meta: {
        request_id: string;
        pagination?: { cursor: string; has_more: boolean };
      };
    }>(`/mobile/cameras${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    api<{ data: Camera; meta: { request_id: string } }>(`/mobile/cameras/${id}`),

  getSettings: (id: string) =>
    api<{ data: { motion_detection: boolean; notification_enabled: boolean }; meta: { request_id: string } }>(
      `/mobile/cameras/${id}/settings`,
    ),

  updateSettings: (
    id: string,
    settings: { motion_detection?: boolean; notification_enabled?: boolean },
  ) =>
    api<{ data: { motion_detection: boolean; notification_enabled: boolean }; meta: { request_id: string } }>(
      `/mobile/cameras/${id}/settings`,
      { method: 'PATCH', body: settings },
    ),

  startRecording: (id: string) =>
    api<{ data: { recording_id: string }; meta: { request_id: string } }>(
      `/mobile/cameras/${id}/recordings/start`,
      { method: 'POST' },
    ),

  stopRecording: (id: string) =>
    api<{ data: { recording_id: string }; meta: { request_id: string } }>(
      `/mobile/cameras/${id}/recordings/stop`,
      { method: 'POST' },
    ),
};

// ── Recording API ───────────────────────────────────────────────────────
export type RecordingStatus = 'available' | 'processing' | 'deleted';

export interface Recording {
  id: string;
  camera_id: string;
  camera_name: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  duration: number;
  size_bytes: number;
  status: RecordingStatus;
  has_motion: boolean;
  thumbnail_url?: string;
  playback_url?: string;
}

export const recordingsApi = {
  list: (params?: {
    camera_id?: string;
    status?: RecordingStatus;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.camera_id) q.set('camera_id', params.camera_id);
    if (params?.status) q.set('status', params.status);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return api<{
      data: Recording[];
      meta: {
        request_id: string;
        pagination?: { cursor: string; has_more: boolean };
      };
    }>(`/mobile/recordings${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    api<{ data: Recording; meta: { request_id: string } }>(`/mobile/recordings/${id}`),
};

// ── Alert API ───────────────────────────────────────────────────────────
export type AlertType = 'motion' | 'person' | 'vehicle' | 'sound' | 'line';
export type Severity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  camera_id: string;
  camera_name: string;
  type: AlertType;
  severity: Severity;
  message: string;
  time: string;
  read: boolean;
}

export const alertsApi = {
  list: (params?: {
    camera_id?: string;
    is_read?: boolean;
    severity?: Severity;
    type?: AlertType;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.camera_id) q.set('camera_id', params.camera_id);
    if (params?.is_read !== undefined) q.set('is_read', String(params.is_read));
    if (params?.severity) q.set('severity', params.severity);
    if (params?.type) q.set('type', params.type);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return api<{
      data: Alert[];
      meta: {
        request_id: string;
        pagination?: { cursor: string; has_more: boolean };
      };
    }>(`/mobile/alerts${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    api<{ data: Alert; meta: { request_id: string } }>(`/mobile/alerts/${id}`),

  markRead: (id: string) =>
    api<{ meta: { request_id: string } }>(`/mobile/alerts/${id}/read`, {
      method: 'POST',
    }),

  markAllRead: () =>
    api<{ meta: { request_id: string } }>('/mobile/alerts/read-all', {
      method: 'POST',
    }),
};

// ── Subscription API ────────────────────────────────────────────────────
export type SubscriptionStatus = 'active' | 'expired' | 'pending';
export type PaymentMethod = 'transfer' | 'qris' | 'va' | 'card';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  cameras: number;
  storage_days: number;
  description: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  status: SubscriptionStatus;
  starts_at: string | null;
  ends_at: string;
  created_at: string;
  days_left: number | null;
}

export const subscriptionsApi = {
  plans: () =>
    api<{ data: SubscriptionPlan[]; meta: { request_id: string } }>(
      '/mobile/subscription-plans',
    ),

  list: () =>
    api<{
      data: { subscriptions: Subscription[]; active: Subscription | null };
      meta: { request_id: string };
    }>('/mobile/subscriptions'),

  subscribe: (planId: string, method: PaymentMethod) =>
    api<{
      data: { subscriptions: Subscription[]; active: Subscription | null };
      meta: { request_id: string };
    }>('/mobile/subscriptions', {
      method: 'POST',
      body: { plan_id: planId, payment_method: method },
    }),
};

// ── Snapshot API ────────────────────────────────────────────────────────
export interface Snapshot {
  id: string;
  camera_id: string;
  camera_name: string;
  captured_at: string;
  size_bytes: number;
  resolution: string;
  thumbnail_url: string;
}

export const snapshotsApi = {
  create: (cameraId: string) =>
    api<{ data: Snapshot; meta: { request_id: string } }>('/mobile/snapshots', {
      method: 'POST',
      body: { camera_id: cameraId },
    }),

  list: (params?: { camera_id?: string; limit?: number; cursor?: string }) => {
    const q = new URLSearchParams();
    if (params?.camera_id) q.set('camera_id', params.camera_id);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return api<{
      data: Snapshot[];
      meta: {
        request_id: string;
        pagination?: { cursor: string; has_more: boolean };
      };
    }>(`/mobile/snapshots${qs ? `?${qs}` : ''}`);
  },
};

// ── Help & Terms ────────────────────────────────────────────────────────
export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface LegalDocument {
  id: string;
  type: 'terms' | 'privacy' | 'cookies';
  title: string;
  content: string;
  version: string;
  locale: string;
  published_at: string;
}

export const helpApi = {
  list: (params?: {
    q?: string;
    category?: string;
    locale?: string;
    limit?: number;
    cursor?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.category) q.set('category', params.category);
    if (params?.locale) q.set('locale', params.locale);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return api<{
      data: HelpArticle[];
      meta: {
        request_id: string;
        pagination?: { cursor: string; has_more: boolean };
      };
    }>(`/mobile/help${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    api<{ data: HelpArticle; meta: { request_id: string } }>(`/mobile/help/${id}`),

  terms: (params?: { locale?: string; version?: string }) => {
    const q = new URLSearchParams();
    if (params?.locale) q.set('locale', params.locale);
    if (params?.version) q.set('version', params.version);
    const qs = q.toString();
    return api<{ data: LegalDocument; meta: { request_id: string } }>(
      `/mobile/terms${qs ? `?${qs}` : ''}`,
    );
  },
};

// ── Emergency Contacts ──────────────────────────────────────────────────
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  description?: string;
  is_active: boolean;
}

export const emergencyApi = {
  list: () =>
    api<{ data: EmergencyContact[]; meta: { request_id: string } }>(
      '/mobile/emergency-contacts',
    ),
};

// ── Settings ─────────────────────────────────────────────────────────────
export interface CustomerSettings {
  push_enabled: boolean;
  motion_notifications: boolean;
  biometric_enabled: boolean;
}

export const settingsApi = {
  get: () =>
    api<{ data: CustomerSettings; meta: { request_id: string } }>(
      '/mobile/me/settings',
    ),

  update: (settings: Partial<CustomerSettings>) =>
    api<{ data: CustomerSettings; meta: { request_id: string } }>(
      '/mobile/me/settings',
      { method: 'PATCH', body: settings },
    ),

  registerPushToken: (installationId: string, token: string, platform: string) =>
    api<{ data: { installation_id: string }; meta: { request_id: string } }>(
      '/mobile/me/push-tokens',
      { method: 'POST', body: { installation_id: installationId, token, platform } },
    ),

  removePushToken: (installationId: string) =>
    api<{ meta: { request_id: string } }>(
      `/mobile/me/push-tokens/${installationId}`,
      { method: 'DELETE' },
    ),

  enableBiometric: () =>
    api<{ data: { enabled: boolean }; meta: { request_id: string } }>(
      '/mobile/me/biometric',
      { method: 'POST' },
    ),

  disableBiometric: () =>
    api<{ meta: { request_id: string } }>('/mobile/me/biometric', {
      method: 'DELETE',
    }),
};

// ── Legacy exports for backward compatibility (deprecated) ───────────────
// These are kept for screens that haven't been updated yet.
// Will be removed after all screens are migrated.

/** @deprecated Use authApi.login instead */
export const legacyAuthApi = {
  register: (name: string, email: string, password: string) =>
    api<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/mobile/auth/register',
      {
        method: 'POST',
        body: { full_name: name, email, password, installation_id: 'legacy', platform: 'unknown', app_version: '0.0.0' },
        authenticated: false,
      },
    ).then(r => ({ token: r.token, user: r.user })),

  login: (email: string, password: string) =>
    api<{ access_token: string; customer: { id: string; full_name: string; email: string; status: string } }>(
      '/mobile/auth/login',
      {
        method: 'POST',
        body: { email, password, installation_id: 'legacy', platform: 'unknown', app_version: '0.0.0' },
        authenticated: false,
      },
    ).then(r => ({
      token: r.access_token,
      user: { id: r.customer.id, name: r.customer.full_name, email: r.customer.email, role: r.customer.status },
    })),

  me: () =>
    api<{ data: { id: string; full_name: string; email: string; status: string; avatar_url: string | null } }>(
      '/mobile/me',
    ).then(r => ({ user: { id: r.data.id, name: r.data.full_name, email: r.data.email, role: r.data.status } })),

  updateProfile: (name: string) =>
    api<{ data: { id: string; full_name: string; email: string; status: string } }>(
      '/mobile/me',
      { method: 'PATCH', body: { full_name: name } },
    ).then(r => ({ user: { id: r.data.id, name: r.data.full_name, email: r.data.email, role: r.data.status } })),

  changePassword: (oldPassword: string, newPassword: string) =>
    api<{ meta: { request_id: string } }>('/mobile/auth/change-password', {
      method: 'POST',
      body: { old_password: oldPassword, new_password: newPassword },
    }).then(() => ({ ok: true })),
};
