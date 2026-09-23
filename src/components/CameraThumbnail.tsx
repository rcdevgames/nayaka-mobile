import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../theme';
import { cameraThumbnailStyles as styles } from '../theme/styles';
import { Icon } from './Icon';
import { StatusBadge } from './common';
import { thumbnailsApi } from '../api';
import type { Camera } from '../types';

interface CameraThumbnailProps {
  camera: Camera;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Daftar kamera tidak bisa memutar MJPEG: <Image> RN tidak memahami
 * multipart/x-mixed-replace, dan satu WebView per baris berarti puluhan
 * instance native sekaligus (limit list 50). Yang dipakai di sini karena itu
 * hanya foto diam.
 *
 * Backend sekarang mengirim thumbnail_url == stream_url, yaitu stream, bukan
 * JPEG. Kontrak API bagian 2.1 meminta signed URL berumur pendek, jadi
 * thumbnail diam dianggap belum ada sampai nilainya berbeda dari stream_url.
 * Begitu backend mengirim URL gambar sungguhan, blok di bawah aktif sendiri.
 */
export function CameraThumbnail({ camera, height = 130, style }: CameraThumbnailProps) {
  const offline = camera.status === 'offline';
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);
  const abortRef = useRef<boolean>(false);

  // Fetch thumbnail dengan auth header saat URL berubah
  useEffect(() => {
    const thumbUrl = camera.thumbnail_url && camera.thumbnail_url !== camera.stream_url
      ? camera.thumbnail_url
      : null;

    if (!thumbUrl || camera.status === 'offline') {
      setThumbnailSrc(null);
      return;
    }

    abortRef.current = false;
    thumbnailsApi.fetch(thumbUrl)
      .then(data => {
        if (!abortRef.current) setThumbnailSrc(data);
      })
      .catch(() => {
        if (!abortRef.current) setThumbFailed(true);
      });

    return () => {
      abortRef.current = true;
    };
  }, [camera.thumbnail_url, camera.stream_url, camera.status]);

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
        {camera.status === 'offline' ? (
          <>
            <Icon name="videocam-off" size={34} color={Colors.textMuted} />
            <Text style={styles.offlineText}>Kamera tidak terhubung</Text>
          </>
        ) : thumbnailSrc && !thumbFailed ? (
          <Image
            source={{ uri: thumbnailSrc }}
            style={styles.stillImage}
            resizeMode="cover"
            onError={() => setThumbFailed(true)}
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
      {offline && (
        <View style={styles.offlineOverlay} />
      )}
    </View>
  );
}

export default CameraThumbnail;
