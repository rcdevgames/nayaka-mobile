/**
 * Render check untuk SubscriptionScreen dan ProfileScreen.
 * API, auth, dan data di-mock supaya layar bisa diperiksa tanpa kredensial asli.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactModule = require('react');
  return {
    ...actual,
    useFocusEffect: (effect: () => void) =>
      ReactModule.useEffect(() => effect(), [effect]),
  };
});

jest.mock('../src/api', () => ({
  subscriptionsApi: {
    current: jest.fn(async () => ({
      plan_name: 'Rumah',
      plan_price: 50000,
      status: 'active',
      starts_at: '2026-09-01T00:00:00Z',
      ends_at: '2026-10-01T00:00:00Z',
    })),
  },
  meApi: { get: jest.fn(), update: jest.fn() },
  authApi: { changePassword: jest.fn() },
  settingsApi: {
    get: jest.fn(async () => ({
      push_enabled: false,
      motion_notifications: false,
    })),
    update: jest.fn(),
  },
}));

jest.mock('../src/context/DataContext', () => ({
  useData: () => ({ cameras: [{ id: 'cam-1' }, { id: 'cam-2' }] }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'c1', name: 'Budi', email: 'budi@example.com', role: 'active' },
    signOut: jest.fn(),
    updateUser: jest.fn(),
    biometricAvailable: true,
    biometricType: 'Fingerprint',
    biometricEnabled: false,
    enableBiometricLogin: jest.fn(),
    disableBiometricLogin: jest.fn(),
  }),
}));

import SubscriptionScreen from '../src/screens/home/SubscriptionScreen';
import ProfileScreen from '../src/screens/home/ProfileScreen';

const navigation = { navigate: jest.fn(), goBack: jest.fn() } as never;

const textOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(require('react-native').Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(child => typeof child === 'string')
    .join(' ');

async function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

test('SubscriptionScreen menampilkan langganan aktif dan katalog yang jujur', async () => {
  const tree = await render(
    <SubscriptionScreen navigation={navigation} route={{} as never} />,
  );
  const text = textOf(tree);

  expect(text).toContain('Langganan');
  expect(text).toContain('Pilihan Paket');
  expect(text).toContain('Pembelian paket belum tersedia dari aplikasi.');
  expect(text).toContain('Segera hadir');
  expect(text).toContain('Rumah');
  expect(text).toContain('Sisa');
  expect(text).not.toContain('Pembayaran Berhasil');
  expect(text).not.toContain('Scan QRIS');
});

test('ProfileScreen punya menu Tentang Aplikasi dan bukan Alert', async () => {
  const tree = await render(
    <ProfileScreen navigation={navigation} route={{} as never} />,
  );
  const text = textOf(tree);

  expect(text).toContain('Tentang Aplikasi');
  // Section Umum sudah dihapus
  expect(text).not.toContain('Kartu Identitas / Lisensi');
  expect(text).not.toContain('Preferensi Notifikasi');
});
