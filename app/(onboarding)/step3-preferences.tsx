import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, Check, Sparkles } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useUser } from '@/context/UserContext';

const LOOKING_FOR_OPTIONS = [
  'Couples Only',
  'Singles (Female)',
  'Singles (Male)',
  'Non-Singles / Open Partners',
  'Just Friends / Socializing',
];

const BOUNDARY_OPTIONS = [
  'Social / Vibe Check Only',
  'Same Room',
  'Soft Swap',
  'Full Swap',
];

export default function Step3PreferencesScreen() {
  const router = useRouter();
  const { profile, updatePreferences, completeOnboarding } = useUser();

  const [lookingFor, setLookingFor] = useState<string[]>(() => profile.preferences.lookingFor || []);
  const [boundaries, setBoundaries] = useState<string[]>(() => profile.preferences.playBoundaries || []);

  const toggleLookingFor = (item: string) => {
    if (lookingFor.includes(item)) {
      setLookingFor(lookingFor.filter((i) => i !== item));
    } else {
      setLookingFor([...lookingFor, item]);
    }
  };

  const toggleBoundary = (item: string) => {
    if (boundaries.includes(item)) {
      setBoundaries(boundaries.filter((i) => i !== item));
    } else {
      setBoundaries([...boundaries, item]);
    }
  };

  const handleFinish = () => {
    updatePreferences({
      lookingFor,
      playBoundaries: boundaries,
    });
    completeOnboarding();
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.badge}><Text style={s.badgeText}>STEP 3 OF 3</Text></View>
        <View style={s.barBg}><View style={[s.barFill, { width: '100%' }]} /></View>

        <Text style={Typography.header}>Private Boundaries</Text>
        <Text style={[Typography.subtitle, { marginBottom: Spacing.md }]}>Set your matchmaking preferences and comfort levels.</Text>

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

        {/* Looking For Chips */}
        <View style={s.group}>
          <Text style={s.label}>Looking For</Text>
          <View style={s.chipGrid}>
            {LOOKING_FOR_OPTIONS.map((item) => {
              const sel = lookingFor.includes(item);
              return (
                <TouchableOpacity key={item} style={[s.chip, sel && s.chipSel]} onPress={() => toggleLookingFor(item)}>
                  <Text style={[s.chipText, sel && s.chipTextSel]}>{item}</Text>
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

        <TouchableOpacity style={s.finishBtn} onPress={handleFinish}>
          <Sparkles size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={s.finishBtnText}>Complete Onboarding & Enter App</Text>
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
