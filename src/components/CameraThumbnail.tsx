import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../theme';
import { cameraThumbnailStyles as styles } from '../theme/styles';
import { Icon } from './Icon';
import { StatusBadge } from './common';
import { thumbnailsApi } from '../api';
import { mjpegCaptureHtml } from './mjpegFrames';
import type { Camera } from '../types';

interface CameraThumbnailProps {
  camera: Camera;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Daftar kamera tidak bisa memutar MJPEG: <Image> RN tidak memahami
 * multipart/x-mixed-replace, dan satu stream hidup per baris berarti puluhan
 * koneksi ke kamera sekaligus.
 *
 * Jadi: kalau backend mengirim URL foto diam, pakai itu. Kalau tidak (backend
 * sekarang mengirim thumbnail_url == stream_url), ambil frame pertama dari
 * stream sekali lewat WebView 1x1, simpan sebagai data URL, lalu lepas
 * koneksinya. Setelah itu thumbnail cuma <Image> biasa.
 */
export function CameraThumbnail({ camera, height = 130, style }: CameraThumbnailProps) {
  const offline = camera.status === 'offline';
  const streamUrl = camera.stream_url || null;
  const stillUrl =
    camera.thumbnail_url && camera.thumbnail_url !== camera.stream_url
      ? camera.thumbnail_url
      : null;
  const frameKey = stillUrl ?? streamUrl;

  const [frame, setFrame] = useState<{ key: string; data: string } | null>(() => {
    if (!streamUrl) return null;
    const cached = frameCache.get(streamUrl);
    return cached && Date.now() - cached.at < FRAME_TTL_MS
      ? { key: streamUrl, data: cached.data }
      : null;
  });
  const [failedKey, setFailedKey] = useState<string | null>(null);

  // Foto diam dari backend tetap jalur utama kalau kontraknya sudah benar.
  useEffect(() => {
    if (offline || !stillUrl) return;
    let cancelled = false;
    thumbnailsApi
      .fetch(stillUrl)
      .then(data => {
        if (!cancelled) setFrame({ key: stillUrl, data });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(stillUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [offline, stillUrl]);

  const handleFrame = useCallback(
    (dataUrl: string) => {
      if (!streamUrl) return;
      frameCache.set(streamUrl, { data: dataUrl, at: Date.now() });
      setFrame({ key: streamUrl, data: dataUrl });
    },
    [streamUrl],
  );

  const handleCaptureError = useCallback(() => {
    if (streamUrl) setFailedKey(streamUrl);
  }, [streamUrl]);

  const visibleFrame = frame && frame.key === frameKey ? frame.data : null;
  const capture =
    !offline && !visibleFrame && !stillUrl && !!streamUrl && failedKey !== streamUrl;

  return (
    <View style={[styles.thumb, { height }, style]}>
      <View style={styles.scanLines} pointerEvents="none" />
      <View style={styles.thumbHeader}>
        <Text style={styles.camName} numberOfLines={1}>
          {camera.name}
        </Text>
        {camera.is_recording && (
          <View style={styles.recTag}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>REC</Text>
          </View>
        )}
      </View>

      <View style={styles.thumbCenter}>
        {offline ? (
          <>
            <Icon name="videocam-off" size={34} color={Colors.textMuted} />
            <Text style={styles.offlineText}>Kamera tidak terhubung</Text>
          </>
        ) : visibleFrame ? (
          <Image
            source={{ uri: visibleFrame }}
            style={styles.stillImage}
            resizeMode="cover"
            onError={() => setFailedKey(frameKey)}
          />
        ) : (
          <View style={styles.videoPlane}>
            <Text style={styles.videoLabel}>{camera.resolution}</Text>
          </View>
        )}
      </View>

      <View style={styles.thumbFooter}>
        <StatusBadge status={camera.status} />
        <Text style={styles.thumbMeta} numberOfLines={1}>
          {camera.ip}
        </Text>
      </View>

      {capture && streamUrl && (
        <ThumbnailCapture
          url={streamUrl}
          onFrame={handleFrame}
          onError={handleCaptureError}
        />
      )}

      {offline && <View style={styles.offlineOverlay} />}
    </View>
  );
}

/**
 * Mengambil frame pertama dari stream, lalu berhenti. WebView baru dipasang
 * setelah dapat jatah supaya daftar yang panjang tidak membuka belasan koneksi
 * ke kamera sekaligus.
 */
function ThumbnailCapture({
  url,
  onFrame,
  onError,
}: {
  url: string;
  onFrame: (dataUrl: string) => void;
  onError: () => void;
}) {
  const [release, setRelease] = useState<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let acquired: (() => void) | null = null;
    acquireCaptureSlot().then(slot => {
      if (cancelled) {
        slot();
        return;
      }
      acquired = slot;
      setRelease(() => slot);
    });
    return () => {
      cancelled = true;
      if (acquired) acquired();
    };
  }, [url]);

  const handleMessage = useCallback(
    (e: { nativeEvent: { data: string } }) => {
      let msg: { type?: string; data?: string; message?: string };
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'frame' && typeof msg.data === 'string') onFrame(msg.data);
      if (msg.type === 'error') onError();
    },
    [onFrame, onError],
  );

  if (!release) return null;

  return (
    <WebView
      testID="thumbnail-capture"
      style={styles.capture}
      source={{ html: mjpegCaptureHtml(url), baseUrl: 'http://localhost' }}
      originWhitelist={['*']}
      mixedContentMode="always"
      javaScriptEnabled={true}
      domStorageEnabled={false}
      scrollEnabled={false}
      setSupportMultipleWindows={false}
      onMessage={handleMessage}
      onError={onError}
    />
  );
}

// Thumbnail tidak perlu live: sekali dapat frame, simpan untuk sesi ini.
const FRAME_TTL_MS = 5 * 60 * 1000;
const frameCache = new Map<string, { data: string; at: number }>();

// Tiap capture membuka satu koneksi ke gateway kamera. FlatList memasang
// beberapa baris sekaligus, jadi jumlahnya dibatasi dan sisanya mengantre.
const MAX_CONCURRENT_CAPTURES = 2;
let activeCaptures = 0;
const captureQueue: Array<() => void> = [];

function acquireCaptureSlot(): Promise<() => void> {
  const release = () => {
    const next = captureQueue.shift();
    if (next) {
      // Jatahnya langsung dialihkan, jadi hitungan tidak perlu turun.
      next();
      return;
    }
    activeCaptures--;
  };

  if (activeCaptures < MAX_CONCURRENT_CAPTURES) {
    activeCaptures++;
    return Promise.resolve(release);
  }

  return new Promise(resolve => {
    captureQueue.push(() => resolve(release));
  });
}

export default CameraThumbnail;