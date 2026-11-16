import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/src/lib/supabase';

function extractParam(url: string, key: string): string | null {
  const regex = new RegExp(`[?&#]${key}=([^&#]+)`);
  const match = url.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const { unlockSession, refreshProfileFromSupabase } = useUser();

  useEffect(() => {
    let active = true;

    const handleCallback = async () => {
      try {
        WebBrowser.dismissBrowser();

        const targetUrl = url || (await Linking.getInitialURL()) || '';

        if (targetUrl) {
          const accessToken = extractParam(targetUrl, 'access_token');
          const refreshToken = extractParam(targetUrl, 'refresh_token');
          const code = extractParam(targetUrl, 'code');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          } else if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (session?.user) {
          unlockSession();
          const row = await refreshProfileFromSupabase();
          if (!active) return;
          const isComplete = Boolean(row?.onboarding_completed && row?.default_display_name?.trim());
          if (isComplete) {
            router.replace('/(tabs)' as any);
          } else {
            router.replace('/(onboarding)/step1-identity' as any);
          }
        } else {
          // Give login.tsx listener a brief moment if it is mid-exchange
          setTimeout(async () => {
            if (!active) return;
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();
            if (retrySession?.user) {
              unlockSession();
              const row = await refreshProfileFromSupabase();
              if (!active) return;
              const isComplete = Boolean(
                row?.onboarding_completed && row?.default_display_name?.trim()
              );
              router.replace((isComplete ? '/(tabs)' : '/(onboarding)/step1-identity') as any);
            } else {
              router.replace('/(auth)/login' as any);
            }
          }, 800);
        }
      } catch {
        if (active) {
          router.replace('/(auth)/login' as any);
        }
      }
    };

    handleCallback();

    return () => {
      active = false;
    };
  }, [url, unlockSession, refreshProfileFromSupabase, router]);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={Colors.accent.copper} />
      <Text style={s.text}>Completing Sign-In...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.black,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
