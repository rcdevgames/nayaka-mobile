import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme';
import { playbackStyles as styles } from '../../theme/styles';
import { Icon } from '../../components/Icon';
import { useData } from '../../context/DataContext';
import { recordingsApi } from '../../api';
import { formatDate } from '../../utils/format';
import type { Recording } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Playback'>;

const DATE_OPTIONS = ['Hari Ini', '7 Hari', '30 Hari'];
const DAYS: Record<string, number> = {
  'Hari Ini': 1,
  '7 Hari': 7,
  '30 Hari': 30,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function PlaybackScreen({ navigation, route }: Props) {
  const preselected = route.params?.cameraId;
  const { cameras } = useData();
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(
    preselected,
  );
  const [dateRange, setDateRange] = useState('7 Hari');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  // Muat ulang saat layar kembali fokus (mis. selesai Rekam dari LiveView).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      const days = DAYS[dateRange];
      const from = new Date();
      from.setDate(from.getDate() - days);

      recordingsApi
        .list({
          camera_id: selectedCamera,
          from: from.toISOString(),
          limit: 50,
        })
        .then(res => {
          if (active) setRecordings(Array.isArray(res) ? res : []);
        })
        .catch(e => console.warn('Gagal memuat rekaman', e))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [selectedCamera, dateRange]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Rekaman</Text>
        <Text style={styles.subtitle}>Putar kembali rekaman kamera</Text>
      </View>

      {/* Filter kamera */}
      <View style={styles.pickerRow}>
        <TouchableOpacity
          style={[styles.picker, !selectedCamera && styles.pickerActive]}
          onPress={() => setSelectedCamera(undefined)}
        >
          <Icon
            name="videocam"
            size={16}
            color={!selectedCamera ? Colors.white : Colors.textMuted}
          />
          <Text
            style={[
              styles.pickerText,
              !selectedCamera && styles.pickerTextActive,
            ]}
          >
            Semua
          </Text>
        </TouchableOpacity>
        {cameras.slice(0, 4).map(c => {
          const active = selectedCamera === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.picker, active && styles.pickerActive]}
              onPress={() =>
                setSelectedCamera(active ? undefined : c.id)
              }
            >
              <View style={[styles.pickerDot, { backgroundColor: c.status === 'online' ? Colors.success : Colors.textMuted }]} />
              <Text style={[styles.pickerText, active && styles.pickerTextActive]}>
                {c.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rentang tanggal */}
      <View style={styles.dateRow}>
        {DATE_OPTIONS.map(d => {
          const active = dateRange === d;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dateChip, active && styles.dateChipActive]}
              onPress={() => setDateRange(d)}
            >
              <Text
                style={[
                  styles.dateChipText,
                  active && styles.dateChipTextActive,
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="video-library" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Tidak ada rekaman</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.recCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('PlaybackDetail', { recording: item })
              }
            >
              <View style={styles.thumb}>
                <Icon name="videocam" size={22} color="rgba(255,255,255,0.4)" />
                <View style={styles.durBadge}>
                  <Text style={styles.durText}>{formatDuration(item.duration)}</Text>
                </View>
                {item.has_motion && (
                  <View style={styles.motionBadge}>
                    <Icon name="motion-photos-on" size={10} color={Colors.warning} />
                    <Text style={styles.motionText}>Motion</Text>
                  </View>
                )}
              </View>
              <View style={styles.recInfo}>
                <Text style={styles.recName} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.recLoc} numberOfLines={1}>
                  {item.camera_name}
                </Text>
                <View style={styles.recMetaRow}>
                  <Icon name="schedule" size={12} color={Colors.textMuted} />
                  <Text style={styles.recMeta}>{formatDate(item.started_at)}</Text>
                  <Icon name="storage" size={12} color={Colors.textMuted} style={{ marginLeft: 10 }} />
                  <Text style={styles.recMeta}>{formatBytes(item.size_bytes)}</Text>
                </View>
              </View>
              <Icon name="play-circle-outline" size={30} color={Colors.primary} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
