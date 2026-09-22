import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';
import { helpApi, type LegalDocument } from '../../api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import { Icon } from '../../components/Icon';

type Props = NativeStackScreenProps<HomeStackParamList, 'Settings'>;

export default function TermsScreen({ navigation }: Props) {
  const [terms, setTerms] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await helpApi.terms({ locale: 'id' });
        setTerms(response);
      } catch (e) {
        setError((e as Error).message ?? 'Gagal memuat dokumen');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleShare = async () => {
    if (!terms) return;
    try {
      await Share.share({
        title: terms.title,
        message: `${terms.title}\n\n${terms.content}`,
      });
    } catch (e) {
      console.warn('Share failed', e);
    }
  };

  const handleOpenLink = () => {
    // If there's a URL in the content, open it
    const urlMatch = terms?.content.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      Linking.openURL(urlMatch[0]).catch(() => {
        // Fallback: copy to clipboard or show alert
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Syarat & Ketentuan</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Icon name="share" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat dokumen...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              setError(null);
              helpApi.terms({ locale: 'id' }).then(r => {
                setTerms(r);
                setLoading(false);
              }).catch(e => {
                setError((e as Error).message ?? 'Gagal memuat');
                setLoading(false);
              });
            }}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : terms ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Document Info */}
          <View style={styles.docInfo}>
            <Text style={styles.docVersion}>Versi {terms.version}</Text>
            <Text style={styles.docDate}>
              Berlaku sejak {new Date(terms.published_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{terms.title}</Text>

          {/* Body */}
          <Text style={styles.body}>{terms.content}</Text>

          {/* Footer */}
          <View style={styles.footer}>
            <Icon name="verified" size={16} color={Colors.textMuted} />
            <Text style={styles.footerText}>
              Dokumen ini dikelola oleh Nayaka CCTV
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <Icon name="article" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Dokumen tidak tersedia</Text>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  shareBtn: {
    padding: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textMuted,
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
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  docVersion: {
    fontSize: 12,
    color: Colors.white,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  docDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
    lineHeight: 32,
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
