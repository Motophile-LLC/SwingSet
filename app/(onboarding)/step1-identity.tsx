import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, LogOut, MapPin, Sparkles, User } from 'lucide-react-native';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/src/lib/supabase';

export default function Step1IdentityScreen() {
  const router = useRouter();
  const { profile, updateIdentity, completeOnboarding, resetOnboarding } = useUser();

  const [displayName, setDisplayName] = useState(
    () => profile.identity.displayName || profile.identity.ssoFullName || ''
  );
  const [homeCity, setHomeCity] = useState(() => profile.identity.homeCity || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!displayName && (profile.identity.displayName || profile.identity.ssoFullName)) {
      setDisplayName(profile.identity.displayName || profile.identity.ssoFullName);
    }
    if (!homeCity && profile.identity.homeCity) {
      setHomeCity(profile.identity.homeCity);
    }
  }, [
    profile.identity.displayName,
    profile.identity.ssoFullName,
    profile.identity.homeCity,
  ]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    resetOnboarding();
    router.replace('/(auth)/login' as any);
  };

  const handleContinue = async () => {
    const cleanName = displayName.trim();
    if (!cleanName) return setErrorMsg('Please enter a display name or nickname.');

    setErrorMsg('');
    setSaving(true);

    updateIdentity({
      displayName: cleanName,
      homeCity: homeCity.trim(),
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        const baseUpdate = {
          id: uid,
          default_display_name: cleanName,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from('profiles')
          .upsert({ ...baseUpdate, home_city: homeCity.trim() || null }, { onConflict: 'id' });

        if (error && /column .* does not exist/i.test(error.message)) {
          await supabase.from('profiles').upsert(baseUpdate, { onConflict: 'id' });
        }
      }
    } catch {
      // Local state still completes cleanly
    }

    setSaving(false);
    completeOnboarding();
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.topRow}>
          <View style={s.badge}>
            <Text style={s.badgeText}>QUICK SETUP</Text>
          </View>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <LogOut size={14} color={Colors.accent.crimson} />
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={Typography.header}>Welcome! Let’s Get You In</Text>
        <Text style={[Typography.subtitle, { marginBottom: Spacing.md }]}>
          Confirm your display name to browse Nearby events, play live Trivia, and join social games.
        </Text>

        {errorMsg ? (
          <View style={s.errBox}>
            <Text style={s.errText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={s.group}>
          <Text style={s.label}>Display Name / Nickname *</Text>
          <View style={s.inputRow}>
            <User size={16} color={Colors.accent.copper} />
            <TextInput
              style={s.input}
              placeholder="e.g. Alex"
              placeholderTextColor={Colors.text.muted}
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);
                setErrorMsg('');
              }}
            />
          </View>
          {profile.identity.ssoFullName ? (
            <View style={s.ssoHintRow}>
              <Sparkles size={12} color={Colors.accent.copper} />
              <Text style={s.ssoHintText}>
                Synced from SSO ({profile.identity.ssoFullName}) — use your name or a fun nickname.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.group}>
          <Text style={s.label}>Home City (Optional — for Nearby & Local Rankings)</Text>
          <View style={s.inputRow}>
            <MapPin size={16} color={Colors.accent.copper} />
            <TextInput
              style={s.input}
              placeholder="e.g. Nashville, TN"
              placeholderTextColor={Colors.text.muted}
              value={homeCity}
              onChangeText={setHomeCity}
            />
          </View>
        </View>

        <View style={s.privacyNote}>
          <Text style={s.privacyNoteText}>
            Your profile is private and never searchable. Lifestyle events (SwingSet) are kept completely separate behind an optional Code of Conduct gate inside Profile.
          </Text>
        </View>

        <TouchableOpacity style={s.nextBtn} onPress={handleContinue} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={s.nextBtnText}>Enter App</Text>
              <ArrowRight size={18} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.background.darkSteel,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
  },
  badgeText: { color: Colors.text.copper, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
    borderWidth: 1,
    borderColor: Colors.accent.crimson,
  },
  signOutText: { color: Colors.accent.crimson, fontSize: 11, fontWeight: '800' },
  errBox: {
    backgroundColor: 'rgba(255, 92, 122, 0.14)',
    borderColor: Colors.accent.crimson,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.md,
  },
  errText: { color: Colors.accent.crimson, fontWeight: '700', fontSize: 13 },
  group: { marginBottom: Spacing.md },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text.primary },
  ssoHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ssoHintText: { fontSize: 11, color: Colors.text.copper, fontWeight: '600', flex: 1 },
  privacyNote: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: Spacing.lg,
  },
  privacyNoteText: { fontSize: 12, color: Colors.text.secondary, lineHeight: 18 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
