/**
 * Kontrak live view MJPEG.
 *
 * Yang dikunci di sini berasal dari keluhan "stream tidak pernah muncul":
 *  - render pertama harus lewat <img src> supaya WebView sendiri yang men-decode
 *    multipart/x-mixed-replace. Tanpa fetch, CORS, dan blob URL.
 *  - kalau tidak ada frame sama sekali, pengguna harus melihat sebabnya dan bisa
 *    mencoba ulang, bukan layar hitam tanpa penjelasan.
 */

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { BASE_URL } from '../src/api';
import { MjpegView } from '../src/components/MjpegView';

const streamUrl = 'http://110.232.92.134:3001/api/stream';

function render(url: string = streamUrl) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<MjpegView url={url} />);
  });
  return tree;
}

const webview = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByProps({ testID: 'mjpeg-webview' })[0];

const htmlOf = (tree: ReactTestRenderer.ReactTestRenderer): string =>
  webview(tree).props.source.html;

const send = (
  tree: ReactTestRenderer.ReactTestRenderer,
  payload: Record<string, unknown>,
) => {
  const handler = webview(tree).props.onMessage;
  ReactTestRenderer.act(() => {
    handler({ nativeEvent: { data: JSON.stringify(payload) } });
  });
};

const texts = (tree: ReactTestRenderer.ReactTestRenderer): string[] => {
  const out: string[] = [];
  const walk = (children: React.ReactNode): void => {
    React.Children.forEach(children, child => {
      if (typeof child === 'string' || typeof child === 'number') {
        out.push(String(child));
        return;
      }
      if (React.isValidElement(child)) {
        walk((child.props as { children?: React.ReactNode }).children);
      }
    });
  };
  tree.root
    .findAllByType(Text)
    .forEach(node => walk(node.props.children as React.ReactNode));
  return out;
};

test('render pertama memakai <img src>, bukan fetch atau blob URL', () => {
  const html = htmlOf(render());

  expect(html).toContain('<img id="frame"');
  expect(html).toContain(`"${streamUrl}"`);
  expect(html).toContain('img.src = bust(STREAM)');
  // Blob URL dari dokumen ber-baseUrl localhost pernah jadi tersangka utama
  // stream tidak tampil di Android.
  expect(html).not.toContain('createObjectURL');
});

test('url relatif digabung dengan BASE_URL', () => {
  const html = htmlOf(render('/mobile/stream/cam-1'));

  expect(html).toContain(`"${BASE_URL}/mobile/stream/cam-1"`);
});

test('overlay loading hilang begitu frame pertama tiba', () => {
  const tree = render();
  expect(texts(tree)).toContain('Menghubungkan ke kamera…');

  send(tree, { type: 'streaming', mode: 'img' });

  expect(texts(tree)).not.toContain('Menghubungkan ke kamera…');
});

test('mode cadangan diberitahukan saat <img> tidak kunjung mengirim frame', () => {
  const tree = render();

  send(tree, { type: 'fallback', reason: 'timeout', attempts: 2 });

  expect(texts(tree)).toContain('Mencoba mode cadangan…');
});

test('kegagalan menampilkan sebabnya, bukan layar hitam', () => {
  const tree = render();

  send(tree, { type: 'error', message: 'HTTP 404, boundary tidak ditemukan' });

  const visible = texts(tree);
  expect(visible).toContain('Gagal memuat stream');
  expect(visible).toContain('HTTP 404, boundary tidak ditemukan');
  expect(visible).toContain('Coba lagi');
});

test('tombol coba lagi mengembalikan overlay ke loading', () => {
  const tree = render();
  send(tree, { type: 'error', message: 'Stream terputus' });

  const button = tree.root.findAllByType(TouchableOpacity)[0];
  ReactTestRenderer.act(() => {
    button.props.onPress();
  });

  expect(texts(tree)).toContain('Menghubungkan ke kamera…');
});

test('WebView tidak di-remount hanya karena status berubah', () => {
  const tree = render();
  const before = webview(tree);

  send(tree, { type: 'streaming', mode: 'img' });

  expect(webview(tree)).toBe(before);
});