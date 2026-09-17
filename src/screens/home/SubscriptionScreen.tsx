import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme';
import { subscriptionStyles as styles } from '../../theme/styles';
import { Icon } from '../../components/Icon';
import { subscriptionsApi, type RawSubscription } from '../../api';
import { formatIDR } from '../../utils/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Subscription'>;

const DAY_MS = 864e5;

/** Field di dalam `subscription` belum terdokumentasi, jadi tiap nilai dibaca dari beberapa nama. */
const pick = (s: RawSubscription, keys: string[]): unknown => {
  for (const k of keys) {
    const v = s[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

const pickString = (s: RawSubscription, keys: string[]): string | null => {
  const v = pick(s, keys);
  return typeof v === 'string' ? v : null;
};

const pickNumber = (s: RawSubscription, keys: string[]): number | null => {
  const v = pick(s, keys);
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
};

const STATUS_TEXT: Record<string, string> = {
  active: 'Aktif',
  pending: 'Menunggu pembayaran',
  suspended: 'Ditangguhkan',
  expired: 'Berakhir',
  cancelled: 'Dibatalkan',
};

const STATUS_TINT: Record<string, string> = {
  active: Colors.success,
  pending: Colors.warning,
  suspended: Colors.warning,
  expired: Colors.textMuted,
  cancelled: Colors.danger,
};

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/** Sisa hari dari tanggal berakhir, dihitung lokal agar tidak bergantung field back end. */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
}

export default function SubscriptionScreen({ navigation }: Props) {
  const [sub, setSub] = useState<RawSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    [],
  );

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const data = await subscriptionsApi.current();
      if (!aliveRef.current) return;
      setSub(data);
    } catch (e) {
      if (aliveRef.current) {
        setError((e as Error).message || 'Gagal memuat data langganan.');
      }
    } finally {
      if (aliveRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading)
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.centeredText}>Memuat data langganan...</Text>
        </View>
      </SafeAreaView>
    );

  const planName = sub
    ? pickString(sub, ['plan_name', 'planName', 'plan', 'name'])
    : null;
  const price = sub
    ? pickNumber(sub, ['plan_price', 'planPrice', 'price', 'amount'])
    : null;
  const statusRaw = sub ? pickString(sub, ['status']) : null;
  const status = statusRaw?.toLowerCase() ?? null;
  const startsRaw = sub
    ? pickString(sub, [
        'starts_at',
        'startsAt',
        'start_date',
        'activated_at',
      ])
    : null;
  const endsRaw = sub
    ? pickString(sub, [
        'ends_at',
        'endsAt',
        'end_date',
        'expires_at',
        'expired_at',
      ])
    : null;
  const startsAt = fmtDate(startsRaw);
  const endsAt = fmtDate(endsRaw);
  const left = daysUntil(endsRaw);
  const tint = status
    ? STATUS_TINT[status] ?? Colors.textMuted
    : Colors.textMuted;
  const statusText = status
    ? STATUS_TEXT[status] ?? statusRaw ?? '-'
    : 'Tidak diketahui';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Langganan</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Icon name="error-outline" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} hitSlop={8}>
              <Text style={styles.errorAction}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : sub ? (
          <>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: tint }]} />
              <Text style={[styles.statusText, { color: tint }]}> {statusText}</Text>
            </View>

            <View style={styles.activeCard}>
              <Text style={styles.activeLabel}>Langganan Anda</Text>
              <Text style={styles.activePlan}>
                {planName ?? 'Paket tidak diketahui'}
              </Text>
              {price != null ? (
                <Text style={styles.activeMeta}>
                  {formatIDR(price)} per bulan
                </Text>
              ) : null}

              {endsRaw ? (
                <>
                  {/* Meter hanya indikator kasar sisa masa aktif, bukan data terukur. */}
                  <View style={styles.meterTrack}>
                    <View
                      style={[
                        styles.meterFill,
                        {
                          width: `${
                            left != null && left <= 30
                              ? Math.max(6, Math.round((left / 30) * 100))
                              : 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.activePeriod}>
                    <Text style={styles.activePeriodText}>
                      {left != null ? `Sisa ${left} hari` : 'Masa aktif berjalan'}
                    </Text>
                    <Text style={styles.activePeriodText}>
                      Berakhir {endsAt ?? '-'}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Rincian</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { color: tint }]}> {statusText}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mulai</Text>
                <Text style={styles.detailValue}>{startsAt ?? '-'}</Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowLast]}>
                <Text style={styles.detailLabel}>Berakhir</Text>
                <Text style={styles.detailValue}>{endsAt ?? '-'}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyActive}>
            <Text style={styles.emptyActiveTitle}>Belum ada langganan</Text>
            <Text style={styles.emptyActiveSub}>
              Akun ini belum terhubung ke langganan mana pun. Hubungi tim Nayaka
              untuk mengaktifkan paket.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => navigation.navigate('Help', {})}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyActionText}>Buka Pusat Bantuan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
