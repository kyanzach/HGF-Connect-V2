import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';
import {
  registerForPushNotificationsAsync,
  getNotificationsModule,
} from '@/services/notificationService';

// Suppress known Expo Go SDK 53+ remote push notification deprecation notice on Android
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    registerForPushNotificationsAsync();

    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const link = response.notification.request.content.data?.link;
        if (link && typeof link === 'string') {
          if (link.includes('prayer')) {
            router.push('/(tabs)/prayer');
          } else if (link.includes('event')) {
            router.push('/(tabs)/events');
          } else if (link.includes('stewardshop') || link.includes('marketplace')) {
            router.push('/(tabs)/stewardshop');
          } else {
            router.push('/(tabs)');
          }
        }
      }
    );

    return () => {
      responseSubscription.remove();
    };
  }, [router]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-post" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="church" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
