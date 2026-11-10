import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { FontAwesome } from '@expo/vector-icons';

const PRIMARY = '#4EB1CB';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Clean Inline 16:9 YouTube Sermon Player for iOS & Android
 * - Shows crisp high-res thumbnail + glassmorphic play button initially (zero heavy WebView load until tapped)
 * - Plays inline inside HGF Connect with baseUrl="https://connect.houseofgrace.ph" (prevents YouTube Error 153)
 * - Blocks navigation away to external YouTube links
 * - Includes 1-tap Fullscreen Stage Modal
 */
export function NativeYoutubePlayer({ videoId }: { videoId: string }) {
  const [playingInline, setPlayingInline] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  if (!videoId) return null;

  const cleanId = videoId.trim();
  const thumbUrl = `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;

  const buildEmbedHtml = (autoPlay: boolean) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; background: #000; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe
    src="https://www.youtube.com/embed/${cleanId}?autoplay=${autoPlay ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=1&origin=https://connect.houseofgrace.ph"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
    allowfullscreen
  ></iframe>
</body>
</html>`;

  const renderWebView = (autoPlay: boolean) => (
    <WebView
      originWhitelist={['*']}
      source={{
        html: buildEmbedHtml(autoPlay),
        baseUrl: 'https://connect.houseofgrace.ph',
      }}
      style={{ flex: 1, backgroundColor: '#000000' }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo
      javaScriptEnabled
      domStorageEnabled
      onShouldStartLoadWithRequest={(req) => {
        const u = req.url || '';
        if (
          u.startsWith('about:blank') ||
          u.includes('connect.houseofgrace.ph') ||
          u.includes('youtube.com/embed') ||
          u.includes('youtube-nocookie.com/embed') ||
          u.includes('googlevideo.com') ||
          u.includes('ytimg.com')
        ) {
          return true;
        }
        // Block clicking out to external YouTube watch/channel pages
        return false;
      }}
    />
  );

  return (
    <>
      <View style={styles.videoFrame}>
        {!playingInline ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.thumbTouch}
            onPress={() => setPlayingInline(true)}
          >
            <Image source={{ uri: thumbUrl }} style={styles.thumbImg} resizeMode="cover" />
            <View style={styles.thumbDarkOverlay}>
              <View style={styles.playCircle}>
                <FontAwesome name="play" size={24} color="#ffffff" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.playLabel} numberOfLines={1}>
                Tap to Watch Sermon Replay
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }}>
            {renderWebView(true)}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setPlayingInline(false);
                setFullscreen(true);
              }}
              style={styles.expandBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome name="expand" size={13} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={fullscreen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={styles.fullscreenWrap}>
          <View style={styles.fullscreenTopBar}>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>
              Sermon Livestream Replay
            </Text>
            <TouchableOpacity
              onPress={() => setFullscreen(false)}
              style={styles.fullscreenCloseBtn}
            >
              <Text style={styles.fullscreenCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}>
              {fullscreen ? renderWebView(true) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Inline MP4 Slide Video Player for Sermon Slides containing embedded video (`slide.video`)
 */
export function NativeSlideVideoPlayer({
  videoUrl,
  posterUrl,
}: {
  videoUrl: string;
  posterUrl?: string;
}) {
  const fullVideo = videoUrl.startsWith('http')
    ? videoUrl
    : `https://connect.houseofgrace.ph${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`;
  const fullPoster = posterUrl
    ? posterUrl.startsWith('http')
      ? posterUrl
      : `https://connect.houseofgrace.ph${posterUrl.startsWith('/') ? '' : '/'}${posterUrl}`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; background: #000; }
    html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <video src="${fullVideo}" ${fullPoster ? `poster="${fullPoster}"` : ''} controls playsinline preload="metadata"></video>
</body>
</html>`;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://connect.houseofgrace.ph' }}
        style={{ flex: 1, backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        javaScriptEnabled
      />
    </View>
  );
}

/**
 * Celebratory Confetti Overlay for Correct Answers inside Native QuizPlayer
 * Zero purple colors (Rule #4 compliant)
 */
const CONFETTI_COLORS = ['#4EB1CB', '#fbbf24', '#10b981', '#38bdf8', '#f97316', '#f43f5e'];

export function NativeConfetti({ active }: { active: boolean }) {
  const anims = useRef(
    Array.from({ length: 28 }, (_, idx) => ({
      progress: new Animated.Value(0),
      startX: ((idx * 37) % 92) + 4,
      driftX: ((idx % 5) - 2) * 28,
      size: 7 + (idx % 4) * 2.5,
      color: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
      delay: (idx % 7) * 55,
    }))
  ).current;

  useEffect(() => {
    if (!active) return;
    anims.forEach((p) => p.progress.setValue(0));
    const animations = anims.map((p) =>
      Animated.timing(p.progress, {
        toValue: 1,
        duration: 1850,
        delay: p.delay,
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, [active, anims]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((p, idx) => {
        const translateY = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-24, SCREEN_H * 0.72],
        });
        const translateX = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.driftX],
        });
        const rotate = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '320deg'],
        });
        const opacity = p.progress.interpolate({
          inputRange: [0, 0.75, 1],
          outputRange: [1, 0.9, 0],
        });
        return (
          <Animated.View
            key={idx}
            style={{
              position: 'absolute',
              top: 0,
              left: (p.startX / 100) * SCREEN_W,
              width: p.size,
              height: p.size * 0.65,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  videoFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#020617',
  },
  thumbTouch: {
    flex: 1,
    position: 'relative',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbDarkOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(6, 20, 31, 0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(78, 177, 203, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  playLabel: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  expandBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  fullscreenWrap: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fullscreenTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  fullscreenCloseBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  fullscreenCloseText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
