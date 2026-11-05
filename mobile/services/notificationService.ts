import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import client from '@/api/client';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const isAndroidExpoGo = Platform.OS === 'android' && isExpoGo;

export function getNotificationsModule(): typeof import('expo-notifications') | null {
  if (isAndroidExpoGo) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

const NotificationsInit = getNotificationsModule();
if (NotificationsInit) {
  NotificationsInit.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: NotificationsInit.AndroidNotificationPriority.MAX,
    }),
  });
}

const LAST_SEEN_KEY = 'hgf_last_alerted_notif_id';

export async function registerForPushNotificationsAsync(): Promise<boolean> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return false;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('hgf-connect-alerts', {
          name: 'HGF Connect Notifications',
          description: 'Community posts, prayer requests, comments, and church event alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4EB1CB',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
          sound: 'default',
          enableVibrate: true,
        });
      } catch {
        // Safe fallback
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

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
    // silent fallback
  }
}

export async function syncAndAlertNewNotifications(): Promise<number> {
  try {
    const res = await client.get('/notifications?limit=15');
    if (!res.data?.success) return 0;

    const notifs = res.data.data?.notifications || [];
    const unreadCount = res.data.data?.unread_count || 0;
    if (notifs.length === 0) return 0;

    let lastSeenStr = null;
    try {
      lastSeenStr = await SecureStore.getItemAsync(LAST_SEEN_KEY);
    } catch {
      // ignore
    }

    const lastSeenId = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;
    const maxOverallId = Math.max(...notifs.map((n: any) => Number(n.id) || 0));

    if (lastSeenId === 0) {
      if (maxOverallId > 0) {
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
      if (n.is_read || Number(n.id) <= lastSeenId) return false;
      const createdMs = n.created_at ? new Date(n.created_at).getTime() : nowMs;
      return nowMs - createdMs <= MAX_PUSH_AGE_MS;
    });

    for (const n of newUnread) {
      await triggerLocalNotification(n.title, n.message || '', {
        link: n.link || '/(tabs)',
        id: n.id,
      });
    }

    if (maxOverallId > lastSeenId) {
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
