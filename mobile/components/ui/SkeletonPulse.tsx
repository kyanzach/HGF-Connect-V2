import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useGlobalSearchParams } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width || 390;
const PRIMARY = '#4EB1CB';

// Shared single clock so all visible skeleton boxes shimmer in unison (60fps native driver)
let sharedAnim: Animated.Value | null = null;
let sharedLoopStarted = false;

function getSharedShimmerAnim(): Animated.Value {
  if (!sharedAnim) {
    sharedAnim = new Animated.Value(0);
  }
  if (!sharedLoopStarted) {
    sharedLoopStarted = true;
    Animated.loop(
      Animated.timing(sharedAnim, {
        toValue: 1,
        duration: 1250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }
  return sharedAnim;
}

/**
 * SkeletonBox — Rectangular placeholder with Facebook-style sweeping grey shimmer line.
 */
export function SkeletonBox({
  width = '100%',
  height = 12,
  radius = 6,
  dark = false,
  style,
}: {
  width?: number | `${number}%` | 'auto';
  height?: number;
  radius?: number;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const anim = getSharedShimmerAnim();
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const baseBg = dark ? 'rgba(255,255,255,0.16)' : '#e2e8f0';
  const shimmerColors: readonly [string, string, string] = dark
    ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']
    : ['rgba(248,250,252,0)', 'rgba(248,250,252,0.88)', 'rgba(248,250,252,0)'];

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: baseBg,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            width: SCREEN_WIDTH * 0.85,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * SkeletonCircle — Circular avatar placeholder with sweeping shimmer line.
 */
export function SkeletonCircle({
  size = 40,
  dark = false,
  style,
}: {
  size?: number;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonBox
      width={size}
      height={size}
      radius={size / 2}
      dark={dark}
      style={style}
    />
  );
}

/**
 * SkeletonText — Multi-line text placeholder.
 */
export function SkeletonText({
  lines = 2,
  lastWidth = '65%',
  gap = 8,
  height = 10,
}: {
  lines?: number;
  lastWidth?: number | `${number}%`;
  gap?: number;
  height?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          height={height}
          width={i === lines - 1 ? lastWidth : '100%'}
          radius={6}
        />
      ))}
    </View>
  );
}

/**
 * SkeletonPostCard — 1:1 with web SkeletonPostCard (components/ui/SkeletonPulse.tsx)
 */
export function SkeletonPostCard() {
  return (
    <View style={styles.postCard}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <SkeletonCircle size={40} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox height={12} width="42%" />
          <SkeletonBox height={10} width="26%" />
        </View>
      </View>
      {/* Content lines */}
      <SkeletonBox height={11} width="100%" style={{ marginBottom: 8 }} />
      <SkeletonBox height={11} width="88%" style={{ marginBottom: 8 }} />
      <SkeletonBox height={11} width="64%" style={{ marginBottom: 14 }} />
      {/* Media / Scripture block placeholder */}
      <SkeletonBox height={140} width="100%" radius={12} style={{ marginBottom: 14 }} />
      {/* Action bar */}
      <View style={styles.actionRow}>
        <SkeletonBox height={12} width={64} radius={6} />
        <SkeletonBox height={12} width={72} radius={6} />
        <SkeletonBox height={12} width={54} radius={6} />
      </View>
    </View>
  );
}

/**
 * SkeletonProductCard — StewardShop 2-column card skeleton
 */
export function SkeletonProductCard() {
  return (
    <View style={styles.productCard}>
      <SkeletonBox height={135} width="100%" radius={0} />
      <View style={{ padding: 12, gap: 8 }}>
        <SkeletonBox height={12} width="75%" />
        <SkeletonBox height={14} width="45%" />
        <SkeletonBox height={10} width="58%" />
      </View>
    </View>
  );
}

/**
 * SkeletonFeedLoading — Full Facebook-style Community Feed loading state
 */
export function SkeletonFeedLoading() {
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 32 }}>
      {/* Hero Banner Skeleton */}
      <View style={styles.heroSkeleton}>
        <SkeletonBox width="38%" height={12} dark style={{ marginBottom: 10 }} />
        <SkeletonBox width="62%" height={22} dark style={{ marginBottom: 12 }} />
        <SkeletonBox width="85%" height={11} dark style={{ marginBottom: 6 }} />
        <SkeletonBox width="50%" height={11} dark style={{ marginBottom: 18 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonBox width={120} height={36} radius={999} dark />
          <SkeletonBox width={96} height={36} radius={999} dark />
        </View>
      </View>

      {/* Quick Links Horizontal Strip Skeleton */}
      <View style={styles.quickStripSkeleton}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            <SkeletonBox width={48} height={48} radius={14} />
            <SkeletonBox width={42} height={9} radius={4} />
          </View>
        ))}
      </View>

      {/* Section Title Skeleton */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingHorizontal: 2,
        }}
      >
        <SkeletonBox width={140} height={18} radius={6} />
        <SkeletonBox width={72} height={30} radius={999} />
      </View>

      {/* Post Cards */}
      <SkeletonPostCard />
      <SkeletonPostCard />
      <SkeletonPostCard />
    </View>
  );
}

