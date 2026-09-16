import type { Recording } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

export type HomeStackParamList = {
  Dashboard: undefined;
  Cameras: undefined;
  CameraDetail: { cameraId: string };
  LiveView: { cameraId: string };
  Playback: { cameraId?: string };
  PlaybackDetail: { recording: Recording };
  Alerts: undefined;
  Emergency: undefined;
  Settings: undefined;
  Subscription: undefined;
  Help: { articleId?: string };
  Terms: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  CamerasTab: undefined;
  PlaybackTab: undefined;
  AlertsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AppNavigation = {
  HomeStack: HomeStackParamList;
};
