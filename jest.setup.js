/* eslint-env jest */

// Mock native modules not available in jest.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, WebView: (props) => <View testID="webview" {...props} /> };
});

jest.mock('@react-native-vector-icons/material-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = React.forwardRef((props, ref) => (
    <Text ref={ref} testID="icon" {...props}>
      {props.name}
    </Text>
  ));
  return { __esModule: true, default: MockIcon };
});

jest.mock('@react-native-google-signin/google-signin', () => {
  const cancelled = { type: 'cancelled', data: null };
  const success = { type: 'success', data: { idToken: 'mock-google-id-token' } };
  return {
    __esModule: true,
    statusCodes: {
      SIGN_IN_CANCELLED: '-5',
      IN_PROGRESS: '-4',
      PLAY_SERVICES_NOT_AVAILABLE: '-3',
    },
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(async () => true),
      signIn: jest.fn(async () => success),
      signOut: jest.fn(async () => null),
      revokeAccess: jest.fn(async () => null),
    },
  };
});

jest.mock('react-native-device-info', () => {
  const { Platform } = require('react-native');
  return {
    __esModule: true,
    getVersion: () => '1.0.0',
    getBuildNumber: () => '1',
    getSystemName: () => (Platform.OS === 'ios' ? 'iOS' : 'Android'),
    getSystemVersion: () => '0',
    getUniqueId: async () => 'test-device',
    getDeviceId: () => 'test-device',
    isEmulator: async () => true,
  };
});

jest.mock('react-native-keychain', () => ({
  __esModule: true,
  ACCESS_CONTROL: { BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'biometry' },
  ACCESSIBLE: { WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'passcode' },
  BIOMETRY_TYPE: {
    FACE_ID: 'FaceID',
    TOUCH_ID: 'TouchID',
    FINGERPRINT: 'Fingerprint',
    IRIS: 'Iris',
  },
  setGenericPassword: jest.fn(async () => true),
  getGenericPassword: jest.fn(async () => false),
  resetGenericPassword: jest.fn(async () => true),
  getSupportedBiometryType: jest.fn(async () => null),
}));

const mockStore = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async key =>
      mockStore.has(key) ? mockStore.get(key) : null,
    ),
    setItem: jest.fn(async (key, value) => {
      mockStore.set(key, value);
    }),
    removeItem: jest.fn(async key => {
      mockStore.delete(key);
    }),
    clear: jest.fn(async () => {
      mockStore.clear();
    }),
  },
}));
