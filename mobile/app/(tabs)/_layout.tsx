import React from 'react';
import { View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '@/components/ui/TopHeader';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={20} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <TopHeader />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#0e7490',
          tabBarInactiveTintColor: '#64748b',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
            height: 54 + bottomInset,
            paddingBottom: bottomInset,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <TabBarIcon name="newspaper-o" color={color} />,
          }}
        />
        <Tabs.Screen
          name="prayer"
          options={{
            title: 'Prayer',
            tabBarIcon: ({ color }) => <TabBarIcon name="heart-o" color={color} />,
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          }}
        />
        <Tabs.Screen
          name="stewardshop"
          options={{
            title: 'StewardShop',
            tabBarIcon: ({ color }) => <TabBarIcon name="shopping-bag" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <TabBarIcon name="user-o" color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
