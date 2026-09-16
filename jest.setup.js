/* eslint-env jest */

// Mock native modules not available in jest.
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
