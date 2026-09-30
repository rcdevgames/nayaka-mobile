import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { BASE_URL } from '../api';
import { MJPEG_FRAME_READER } from './mjpegFrames';

interface MjpegViewProps {
  url: string;
  /** Dilaporkan ke layar induk supaya teks status ikut keadaan stream. */
  onStateChange?: (state: MjpegViewState) => void;
}

// Prepend BASE_URL jika url relatif (misal "/mobile/stream/{id}")
const resolveUrl = (url: string) =>
  url?.startsWith('http') ? url : `${BASE_URL}${url}`;

/**
 * Halaman yang dirender di dalam WebView.
 *
 * Lapis 1 memakai <img src> biasa: WebView sendiri yang men-decode
 * multipart/x-mixed-replace. Tidak ada fetch, CORS, atau blob URL yang bisa
 * gagal di dokumen ber-origin opaque (baseUrl WebView).
 *
 * Lapis 2 dipakai hanya kalau lapis 1 tidak pernah mengirim frame: parser
 * multipart manual yang menggambar tiap JPEG sebagai data URL.
 */
const html = (url: string) => {
  const stream = JSON.stringify(resolveUrl(url)).replace(/</g, '\\u003c');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    body { display: flex; align-items: center; justify-content: center; }
    #frame { display: none; max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <img id="frame" alt="live" />
  <script>
    (function () {
      var STREAM = ${stream};
      var IMG_TIMEOUT_MS = 10000;
      var MAX_IMG_ATTEMPTS = 2;

      var img = document.getElementById('frame');
      var mode = 'img';
      var imgAttempts = 0;
      var frames = 0;
      var reader = null;
      var imgTimer = null;
      var settled = false;

      ${MJPEG_FRAME_READER}

      function post(type, extra) {
        var payload = { type: type };
        for (var key in extra) payload[key] = extra[key];
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
        if (type === 'error' || type === 'fallback') {
          console.warn('[stream]', type, JSON.stringify(extra || {}));
        }
      }

      // Gateway membuka sesi RTSP baru per permintaan, jadi URL yang sama tidak
      // boleh diambil dari cache.
      function bust(value) {
        return value + (value.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now();
      }

      function show() {
        if (!settled) {
          settled = true;
          post('streaming', { mode: mode });
        }
        img.style.display = 'block';
        frames++;
        if (frames % 25 === 0) post('frame', { frames: frames, mode: mode });
      }

      // ── Lapis 1: <img src> ────────────────────────────────────────────────
      function startImg() {
        mode = 'img';
        imgAttempts++;
        clearTimeout(imgTimer);
        imgTimer = setTimeout(function () {
          if (mode !== 'img') return;
          onImgFail('timeout');
        }, IMG_TIMEOUT_MS);
        img.onload = function () {
          if (mode !== 'img') return;
          clearTimeout(imgTimer);
          img.onload = null;
          img.onerror = null;
          // onload pada multipart hanya menyala sekali, saat frame pertama tiba.
          show();
        };
        img.onerror = function () {
          if (mode !== 'img') return;
          clearTimeout(imgTimer);
          onImgFail('error');
        };
        img.src = bust(STREAM);
        post('connecting', { attempt: imgAttempts });
      }

      function onImgFail(reason) {
        img.onload = null;
        img.onerror = null;
        clearTimeout(imgTimer);
        if (imgAttempts < MAX_IMG_ATTEMPTS) {
          setTimeout(startImg, 1500);
          return;
        }
        post('fallback', { reason: reason, attempts: imgAttempts });
        startParser();
      }

      // ── Lapis 2: parser multipart ─────────────────────────────────────────
      function startParser() {
        mode = 'parser';
        fetch(bust(STREAM), {
          cache: 'no-store',
          headers: { Accept: 'multipart/x-mixed-replace' }
        })
          .then(function (response) {
            if (!response.ok || !response.body) {
              throw new Error('HTTP ' + response.status);
            }
            if (!MjpegFrames.setContentType(response.headers.get('content-type'))) {
              throw new Error('Boundary tidak ditemukan pada Content-Type');
            }
            reader = response.body.getReader();
            var pump = function () {
              reader.read().then(
                function (part) {
                  if (part.done) {
                    post('error', { message: 'Stream berakhir' });
                    return;
                  }
                  MjpegFrames.push(part.value, function (frame) {
                    img.src = bytesToDataUrl(frame);
                    show();
                  });
                  pump();
                },
                function (e) {
                  post('error', { message: 'Stream terputus: ' + (e && e.message ? e.message : e) });
                }
              );
            };
            pump();
          })
          .catch(function (e) {
            post('error', { message: e && e.message ? e.message : String(e) });
          });
      }

      if (!STREAM || STREAM === 'null' || STREAM === 'undefined') {
        post('error', { message: 'URL stream kosong' });
        return;
      }

      startImg();

      window.onunload = function () {
        if (reader) reader.cancel();
      };
    })();
  </script>
</body>
</html>
`;
};

export type MjpegViewState = 'loading' | 'streaming' | 'error';

// Dinaikkan tiap mount supaya tombol "Coba lagi" memaksa WebView baru —
// stream multipart tidak bisa di-restart tanpa memuat ulang halaman.
let streamInstanceCounter = 0;

export function MjpegView({ url, onStateChange }: MjpegViewProps) {
  const [state, setState] = useState<MjpegViewState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [fallback, setFallback] = useState(false);
  // Key stabil per mount. Kalau nilainya berubah saat render, WebView remount
  // dan stream ikut restart di tengah jalan.
  const [instance, setInstance] = useState(() => ++streamInstanceCounter);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Layar induk memakai ini untuk menampilkan status stream apa adanya: status
  // dari telemetry bisa tertinggal dari gambar yang benar-benar tampil.
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const handleMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    if (!mountedRef.current) return;
    let msg: { type?: string; message?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'streaming') setState('streaming');
    if (msg.type === 'fallback') setFallback(true);
    if (msg.type === 'error') {
      setState('error');
      setErrorMsg(msg.message ?? 'Stream tidak mengirim frame');
    }
  }, []);

  const retry = useCallback(() => {
    setState('loading');
    setErrorMsg('');
    setFallback(false);
    setInstance(++streamInstanceCounter);
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        key={`mjpeg-${instance}`}
        testID="mjpeg-webview"
        source={{ html: html(url), baseUrl: 'http://localhost' }}
        style={styles.webview}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled={true}
        domStorageEnabled={false}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        onMessage={handleMessage}
        onError={e => {
          if (!mountedRef.current) return;
          setState('error');
          setErrorMsg(e.nativeEvent.description);
        }}
        onHttpError={e => {
          if (!mountedRef.current) return;
          setState('error');
          setErrorMsg(`HTTP ${e.nativeEvent.statusCode}`);
        }}
      />
      {state === 'loading' && (
        <View style={styles.overlay}>
          <Text style={styles.statusText}>
            {fallback ? 'Mencoba mode cadangan…' : 'Menghubungkan ke kamera…'}
          </Text>
        </View>
      )}
      {state === 'error' && (
        <View style={styles.overlay}>
          <Text style={styles.statusText}>Gagal memuat stream</Text>
          <Text style={styles.detailText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.8}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  webview: { flex: 1, backgroundColor: '#000' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  statusText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  detailText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default MjpegView;
