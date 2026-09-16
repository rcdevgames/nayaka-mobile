import { DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';

export const Colors = {
  primary: '#1B4DF5',
  primaryDark: '#0F36B0',
  primarySoft: '#E8EEFF',
  accent: '#00C2A8',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  warning: '#F59E0B',
  success: '#22C55E',
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceDark: '#12151F',
  text: '#0F172A',
  textMuted: '#64748B',
  textSecondary: '#94A3B8',
  border: '#E2E8F0',
  black: '#000000',
  white: '#FFFFFF',
  gridLines: 'rgba(255,255,255,0.15)',
  recordingRed: '#FF3B30',
};

export const Fonts = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

const navLight: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
  },
};

const navDark: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: '#0B0D13',
    card: Colors.surfaceDark,
    text: '#F1F5F9',
    border: '#1E2433',
  },
};

export const getTheme = (isDark: boolean): Theme =>
  isDark ? navDark : navLight;
