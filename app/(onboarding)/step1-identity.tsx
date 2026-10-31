import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Users, Music, Compass, Zap, ArrowRight, Check } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useUser, WhoYouAreType } from '@/context/UserContext';

const OPTIONS: { label: WhoYouAreType; desc: string; icon: any }[] = [
  { label: 'Single Male', desc: 'Solo attendee', icon: User },
  { label: 'Single Female', desc: 'Solo attendee', icon: User },
  { label: 'Couple', desc: 'Pair attending together', icon: Users },
  { label: 'Group Arrival', desc: 'Group / Crew', icon: Users },
];

export default function Step1IdentityScreen() {
  const router = useRouter();
  const { profile, updateIdentity } = useUser();
  const [displayName, setDisplayName] = useState(() => profile.identity.displayName || '');
  const [whoYouAre, setWhoYouAre] = useState<WhoYouAreType | ''>(() => profile.identity.whoYouAre || '');
  const [karaoke, setKaraoke] = useState(() => profile.identity.karaokeSong || '');
  const [travel, setTravel] = useState(() => profile.identity.favoriteTravelSpot || '');
  const [skill, setSkill] = useState(() => profile.identity.hiddenSkill || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleNext = () => {
    if (!displayName.trim()) return setErrorMsg('Please enter a display name.');
    if (!whoYouAre) return setErrorMsg('Please select who you are.');
    setErrorMsg('');
    updateIdentity({ displayName: displayName.trim(), whoYouAre, karaokeSong: karaoke.trim(), favoriteTravelSpot: travel.trim(), hiddenSkill: skill.trim() });
    router.push('/(onboarding)/step2-partner' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.badge}><Text style={s.badgeText}>STEP 1 OF 3</Text></View>
        <View style={s.barBg}><View style={[s.barFill, { width: '33%' }]} /></View>
        <Text style={Typography.header}>Identity & Icebreakers</Text>
        <Text style={[Typography.subtitle, { marginBottom: Spacing.md }]}>Set up your profile and prompts.</Text>
        {errorMsg ? <View style={s.errBox}><Text style={s.errText}>{errorMsg}</Text></View> : null}
        <View style={s.group}>
          <Text style={s.label}>Display Name / Alias *</Text>
          <TextInput style={s.input} placeholder="e.g. Alex_Vibe" placeholderTextColor={Colors.text.muted} value={displayName} onChangeText={(v) => { setDisplayName(v); setErrorMsg(''); }} />
        </View>
        <View style={s.group}>
          <Text style={s.label}>Who You Are *</Text>
          <View style={s.grid}>
            {OPTIONS.map((item) => {
              const Icon = item.icon;
              const sel = whoYouAre === item.label;
              return (
                <TouchableOpacity key={item.label} style={[s.card, sel && s.cardSel]} onPress={() => { setWhoYouAre(item.label); setErrorMsg(''); }}>
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
          <Text style={s.label}>Quick Icebreakers</Text>
          <View style={s.pRow}><Music size={14} color={Colors.accent.copper} /><Text style={s.pLabel}>Go-to Karaoke Song</Text></View>
          <TextInput style={s.input} placeholder="e.g. Don't Stop Believin'" placeholderTextColor={Colors.text.muted} value={karaoke} onChangeText={setKaraoke} />
          <View style={[s.pRow, { marginTop: 8 }]}><Compass size={14} color={Colors.accent.copper} /><Text style={s.pLabel}>Favorite Travel Spot</Text></View>
          <TextInput style={s.input} placeholder="e.g. Tokyo" placeholderTextColor={Colors.text.muted} value={travel} onChangeText={setTravel} />
          <View style={[s.pRow, { marginTop: 8 }]}><Zap size={14} color={Colors.accent.copper} /><Text style={s.pLabel}>Hidden Skill / Fun Fact</Text></View>
          <TextInput style={s.input} placeholder="e.g. Espresso Martini Master" placeholderTextColor={Colors.text.muted} value={skill} onChangeText={setSkill} />
        </View>
        <TouchableOpacity style={s.btn} onPress={handleNext}>
          <Text style={s.btnText}>Next: Partner Linking</Text>
          <ArrowRight size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  badge: { alignSelf: 'flex-start', backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  badgeText: { color: Colors.accent.copper, fontSize: 10, fontWeight: '800' },
  barBg: { height: 4, backgroundColor: Colors.border.steelGray, borderRadius: 2, marginBottom: Spacing.md },
  barFill: { height: '100%', backgroundColor: Colors.accent.copper, borderRadius: 2 },
  errBox: { backgroundColor: 'rgba(217, 56, 58, 0.15)', borderColor: Colors.accent.crimson, borderWidth: 1, borderRadius: BorderRadius.md, padding: 10, marginBottom: Spacing.md },
  errText: { color: Colors.accent.crimson, fontWeight: '600', fontSize: 13 },
  group: { marginBottom: Spacing.md },
  label: { fontSize: 12, fontWeight: '800', color: Colors.text.primary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.background.inputBg, borderColor: Colors.border.steelGray, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48%', backgroundColor: Colors.background.darkSteel, borderColor: Colors.border.steelGray, borderWidth: 1, borderRadius: BorderRadius.md, padding: 10 },
  cardSel: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  check: { backgroundColor: Colors.accent.copper, borderRadius: 99, padding: 2 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  cardDesc: { fontSize: 11, color: Colors.text.secondary },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },
  btn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  btnText: { color: Colors.text.primary, fontSize: 15, fontWeight: '800' },
});
