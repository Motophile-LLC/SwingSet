import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { extractAuthParam, supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const { unlockSession, refreshProfileFromSupabase } = useUser();

  useEffect(() => {
    let active = true;

    const handleCallback = async () => {
      try {
        if (Platform.OS === 'ios') {
          try {
            WebBrowser.dismissBrowser();
          } catch {}
        }

        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (!existingSession?.user) {
          const targetUrl =
            url ||
            (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : '') ||
            (await Linking.getInitialURL()) ||
            '';

          if (targetUrl) {
            const errorDescription =
              extractAuthParam(targetUrl, 'error_description') ||
              extractAuthParam(targetUrl, 'error');
            if (errorDescription) {
              if (active) router.replace('/(auth)/login' as any);
              return;
            }

            const accessToken = extractAuthParam(targetUrl, 'access_token');
            const refreshToken = extractAuthParam(targetUrl, 'refresh_token');
            const code = extractAuthParam(targetUrl, 'code');

            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            } else if (code) {
              await supabase.auth.exchangeCodeForSession(code);
            }
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
