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
export const INSTALLATION_ID_KEY = '@nayaka_cctv_installation_id';

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

/**
 * ID instalasi dipakai login maupun refresh, jadi tinggal di sini — bukan di
 * AuthContext — supaya lapisan API bisa me-refresh tanpa mengimpor React.
 */
export async function getInstallationId(): Promise<string> {
  let id = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (!id) {
    id = `mobile-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    await AsyncStorage.setItem(INSTALLATION_ID_KEY, id);
  }
  return id;
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

// Session-expired hanya boleh dipancarkan sekali per sesi. Tanpa ini, rantai
// emit -> signOut() -> authApi.logout() -> 401 lagi -> emit berputar tanpa henti.
let sessionExpiredEmitted = false;

export function setAuthToken(token: string | null) {
  authToken = token;
  // Sesi baru dimulai (login/hydrate): boleh memancarkan session-expired lagi.
  if (token) sessionExpiredEmitted = false;
}

export function getAuthToken(): string | null {
  return authToken;
}

// ── Sesi berakhir ───────────────────────────────────────────────────────
// Dipakai supaya lapisan API bisa memberi tahu AuthContext bahwa refresh token
// sudah tidak berlaku lagi, tanpa api.ts mengimpor React.
type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function emitSessionExpired() {
  // Sekali per sesi. Beberapa request bisa menyebabkan ini hampir bersamaan
  // (access token 15 menit), dan logout() berikutnya akan me-request 401 lagi.
  if (sessionExpiredEmitted) return;
  sessionExpiredEmitted = true;

  sessionExpiredListeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.warn('Session expired listener gagal', e);
    }
  });
}

// ── Refresh token ───────────────────────────────────────────────────────
const REFRESH_PATH = '/mobile/auth/refresh';

// Single-flight: token akses berumur 15 menit, jadi beberapa request bisa
// kena 401 hampir bersamaan. Semua menunggu satu refresh yang sama; tanpa ini
// tiap request memutar refresh token sendiri dan backend menganggapnya reuse
// (rotasi token) lalu mencabut sesi.
let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  const installationId = await getInstallationId();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${REFRESH_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        installation_id: installationId,
      }),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let raw: Record<string, unknown>;
  try {
    raw = await res.json();
  } catch {
    return null;
  }

  const payload =
    raw && raw.data && typeof raw.data === 'object'
      ? (raw.data as Record<string, unknown>)
      : raw;

  const accessToken = payload?.access_token;
  const newRefreshToken = payload?.refresh_token;

  if (typeof accessToken !== 'string' || !accessToken) return null;

  authToken = accessToken;
  await setStoredToken(accessToken);
  // Refresh token dirotasi; yang lama sudah tidak berlaku di server.
  if (typeof newRefreshToken === 'string' && newRefreshToken) {
    await setStoredRefreshToken(newRefreshToken);
  }

  return accessToken;
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
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
  const { data } = await request(path, { method, body, authenticated });
  return data as T;
}

export async function request(
  path: string,
  opts: ApiOptions = {},
): Promise<{ data: unknown; meta: Record<string, unknown> }> {
  return send(path, opts, true);
}

async function send(
  path: string,
  opts: ApiOptions,
  allowRetry: boolean,
): Promise<{ data: unknown; meta: Record<string, unknown> }> {
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
  let rawData: Record<string, unknown> = {};

  try {
    rawData = await res.json();
    // Check if it's an error envelope
    if (rawData.error) {
      const err = rawData as unknown as ApiErrorResponse;
      const expired =
        err.error.code === 'TOKEN_EXPIRED' || err.error.code === 'TOKEN_REVOKED';

      // Access token habis umurnya (15 menit): coba perpanjang dulu, baru
      // menyerah. Sesi baru benar-benar dianggap berakhir (lempar ke logout)
      // kalau refresh token sendiri tidak berlaku, ATAU kalau server masih
      // menolak pada percobaan ulang dengan token baru.
      // Sebelumnya, kasus "refresh berhasil tapi tetap 401" hanya dilempar
      // sebagai ApiError biasa — pengguna tetap masuk dengan sesi yang sudah
      // mati, dan setiap layar menampilkan error "Sesi Anda telah berakhir".
      if (expired && authenticated) {
        if (allowRetry) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            return send(path, opts, false);
          }
        }
        emitSessionExpired();
      }

      const status = expired ? 401 : res.status;
      throw new ApiError(status, err.error.code, getErrorMessage(err.error.code, err.error.message));
    }
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

  // Unwrap the envelope { data, meta } when present
  if ('data' in rawData && Object.keys(rawData).every(key => key === 'data' || key === 'meta')) {
    const wrapped = rawData as unknown as ApiResponse<unknown>;
    return {
      data: wrapped.data,
      meta: (wrapped.meta ?? {}) as unknown as Record<string, unknown>,
    };
  }

  return { data: rawData, meta: {} };
}

// Only list callers need the collection pulled out of its wrapper.
function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      if (Array.isArray(item)) return item as T[];
    }
  }
  return [];
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

  // Refresh token ditangani otomatis oleh request() saat menerima 401, jadi
  // tidak ada method refresh terpisah di sini — dua jalur refresh yang berbeda
  // justru berisiko memutar token dua kali dan membuat server mencabut sesi.

  logout: () =>
    api<{ meta: { request_id: string } }>('/mobile/auth/logout', {
      method: 'POST',
    }),

  logoutAll: () =>
    api<{ meta: { request_id: string } }>('/mobile/auth/logout-all', {
      method: 'POST',
    }),

  forgotPassword: (email: string) =>
    api<{ sent: boolean; expires_in: number }>('/mobile/auth/forgot-password', {
      method: 'POST',
      body: { email },
      authenticated: false,
    }),

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
  get: async () => {
    const { data } = await request('/mobile/me');
    const profile = (data as { profile?: Customer }).profile;
    return profile ?? (data as Customer);
  },
  update: (params: { full_name?: string; avatar_url?: string }) =>
    request('/mobile/me', { method: 'PATCH', body: params }).then(({ data }) => {
      const profile = (data as { profile?: Customer }).profile;
      return profile ?? (data as Customer);
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
}

export const dashboardApi = {
  get: async () => {
    const { data } = await request('/mobile/dashboard');
    const summary = data as {
      camera_summary?: {
        total_count?: number;
        active_count?: number;
        recording_count?: number;
        offline_count?: number;
        unknown_count?: number;
      };
      alert_summary?: { unread_count?: number };
    };
    return {
      total_cameras: summary.camera_summary?.total_count ?? 0,
      active_cameras: summary.camera_summary?.active_count ?? 0,
      recording_cameras: summary.camera_summary?.recording_count ?? 0,
      offline_cameras: summary.camera_summary?.offline_count ?? 0,
      unknown_cameras: summary.camera_summary?.unknown_count ?? 0,
      alert_unread: summary.alert_summary?.unread_count ?? 0,
    } satisfies DashboardStats;
  },
};

// ── Camera API ──────────────────────────────────────────────────────────
export type CameraStatus = 'online' | 'offline' | 'recording';
export type CameraType = 'indoor' | 'outdoor' | 'ptz' | 'doorbell';

/**
 * Status kamera berasal dari `camera_telemetry`, dan ejaannya tidak selalu sama
 * dengan yang dipakai UI. Kontrak mobile bagian 5 menyebut hitungan
 * `active`/`offline`/`unknown` di dashboard, sedangkan kolom `status` bisa
 * berisi `active` atau `streaming`. Nilai mentah itu dulu jatuh ke cabang
 * bukan-online di UI, jadi kamera yang gambarnya hidup tetap berlabel TIDAK
 * TERHUBUNG. Petakan di tepi API supaya tidak ada layar yang menebak sendiri.
 */
export function normalizeCameraStatus(raw: unknown): CameraStatus {
  switch (String(raw ?? '').toLowerCase()) {
    case 'recording':
      return 'recording';
    case 'online':
    case 'active':
    case 'streaming':
      return 'online';
    default:
      return 'offline';
  }
}

// Nilai status mentah tidak pernah dipakai langsung oleh UI.
const normalizeCamera = <T extends { status?: unknown }>(camera: T): T =>
  ({ ...camera, status: normalizeCameraStatus(camera.status) }) as T;

export interface Camera {
  id: string;
  name: string;
  serial_number: string;
  model: string;
  location: string;
  ip: string;
  status: CameraStatus;
  recording_status: string;
  thumbnail_url: string;
  stream_url: string;
  thumbnail_expires_at: string | null;
  last_seen_at: string | null;
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
    return request(`/mobile/cameras${qs ? `?${qs}` : ''}`).then(({ data }) =>
      unwrapList<Camera>(data).map(normalizeCamera),
    );
  },

  get: (id: string) =>
    api<Camera>(`/mobile/cameras/${id}`).then(normalizeCamera),

  // Endpoint pengaturan per kamera tidak ada di kontrak mobile §5 (hanya list dan
  // detail kamera). Menambahkannya kembali menuntut perubahan backend lebih dulu.

  startRecording: (id: string) =>
    api<{ recording_id: string }>(`/mobile/cameras/${id}/recordings/start`, {
      method: 'POST',
    }),

  stopRecording: (id: string) =>
    api<{ recording_id: string }>(`/mobile/cameras/${id}/recordings/stop`, {
      method: 'POST',
    }),
};

// ── Thumbnails API ───────────────────────────────────────────────────────
// Fetch thumbnail JPEG dengan auth header, return base64 data URL.
// React Native <Image> tidak support custom headers, jadi perlu ini.
export const thumbnailsApi = {
  /**
   * Fetch thumbnail untuk sebuah camera.
   * @param thumbnailUrl URL relatif dari API (misal "/api/v1/mobile/stream/{id}/thumbnail")
   * @returns Promise<string> base64 data URL: "data:image/jpeg;base64,..."
   */
  fetch: async (thumbnailUrl: string): Promise<string> => {
    if (!thumbnailUrl || thumbnailUrl === 'null' || thumbnailUrl === 'undefined') {
      throw new Error('Thumbnail URL kosong');
    }
    const fullUrl = thumbnailUrl.startsWith('http')
      ? thumbnailUrl
      : `${BASE_URL}${thumbnailUrl}`;

    if (!authToken) throw new Error('Belum login');

    const res = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'image/jpeg',
      },
    });

    if (!res.ok) {
      throw new ApiError(res.status, 'THUMBNAIL_ERROR', `Gagal mengambil thumbnail (${res.status})`);
    }

    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal decode thumbnail'));
      reader.readAsDataURL(blob);
    });
  },
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
    return request(`/mobile/recordings${qs ? `?${qs}` : ''}`).then(({ data }) =>
      unwrapList<Recording>(data),
    );
  },

  get: (id: string) => api<Recording>(`/mobile/recordings/${id}`),
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
    return request(`/mobile/alerts${qs ? `?${qs}` : ''}`).then(({ data }) =>
      unwrapList<Alert>(data),
    );
  },

  get: (id: string) => api<Alert>(`/mobile/alerts/${id}`),

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
// Backend tidak punya endpoint langganan tersendiri (/mobile/subscriptions dan
// /mobile/subscription-plans mengembalikan 404 HTML). Satu-satunya sumber adalah
// field `subscription` pada GET /mobile/me, sesuai MOBILE_API_Contract bagian 8.
//
// ponytail: nama field di dalam `subscription` belum terverifikasi karena akun
// yang tersedia mengembalikan null. Layar membaca beberapa varian nama sekaligus;
// rapikan jadi tipe tetap begitu ada contoh respons berisi langganan.
export type RawSubscription = Record<string, unknown>;

export const subscriptionsApi = {
  current: async (): Promise<RawSubscription | null> => {
    const { data } = await request('/mobile/me');
    const sub = (data as { subscription?: unknown }).subscription;
    return sub && typeof sub === 'object' && !Array.isArray(sub)
      ? (sub as RawSubscription)
      : null;
  },
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
    api<Snapshot>('/mobile/snapshots', {
      method: 'POST',
      body: { camera_id: cameraId },
    }),

  list: (params?: { camera_id?: string; limit?: number; cursor?: string }) => {
    const q = new URLSearchParams();
    if (params?.camera_id) q.set('camera_id', params.camera_id);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return request(`/mobile/snapshots${qs ? `?${qs}` : ''}`).then(({ data }) =>
      unwrapList<Snapshot>(data),
    );
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
  list: async (params?: {
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
    const response = await request(`/mobile/help${qs ? `?${qs}` : ''}`);
    const payload = response.data as Record<string, unknown> | HelpArticle[];
    const nestedPagination =
      payload && !Array.isArray(payload) && typeof payload === 'object'
        ? payload.pagination
        : undefined;
    const metaPagination = response.meta.pagination as
      | { cursor?: unknown; has_more?: unknown }
      | undefined;
    const pagination = metaPagination ?? nestedPagination;

    return {
      data: unwrapList<HelpArticle>(response.data),
      meta: {
        ...response.meta,
        pagination:
          pagination && typeof pagination === 'object'
            ? {
                cursor:
                  typeof (pagination as Record<string, unknown>).cursor === 'string'
                    ? (pagination as Record<string, unknown>).cursor as string
                    : undefined,
                has_more: (pagination as Record<string, unknown>).has_more === true,
              }
            : undefined,
      },
    };
  },

  get: async (id: string) => {
    const response = await request(`/mobile/help/${id}`);
    return { data: response.data as HelpArticle, meta: response.meta };
  },

  terms: (params?: { locale?: string; version?: string }) => {
    const q = new URLSearchParams();
    if (params?.locale) q.set('locale', params.locale);
    if (params?.version) q.set('version', params.version);
    const qs = q.toString();
    return api<LegalDocument>(`/mobile/terms${qs ? `?${qs}` : ''}`);
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
  list: () => request('/mobile/emergency-contacts').then(({ data }) => unwrapList<EmergencyContact>(data)),
};

// ── Settings ─────────────────────────────────────────────────────────────
export interface CustomerSettings {
  motion_notifications: boolean;
}

export const settingsApi = {
  get: async () => {
    const { data } = await request('/mobile/me/settings');
    const settings = data as {
      alerts?: { enabled?: boolean };
    };
    return {
      motion_notifications: settings.alerts?.enabled ?? false,
    } satisfies CustomerSettings;
  },

  update: (settings: Partial<CustomerSettings>) =>
    request('/mobile/me/settings', { method: 'PATCH', body: settings }).then(({ data }) => data as CustomerSettings),

  registerPushToken: (installationId: string, token: string, platform: string) =>
    api<{ installation_id: string }>('/mobile/me/push-tokens', {
      method: 'POST',
      body: { installation_id: installationId, token, platform },
    }),

  removePushToken: (installationId: string) =>
    api<{ meta: { request_id: string } }>(
      `/mobile/me/push-tokens/${installationId}`,
      { method: 'DELETE' },
    ),

  enableBiometric: () =>
    api<{ enabled: boolean }>('/mobile/me/biometric', {
      method: 'POST',
    }),

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
    api<{ id: string; full_name: string; email: string; status: string; avatar_url: string | null }>(
      '/mobile/me',
    ).then(r => ({ user: { id: r.id, name: r.full_name, email: r.email, role: r.status } })),

  updateProfile: (name: string) =>
    api<{ id: string; full_name: string; email: string; status: string }>(
      '/mobile/me',
      { method: 'PATCH', body: { full_name: name } },
    ).then(r => ({ user: { id: r.id, name: r.full_name, email: r.email, role: r.status } })),

  changePassword: (oldPassword: string, newPassword: string) =>
    api<{ meta: { request_id: string } }>('/mobile/auth/change-password', {
      method: 'POST',
      body: { old_password: oldPassword, new_password: newPassword },
    }).then(() => ({ ok: true })),
};
