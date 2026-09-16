import React from 'react';
import {
  View,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors } from '../theme';
import { commonStyles as styles } from '../theme/styles';
import { formatNumber } from '../utils/format';

type AlertType = 'motion' | 'person' | 'vehicle' | 'sound' | 'line';
type Status = 'online' | 'offline' | 'recording';

const TYPE_ICON: Record<string, string> = {
  motion: 'motion-photos-on',
  person: 'person',
  vehicle: 'directions-car',
  sound: 'graphic-eq',
  line: 'horizontal-rule',
};

const TYPE_COLOR: Record<string, string> = {
  motion: Colors.warning,
  person: Colors.danger,
  vehicle: Colors.primary,
  sound: Colors.accent,
  line: Colors.textMuted,
};

const STATUS_LABEL: Record<Status, string> = {
  online: 'Online',
  offline: 'Offline',
  recording: 'Merekam',
};

const STATUS_COLOR: Record<Status, string> = {
  online: Colors.success,
  offline: Colors.textMuted,
  recording: Colors.danger,
};

export function StatusBadge({
  status,
  style,
}: {
  status: Status;
  style?: StyleProp<ViewStyle>;
}) {
  const color = STATUS_COLOR[status];
  const isOffline = status === 'offline';
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A` }, style]}>
      {!isOffline && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.badgeText, { color: isOffline ? Colors.textMuted : color }]}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

export function TypeIcon({
  type,
  size = 14,
}: {
  type: AlertType;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.typeIcon,
        { backgroundColor: `${TYPE_COLOR[type]}1F`, borderRadius: size },
      ]}
    >
      <Text style={{ color: TYPE_COLOR[type], fontSize: size }}>●</Text>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  accent?: string;
  icon?: string;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({
  label,
  value,
  accent = Colors.primary,
  suffix = '',
  style,
}: StatCardProps) {
  return (
    <View style={[styles.statCard, style]}>
      <View style={[styles.statAccent, { backgroundColor: accent }]} />
      <Text style={styles.statValue}>
        {formatNumber(value)}
        {suffix ? <Text style={styles.statSuffix}>{suffix}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Text style={styles.sectionAction} onPress={onPress}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

export { TYPE_ICON, TYPE_COLOR };
