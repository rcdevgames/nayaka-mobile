import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';
import { cameraDetailStyles as styles } from '../../theme/styles';
import { Icon, type IconName } from '../../components/Icon';
import { StatusBadge } from '../../components/common';
import { MjpegView } from '../../components/MjpegView';
import { useData } from '../../context/DataContext';
import { timeAgo } from '../../utils/format';
import { settingsApi, snapshotsApi } from '../../api';
import type { CustomerSettings } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CameraDetail'>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function CameraDetailScreen({ navigation, route }: Props) {
  const { cameras } = useData();
  const [localSettings, setLocalSettings] = useState<CustomerSettings | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);

  const camera = cameras.find(c => c.id === route.params.cameraId);

  // Pengaturan kamera per perangkat belum ada endpointnya, jadi yang ditampilkan
  // di sini nilai akun dari GET /mobile/me/settings, dengan label yang jujur.
  useEffect(() => {
    let active = true;
    settingsApi
      .get()
      .then(s => {
        if (active) setLocalSettings(s);
      })
      .catch(e => console.warn('Gagal memuat preferensi akun', e));
    return () => {
      active = false;
    };
  }, []);

  const updatePreference = (patch: Partial<CustomerSettings>) => {
    setLocalSettings(prev => (prev ? { ...prev, ...patch } : prev));
    setSettingsBusy(true);
    settingsApi
      .update(patch)
      .catch(e => {
        console.warn('Gagal menyimpan preferensi', e);
        Alert.alert('Gagal', (e as Error).message ?? 'Simpan pengaturan gagal.');
      })
      .finally(() => setSettingsBusy(false));
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
            {online && camera.stream_url ? (
              <MjpegView url={camera.stream_url} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Icon
                  name="videocam-off"
                  size={44}
                  color="rgba(255,255,255,0.25)"
                />
                <Text style={styles.previewPlaceholderText}>
                  {online ? 'Sumber stream belum tersedia' : 'Kamera tidak terhubung'}
                </Text>
                {!online && camera.last_seen_at && (
                  <Text style={styles.previewPlaceholderHint}>
                    Terakhir aktif {timeAgo(camera.last_seen_at)}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.previewBottom}>
            <Text style={styles.previewTime}>
              {camera.status === 'recording'
                ? 'MEREKAM'
                : camera.status === 'online'
                  ? 'LIVE'
                  : 'TIDAK TERHUBUNG'}
            </Text>
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

        {/* Preferensi akun. Pengaturan per kamera belum ada endpointnya, jadi
            labelnya menyebut akun supaya tidak terbaca sebagai setelan perangkat. */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferensi Akun</Text>
          {localSettings ? (
            <>
              <CameraSwitch
                icon="motion-photos-on"
                label="Deteksi Gerakan"
                sub="Berlaku untuk semua kamera"
                value={localSettings.motion_notifications}
                disabled={settingsBusy}
                onChange={v => updatePreference({ motion_notifications: v })}
              />
              <View style={styles.divider} />
              <CameraSwitch
                icon="notifications-active"
                label="Notifikasi Alert"
                sub="Berlaku untuk semua kamera"
                value={localSettings.push_enabled}
                disabled={settingsBusy}
                onChange={v => updatePreference({ push_enabled: v })}
              />
            </>
          ) : (
            <Text style={styles.noRec}>Preferensi akun belum bisa dimuat.</Text>
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

function CameraSwitch({
  icon,
  label,
  sub,
  value,
  disabled,
  onChange,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.menuRow}>
      <Icon name={icon} size={20} color={Colors.textMuted} />
      <View style={styles.menuLabelWrap}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sub != null && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: Colors.primarySoft, false: Colors.border }}
        thumbColor={value ? Colors.primary : Colors.surface}
      />
    </View>
  );
}
