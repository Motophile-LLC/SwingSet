import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { AlertCircle, Key, LogIn, ShieldCheck, User } from 'lucide-react-native';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { extractAuthParam, getOAuthRedirectUrl, supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

function AppleLogo({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 384 512">
      <Path
        fill={color}
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { unlockSession, refreshProfileFromSupabase } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeProvider, setActiveProvider] = useState<'google' | 'apple' | 'email' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const isHandlingCallbackRef = useRef(false);

  const routeAfterAuth = async (_userId: string) => {
    unlockSession();
    const row = await refreshProfileFromSupabase();
    const isComplete = Boolean(row?.onboarding_completed && row?.default_display_name?.trim());
    if (isComplete) {
      router.replace('/(tabs)' as any);
    } else {
      router.replace('/(onboarding)/step1-identity' as any);
    }
  };

  const createSessionFromUrl = async (url: string) => {
    if (isHandlingCallbackRef.current) return;
    isHandlingCallbackRef.current = true;
    try {
      const errorDescription =
        extractAuthParam(url, 'error_description') || extractAuthParam(url, 'error');
      if (errorDescription) {
        setErrorMsg(errorDescription.replace(/\+/g, ' '));
        setActiveProvider(null);
        return;
      }

      // If another listener (e.g. auth/callback.tsx) already established the session, route immediately
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();
      if (existingSession?.user) {
        setActiveProvider(null);
        await routeAfterAuth(existingSession.user.id);
        return;
      }

      const code = extractAuthParam(url, 'code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErrorMsg(error.message);
          setActiveProvider(null);
          return;
        }
        if (data.session?.user) {
          setActiveProvider(null);
          await routeAfterAuth(data.session.user.id);
          return;
        }
      }

      const accessToken = extractAuthParam(url, 'access_token');
      const refreshToken = extractAuthParam(url, 'refresh_token');
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setErrorMsg(error.message);
          setActiveProvider(null);
          return;
        }
        if (data.session?.user) {
          setActiveProvider(null);
          await routeAfterAuth(data.session.user.id);
        }
      }
    } catch (err: any) {
      setActiveProvider(null);
      setErrorMsg(err?.message || 'OAuth callback failed.');
    } finally {
      isHandlingCallbackRef.current = false;
    }
  };

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (
        url &&
        (url.includes('access_token=') ||
          url.includes('code=') ||
          url.includes('error=') ||
          url.includes('error_description='))
      ) {
        if (Platform.OS === 'ios') {
          try {
            WebBrowser.dismissBrowser();
          } catch {}
        }
        createSessionFromUrl(url);
      }
    });
    return () => sub.remove();
  }, []);

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setActiveProvider(provider);
    setErrorMsg('');
    isHandlingCallbackRef.current = false;
    try {
      const redirectTo = getOAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setActiveProvider(null);
        setErrorMsg(error.message);
        return;
      }

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type === 'success' && res.url) {
          await createSessionFromUrl(res.url);
        } else {
          // On Android/Expo Go, Linking listener or auth/callback.tsx may handle the session
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            setActiveProvider(null);
            await routeAfterAuth(session.user.id);
          } else {
            setActiveProvider(null);
          }
        }
      } else {
        setActiveProvider(null);
      }
    } catch (err: any) {
      setActiveProvider(null);
      setErrorMsg(err?.message || `${provider} Sign-In failed.`);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setActiveProvider('email');
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) {
        setActiveProvider(null);
        setErrorMsg(error.message);
        return;
      }
      if (data.session?.user) {
        setActiveProvider(null);
        await routeAfterAuth(data.session.user.id);
      }
    } catch (err: any) {
      setActiveProvider(null);
      setErrorMsg(err?.message || 'Sign in failed.');
    }
  };

  const isBusy = activeProvider !== null;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerBox}>
          <View style={s.iconRing}>
            <Image
              source={require('@/assets/SSLogo.png')}
              style={s.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={Typography.header}>SwingSet</Text>
          <Text style={s.headerSub}>
            Private, invitation-only social events, icebreakers, and mutual contact exchange.
          </Text>
        </View>

        <View style={s.privacyCard}>
          <ShieldCheck size={20} color={Colors.accent.copper} />
          <Text style={s.privacyText}>
            Private static profile • Non-searchable • Only people you tap in a game can exchange info.
          </Text>
        </View>

        {errorMsg ? (
          <View style={s.errCard}>
            <AlertCircle size={16} color={Colors.accent.crimson} />
            <Text style={s.errText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Continue with Google Button */}
        <TouchableOpacity
          style={s.googleBtn}
          onPress={() => handleOAuthSignIn('google')}
          disabled={isBusy}
        >
          {activeProvider === 'google' ? (
            <ActivityIndicator color="#1F1F1F" />
          ) : (
            <>
              <View style={s.logoWrap}>
                <GoogleLogo size={20} />
              </View>
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Continue with Apple Button */}
        <TouchableOpacity
          style={s.appleBtn}
          onPress={() => handleOAuthSignIn('apple')}
          disabled={isBusy}
        >
          {activeProvider === 'apple' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <View style={s.logoWrap}>
                <AppleLogo size={20} color="#FFFFFF" />
              </View>
              <Text style={s.appleBtnText}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s.formCard}>
          <Text style={s.cardHeaderTitle}>OR SIGN IN WITH EMAIL</Text>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Email</Text>
            <View style={s.inputWrap}>
              <User size={18} color={Colors.accent.copper} style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.text.muted}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  setErrorMsg('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Password</Text>
            <View style={s.inputWrap}>
              <Key size={18} color={Colors.accent.copper} style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.text.muted}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  setErrorMsg('');
                }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity style={s.signInBtn} onPress={handleEmailSignIn} disabled={isBusy}>
            {activeProvider === 'email' ? (
              <ActivityIndicator color={Colors.accent.copper} />
            ) : (
              <>
                <LogIn size={18} color={Colors.accent.copper} style={{ marginRight: 8 }} />
                <Text style={s.signInBtnText}>Sign In with Email</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.debugRedirectText}>
          Redirect: {getOAuthRedirectUrl()} ({Constants.executionEnvironment}/{String(Constants.appOwnership)})
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: 140 },
  headerBox: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 2,
    borderColor: Colors.accent.copper,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  headerSub: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(200, 109, 81, 0.12)',
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  privacyText: { flex: 1, color: Colors.text.primary, fontSize: 12, lineHeight: 17 },
  errCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(217, 56, 58, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accent.crimson,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: Spacing.md,
  },
  errText: { color: Colors.accent.crimson, fontSize: 12, fontWeight: '700', flex: 1 },
  logoWrap: { marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  googleBtnText: { color: '#1F1F1F', fontSize: 15, fontWeight: '800' },
  appleBtn: {
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: Colors.border.brushedSteel,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appleBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  formCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.accent.copper,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 14, color: Colors.text.primary, fontWeight: '600' },
  signInBtn: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  signInBtnText: { color: Colors.accent.copper, fontSize: 15, fontWeight: '800' },
  debugRedirectText: {
    color: Colors.text.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
