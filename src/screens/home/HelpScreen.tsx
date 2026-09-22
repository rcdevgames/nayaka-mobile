import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';
import { helpApi, type HelpArticle } from '../../api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import { Icon } from '../../components/Icon';

type Props = NativeStackScreenProps<HomeStackParamList, 'Help'>;

const CATEGORIES = ['Semua', 'Akun', 'Kamera', 'Recording', 'Billing', 'Lainnya'];

export default function HelpScreen({ navigation, route }: Props) {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // If articleId provided, show detail view
  const articleId = route.params?.articleId;

  const fetchArticles = useCallback(async (reset = true) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof helpApi.list>[0] = {
        locale: 'id',
        limit: 20,
        cursor: reset ? undefined : cursor,
      };
      if (searchQuery) params.q = searchQuery;
      if (selectedCategory !== 'Semua') params.category = selectedCategory.toLowerCase();

      const response = await helpApi.list(params);
      const nextArticles = Array.isArray(response.data) ? response.data : [];
      if (mountedRef.current) {
        if (reset) {
          setArticles(nextArticles);
        } else {
          setArticles(prev => [...prev, ...nextArticles]);
        }
        setHasMore(response.meta.pagination?.has_more ?? false);
        setCursor(response.meta.pagination?.cursor || undefined);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError((e as Error).message ?? 'Gagal memuat bantuan');
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [searchQuery, selectedCategory, cursor]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchArticles(false);
    }
  };

  const handleSearch = () => {
    setCursor(undefined);
    fetchArticles();
  };

  const renderArticle = ({ item }: { item: HelpArticle }) => (
    <TouchableOpacity
      style={styles.articleCard}
      onPress={() => navigation.navigate('Help', { articleId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.articleIcon}>
        <Icon name="help-outline" size={24} color={Colors.primary} />
      </View>
      <View style={styles.articleContent}>
        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.articleCategory}>{item.category}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  if (articleId) {
    return <HelpDetailScreen articleId={articleId} navigation={navigation} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pusat Bantuan</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari bantuan..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); fetchArticles(); }}>
            <Icon name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryPill,
              selectedCategory === cat && styles.categoryPillActive,
            ]}
            onPress={() => {
              setSelectedCategory(cat);
              setCursor(undefined);
            }}
          >
            <Text
              style={[
                styles.categoryPillText,
                selectedCategory === cat && styles.categoryPillTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Article List */}
      {loading && articles.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchArticles()}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="help-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Tidak ada artikel bantuan</Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          renderItem={renderArticle}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator style={styles.footer} color={Colors.primary} />
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}

// Detail view for a single article
function HelpDetailScreen({
  articleId,
  navigation,
}: {
  articleId: string;
  navigation: Props['navigation'];
}) {
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await helpApi.get(articleId);
        if (mountedRef.current) setArticle(response.data);
      } catch (e) {
        if (mountedRef.current) {
          setError((e as Error).message ?? 'Gagal memuat artikel');
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    load();
  }, [articleId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {article?.title ?? 'Artikel'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : article ? (
        <ScrollView
          style={styles.detailContent}
          contentContainerStyle={styles.detailContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.detailCategory}>{article.category}</Text>
          <Text style={styles.detailTitle}>{article.title}</Text>
          <Text style={styles.detailBody}>{article.content}</Text>
        </ScrollView>
      ) : null}
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
  headerSpacer: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: Colors.text,
  },
  categoryScroll: {
    maxHeight: 48,
    marginTop: 12,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryPillText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  categoryPillTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  articleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleContent: {
    flex: 1,
    marginLeft: 12,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  articleCategory: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  centered: {
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
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
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
  footer: {
    paddingVertical: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailContainer: {
    padding: 20,
  },
  detailCategory: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 16,
  },
  detailBody: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
});
