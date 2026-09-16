import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';
import { Icon, type IconName } from '../../components/Icon';
import { emergencyApi, type EmergencyContact } from '../../api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Emergency'>;

// Icon mapping based on contact name keywords
function getContactIcon(name: string): IconName {
  const lower = name.toLowerCase();
  if (lower.includes('teknisi') || lower.includes('teknik') || lower.includes('support')) {
    return 'headset-mic';
  }
  if (lower.includes('ambulans') || lower.includes('medis') || lower.includes('rsud') || lower.includes('rumah sakit')) {
    return 'medical-services';
  }
  if (lower.includes('pemadam') || lower.includes('kebakaran') || lower.includes('damkar')) {
    return 'local-fire-department';
  }
  if (lower.includes('polisi') || lower.includes('polri') || lower.includes('kepolisian')) {
    return 'local-police';
  }
  if (lower.includes('darurat') || lower.includes('emergency')) {
    return 'emergency';
  }
  return 'support-agent';
}

function callContact(contact: EmergencyContact) {
  Alert.alert(
    'Telepon kontak?',
    `${contact.name}\n${contact.description ?? ''}\n\n${contact.phone}`,
    [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Telepon',
        onPress: () => {
          const tel = `tel:${contact.phone.replace(/[^+\d]/g, '')}`;
          Linking.openURL(tel).catch(() =>
            Alert.alert('Gagal', `Tidak bisa membuka penelepon untuk ${contact.phone}.`),
          );
        },
      },
    ],
  );
}

export default function EmergencyScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await emergencyApi.list();
      // Filter only active contacts
      const activeContacts = response.data.filter(c => c.is_active);
      setContacts(activeContacts);
    } catch (e) {
      setError((e as Error).message ?? 'Gagal memuat kontak darurat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const renderContact = ({ item }: { item: EmergencyContact }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => callContact(item)}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <Icon name={getContactIcon(item.name)} size={20} color={Colors.danger} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.rowRole}>{item.description}</Text>
        )}
        <View style={styles.rowPhone}>
          <Icon name="call" size={12} color={Colors.textMuted} />
          <Text style={styles.rowPhoneText}>{item.phone}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Icon name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Emergency Call</Text>
          <Text style={styles.subtitle}>Kontak darurat Nayaka</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="phone-in-talk" size={26} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle}>Butuh bantuan segera?</Text>
          <Text style={styles.heroSub}>
            Tim Nayaka siap membantu 24 jam, 7 hari. Pilih kontak di bawah
            untuk langsung menelepon.
          </Text>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat kontak...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={48} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchContacts}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="contact-phone" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Tidak ada kontak darurat</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Pilih kontak</Text>
            <FlatList
              data={contacts}
              renderItem={renderContact}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerText: {
    marginLeft: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  hero: {
    backgroundColor: Colors.dangerSoft,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  listContainer: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  rowRole: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  rowPhoneText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 12,
  },
});
