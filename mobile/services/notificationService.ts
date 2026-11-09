import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import client from '@/api/client';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function getNotificationsModule(): typeof import('expo-notifications') | null {
  if (isExpoGo) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

// Configure foreground presentation behavior (skipped in Android Expo Go where SDK 53+ removed remote push module)
const NotificationsInit = getNotificationsModule();
if (NotificationsInit) {
  try {
    NotificationsInit.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: NotificationsInit.AndroidNotificationPriority.MAX,
      }),
    });
  } catch {
    // Safe fallback
  }
}

const LAST_SEEN_KEY = 'hgf_connect_last_alerted_notif_id';

/**
 * Register Android notification channels, request OS-level permissions,
 * and register the native Expo Push Token with /api/mobile/push-token
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return false;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('hgf-connect-alerts', {
          name: 'HGF Connect Notifications',
          description: 'Community posts, prayer requests, church events, and StewardShop updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4EB1CB',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
          sound: 'default',
          enableVibrate: true,
        });
      } catch {
        // Safe channel fallback
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted' && !isExpoGo) {
      try {
        const pushTokenRes = await Notifications.getExpoPushTokenAsync();
        if (pushTokenRes?.data) {
          await client.post('/push-token', {
            token: pushTokenRes.data,
            platform: Platform.OS,
          });
        }
      } catch {
        // Ignore token fetch errors on simulator
      }
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Trigger an instant native OS notification (displays in lock screen & top heads-up banner)
 */
export async function triggerLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        badge: 1,
        ...(Platform.OS === 'android' ? { channelId: 'hgf-connect-alerts' } : {}),
      },
      trigger: null,
    });
  } catch {
    // Silent fallback in simulator/Expo Go
  }
}

/**
 * Sync with server /api/mobile/notifications and fire native push banners for new unread notifications
 */
export async function syncAndAlertNewNotifications(): Promise<number> {
  try {
    const res = await client.get('/notifications?limit=15');
    if (!res.data?.success) return 0;

    const notifs = res.data.data?.notifications || [];
    const unreadCount = res.data.data?.unreadCount || 0;
    if (notifs.length === 0) return 0;

    let lastSeenStr: string | null = null;
    try {
      if (Platform.OS !== 'web') {
        lastSeenStr = await SecureStore.getItemAsync(LAST_SEEN_KEY);
      }
    } catch {
      // ignore
    }

    const lastSeenId = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;
    const maxOverallId = Math.max(...notifs.map((n: any) => Number(n.id) || 0));

    if (lastSeenId === 0) {
      if (maxOverallId > 0 && Platform.OS !== 'web') {
        try {
          await SecureStore.setItemAsync(LAST_SEEN_KEY, String(maxOverallId));
        } catch {
          // ignore
        }
      }
      return unreadCount;
    }

    const nowMs = Date.now();
    const MAX_PUSH_AGE_MS = 30 * 60 * 1000;

    const newUnread = notifs.filter((n: any) => {
      if (n.isRead || Number(n.id) <= lastSeenId) return false;
      const createdMs = n.createdAt ? new Date(n.createdAt).getTime() : nowMs;
      return nowMs - createdMs <= MAX_PUSH_AGE_MS;
    });

    for (const n of newUnread) {
      await triggerLocalNotification(n.title, n.body || '', {
        link: n.link || '/(tabs)',
        id: n.id,
      });
    }

    if (maxOverallId > lastSeenId && Platform.OS !== 'web') {
      try {
        await SecureStore.setItemAsync(LAST_SEEN_KEY, String(maxOverallId));
      } catch {
        // ignore
      }
    }

    return unreadCount;
  } catch {
    return 0;
  }
}
