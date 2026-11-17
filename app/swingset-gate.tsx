import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckSquare, HeartHandshake, ShieldAlert, ShieldCheck, Square } from 'lucide-react-native';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useUser } from '@/context/UserContext';

const CODE_OF_CONDUCT = [
  {
    title: '1. Body Positivity & Respect',
    desc: 'Every body type, background, gender, and identity is welcomed without judgment or unsolicited comments.',
  },
  {
    title: '2. Consent First, Always',
    desc: 'Every conversation, game tap, and contact exchange is strictly mutual. “No” or silence is always respected.',
  },
  {
    title: '3. Acceptance of All',
    desc: 'Zero tolerance for harassment, shaming, or discrimination. SwingSet is an intentional, welcoming social space.',
  },
  {
    title: '4. Discretion & Privacy',
    desc: 'Lifestyle profiles, partner links, and contact details stay isolated inside SwingSet and are never shown to general users.',
  },
];

export default function SwingSetGateScreen() {
  const router = useRouter();
  const { acceptSwingSetGate } = useUser();
  const [agreed, setAgreed] = useState(false);

  const handleEnterSwingSet = async () => {
    if (!agreed) return;
    await acceptSwingSetGate();
    router.replace('/(onboarding)/step2-partner' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={16} color={Colors.text.secondary} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <View style={s.heroBox}>
          <ShieldAlert size={26} color={Colors.accent.crimson} />
          <Text style={Typography.header}>SwingSet Lifestyle Gate</Text>
          <Text style={s.heroSub}>
            SwingSet is the dedicated Lifestyle portion of the app—kept completely separate from mainstream Trivia & social events.
          </Text>
        </View>

        <View style={s.card}>
          <View style={s.rowGap}>
            <HeartHandshake size={18} color={Colors.accent.copper} />
            <Text style={s.cardTitle}>SWINGSET CODE OF CONDUCT</Text>
          </View>
          <Text style={s.cardIntro}>
            To keep Lifestyle events safe, inclusive, and fun, everyone entering SwingSet must read and accept these rules:
          </Text>

          {CODE_OF_CONDUCT.map((rule) => (
            <View key={rule.title} style={s.ruleItem}>
              <Text style={s.ruleTitle}>{rule.title}</Text>
              <Text style={s.ruleDesc}>{rule.desc}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.agreeRow, agreed && s.agreeRowActive]}
          onPress={() => setAgreed((prev) => !prev)}
          activeOpacity={0.8}
        >
          {agreed ? (
            <CheckSquare size={22} color={Colors.accent.emerald} />
          ) : (
            <Square size={22} color={Colors.text.muted} />
          )}
          <Text style={s.agreeText}>
            I understand what Lifestyle events are and I agree to uphold the SwingSet Code of Conduct (body positivity, consent, and acceptance of all).
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.enterBtn, !agreed && s.enterBtnDisabled]}
          disabled={!agreed}
          onPress={handleEnterSwingSet}
        >
          <ShieldCheck size={18} color="#FFFFFF" />
          <Text style={s.enterBtnText}>Accept & Continue to SwingSet Setup</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '700' },
  heroBox: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.accent.crimson,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 8,
  },
  heroSub: { color: Colors.text.secondary, fontSize: 13, lineHeight: 19 },
  card: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: Colors.text.copper, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  cardIntro: { color: Colors.text.secondary, fontSize: 12, lineHeight: 17 },
  ruleItem: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.sm,
    padding: 10,
    gap: 3,
  },
  ruleTitle: { color: Colors.text.primary, fontSize: 13, fontWeight: '800' },
  ruleDesc: { color: Colors.text.secondary, fontSize: 12, lineHeight: 17 },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  agreeRowActive: {
    borderColor: Colors.accent.emerald,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  agreeText: { flex: 1, color: Colors.text.primary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  enterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
  },
  enterBtnDisabled: { opacity: 0.45 },
  enterBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
