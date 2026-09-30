/**
 * Kontrak thumbnail daftar kamera.
 *
 * Tiga hal yang mudah regresi dan dikunci di sini:
 *  1. MJPEG tidak boleh masuk ke <Image> sebagai URL stream.
 *  2. Selama backend mengirim thumbnail_url == stream_url, frame pertama diambil
 *     sekali dari stream lalu koneksinya dilepas — bukan stream hidup per baris.
 *  3. Kegagalan capture harus berhenti, bukan menyisakan WebView menggantung.
 */

import React from 'react';
import { Image } from 'react-native';
import { WebView } from 'react-native-webview';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/api', () => ({
  thumbnailsApi: {
    fetch: jest.fn(async (url: string) => url),
  },
}));

import { CameraThumbnail } from '../src/components/CameraThumbnail';
import type { Camera } from '../src/types';

const streamUrl = 'http://110.232.92.134:3001/api/stream';

const camera = (over: Partial<Camera> = {}): Camera => ({
  id: 'cam-1',
  name: 'Kamera Teras Utama',
  serial_number: 'SN-2026-000125',
  model: 'NX-200',
  location: 'Teras',
  ip: '192.168.1.20',
  status: 'online',
  recording_status: 'recording',
  thumbnail_url: streamUrl,
  stream_url: streamUrl,
  thumbnail_expires_at: '2026-09-21T10:41:00Z',
  last_seen_at: '2026-09-21T08:00:00Z',
  type: 'outdoor',
  resolution: '1080p',
  fov: 110,
  is_recording: true,
  has_alert: false,
  ...over,
});

let mounted: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  ReactTestRenderer.act(() => {
    mounted?.unmount();
  });
  mounted = null;
});

async function renderThumb(props: Partial<Camera> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<CameraThumbnail camera={camera(props)} />);
  });
  mounted = tree;
  return tree;
}

const imagesIn = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Image);

const capturesIn = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(WebView);

const postToCapture = async (
  tree: ReactTestRenderer.ReactTestRenderer,
  payload: Record<string, unknown>,
) => {
  const capture = capturesIn(tree)[0];
  await ReactTestRenderer.act(async () => {
    capture.props.onMessage({ nativeEvent: { data: JSON.stringify(payload) } });
  });
};

test('thumbnail tidak memuat stream MJPEG ke dalam <Image>', async () => {
  const tree = await renderThumb();

  expect(imagesIn(tree)).toHaveLength(0);
});

test('thumbnail memakai <Image> begitu backend mengirim URL foto diam', async () => {
  const stillUrl = 'https://cdn.example.com/snap/cam-1.jpg?sig=abc';
  const tree = await renderThumb({ thumbnail_url: stillUrl });

  const images = imagesIn(tree);
  expect(images).toHaveLength(1);
  expect(images[0].props.source).toEqual({ uri: stillUrl });
  expect(capturesIn(tree)).toHaveLength(0);
});

test('kamera offline tidak menampilkan foto diam', async () => {
  const tree = await renderThumb({
    thumbnail_url: 'https://cdn.example.com/snap/cam-1.jpg?sig=abc',
    status: 'offline',
  });

  expect(imagesIn(tree)).toHaveLength(0);
  expect(capturesIn(tree)).toHaveLength(0);
});

test('thumbnail mengambil frame pertama dari stream saat tidak ada foto diam', async () => {
  const tree = await renderThumb({ stream_url: `${streamUrl}?cam=a`, thumbnail_url: `${streamUrl}?cam=a` });

  expect(capturesIn(tree)).toHaveLength(1);
  expect(imagesIn(tree)).toHaveLength(0);
});

test('frame hasil capture dipakai sebagai <Image> dan koneksinya dilepas', async () => {
  const url = `${streamUrl}?cam=b`;
  const tree = await renderThumb({ stream_url: url, thumbnail_url: url });
  const dataUrl = 'data:image/jpeg;base64,QUJD';

  await postToCapture(tree, { type: 'frame', data: dataUrl });

  const images = imagesIn(tree);
  expect(images).toHaveLength(1);
  expect(images[0].props.source).toEqual({ uri: dataUrl });
  expect(capturesIn(tree)).toHaveLength(0);
});

test('kegagalan capture berhenti tanpa menyisakan WebView', async () => {
  const url = `${streamUrl}?cam=c`;
  const tree = await renderThumb({ stream_url: url, thumbnail_url: url });

  await postToCapture(tree, { type: 'error', message: 'HTTP 500' });

  expect(imagesIn(tree)).toHaveLength(0);
  expect(capturesIn(tree)).toHaveLength(0);
});

test('frame yang sudah didapat dipakai ulang tanpa capture lagi', async () => {
  const url = `${streamUrl}?cam=d`;
  const first = await renderThumb({ stream_url: url, thumbnail_url: url });
  await postToCapture(first, { type: 'frame', data: 'data:image/jpeg;base64,QUJD' });

  ReactTestRenderer.act(() => {
    mounted?.unmount();
  });
  const second = await renderThumb({ stream_url: url, thumbnail_url: url });

  expect(imagesIn(second)).toHaveLength(1);
  expect(capturesIn(second)).toHaveLength(0);
});