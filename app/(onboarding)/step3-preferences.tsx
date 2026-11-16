import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, Check, Sparkles } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/src/lib/supabase';
import { AttendeeBucketType, GenderType, InterestedInType } from '@/src/types/swingset';

const INTERESTED_IN_OPTIONS: { label: string; value: InterestedInType }[] = [
  { label: 'Couples', value: 'couples' },
  { label: 'Women', value: 'women' },
  { label: 'Men', value: 'men' },
  { label: 'Everyone / Socializing', value: 'everyone' },
];

const BOUNDARY_OPTIONS = [
  'Social / Vibe Check Only',
  'Same Room',
  'Soft Swap',
  'Full Swap',
];

export default function Step3PreferencesScreen() {
  const router = useRouter();
  const { profile, updateIdentity, updatePreferences, completeOnboarding } = useUser();

  const [interestedIn, setInterestedIn] = useState<InterestedInType[]>(() =>
    profile.identity.interestedIn?.length > 0 ? profile.identity.interestedIn : ['everyone']
  );
  const [boundaries, setBoundaries] = useState<string[]>(() => profile.preferences.playBoundaries || []);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleInterestedIn = (item: InterestedInType) => {
    if (interestedIn.includes(item)) {
      const next = interestedIn.filter((i) => i !== item);
      setInterestedIn(next.length > 0 ? next : ['everyone']);
    } else {
      setInterestedIn([...interestedIn, item]);
    }
  };

  const toggleBoundary = (item: string) => {
    if (boundaries.includes(item)) {
      setBoundaries(boundaries.filter((i) => i !== item));
    } else {
      setBoundaries([...boundaries, item]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setErrorMsg('');

    try {
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
        if (anonErr) {
          setSaving(false);
          setErrorMsg('No active session found. Please sign in first.');
          return;
        }
        sessionData = { session: anonData.session };
      }

      const userId = sessionData.session?.user?.id;
      if (!userId) {
        setSaving(false);
        setErrorMsg('No authenticated user ID available. Please sign in again.');
        return;
      }

      const displayName = profile.identity.displayName.trim() || 'Guest';
      const bucketType: AttendeeBucketType =
        profile.identity.whoYouAre === 'couple' || profile.identity.whoYouAre === 'group'
          ? profile.identity.whoYouAre
          : 'single';
      const gender: GenderType = profile.identity.gender || 'man';
      const interestedInValues: InterestedInType[] =
        interestedIn.length > 0 ? interestedIn : ['everyone'];

      const bioParts = [
        profile.identity.karaokeSong ? `Karaoke: ${profile.identity.karaokeSong}` : '',
        profile.identity.favoriteTravelSpot ? `Travel: ${profile.identity.favoriteTravelSpot}` : '',
        profile.identity.hiddenSkill ? `Skill: ${profile.identity.hiddenSkill}` : '',
      ].filter(Boolean);
      const bioTagline = bioParts.join(' • ') || null;

      // Max 4 items enforced by DB constraint max_four_custom_fields
      const customFields = [
        { label: 'boundaries', value: boundaries.join(', ') },
        { label: 'play_style', value: profile.partner.playStyle },
        { label: 'partner_code', value: profile.partner.enteredCode || profile.partner.linkCode },
      ].slice(0, 4);

      const { error } = await supabase.from('profiles').upsert(
        {
          id: userId,
          default_display_name: displayName,
          bucket_type: bucketType,
          gender,
          interested_in: interestedInValues,
          bio_tagline: bioTagline,
          karaoke_song: profile.identity.karaokeSong || null,
          favorite_travel_spot: profile.identity.favoriteTravelSpot || null,
          hidden_skill: profile.identity.hiddenSkill || null,
          play_style: profile.partner.playStyle,
          play_boundaries: boundaries,
          partner_link_code: profile.partner.linkCode,
          linked_partner_code: profile.partner.enteredCode || null,
          contact_custom_fields: customFields,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) {
        setSaving(false);
        setErrorMsg(error.message || 'Failed to save onboarding profile.');
        return;
      }

      updateIdentity({
        interestedIn: interestedInValues,
        bioTagline: bioTagline || '',
      });
      updatePreferences({
        lookingFor: interestedInValues,
        playBoundaries: boundaries,
      });
      completeOnboarding();
      setSaving(false);
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      setSaving(false);
      setErrorMsg(err?.message || 'Unexpected error saving profile.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerStyle={s.scroll}>
        <View style={s.badge}><Text style={s.badgeText}>STEP 3 OF 3</Text></View>
        <View style={s.barBg}><View style={[s.barFill, { width: '100%' }]} /></View>

        <Text style={Typography.header}>Private Boundaries</Text>
        <Text style={[Typography.subtitle, { marginBottom: Spacing.md }]}>Set your matchmaking preferences and comfort levels.</Text>

        {errorMsg ? (
          <View style={s.errBox}>
            <Text style={s.errText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Private Reassuring Banner */}
        <View style={s.banner}>
          <View style={s.bannerHeader}>
            <ShieldCheck size={20} color={Colors.accent.copper} />
            <Text style={s.bannerTitle}>100% PRIVATE & CONFIDENTIAL</Text>
          </View>
          <Text style={s.bannerBody}>
            These selections are strictly confidential and used solely for venue matchmaking. They are NEVER displayed on your public profile or tag scans.
          </Text>
        </View>

        {/* Interested In Chips */}
        <View style={s.group}>
          <Text style={s.label}>Open to Matching With (Interested In)</Text>
          <View style={s.chipGrid}>
            {INTERESTED_IN_OPTIONS.map((item) => {
              const sel = interestedIn.includes(item.value);
              return (
                <TouchableOpacity key={item.value} style={[s.chip, sel && s.chipSel]} onPress={() => toggleInterestedIn(item.value)}>
                  <Text style={[s.chipText, sel && s.chipTextSel]}>{item.label}</Text>
                  {sel && <Check size={14} color={Colors.accent.copper} style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Comfort & Play Boundaries Chips */}
        <View style={s.group}>
          <Text style={s.label}>Comfort & Play Boundaries</Text>
          <View style={s.chipGrid}>
            {BOUNDARY_OPTIONS.map((item) => {
              const sel = boundaries.includes(item);
              return (
                <TouchableOpacity key={item} style={[s.chip, sel && s.chipSel]} onPress={() => toggleBoundary(item)}>
                  <Text style={[s.chipText, sel && s.chipTextSel]}>{item}</Text>
                  {sel && <Check size={14} color={Colors.accent.copper} style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={s.finishBtn} onPress={handleFinish} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Sparkles size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={s.finishBtnText}>Complete Onboarding & Enter App</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: 140 },
  badge: { alignSelf: 'flex-start', backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  badgeText: { color: Colors.accent.copper, fontSize: 10, fontWeight: '800' },
  barBg: { height: 4, backgroundColor: Colors.border.steelGray, borderRadius: 2, marginBottom: Spacing.md },
  barFill: { height: '100%', backgroundColor: Colors.accent.copper, borderRadius: 2 },
  errBox: { backgroundColor: 'rgba(217, 56, 58, 0.15)', borderColor: Colors.accent.crimson, borderWidth: 1, borderRadius: BorderRadius.md, padding: 10, marginBottom: Spacing.md },
  errText: { color: Colors.accent.crimson, fontWeight: '600', fontSize: 13 },
  banner: { backgroundColor: 'rgba(200, 109, 81, 0.12)', borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bannerTitle: { color: Colors.accent.copper, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  bannerBody: { color: Colors.text.secondary, fontSize: 12, lineHeight: 17 },
  group: { marginBottom: Spacing.lg },
  label: { fontSize: 12, fontWeight: '800', color: Colors.text.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  chipSel: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  chipText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  chipTextSel: { color: Colors.accent.copper, fontWeight: '700' },
  finishBtn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  finishBtnText: { color: Colors.text.primary, fontSize: 16, fontWeight: '800' },
});
