/**
 * Kontrak thumbnail daftar kamera.
 *
 * Dua hal yang diuji di sini dan mudah regresi:
 *  1. MJPEG tidak boleh masuk ke <Image> — thumbnail hanya memakai URL foto diam.
 *  2. Selama backend mengirim thumbnail_url yang sama dengan stream_url, tidak ada
 *     foto diam yang bisa ditampilkan, jadi placeholder yang benar adalah tanpa <Image>.
 */

import React from 'react';
import { Image } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-webview', () => ({
  WebView: () => null,
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

function renderThumb(props: Partial<Camera> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <CameraThumbnail camera={camera(props)} />,
    );
  });
  return tree;
}

const imagesIn = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Image);

test('thumbnail tidak memuat stream MJPEG ke dalam <Image>', () => {
  const tree = renderThumb();
  expect(imagesIn(tree)).toHaveLength(0);
});

test('thumbnail memakai <Image> begitu backend mengirim URL foto diam', () => {
  const stillUrl = 'https://cdn.example.com/snap/cam-1.jpg?sig=abc';
  const tree = renderThumb({ thumbnail_url: stillUrl });

  const images = imagesIn(tree);
  expect(images).toHaveLength(1);
  expect(images[0].props.source).toEqual({ uri: stillUrl });
});

test('kamera offline tidak menampilkan foto diam', () => {
  const stillUrl = 'https://cdn.example.com/snap/cam-1.jpg?sig=abc';
  const tree = renderThumb({
    thumbnail_url: stillUrl,
    status: 'offline',
  });

  expect(imagesIn(tree)).toHaveLength(0);
});
