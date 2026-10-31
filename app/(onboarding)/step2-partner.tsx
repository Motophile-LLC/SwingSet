import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { RefreshCw, ArrowRight, Users, Check, Shield } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useUser, PlayStyleType } from '@/context/UserContext';

const PLAY_STYLES: PlayStyleType[] = ['Play Together as a Unit', 'Mingle Separately with Check-Ins'];

export default function Step2PartnerScreen() {
  const router = useRouter();
  const { profile, updatePartner, generatePartnerCode } = useUser();
  const isCouple = profile.identity.whoYouAre === 'Couple';
  const [enteredCode, setEnteredCode] = useState(() => profile.partner.enteredCode || '');
  const [playStyle, setPlayStyle] = useState<PlayStyleType>(() => profile.partner.playStyle || 'Play Together as a Unit');
  const [isLinked, setIsLinked] = useState(() => profile.partner.isLinked || false);
  const [linkMsg, setLinkMsg] = useState('');

  const handleLink = () => {
    if (enteredCode.length < 4) return setLinkMsg('Please enter a valid 4-digit code.');
    setIsLinked(true);
    setLinkMsg(`Partner linked! (Code #${enteredCode})`);
    updatePartner({
      enteredCode,
      isLinked: true,
      partnerName: `Partner #${enteredCode}`,
      playStyle,
    });
  };

  const handleUnlink = () => {
    setIsLinked(false);
    setEnteredCode('');
    setLinkMsg('Partner unlinked.');
    updatePartner({
      enteredCode: '',
      isLinked: false,
      partnerName: '',
    });
  };

  const handleNext = () => {
    updatePartner({ enteredCode, isLinked, playStyle });
    router.push('/(onboarding)/step3-preferences' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.badge}><Text style={s.badgeText}>STEP 2 OF 3</Text></View>
        <View style={s.barBg}><View style={[s.barFill, { width: '66%' }]} /></View>
        <Text style={Typography.header}>Partner Link & Play Mode</Text>
        <Text style={[Typography.subtitle, { marginBottom: Spacing.md }]}>
          {isCouple ? 'Connect profile with your partner for duo quests.' : 'Optional partner link or solo play.'}
        </Text>

        {/* Share your random code card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Your Random 4-Digit Partner Code</Text>
          <Text style={s.cardSub}>Share this code with your partner so they can link with you.</Text>
          <View style={s.codeRow}>
            <Text style={s.codeText}>{profile.partner.linkCode}</Text>
            <TouchableOpacity style={s.regenBtn} onPress={generatePartnerCode}>
              <RefreshCw size={14} color={Colors.accent.copper} />
              <Text style={s.regenText}>Regenerate Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enter partner's code card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Enter Partner's 4-Digit Code</Text>
          <Text style={s.cardSub}>Alternatively, enter your partner's code below to connect profiles.</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.codeInput}
              placeholder="e.g. 7392"
              placeholderTextColor={Colors.text.muted}
              keyboardType="number-pad"
              maxLength={4}
              value={enteredCode}
              onChangeText={(text) => {
                setEnteredCode(text);
                setLinkMsg('');
              }}
            />
            {isLinked ? (
              <TouchableOpacity style={s.unlinkBtn} onPress={handleUnlink}>
                <Text style={s.unlinkBtnText}>Unlink</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.linkBtn} onPress={handleLink}>
                <Text style={s.linkBtnText}>Link Code</Text>
              </TouchableOpacity>
            )}
          </View>
          {linkMsg ? <Text style={isLinked ? s.msgOk : s.msgErr}>{linkMsg}</Text> : null}
        </View>

        {/* Play Style */}
        <View style={s.group}>
          <Text style={s.label}>Play Style / Interaction Mode</Text>
          {PLAY_STYLES.map((style) => {
            const sel = playStyle === style;
            return (
              <TouchableOpacity
                key={style}
                style={[s.toggleCard, sel && s.toggleCardSel]}
                onPress={() => setPlayStyle(style)}
              >
                <View style={s.toggleRow}>
                  <Users size={16} color={sel ? Colors.accent.copper : Colors.border.brushedSteel} />
                  <Text style={[s.toggleTitle, sel && { color: Colors.accent.copper }]}>{style}</Text>
                  {sel && <Check size={14} color={Colors.accent.copper} style={{ marginLeft: 'auto' }} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={handleNext}>
          <Text style={s.btnText}>Continue to Preferences</Text>
          <ArrowRight size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {!isCouple && (
          <TouchableOpacity style={s.skipBtn} onPress={handleNext}>
            <Text style={s.skipBtnText}>Skip Partner Link (Proceed Solo)</Text>
          </TouchableOpacity>
        )}
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
  card: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, marginBottom: 2 },
  cardSub: { fontSize: 11, color: Colors.text.secondary, marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, paddingHorizontal: 16, paddingVertical: 8 },
  codeText: { fontSize: 22, fontWeight: '800', letterSpacing: 4, color: Colors.accent.copper },
  regenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.accent.copper, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm },
  regenText: { color: Colors.accent.copper, fontSize: 11, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 8 },
  codeInput: { flex: 1, backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  linkBtn: { backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingHorizontal: 16, justifyContent: 'center' },
  linkBtnText: { color: Colors.accent.copper, fontWeight: '800', fontSize: 13 },
  unlinkBtn: { backgroundColor: 'rgba(217, 56, 58, 0.15)', borderWidth: 1, borderColor: Colors.accent.crimson, borderRadius: BorderRadius.md, paddingHorizontal: 16, justifyContent: 'center' },
  unlinkBtnText: { color: Colors.accent.crimson, fontWeight: '800', fontSize: 13 },
  msgOk: { color: Colors.accent.emerald, fontWeight: '700', fontSize: 12, marginTop: 6 },
  msgErr: { color: Colors.accent.crimson, fontWeight: '700', fontSize: 12, marginTop: 6 },
  group: { marginBottom: Spacing.md },
  label: { fontSize: 12, fontWeight: '800', color: Colors.text.primary, marginBottom: 6, textTransform: 'uppercase' },
  toggleCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 12, marginBottom: 8 },
  toggleCardSel: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  primaryBtn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  btnText: { color: Colors.text.primary, fontSize: 15, fontWeight: '800' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { color: Colors.text.secondary, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
});
