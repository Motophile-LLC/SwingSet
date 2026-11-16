import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Users, Music, Compass, Zap, ArrowRight, Check, LogOut, Sparkles } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useUser, WhoYouAreType } from '@/context/UserContext';
import { supabase } from '@/src/lib/supabase';
import { GenderType } from '@/src/types/swingset';

const BUCKET_OPTIONS: { value: WhoYouAreType; label: string; desc: string; icon: any }[] = [
  { value: 'single', label: 'Single', desc: 'Solo attendee', icon: User },
  { value: 'couple', label: 'Couple', desc: 'Pair attending together', icon: Users },
  { value: 'group', label: 'Group', desc: 'Group / Crew arrival', icon: Users },
];

const GENDER_OPTIONS: { value: GenderType; label: string }[] = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non_binary', label: 'Non-Binary' },
];

export default function Step1IdentityScreen() {
  const router = useRouter();
  const { profile, updateIdentity, resetOnboarding } = useUser();
  const [displayName, setDisplayName] = useState(
    () => profile.identity.displayName || profile.identity.ssoFullName || ''
  );
  const [whoYouAre, setWhoYouAre] = useState<WhoYouAreType | ''>(
    () => profile.identity.whoYouAre || 'single'
  );
  const [gender, setGender] = useState<GenderType>(() => profile.identity.gender || 'man');
  const [karaoke, setKaraoke] = useState(() => profile.identity.karaokeSong || '');
  const [travel, setTravel] = useState(() => profile.identity.favoriteTravelSpot || '');
  const [skill, setSkill] = useState(() => profile.identity.hiddenSkill || '');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-populate SSO name/prompts once UserContext finishes hydrating from Supabase
  useEffect(() => {
    if (!displayName && (profile.identity.displayName || profile.identity.ssoFullName)) {
      setDisplayName(profile.identity.displayName || profile.identity.ssoFullName);
    }
    if (!karaoke && profile.identity.karaokeSong) setKaraoke(profile.identity.karaokeSong);
    if (!travel && profile.identity.favoriteTravelSpot) setTravel(profile.identity.favoriteTravelSpot);
    if (!skill && profile.identity.hiddenSkill) setSkill(profile.identity.hiddenSkill);
  }, [
    profile.identity.displayName,
    profile.identity.ssoFullName,
    profile.identity.karaokeSong,
    profile.identity.favoriteTravelSpot,
    profile.identity.hiddenSkill,
  ]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    resetOnboarding();
    router.replace('/(auth)/login' as any);
  };

  const handleNext = () => {
    if (!displayName.trim()) return setErrorMsg('Please enter a display name.');
    if (!whoYouAre) return setErrorMsg('Please select who you are.');
    setErrorMsg('');
    updateIdentity({
      displayName: displayName.trim(),
      whoYouAre,
      gender,
      karaokeSong: karaoke.trim(),
      favoriteTravelSpot: travel.trim(),
      hiddenSkill: skill.trim(),
    });
    if (whoYouAre === 'single') {
      router.push('/(onboarding)/step3-preferences' as any);
    } else {
      router.push('/(onboarding)/step2-partner' as any);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.topRow}>
          <View style={s.badge}><Text style={s.badgeText}>STEP 1 OF 3</Text></View>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <LogOut size={14} color={Colors.accent.crimson} />
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        <View style={s.barBg}><View style={[s.barFill, { width: '33%' }]} /></View>
        <Text style={Typography.header}>Identity & Icebreakers</Text>
        <Text style={[Typography.subtitle, { marginBottom: Spacing.md }]}>
          Your static profile stays private (never searchable) and remembers your settings every time you sign in.
        </Text>
        {errorMsg ? <View style={s.errBox}><Text style={s.errText}>{errorMsg}</Text></View> : null}

        <View style={s.group}>
          <Text style={s.label}>Display Name / Alias *</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Alex_Vibe"
            placeholderTextColor={Colors.text.muted}
            value={displayName}
            onChangeText={(v) => { setDisplayName(v); setErrorMsg(''); }}
          />
          {profile.identity.ssoFullName ? (
            <View style={s.ssoHintRow}>
              <Sparkles size={12} color={Colors.accent.copper} />
              <Text style={s.ssoHintText}>
                Synced from SSO ({profile.identity.ssoFullName}) — feel free to use a party alias.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.group}>
          <Text style={s.label}>Who You Are (Attendance Bucket) *</Text>
          <View style={s.grid}>
            {BUCKET_OPTIONS.map((item) => {
              const Icon = item.icon;
              const sel = whoYouAre === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[s.card, sel && s.cardSel]}
                  onPress={() => { setWhoYouAre(item.value); setErrorMsg(''); }}
                >
                  <View style={s.cardHeader}>
                    <Icon size={18} color={sel ? Colors.accent.copper : Colors.border.brushedSteel} />
                    {sel && <View style={s.check}><Check size={10} color="#FFF" /></View>}
                  </View>
                  <Text style={[s.cardTitle, sel && { color: Colors.accent.copper }]}>{item.label}</Text>
                  <Text style={s.cardDesc}>{item.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.label}>Your Individual Gender *</Text>
          <View style={s.genderRow}>
            {GENDER_OPTIONS.map((item) => {
              const sel = gender === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[s.genderChip, sel && s.genderChipSel]}
                  onPress={() => setGender(item.value)}
                >
                  <Text style={[s.genderChipText, sel && { color: Colors.accent.copper }]}>{item.label}</Text>
                  {sel && <Check size={12} color={Colors.accent.copper} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.label}>Quick Icebreakers</Text>
          <View style={s.pRow}><Music size={14} color={Colors.accent.copper} /><Text style={s.pLabel}>Go-to Karaoke Song</Text></View>
          <TextInput style={s.input} placeholder="e.g. Don't Stop Believin'" placeholderTextColor={Colors.text.muted} value={karaoke} onChangeText={setKaraoke} />
          <View style={[s.pRow, { marginTop: 8 }]}><Compass size={14} color={Colors.accent.copper} /><Text style={s.pLabel}>Favorite Travel Spot</Text></View>
          <TextInput style={s.input} placeholder="e.g. Tokyo" placeholderTextColor={Colors.text.muted} value={travel} onChangeText={setTravel} />
          <View style={[s.pRow, { marginTop: 8 }]}><Zap size={14} color={Colors.accent.copper} /><Text style={s.pLabel}>Hidden Skill / Fun Fact</Text></View>
          <TextInput style={s.input} placeholder="e.g. Espresso Martini Master" placeholderTextColor={Colors.text.muted} value={skill} onChangeText={setSkill} />
        </View>

        <TouchableOpacity style={s.btn} onPress={handleNext}>
          <Text style={s.btnText}>
            {whoYouAre === 'single' ? 'Next: Private Preferences' : 'Next: Partner Linking'}
          </Text>
          <ArrowRight size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: 140 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { alignSelf: 'flex-start', backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: Colors.accent.copper, fontSize: 10, fontWeight: '800' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(217, 56, 58, 0.12)', borderWidth: 1, borderColor: Colors.accent.crimson, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  signOutText: { color: Colors.accent.crimson, fontSize: 11, fontWeight: '800' },
  barBg: { height: 4, backgroundColor: Colors.border.steelGray, borderRadius: 2, marginBottom: Spacing.md },
  barFill: { height: '100%', backgroundColor: Colors.accent.copper, borderRadius: 2 },
  errBox: { backgroundColor: 'rgba(217, 56, 58, 0.15)', borderColor: Colors.accent.crimson, borderWidth: 1, borderRadius: BorderRadius.md, padding: 10, marginBottom: Spacing.md },
  errText: { color: Colors.accent.crimson, fontWeight: '600', fontSize: 13 },
  group: { marginBottom: Spacing.md },
  label: { fontSize: 12, fontWeight: '800', color: Colors.text.primary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.background.inputBg, borderColor: Colors.border.steelGray, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text.primary },
  ssoHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ssoHintText: { fontSize: 11, color: Colors.accent.copper, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '31%', backgroundColor: Colors.background.darkSteel, borderColor: Colors.border.steelGray, borderWidth: 1, borderRadius: BorderRadius.md, padding: 10 },
  cardSel: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  check: { backgroundColor: Colors.accent.copper, borderRadius: 99, padding: 2 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  cardDesc: { fontSize: 10, color: Colors.text.secondary },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, paddingVertical: 10 },
  genderChipSel: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  genderChipText: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },
  btn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  btnText: { color: Colors.text.primary, fontSize: 15, fontWeight: '800' },
});
