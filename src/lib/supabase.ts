import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { NativeModules, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Returns the OAuth redirect URL appropriate for the current runtime:
 * - Expo Go: `exp://<host>/--/auth/callback` (since Expo Go doesn't register custom schemes)
 * - Web: `<origin>/auth/callback`
 * - Dev / Standalone build: `swingset://auth/callback`
 */
export function getOAuthRedirectUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/auth/callback`;
    }
    return Linking.createURL('auth/callback');
  }

  // In Expo Go, executionEnvironment can report as 'bare' in SDK 58, so detect it by
  // checking for an HTTP(S) Metro bundle origin without a custom expo-dev-client launcher.
  if (!NativeModules.EXDevLauncher) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getBundleOrigin } = require('expo/internal/bundle-origin') as {
        getBundleOrigin: () => string | null;
      };
      const bundleOrigin = getBundleOrigin();
      const match = bundleOrigin?.match(/^(https?):\/\/([^/]+)/i);
      if (match) {
        const scheme = match[1].toLowerCase() === 'https' ? 'exps' : 'exp';
        return `${scheme}://${match[2]}/--/auth/callback`;
      }
    } catch {
      // fall through
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NativeSourceCode } = require('react-native/unstable-internals-do-not-use') as {
        NativeSourceCode?: { getConstants?: () => { scriptURL?: string | null } };
      };
      const nativeScriptUrl = NativeSourceCode?.getConstants?.()?.scriptURL;
      const nativeMatch = nativeScriptUrl?.match(/^(https?):\/\/([^/]+)/i);
      if (nativeMatch) {
        const scheme = nativeMatch[1].toLowerCase() === 'https' ? 'exps' : 'exp';
        return `${scheme}://${nativeMatch[2]}/--/auth/callback`;
      }
    } catch {
      // fall through
    }

    const scriptUrl: string | undefined =
      NativeModules.SourceCode?.getConstants?.()?.scriptURL ??
      NativeModules.SourceCode?.scriptURL;

    const scriptMatch = scriptUrl?.match(/^(https?):\/\/([^/]+)/i);
    if (scriptMatch) {
      const scheme = scriptMatch[1].toLowerCase() === 'https' ? 'exps' : 'exp';
      return `${scheme}://${scriptMatch[2]}/--/auth/callback`;
    }

    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost;
    if (hostUri) {
      const cleanHost = hostUri.replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '');
      return `exp://${cleanHost}/--/auth/callback`;
    }

    if (Constants.linkingUri && /^exps?:\/\//i.test(Constants.linkingUri)) {
      const base = Constants.linkingUri.replace(/\/+$/, '');
      return base.endsWith('/--') ? `${base}/auth/callback` : `${base}/--/auth/callback`;
    }
  }

  return Linking.createURL('auth/callback');
}

/** Extracts a query or hash parameter from an OAuth callback URL. */
export function extractAuthParam(url: string, key: string): string | null {
  const regex = new RegExp(`[?&#]${key}=([^&#]+)`);
  const match = url.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}
