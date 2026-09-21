// ── Customer / User ─────────────────────────────────────────────────────
// Customer adalah user yang login di mobile app
export interface Customer {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: 'active' | 'suspended' | 'inactive';
}

// Legacy User type (deprecated, use Customer)
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ── Camera ─────────────────────────────────────────────────────────────
export type CameraStatus = 'online' | 'offline' | 'recording';
export type CameraType = 'indoor' | 'outdoor' | 'ptz' | 'doorbell';

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

export interface CameraSettings {
  motion_detection: boolean;
  notification_enabled: boolean;
}

// ── Recording ──────────────────────────────────────────────────────────
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

// Legacy recording format (from old API)
export interface RecordingLegacy {
  id: string;
  cameraId: string;
  title: string;
  startedAt: string;
  duration: string;
  durationSec: number;
  size: string;
  sizeBytes: number;
  hasMotion: boolean;
}

// ── Alert ───────────────────────────────────────────────────────────────
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

// Legacy alert format (from old API)
export interface AlertItem {
  id: string;
  cameraId: string;
  cameraName: string;
  type: AlertType;
  severity: Severity;
  message: string;
  time: string;
  read: boolean;
}

// ── Snapshot ────────────────────────────────────────────────────────────
export interface Snapshot {
  id: string;
  camera_id: string;
  camera_name: string;
  captured_at: string;
  size_bytes: number;
  resolution: string;
  thumbnail_url: string;
}

// Legacy snapshot format (from old API)
export interface SnapshotLegacy {
  id: string;
  cameraId: string;
  capturedAt: string;
  size: string;
  sizeBytes: number;
  resolution: string;
  cameraName: string;
}

// ── Dashboard ──────────────────────────────────────────────────────────
export interface DashboardStats {
  activityToday: number;
  incidentsWeek: number;
  // New contract fields
  total_cameras?: number;
  active_cameras?: number;
  recording_cameras?: number;
  offline_cameras?: number;
  unknown_cameras?: number;
  alert_unread?: number;
}

// ── Subscription ──────────────────────────────────────────────────────
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

// Legacy subscription (from old API)
export interface SubscriptionLegacy {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  planPrice: number;
  status: SubscriptionStatus;
  startsAt: string | null;
  endsAt: string;
  amount: number;
  createdAt: string;
  daysLeft: number | null;
}

// ── Help & Legal ───────────────────────────────────────────────────────
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

// ── Emergency ────────────────────────────────────────────────────────────
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  description?: string;
  is_active: boolean;
}

// ── Settings ─────────────────────────────────────────────────────────────
export interface CustomerSettings {
  push_enabled: boolean;
  motion_notifications: boolean;
  biometric_enabled: boolean;
}
