import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme';
import { subscriptionStyles as styles } from '../../theme/styles';
import { Icon } from '../../components/Icon';
import { subscriptionsApi } from '../../api';
import { formatIDR } from '../../utils/format';
import type {
  PaymentMethod,
  Subscription,
  SubscriptionPlan,
} from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Subscription'>;

const METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'qris', label: 'QRIS', icon: 'qr-code' },
  { key: 'transfer', label: 'Transfer Bank', icon: 'account-balance' },
  { key: 'va', label: 'Virtual Account', icon: 'confirmation-number' },
  { key: 'card', label: 'Kartu Kredit/Debit', icon: 'credit-card' },
];

const STATUS_META: Record<
  Subscription['status'],
  { label: string; color: string }
> = {
  active: { label: 'Aktif', color: Colors.success },
  pending: { label: 'Menunggu', color: Colors.warning },
  expired: { label: 'Berakhir', color: Colors.textMuted },
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export default function SubscriptionScreen({ navigation }: Props) {
  const [active, setActive] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [picked, setPicked] = useState<SubscriptionPlan | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('qris');
  const [paying, setPaying] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    setError('');
    Promise.all([subscriptionsApi.list(), subscriptionsApi.plans()])
      .then(([subs, plansData]) => {
        if (!alive) return;
        setActive(subs.data.active);
        setHistory(subs.data.subscriptions);
        setPlans(plansData.data);
      })
      .catch(e => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(load);

  const confirmPay = async () => {
    if (!picked) return;
    setPaying(true);
    try {
      const res = await subscriptionsApi.subscribe(picked.id, method);
      const subData = res.data;
      setActive(subData.active);
      setHistory(subData.subscriptions);
      setPicked(null);
      Alert.alert(
        'Berhasil',
        `Langganan ${picked.name} aktif sampai ${fmtDate(subData.active?.ends_at ?? null)}.`,
      );
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message ?? 'Pembelian gagal.');
    } finally {
      setPaying(false);
    }
  };

  if (loading)
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { marginLeft: 10 }]}>Langganan</Text>
        </View>
        <Text style={styles.subtitle}>Kelola paket monitoring Anda</Text>

        {error ? (
          <View style={styles.emptyActive}>
            <Text style={styles.emptyActiveTitle}>Gagal memuat</Text>
            <Text style={styles.emptyActiveSub}>{error}</Text>
          </View>
        ) : active ? (
          <View style={styles.activeCard}>
            <View style={styles.activeTop}>
              <Text style={styles.activeLabel}>Langganan Aktif</Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  {active.days_left != null ? `${active.days_left} hari lagi` : 'Aktif'}
                </Text>
              </View>
            </View>
            <Text style={styles.activePlan}>{active.plan_name}</Text>
            <Text style={styles.activeMeta}>
              {formatIDR(active.plan_price)} / bulan
            </Text>
            <Text style={styles.activePeriod}>
              {fmtDate(active.starts_at)} → {fmtDate(active.ends_at)}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyActive}>
            <Text style={styles.emptyActiveTitle}>Belum berlangganan</Text>
            <Text style={styles.emptyActiveSub}>
              Pilih paket di bawah untuk mengaktifkan monitoring.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Paket tersedia</Text>
        {plans.map(p => {
          const current = active?.plan_id === p.id && active.status === 'active';
          return (
            <View
              key={p.id}
              style={[styles.planCard, current && styles.planCurrent]}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{p.name}</Text>
                {current && (
                  <View style={styles.planTag}>
                    <Text style={styles.planTagText}>PAKET ANDA</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planPrice}>
                {formatIDR(p.price)}
                <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                  {' '}
                  / bulan
                </Text>
              </Text>
              <Text style={styles.planDesc}>{p.description || '—'}</Text>
              <View style={styles.planSpecs}>
                <View style={styles.planSpec}>
                  <Icon name="videocam" size={14} color={Colors.primary} />
                  <Text style={styles.planSpecText}>{p.cameras} kamera</Text>
                </View>
                <View style={styles.planSpec}>
                  <Icon name="cloud-upload" size={14} color={Colors.primary} />
                  <Text style={styles.planSpecText}>{p.storage_days} hari</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.planBtn, current && styles.planBtnDisabled]}
                disabled={current}
                onPress={() => {
                  setMethod('qris');
                  setPicked(p);
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.planBtnText,
                    current && styles.planBtnTextDisabled,
                  ]}
                >
                  {current ? 'Sedang aktif' : active ? 'Ganti ke paket ini' : 'Langganan sekarang'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>
          Riwayat langganan
        </Text>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="receipt-long" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Belum ada riwayat</Text>
          </View>
        ) : (
          history.map(s => {
            const meta = STATUS_META[s.status];
            return (
              <View key={s.id} style={styles.historyRow}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyPlan}>{s.plan_name}</Text>
                  <Text style={styles.historyDate}>
                    {fmtDate(s.starts_at)} → {fmtDate(s.ends_at)}
                  </Text>
                  <View
                    style={[
                      styles.statusTag,
                      { backgroundColor: `${meta.color}1F` },
                    ]}
                  >
                    <Text style={[styles.statusTagText, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyAmount}>{formatIDR(s.plan_price)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal pembayaran */}
      <Modal
        visible={!!picked}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!paying) setPicked(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bayar {picked?.name}</Text>
            <Text style={styles.modalSub}>
              {formatIDR(picked?.price ?? 0)} · 1 bulan
            </Text>
            <View style={styles.methodList}>
              {METHODS.map(m => {
                const on = method === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.methodRow, on && styles.methodActive]}
                    onPress={() => setMethod(m.key)}
                  >
                    <Icon
                      name={m.icon as any}
                      size={20}
                      color={on ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.methodLabel, { marginLeft: 12 }]}>
                      {m.label}
                    </Text>
                    {on && (
                      <Icon name="check-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setPicked(null)}
                disabled={paying}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={confirmPay}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Bayar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
