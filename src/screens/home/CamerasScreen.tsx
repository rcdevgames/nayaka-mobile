import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';
import { camerasStyles as styles } from '../../theme/styles';
import { Icon } from '../../components/Icon';
import { CameraThumbnail } from '../../components/CameraThumbnail';
import { useData } from '../../context/DataContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cameras'>;

type Filter = 'all' | 'online' | 'recording' | 'offline';

export default function CamerasScreen({ navigation }: Props) {
  const { cameras } = useData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    let list = cameras;
    if (filter === 'online')
      list = list.filter(c => c.status === 'online');
    if (filter === 'recording')
      list = list.filter(c => c.is_recording);
    if (filter === 'offline') list = list.filter(c => c.status === 'offline');
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q),
      );
    }
    return list;
  }, [cameras, query, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Kamera Saya</Text>
        <Text style={styles.subtitle}>{cameras.length} perangkat terpasang</Text>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama / lokasi kamera"
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
            <Icon name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filters}>
        {(
          [
            ['all', 'Semua'],
            ['online', 'Online'],
            ['recording', 'Merekam'],
            ['offline', 'Offline'],
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
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="videocam-off" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Tidak ada kamera ditemukan</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.cameraCard}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('CameraDetail', { cameraId: item.id })
            }
          >
            <CameraThumbnail camera={item} height={index % 3 === 0 ? 200 : 150} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
