import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MemberProfileRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/church?tab=member&id=${id}` as any);
    } else {
      router.replace('/church?tab=directory' as any);
    }
  }, [id, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
      <ActivityIndicator size="large" color="#4EB1CB" />
    </View>
  );
}
