import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

const PRIMARY = '#4EB1CB';
const PRIMARY_DARK = '#0284c7';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

interface VoicePrayerPlayerProps {
  uri: string;
  compact?: boolean;
}

export default function VoicePrayerPlayer({ uri, compact = false }: VoicePrayerPlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const isPlaying = Boolean(status?.playing);
  const duration = status?.duration || 0;
  const currentTime = status?.currentTime || 0;
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const togglePlay = async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (isPlaying) {
        player.pause();
      } else {
        if (duration > 0 && currentTime >= duration - 0.15) {
          await player.seekTo(0);
        }
        player.play();
      }
    } catch {
      // Ignore playback interruption
    }
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <TouchableOpacity
        onPress={togglePlay}
        activeOpacity={0.8}
        style={[styles.playBtn, compact && styles.playBtnCompact]}
        accessibilityLabel={isPlaying ? 'Pause voice prayer' : 'Play voice prayer'}
      >
        <FontAwesome
          name={isPlaying ? 'pause' : 'play'}
          size={compact ? 11 : 12}
          color="#ffffff"
          style={isPlaying ? undefined : { marginLeft: 2 }}
        />
      </TouchableOpacity>

      <View style={styles.trackCol}>
        <View style={styles.trackBg}>
          <View style={[styles.trackFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.label} numberOfLines={1}>
            Voice prayer
          </Text>
          <Text style={styles.time}>
            {formatTime(currentTime)}
            {duration > 0 ? ` / ${formatTime(duration)}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
    marginTop: 6,
  },
  containerCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    marginTop: 4,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  trackCol: {
    flex: 1,
    gap: 4,
  },
  trackBg: {
    height: 4,
    borderRadius: 99,
    backgroundColor: '#cbd5e1',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: PRIMARY,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  time: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
});
