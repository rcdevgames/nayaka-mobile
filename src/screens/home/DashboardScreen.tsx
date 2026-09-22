import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme';
import { dashboardStyles as styles } from '../../theme/styles';
import { Icon } from '../../components/Icon';
import { StatusBadge, StatCard, SectionHeader } from '../../components/common';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api';
import { timeAgo } from '../../utils/format';
import type { Alert, Camera } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, MainTabParamList } from '../../navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dashboard'>;

/**
 * Halaman-halaman ini sudah menjadi tab sendiri. Kalau dibuka lewat navigate
 * di dalam stack, halaman baru menumpuk di atas Dashboard padahal tab-nya sudah
 * ada — jadi yang dipakai adalah lompat tab, bukan push.
 */
function useTabNavigation() {
  return useNavigation<BottomTabNavigationProp<MainTabParamList>>();
}

export default function DashboardScreen({ navigation }: Props) {
  const tab = useTabNavigation();
  const { user } = useAuth();
  const { cameras, alerts, unreadCount } = useData();
  const firstName = user?.name?.split(' ')[0] ?? 'Pengguna';

  // Stats from new dashboard API
  const [totalCameras, setTotalCameras] = React.useState(0);
  const [activeCameras, setActiveCameras] = React.useState(0);
  const [recordingCount, setRecordingCount] = React.useState(0);
  const [alertUnread, setAlertUnread] = React.useState(0);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      dashboardApi
        .get()
        .then(d => {
          if (active) {
            setTotalCameras(d.total_cameras ?? cameras.length);
            setActiveCameras(d.active_cameras ?? 0);
            setRecordingCount(d.recording_cameras ?? 0);
            setAlertUnread(d.alert_unread ?? 0);
          }
        })
        .catch(e => console.warn('Gagal memuat statistik', e));
      return () => {
        active = false;
      };
    }, [cameras.length]),
  );

  const displayTotal = totalCameras || cameras.length;
  const displayActive = activeCameras || cameras.filter(c => c.status === 'online').length;
  const displayRecording = recordingCount || cameras.filter(c => c.is_recording).length;
  const displayAlerts = alertUnread || unreadCount;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Halo, {firstName} 👋</Text>
            <Text style={styles.subGreeting}>Selamat datang kembali</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => tab.navigate('AlertsTab')}
          >
            <Icon name="notifications-none" size={22} color={Colors.text} />
            {displayAlerts > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>
                  {displayAlerts > 9 ? '9+' : displayAlerts}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Emergency Call */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={() => navigation.navigate('Emergency')}
          activeOpacity={0.85}
        >
          <View style={styles.emergencyIcon}>
            <Icon name="call" size={24} color={Colors.white} />
          </View>
          <View style={styles.emergencyText}>
            <Text style={styles.emergencyTitle}>Emergency Call</Text>
            <Text style={styles.emergencySub}>
              Hubungi tim Nayaka untuk bantuan darurat
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.white} />
        </TouchableOpacity>

        {/* Ringkasan sistem */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Icon name="verified-user" size={20} color={Colors.primary} />
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>Sistem Keamanan Aktif</Text>
              <Text style={styles.summarySub}>
                {displayActive} dari {displayTotal} kamera online
              </Text>
            </View>
            <StatusBadge status="online" />
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryQuick}>
            <View style={styles.quickItem}>
              <Icon name="videocam" size={16} color={Colors.primary} />
              <Text style={styles.quickValue}>{displayTotal}</Text>
              <Text style={styles.quickLabel}>Kamera</Text>
            </View>
            <View style={styles.quickDivider} />
            <View style={styles.quickItem}>
              <Icon name="fiber-manual-record" size={16} color={Colors.recordingRed} />
              <Text style={styles.quickValue}>{displayRecording}</Text>
              <Text style={styles.quickLabel}>Merekam</Text>
            </View>
            <View style={styles.quickDivider} />
            <View style={styles.quickItem}>
              <Icon name="notifications-active" size={16} color={Colors.warning} />
              <Text style={styles.quickValue}>{displayAlerts}</Text>
              <Text style={styles.quickLabel}>Alert</Text>
            </View>
          </View>
        </View>

        {/* Kamera */}
        <SectionHeader
          title="Kamera"
          action="Lihat semua"
          onPress={() => tab.navigate('CamerasTab')}
        />
        <FlatList
          horizontal
          data={cameras}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <CameraMiniCard
              camera={item}
              onPress={() =>
                tab.navigate('CamerasTab', {
                  screen: 'CameraDetail',
                  params: { cameraId: item.id },
                })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyCameras}>
              <Text style={styles.emptyText}>Belum ada kamera</Text>
            </View>
          }
        />

        {/* Alert terbaru */}
        <SectionHeader
          title="Alert Terbaru"
          action="Semua alert"
          onPress={() => tab.navigate('AlertsTab')}
        />
        {alerts.slice(0, 3).map(item => (
          <AlertRow
            key={item.id}
            item={item}
            onPress={() => tab.navigate('AlertsTab')}
          />
        ))}
        {alerts.length === 0 && (
          <View style={styles.emptyAlerts}>
            <Icon name="notifications-none" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Tidak ada alert terbaru</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CameraMiniCard({
  camera,
  onPress,
}: {
  camera: Camera;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.miniCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.miniPreview}>
        <Icon
          name={camera.status === 'offline' ? 'videocam-off' : 'videocam'}
          size={28}
          color={camera.status === 'offline' ? Colors.textMuted : Colors.white}
        />
        {camera.is_recording && (
          <View style={styles.miniRec}>
            <View style={styles.miniRecDot} />
          </View>
        )}
      </View>
      <View style={styles.miniInfo}>
        <Text style={styles.miniName} numberOfLines={1}>
          {camera.name}
        </Text>
        <Text style={styles.miniLoc} numberOfLines={1}>
          {camera.location}
        </Text>
        <View style={{ marginTop: 4 }}>
          <StatusBadge status={camera.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AlertRow({
  item,
  onPress,
}: {
  item: Alert;
  onPress: () => void;
}) {
  const isCritical = item.severity === 'critical';
  const accent = isCritical ? Colors.danger : Colors.warning;
  return (
    <TouchableOpacity
      style={[styles.alertRow, !item.read && styles.alertRowUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.alertIcon, { backgroundColor: `${accent}1A` }]}>
        <Icon
          name={isCritical ? 'person' : 'motion-photos-on'}
          size={20}
          color={accent}
        />
      </View>
      <View style={styles.alertBody}>
        <Text style={styles.alertMsg} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.alertMeta}>
          {timeAgo(item.time)} · {item.camera_name}
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}
