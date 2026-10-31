import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useUser } from '@/context/UserContext';
import { Colors } from '@/constants/theme';

export default function Index() {
  const router = useRouter();
  const { profile, isSessionLocked } = useUser();

  useEffect(() => {
    if (isSessionLocked) {
      router.replace('/(auth)/login' as any);
    } else if (profile.isOnboardingCompleted) {
      router.replace('/(tabs)' as any);
    } else {
      router.replace('/(onboarding)/step1-identity' as any);
    }
  }, [isSessionLocked, profile.isOnboardingCompleted]);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={Colors.accent.copper} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
});



