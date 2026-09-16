import React from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../theme';
import { cameraThumbnailStyles as styles } from '../theme/styles';
import { Icon } from './Icon';
import { StatusBadge } from './common';
import type { Camera } from '../types';

interface CameraThumbnailProps {
  camera: Camera;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Placeholder video: gunakan <Image source={{ uri: streamURL }} /> atau
 * player HLS (react-native-video) saat stream asli tersedia.
 * ponytail: renderer stream nyata; ganti saat backend CCTV disediakan.
 */
export function CameraThumbnail({ camera, height = 130, style }: CameraThumbnailProps) {
  const offline =
    camera.status === 'offline';

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
