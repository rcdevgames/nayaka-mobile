/**
 * Status di bawah preview kamera.
 *
 * Yang dikunci di sini berasal dari keluhan feed hidup yang tetap berlabel
 * TIDAK TERHUBUNG:
 *  1. Teks status harus mengikuti keadaan stream yang benar-benar tampil, bukan
 *     hanya status dari telemetry yang bisa tertinggal.
 *  2. Saat feed hidup, teks LIVE ditemani titik merah berkedip.
 */

import React from 'react';
import { Animated, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: () => undefined,
  };
});

jest.mock('../src/context/DataContext', () => ({
  useData: () => ({
    cameras: [
      {
        id: 'cam-1',
        name: 'Kamera Teras',
        serial_number: 'SN-2026-000125',
        model: 'NX-200',
        location: 'Teras',
        ip: '192.168.1.20',
        status: 'online',
        recording_status: 'idle',
        thumbnail_url: 'http://110.232.92.134:3001/api/stream',
        stream_url: 'http://110.232.92.134:3001/api/stream',
        thumbnail_expires_at: null,
        last_seen_at: null,
        type: 'outdoor',
        resolution: '1080p',
        fov: 110,
        is_recording: false,
        has_alert: false,
      },
    ],
  }),
}));

jest.mock('../src/api', () => ({
  settingsApi: { get: jest.fn(async () => ({ motion_notifications: true })) },
  snapshotsApi: { create: jest.fn() },
}));

import CameraDetailScreen, {
  previewStatusLabel,
} from '../src/screens/home/CameraDetailScreen';

const route = { params: { cameraId: 'cam-1' } } as never;
const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never;

let mounted: ReactTestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
  // Kedipan tidak perlu benar-benar berjalan di test renderer.
  jest.spyOn(Animated, 'loop').mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  } as never);
});

afterEach(() => {
  jest.restoreAllMocks();
  ReactTestRenderer.act(() => {
    mounted?.unmount();
  });
  mounted = null;
});

async function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <CameraDetailScreen navigation={navigation} route={route} />,
    );
  });
  mounted = tree;
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer): string[] => {
  const out: string[] = [];
  tree.root.findAllByType(Text).forEach(node => {
    if (typeof node.props.children === 'string') out.push(node.props.children);
  });
  return out;
};

const dots = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByProps({ testID: 'preview-live-dot' });

const send = (
  tree: ReactTestRenderer.ReactTestRenderer,
  payload: Record<string, unknown>,
) => {
  const webview = tree.root.findAllByProps({ testID: 'mjpeg-webview' })[0];
  ReactTestRenderer.act(() => {
    webview.props.onMessage({ nativeEvent: { data: JSON.stringify(payload) } });
  });
};

test('label mengikuti keadaan stream, bukan status yang tertinggal', () => {
  const live = { online: true, hasStream: true, recording: false };

  expect(previewStatusLabel('loading', live)).toBe('MENGHUBUNGKAN…');
  expect(previewStatusLabel('streaming', live)).toBe('LIVE');
  expect(previewStatusLabel('streaming', { ...live, recording: true })).toBe(
    'MEREKAM',
  );
  expect(previewStatusLabel('error', live)).toBe('TIDAK TERHUBUNG');
  expect(previewStatusLabel('streaming', { ...live, online: false })).toBe(
    'TIDAK TERHUBUNG',
  );
  expect(previewStatusLabel('streaming', { ...live, hasStream: false })).toBe(
    'TIDAK TERHUBUNG',
  );
});

test('dot merah muncul hanya saat feed hidup', async () => {
  const tree = await renderScreen();

  expect(texts(tree)).toContain('MENGHUBUNGKAN…');
  expect(dots(tree)).toHaveLength(0);

  send(tree, { type: 'streaming', mode: 'img' });

  expect(texts(tree)).toContain('LIVE');
  // Satu Animated.View terhitung beberapa node oleh test renderer.
  expect(dots(tree).length).toBeGreaterThan(0);

  send(tree, { type: 'error', message: 'Stream terputus' });

  expect(texts(tree)).toContain('TIDAK TERHUBUNG');
  expect(dots(tree)).toHaveLength(0);
});
