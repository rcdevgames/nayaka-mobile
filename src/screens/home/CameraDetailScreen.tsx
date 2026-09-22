import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';
import { cameraDetailStyles as styles } from '../../theme/styles';
import { Icon, type IconName } from '../../components/Icon';
import { StatusBadge } from '../../components/common';
import { MjpegView } from '../../components/MjpegView';
import { useData } from '../../context/DataContext';
import { camerasApi, recordingsApi, snapshotsApi } from '../../api';
import { formatDuration } from '../../utils/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import type { CameraSettings, Recording } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CameraDetail'>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function CameraDetailScreen({ navigation, route }: Props) {
  const { cameras } = useData();
  const [motionDetect, setMotionDetect] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [relatedRecordings, setRelatedRecordings] = useState<Recording[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [loadingRecordings, setLoadingRecordings] = useState(true);

  const camera = cameras.find(c => c.id === route.params.cameraId);

  useEffect(() => {
    let active = true;
    if (!camera) return;
    setLoadingRecordings(true);
    recordingsApi
      .list({ camera_id: camera.id, limit: 20 })
      .then(res => {
        if (active) setRelatedRecordings(Array.isArray(res) ? res : []);
      })
      .catch(e => console.warn('Gagal memuat rekaman kamera', e))
      .finally(() => {
        if (active) setLoadingRecordings(false);
      });
    return () => {
      active = false;
    };
  }, [camera?.id]);

  useEffect(() => {
    let active = true;
    if (!camera) return;
    setSettingsLoaded(false);
    camerasApi
      .getSettings(camera.id)
      .then(res => {
        if (!active) return;
        setMotionDetect(res.motion_detection);
        setNotifEnabled(res.notification_enabled);
      })
      .catch(e => console.warn('Gagal memuat pengaturan kamera', e))
      .finally(() => {
        if (active) setSettingsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [camera?.id]);

  const saveSettings = (patch: { motion_detection?: boolean; notification_enabled?: boolean }) => {
    if (!camera || !settingsLoaded) return;
    camerasApi
      .updateSettings(camera.id, patch)
      .catch(e => {
        console.warn('Gagal menyimpan pengaturan kamera', e);
        Alert.alert('Gagal', (e as Error).message ?? 'Simpan pengaturan gagal.');
      });
  };

  const handleSnapshot = async () => {
    if (!camera || snapshotBusy) return;
    setSnapshotBusy(true);
    try {
      const snapshot = await snapshotsApi.create(camera.id);
      Alert.alert(
        'Snapshot disimpan',
        `${camera.name} · ${snapshot.resolution} (${formatBytes(snapshot.size_bytes)})`,
      );
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message ?? 'Ambil foto gagal.');
    } finally {
      setSnapshotBusy(false);
    }
  };

  if (!camera) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.missing}>
          <Text style={styles.missingText}>Kamera tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  const online = camera.status !== 'offline';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Live preview */}
        <View style={styles.preview}>
          <View style={styles.previewTop}>
            <Text style={styles.previewLabel} numberOfLines={1}>
              {camera.name}
            </Text>
            <View style={styles.previewBadges}>
              {camera.is_recording && (
                <View style={styles.recTag}>
                  <View style={styles.recDot} />
                  <Text style={styles.recText}>REC</Text>
                </View>
              )}
              <StatusBadge status={camera.status} />
            </View>
          </View>

          <View style={styles.previewCenter}>
            {online ? (
              camera.stream_url ? (
                <MjpegView url={camera.stream_url} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Icon name="videocam-off" size={44} color="rgba(255,255,255,0.25)" />
                  <Text style={styles.previewPlaceholderText}>
                    Sumber stream belum tersedia
                  </Text>
                </View>
              )
            ) : (
              <Icon name="videocam-off" size={44} color={Colors.textMuted} />
            )}
          </View>

          <View style={styles.previewBottom}>
            <Text style={styles.previewTime}>Kamera tidak terhubung</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <ActionBtn
            icon="fullscreen"
            label="Live"
            onPress={() =>
              online &&
              navigation.navigate('LiveView', { cameraId: camera.id })
            }
            disabled={!online}
          />
          <ActionBtn
            icon="play-circle-outline"
            label="Putar"
            onPress={() =>
              navigation.navigate('Playback', { cameraId: camera.id })
            }
          />
          <ActionBtn
            icon="camera-alt"
            label="Foto"
            onPress={handleSnapshot}
            disabled={!online || snapshotBusy}
          />
          <ActionBtn icon="more-vert" label="Lainnya" onPress={() => Alert.alert('Info', 'Menu lainnya (dummy).')} />
        </View>

        {/* Detail */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detail Kamera</Text>
          <DetailRow label="Nama" value={camera.name} />
          <DetailRow label="Lokasi" value={camera.location} />
          <DetailRow label="Alamat IP" value={camera.ip} />
          <DetailRow label="Resolusi" value={camera.resolution} />
          <DetailRow label="Sudut Pandang" value={`${camera.fov}°`} />
          {camera.battery != null && (
            <DetailRow label="Baterai" value={`${camera.battery}%`} />
          )}
        </View>

        {/* Pengaturan */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pengaturan</Text>
          <SettingRow
            icon="motion-photos-on"
            label="Deteksi Gerakan"
            value={motionDetect}
            onChange={v => {
              setMotionDetect(v);
              saveSettings({ motion_detection: v });
            }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="notifications-active"
            label="Notifikasi Alert"
            value={notifEnabled}
            onChange={v => {
              setNotifEnabled(v);
              saveSettings({ notification_enabled: v });
            }}
          />
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow} onPress={() => {}}>
            <Icon name="schedule" size={20} color={Colors.textMuted} />
            <Text style={styles.menuLabel}>Jadwal Perekaman</Text>
            <Icon name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Rekaman */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rekaman Terkait</Text>
          {loadingRecordings ? (
            <ActivityIndicator color={Colors.primary} style={{ padding: 16 }} />
          ) : relatedRecordings.length === 0 ? (
            <Text style={styles.noRec}>Belum ada rekaman untuk kamera ini.</Text>
          ) : (
            relatedRecordings.map(rec => (
              <TouchableOpacity
                key={rec.id}
                style={styles.recRow}
                onPress={() =>
                  navigation.navigate('PlaybackDetail', { recording: rec })
                }
              >
                <View style={styles.recThumb}>
                  <Icon name="movie" size={18} color={Colors.primary} />
                </View>
                <View style={styles.recInfo}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recMeta}>
                    {new Date(rec.started_at).toLocaleDateString('id-ID')} · {formatDuration(rec.duration)}
                  </Text>
                </View>
                <Icon name="play-circle-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIcon, disabled && { opacity: 0.4 }]}>
        <Icon
          name={icon}
          size={20}
          color={disabled ? Colors.textMuted : Colors.primary}
        />
      </View>
      <Text
        style={[styles.actionLabel, disabled && { color: Colors.textMuted }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: IconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.menuRow}>
      <Icon name={icon} size={20} color={Colors.textMuted} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Colors.primarySoft, false: Colors.border }}
        thumbColor={value ? Colors.primary : Colors.surface}
      />
    </View>
  );
}
