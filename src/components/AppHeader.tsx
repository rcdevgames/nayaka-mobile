import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import { Icon } from './Icon';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Bila undefined, tombol kembali tidak dirender (layar root tab). */
  onBack?: () => void;
  right?: React.ReactNode;
}

/**
 * Header untuk halaman yang di-push (bukan layar root tab).
 * Latarnya sengaja dibuat opak dan sedikit terangkat supaya isi halaman yang
 * di-scroll tidak tampak mengalir di belakang judul.
 */
export function AppHeader({ title, subtitle, onBack, right }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.sm }]}>
      {onBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Icon name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
      )}
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle != null && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});

export default AppHeader;
