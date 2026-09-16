import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';
import { alertsStyles as styles } from '../../theme/styles';
import { Icon, type IconName } from '../../components/Icon';
import { timeAgo } from '../../utils/format';
import type { Alert } from '../../types';
import { useData } from '../../context/DataContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Alerts'>;

type Filter = 'semua' | 'kritis' | 'belum';

const SEVERITY_META: Record<
  Alert['severity'],
  { color: string; label: string; icon: IconName }
> = {
  critical: { color: Colors.danger, label: 'Kritis', icon: 'error' },
  warning: { color: Colors.warning, label: 'Peringatan', icon: 'warning' },
  info: { color: Colors.primary, label: 'Info', icon: 'info' },
};

const TYPE_LABEL: Record<Alert['type'], string> = {
  motion: 'Gerakan',
  person: 'Orang',
  vehicle: 'Kendaraan',
  sound: 'Suara',
  line: 'Garis batas',
};

export default function AlertsScreen({ navigation }: Props) {
  const { alerts, cameras, markAlertRead, markAllAlertsRead } = useData();
  const [filter, setFilter] = useState<Filter>('semua');

  const filtered = alerts.filter(a => {
    if (filter === 'kritis') return a.severity === 'critical';
    if (filter === 'belum') return !a.read;
    return true;
  });

  const unread = alerts.filter(a => !a.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifikasi Alert</Text>
        <Text style={styles.subtitle}>
          {unread > 0 ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
        </Text>
      </View>

      <View style={styles.filterRow}>
        {(
          [
            ['semua', 'Semua'],
            ['kritis', 'Kritis'],
            ['belum', 'Belum dibaca'],
          ] as [Filter, string][]
        ).map(([key, label]) => {
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {unread > 0 && (
          <TouchableOpacity style={styles.readAllBtn} onPress={markAllAlertsRead}>
            <Icon name="done-all" size={16} color={Colors.primary} />
            <Text style={styles.readAllText}>Tandai semua</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="notifications-off" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Tidak ada notifikasi</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sev = SEVERITY_META[item.severity];
          const cam = cameras.find(c => c.id === item.camera_id);
          return (
            <TouchableOpacity
              style={[styles.alertCard, !item.read && styles.alertUnread]}
              activeOpacity={0.8}
              onPress={() => {
                markAlertRead(item.id);
                if (cam)
                  navigation.navigate('CameraDetail', { cameraId: cam.id });
              }}
            >
              <View style={[styles.alertIcon, { backgroundColor: `${sev.color}1A` }]}>
                <Icon name={sev.icon} size={22} color={sev.color} />
              </View>
              <View style={styles.alertBody}>
                <View style={styles.alertTopRow}>
                  <View style={[styles.typeTag, { backgroundColor: `${sev.color}14` }]}>
                    <Text style={[styles.typeText, { color: sev.color }]}>
                      {TYPE_LABEL[item.type]}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>{timeAgo(item.time)}</Text>
                </View>
                <Text style={styles.alertMsg} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={styles.camText}>
                  <Icon name="videocam" size={11} color={Colors.textMuted} />{' '}
                  {cam?.name ?? 'Kamera'}
                </Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
