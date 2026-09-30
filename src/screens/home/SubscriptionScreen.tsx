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
import { Colors, Radius, Spacing } from '../../theme';
import { subscriptionStyles as styles } from '../../theme/styles';
import { Icon, type IconName } from '../../components/Icon';
import { subscriptionsApi, type RawSubscription } from '../../api';
import { formatIDR } from '../../utils/format';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

// ── Types ───────────────────────────────────────────────────────────────
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
          <>
            {/* Free Plan Info */}
            <View style={styles.freeCard}>
              <View style={styles.freeHeader}>
                <Icon name="star" size={24} color={Colors.warning} />
                <Text style={styles.freeTitle}>Free Plan</Text>
              </View>
              <Text style={styles.freeDesc}>
                Akses fitur dasar monitoring CCTV. Upgrade untuk unlock semua fitur premium.
              </Text>
              <View style={styles.freeFeatures}>
                <FreeFeature icon="videocam" text="1 Kamera" />
                <FreeFeature icon="play-circle-outline" text="Playback 1 jam" />
                <FreeFeature icon="notifications-none" text="Notifikasi dasar" />
                <FreeFeature icon="cloud-done" text="Cloud storage 1 GB" />
              </View>
            </View>

            {/* Plans */}
          </>
        )}

        <Text style={styles.sectionTitle}>Pilihan Paket</Text>
        <Text style={styles.plansNote}>
          Paket di bawah ini adalah perbandingan fitur. Pembelian paket belum tersedia dari aplikasi.
        </Text>
        <View style={styles.plansList}>
          <PlanCard
            name="Starter"
            price={49000}
            period="bulan"
            features={['5 Kamera', 'Playback 7 hari', 'Cloud 10 GB', 'Notifikasi lengkap']}
            popular={false}
          />
          <PlanCard
            name="Professional"
            price={99000}
            period="bulan"
            features={['15 Kamera', 'Playback 30 hari', 'Cloud 50 GB', 'AI Detection', 'Priority Support']}
            popular={true}
          />
          <PlanCard
            name="Enterprise"
            price={199000}
            period="bulan"
            features={['Kamera tak terbatas', 'Playback unlimited', 'Cloud 200 GB', 'AI Detection', 'Multi-user', 'Dedicated Support']}
            popular={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function FreeFeature({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={freeStyles.feature}>
      <Icon name={icon} size={14} color={Colors.textMuted} />
      <Text style={freeStyles.featureText}>{text}</Text>
    </View>
  );
}

interface PlanCardProps {
  name: string;
  price: number;
  period: string;
  features: string[];
  popular: boolean;
}

function PlanCard({ name, price, period, features, popular }: PlanCardProps) {
  return (
    <View style={[planStyles.card, popular && planStyles.cardPopular]}>
      {popular && (
        <View style={planStyles.popularBadge}>
          <Text style={planStyles.popularBadgeText}>TERPOPULER</Text>
        </View>
      )}
      <Text style={[planStyles.name, popular && planStyles.namePopular]}>{name}</Text>
      <View style={planStyles.priceRow}>
        <Text style={[planStyles.price, popular && planStyles.pricePopular]}>
          {formatIDR(price)}
        </Text>
        <Text style={[planStyles.period, popular && planStyles.periodPopular]}> / {period}</Text>
      </View>
      <View style={planStyles.divider} />
      <View style={planStyles.features}>
        {features.map((f, i) => (
          <View key={i} style={planStyles.feature}>
            <Icon name="check" size={12} color={popular ? Colors.white : Colors.success} />
            <Text style={[planStyles.featureText, popular && planStyles.featureTextPopular]}>{f}</Text>
          </View>
        ))}
      </View>
      <View style={[planStyles.btn, popular && planStyles.btnPopular]}>
        <Text style={[planStyles.btnText, popular && planStyles.btnTextPopular]}>Segera hadir</Text>
      </View>
    </View>
  );
}

// ── Inline styles ───────────────────────────────────────────────────────

const freeStyles = StyleSheet.create({
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});

const planStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPopular: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  popularBadge: {
    backgroundColor: Colors.warning,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  popularBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  namePopular: {
    color: Colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  pricePopular: {
    color: Colors.white,
  },
  period: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  periodPopular: {
    color: 'rgba(255,255,255,0.7)',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  features: {
    gap: 6,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  featureTextPopular: {
    color: 'rgba(255,255,255,0.85)',
  },
  btn: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  btnPopular: {
    backgroundColor: Colors.white,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  btnTextPopular: {
    color: Colors.primary,
  },
});
