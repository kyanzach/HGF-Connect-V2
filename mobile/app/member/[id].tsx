import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MemberProfileRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const cleanId = Array.isArray(id) ? id[0] : id;
    if (cleanId) {
      router.replace({ pathname: '/church', params: { tab: 'member', id: String(cleanId) } } as any);
    } else {
      router.replace({ pathname: '/church', params: { tab: 'directory' } } as any);
    }
  }, [id, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
      <ActivityIndicator size="large" color="#4EB1CB" />
    </View>
  );
}
