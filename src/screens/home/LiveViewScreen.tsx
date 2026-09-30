import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme';
import { liveViewStyles as styles } from '../../theme/styles';
import { Icon, type IconName } from '../../components/Icon';
import { MjpegView } from '../../components/MjpegView';
import { useData } from '../../context/DataContext';
import { camerasApi, snapshotsApi } from '../../api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'LiveView'>;

export default function LiveViewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { cameras, refresh } = useData();
  const camera = cameras.find(c => c.id === route.params.cameraId);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Stream key untuk force-remount MjpegView â€” setiap masuk halaman stream di-restart
  const [streamKey, setStreamKey] = useState(0);

  // Force-remount stream setiap kali halaman di-focus (masuk/keluar lalu masuk lagi)
  useFocusEffect(
    useCallback(() => {
      setRecording(camera?.is_recording ?? false);
      setElapsed(0);
      setStreamKey(k => k + 1);
    }, [camera?.id]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Timer REC berjalan
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const fmt = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  if (!camera) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Kamera tidak ditemukan</Text>
      </View>
    );
  }

  const online = camera.status !== 'offline';
  const streamUrl = camera.stream_url;

  return (
    <View style={styles.safe}>
      {/* Stream area */}
      <View
        style={[
          styles.stream,
          { paddingTop: insets.top + Spacing.sm },
        ]}
      >
        <View style={styles.streamHeader}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
            hitSlop={10}
          >
            <Icon name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.streamTitle}>
            <Text style={styles.streamName} numberOfLines={1}>
              {camera.name}
            </Text>
            <Text style={styles.streamLoc} numberOfLines={1}>
              {camera.location}
            </Text>
          </View>
          <View style={styles.streamActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('CameraDetail', { cameraId: camera.id })}
              hitSlop={10}
            >
              <Icon name="info-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {online ? (
          streamUrl ? (
            <View style={styles.streamCenter}>
              <MjpegView key={`stream-${streamKey}`} url={streamUrl} />
            </View>
          ) : (
            <View style={styles.streamCenter}>
              <Icon name="videocam-off" size={80} color="rgba(255,255,255,0.12)" />
              <Text style={styles.streamPlaceholder}>
                Sumber stream belum tersedia
              </Text>
              <Text style={styles.streamHint}>
                Kamera ini tidak mengirim alamat stream.
              </Text>
            </View>
          )
        ) : (
          <View style={styles.streamCenter}>
            <Icon name="videocam-off" size={80} color="rgba(255,255,255,0.2)" />
            <Text style={styles.offlineText}>Kamera sedang offline</Text>
          </View>
        )}

        {recording && (
          <View style={styles.recTimer}>
            <View style={styles.recDot} />
            <Text style={styles.recTimerText}>{fmt(elapsed)}</Text>
          </View>
        )}

        <View style={styles.streamFooter}>
          <Text style={styles.footerText}>LIVE Â· {new Date().toLocaleTimeString('id-ID')}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.md }]}>
        {online ? (
          <>
            <ControlBtn
              icon="photo-camera"
              label="Foto"
              onPress={async () => {
                if (busy || !camera) return;
                setBusy(true);
                try {
                  const snapshot = await snapshotsApi.create(camera.id);
                  Alert.alert(
                    'Snapshot disimpan',
                    `${camera.name} Â· ${snapshot.resolution}`,
                  );
                } catch (e) {
                  Alert.alert(
                    'Gagal',
                    (e as Error).message ?? 'Ambil foto gagal.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            <TouchableOpacity
              style={[
                styles.recordBtn,
                recording && styles.recordBtnActive,
              ]}
              onPress={async () => {
                if (busy || !camera) return;
                setBusy(true);
                try {
                  if (recording) {
                    await camerasApi.stopRecording(camera.id);
                    setRecording(false);
                    setElapsed(0);
                    Alert.alert('Berhasil', 'Rekaman dihentikan.');
                    refresh();
                  } else {
                    await camerasApi.startRecording(camera.id);
                    setRecording(true);
                    setElapsed(0);
                    refresh();
                  }
                } catch (e) {
                  const msg =
                    (e as Error).message ?? 'Operasi rekaman gagal.';
                  if (!recording && /sedang merekam/i.test(msg)) {
                    // State kamera di server = merekam tapi bukan dari sesi ini.
                    refresh();
                  } else {
                    Alert.alert('Gagal', msg);
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              <View style={styles.recordInner}>
                {!recording && <View style={styles.recordDot} />}
              </View>
              <Text style={styles.recordLabel}>
                {recording ? 'Stop' : 'Rekam'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.retryBtn}
            disabled={retrying}
            onPress={async () => {
              if (retrying) return;
              setRetrying(true);
              try {
                await refresh();
                setStreamKey(k => k + 1);
              } finally {
                setRetrying(false);
              }
            }}
          >
            {retrying ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Icon name="refresh" size={18} color={Colors.white} />
            )}
            <Text style={styles.retryText}>{retrying ? 'Memuat...' : 'Coba Lagi'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function ControlBtn({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.controlBtn} onPress={onPress} activeOpacity={0.8}>
      <Icon name={icon} size={22} color={Colors.text} />
      <Text style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

