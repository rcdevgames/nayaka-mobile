import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { playbackDetailStyles as styles } from '../../theme/styles';
import { Icon, type IconName } from '../../components/Icon';
import { useData } from '../../context/DataContext';
import { formatDate } from '../../utils/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import type { Recording } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'PlaybackDetail'>;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function PlaybackDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const rec: Recording = route.params.recording;
  const { cameras } = useData();
  const camera = cameras.find(c => c.id === rec.camera_id);

  const [playing, setPlaying] = useState(true);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(
        () => setPosition(p => (p >= 100 ? 100 : p + 0.1 * speed)),
        100,
      );
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, speed]);

  const speedOptions = [0.5, 1, 2, 4];
  const durationStr = formatDuration(rec.duration);

  return (
    <View style={styles.safe}>
      <View
        style={[
          styles.stream,
          { paddingTop: insets.top + Spacing.sm },
        ]}
      >
        <View style={styles.streamHeader}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
            hitSlop={10}
          >
            <Icon name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.streamTitle}>
            <Text style={styles.streamName} numberOfLines={1}>
              {rec.title}
            </Text>
            <Text style={styles.streamLoc} numberOfLines={1}>
              {formatDate(rec.started_at)} · {durationStr}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert('Info', 'Unduh rekaman (dummy).')}
            hitSlop={10}
          >
            <Icon name="download" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Player placeholder */}
        <View style={styles.streamCenter}>
          <TouchableOpacity
            style={styles.playBig}
            onPress={() => setPlaying(p => !p)}
          >
            <Icon
              name={playing ? 'pause' : 'play-arrow'}
              size={44}
              color={Colors.white}
            />
          </TouchableOpacity>
          <Text style={styles.streamHint}>
            {camera?.name ?? rec.camera_name} · {camera?.resolution ?? ''}
          </Text>
        </View>

        {/* Timeline */}
        <View style={styles.timelineWrap}>
          <View style={styles.timeline}>
            <View style={[styles.timelineFill, { width: `${position}%` }]} />
            <View style={[styles.timelineThumb, { left: `${position}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              00:00:0{Math.floor(position / 10)} / {durationStr}
            </Text>
            {rec.has_motion && (
              <View style={styles.motionHint}>
                <Icon name="motion-photos-on" size={11} color={Colors.warning} />
                <Text style={styles.motionText}>Segmen motion</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.speedRow}>
          {speedOptions.map(s => {
            const active = speed === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.speedChip, active && styles.speedChipActive]}
                onPress={() => setSpeed(s)}
              >
                <Text style={[styles.speedText, active && styles.speedTextActive]}>
                  {s}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.controlRow}>
          <CtlBtn icon="replay-10" label="10 dtk" onPress={() => setPosition(p => Math.max(0, p - 3))} />
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => setPlaying(p => !p)}
          >
            <Icon name={playing ? 'pause' : 'play-arrow'} size={30} color={Colors.white} />
          </TouchableOpacity>
          <CtlBtn icon="forward-10" label="10 dtk" onPress={() => setPosition(p => Math.min(100, p + 3))} />
        </View>
      </View>
    </View>
  );
}

function CtlBtn({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.ctlBtn} onPress={onPress} activeOpacity={0.8}>
      <Icon name={icon} size={26} color={Colors.text} />
      <Text style={styles.ctlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}
