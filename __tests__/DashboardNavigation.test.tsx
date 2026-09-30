/**
 * Regresi navigasi: halaman yang sudah menjadi tab tidak boleh di-push.
 *
 * Sebelumnya tombol lonceng dan "Semua alert" di Dashboard memakai
 * navigation.navigate('Alerts') di dalam HomeStack. Alerts adalah tab sendiri
 * (AlertsTab), jadi cara itu menumpuk layar Alerts di atas Dashboard —
 * pengguna melihat halaman baru padahal tab-nya sudah ada.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const navigate = jest.fn();
const mockTabNavigate = jest.fn();

jest.mock('react-native-webview', () => ({
  WebView: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockTabNavigate }),
    useFocusEffect: () => undefined,
  };
});

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'c1', name: 'Budi', email: 'b@example.com', role: 'active' },
  }),
}));

const mockUseData = jest.fn(() => ({
    cameras: [
      {
        id: 'cam-1',
        name: 'Kamera Teras',
        location: 'Teras',
        status: 'online',
        is_recording: false,
        resolution: '1080p',
        ip: '192.168.1.20',
        stream_url: 'http://example.test/stream',
      },
    ],
    alerts: [
      {
        id: 'a1',
        camera_id: 'cam-1',
        camera_name: 'Kamera Teras',
        type: 'motion',
        severity: 'warning',
        message: 'Gerakan terdeteksi',
        time: '2026-09-22T08:00:00Z',
        read: false,
      },
    ],
    unreadCount: 1,
}));

jest.mock('../src/context/DataContext', () => ({
  useData: () => mockUseData(),
}));

jest.mock('../src/api', () => ({
  dashboardApi: {
    get: jest.fn(async () => ({
      total_cameras: 1,
      active_cameras: 1,
      recording_cameras: 0,
      offline_cameras: 0,
      alert_unread: 1,
    })),
  },
}));

import DashboardScreen from '../src/screens/home/DashboardScreen';

const navigation = { navigate, goBack: jest.fn() } as never;

function renderDashboard() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <DashboardScreen navigation={navigation} route={{} as never} />,
    );
  });
  return tree;
}

beforeEach(() => {
  navigate.mockClear();
  mockTabNavigate.mockClear();
});

test('Dashboard memakai lompat tab, bukan push, untuk Alerts dan Cameras', () => {
  renderDashboard();

  expect(mockTabNavigate).not.toHaveBeenCalledWith('Alerts');
  expect(mockTabNavigate).not.toHaveBeenCalledWith('Cameras');
  expect(navigate).not.toHaveBeenCalledWith('Alerts');
  expect(navigate).not.toHaveBeenCalledWith('Cameras');
});

test('kartu kamera tidak di-push dari stack Dashboard', () => {
  renderDashboard();

  expect(navigate).not.toHaveBeenCalledWith('CameraDetail', expect.anything());
});

test('tombol "Lihat semua" membuka daftar kamera, bukan detail terakhir', () => {
  const tree = renderDashboard();

  ReactTestRenderer.act(() => {
    tree.root.findByProps({ action: 'Lihat semua' }).props.onPress();
  });

  expect(mockTabNavigate).toHaveBeenCalledWith('CamerasTab', {
    screen: 'Cameras',
  });
});

test('status sistem mencerminkan status kamera', async () => {
  mockUseData.mockReturnValueOnce({
    cameras: [
      { id: 'cam-1', name: 'Kamera Teras', location: 'Teras', status: 'offline', is_recording: false, resolution: '1080p', ip: '192.168.1.20', stream_url: '' },
    ],
    alerts: [],
    unreadCount: 0,
  });
  const tree = renderDashboard();
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
  });

  expect(tree.root.findAllByProps({ status: 'offline' }).length).toBeGreaterThanOrEqual(1);
});

test('tombol "Semua alert" dan lonceng membuka daftar alert', () => {
  const tree = renderDashboard();

  ReactTestRenderer.act(() => {
    tree.root.findByProps({ action: 'Semua alert' }).props.onPress();
  });
  expect(mockTabNavigate).toHaveBeenCalledWith('AlertsTab', {
    screen: 'Alerts',
  });

  mockTabNavigate.mockClear();

  ReactTestRenderer.act(() => {
    // Ikon lonceng ada di dalam TouchableOpacity tombol notifikasi —
    // naik ke leluhur terdekat yang punya onPress.
    let node = tree.root.findByProps({ name: 'notifications-none' });
    while (node && typeof node.props.onPress !== 'function') {
      node = node.parent as ReactTestRenderer.ReactTestInstance;
    }
    if (!node) throw new Error('tombol notifikasi tidak ditemukan');
    node.props.onPress();
  });
  expect(mockTabNavigate).toHaveBeenCalledWith('AlertsTab', {
    screen: 'Alerts',
  });
});

test('kartu kamera tetap membuka CameraDetail di dalam tab Kamera', () => {
  const tree = renderDashboard();

  ReactTestRenderer.act(() => {
    const card = tree.root.findAll(
      node => node.props?.camera?.id === 'cam-1',
    )[0];
    if (!card) throw new Error('kartu kamera tidak ditemukan');
    card.props.onPress();
  });

  expect(mockTabNavigate).toHaveBeenCalledWith('CamerasTab', {
    screen: 'CameraDetail',
    params: { cameraId: 'cam-1' },
  });
});
