import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { useUser } from '@/context/UserContext';
import { Colors } from '@/constants/theme';
import { supabase } from '@/src/lib/supabase';

export default function Index() {
  const router = useRouter();
  const { isSessionLocked, refreshProfileFromSupabase } = useUser();

  useEffect(() => {
    let active = true;

    const checkAuthAndProfile = async () => {
      if (isSessionLocked) {
        router.replace('/(auth)/login' as any);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.user) {
        router.replace('/(auth)/login' as any);
        return;
      }

      const row = await refreshProfileFromSupabase();
      if (!active) return;

      const isComplete = Boolean(row?.onboarding_completed && row?.default_display_name?.trim());
      if (isComplete) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/(onboarding)/step1-identity' as any);
      }
    };

    checkAuthAndProfile();

    return () => {
      active = false;
    };
  }, [isSessionLocked, refreshProfileFromSupabase, router]);

  return (
    <View style={s.container}>
      <Image
        source={require('@/assets/SSLogo.png')}
        style={s.logo}
        resizeMode="cover"
      />
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
    gap: 20,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
});