/**
 * SkeletonPrayerLoading — Prayer Wall loading skeleton
 */
export function SkeletonPrayerLoading() {
  return (
    <View style={{ padding: 14, gap: 12 }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.postCard}>
          <View style={styles.authorRow}>
            <SkeletonCircle size={38} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox height={12} width="45%" />
              <SkeletonBox height={9} width="28%" />
            </View>
            <SkeletonBox height={22} width={68} radius={999} />
          </View>
          <SkeletonText lines={3} lastWidth="72%" height={11} gap={7} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <SkeletonBox width={105} height={32} radius={999} />
            <SkeletonBox width={115} height={32} radius={999} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * SkeletonStewardShopLoading — StewardShop marketplace 2-column grid skeleton
 */
export function SkeletonStewardShopLoading() {
  return (
    <View style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ width: (SCREEN_WIDTH - 40) / 2 }}>
            <SkeletonProductCard />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * SkeletonEventsLoading — Events list loading skeleton
 */
export function SkeletonEventsLoading() {
  return (
    <View style={{ padding: 14, gap: 14 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.postCard, { padding: 0, overflow: 'hidden' }]}>
          <SkeletonBox height={150} width="100%" radius={0} />
          <View style={{ padding: 14, gap: 8 }}>
            <SkeletonBox height={16} width="68%" />
            <SkeletonBox height={11} width="48%" />
            <SkeletonBox height={11} width="82%" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <SkeletonBox height={34} width={96} radius={999} />
              <SkeletonBox height={34} width={96} radius={999} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * SkeletonDirectoryLoading — Member Directory cards skeleton
 */
export function SkeletonDirectoryLoading() {
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 10 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={[styles.postCard, { marginBottom: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <SkeletonCircle size={52} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox height={14} width="52%" />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <SkeletonBox height={18} width={64} radius={999} />
                <SkeletonBox height={18} width={76} radius={999} />
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            <SkeletonBox height={18} width={88} radius={999} />
            <SkeletonBox height={18} width={96} radius={999} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * SkeletonProfileLoading — Member Profile & Cover Photo skeleton (1:1 with web ProfileClient loading)
 */
export function SkeletonProfileLoading() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* 220px Cover Photo Skeleton */}
      <SkeletonBox height={220} width="100%" radius={0} />

      {/* White Hero Card Skeleton */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              marginTop: -44,
              width: 88,
              height: 88,
              borderRadius: 44,
              borderWidth: 4,
              borderColor: '#ffffff',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
            }}
          >
            <SkeletonCircle size={80} />
          </View>
          <View style={{ flex: 1, paddingTop: 12, gap: 8 }}>
            <SkeletonBox height={18} width="58%" />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <SkeletonBox height={20} width={95} radius={999} />
              <SkeletonBox height={20} width={82} radius={999} />
            </View>
          </View>
        </View>
        <View style={{ marginTop: 14, gap: 6 }}>
          <SkeletonBox height={11} width="92%" />
          <SkeletonBox height={11} width="65%" />
        </View>
      </View>

      {/* Tabs bar skeleton */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: '#e2e8f0',
          paddingVertical: 12,
          justifyContent: 'space-around',
          marginBottom: 12,
        }}
      >
        <SkeletonBox height={14} width={64} />
        <SkeletonBox height={14} width={64} />
        <SkeletonBox height={14} width={76} />
      </View>

      {/* Wall posts skeleton */}
      <View style={{ paddingHorizontal: 14 }}>
        <SkeletonPostCard />
        <SkeletonPostCard />
      </View>
    </View>
  );
}

/**
 * TopNavigationProgress — 1:1 native replica of web components/NavigationProgress.tsx.
 * Renders a sleek animated teal progress bar whenever pathname or tab params change.
 */
export function TopNavigationProgress() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ tab?: string; page?: string; id?: string }>();
  const [visible, setVisible] = useState(false);
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const routeKey = `${pathname}?tab=${params?.tab || ''}&page=${params?.page || ''}&id=${params?.id || ''}`;
  const prevKey = useRef(routeKey);

  useEffect(() => {
    if (routeKey !== prevKey.current) {
      prevKey.current = routeKey;
      setVisible(true);
      widthAnim.setValue(0.15);
      opacityAnim.setValue(1);

      Animated.sequence([
        Animated.timing(widthAnim, {
          toValue: 0.85,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(widthAnim, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }
  }, [routeKey, widthAnim, opacityAnim]);

  if (!visible) return null;

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        opacity: opacityAnim,
      }}
    >
      <Animated.View
        style={{
          width: barWidth,
          height: '100%',
          backgroundColor: '#ffffff',
          shadowColor: PRIMARY,
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroSkeleton: {
    backgroundColor: '#2b7a91',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  quickStripSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
