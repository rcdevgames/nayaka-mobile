import type { NavigatorScreenParams } from '@react-navigation/native';
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
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  CamerasTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  PlaybackTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  AlertsTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<HomeStackParamList> | undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AppNavigation = {
  HomeStack: HomeStackParamList;
};
