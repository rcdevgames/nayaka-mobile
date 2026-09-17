/**
 * Render check untuk SubscriptionScreen dan ProfileScreen.
 * API, auth, dan data di-mock supaya layar bisa diperiksa tanpa kredensial asli.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const activeSub = {
  id: 's1',
  customer_id: 'c1',
  plan_id: 'p1',
  plan_name: 'Rumah',
  plan_price: 50000,
  status: 'active' as const,
  starts_at: '2026-09-01T00:00:00Z',
  ends_at: '2026-10-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
  days_left: 14,
};

const plans = [
  {
    id: 'p1',
    name: 'Rumah',
    price: 50000,
    cameras: 4,
    storage_days: 7,
    description: 'Untuk rumah tinggal.',
  },
  {
    id: 'p2',
    name: 'Bisnis',
    price: 150000,
    cameras: 16,
    storage_days: 30,
    description: 'Untuk beberapa lokasi.',
  },
];

jest.mock('../src/api', () => ({
  subscriptionsApi: {
    list: jest.fn(async () => ({
      data: { subscriptions: [activeSub], active: activeSub },
      meta: {},
    })),
    plans: jest.fn(async () => ({ data: plans, meta: {} })),
    subscribe: jest.fn(),
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
  JSON.stringify(tree.toJSON());

async function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

test('SubscriptionScreen memuat paket, sisa hari, dan riwayat tagihan', async () => {
  const tree = await render(
    <SubscriptionScreen navigation={navigation} route={{} as never} />,
  );
  const text = textOf(tree);

  expect(text).toContain('Langganan');
  expect(text).toContain('Rumah');
  expect(text).toContain('Bisnis');
  expect(text).toContain('Sisa 14 hari');
  expect(text).toContain('Riwayat tagihan');
  // Satu paket unggulan, sisanya baris ringkas
  expect(text).toContain('16 kamera');
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
