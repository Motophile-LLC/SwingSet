import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Music, Compass, Zap, ShieldCheck, RefreshCw, Sparkles, Edit2, Check, Lock, LogOut } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useGame } from '@/context/GameContext';

export default function ProfileTabScreen() {
  const router = useRouter();
  const { profile, updateIdentity, updatePartner, generatePartnerCode, resetOnboarding, lockSession } = useUser();
  const { resetGameData } = useGame();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(() => profile.identity.displayName || '');
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [partnerMsg, setPartnerMsg] = useState('');

  const handleSaveName = () => {
    if (editName.trim()) {
      updateIdentity({ displayName: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleLinkPartner = () => {
    if (partnerCodeInput.trim().length < 4) {
      setPartnerMsg('Enter a valid 4-digit code.');
      return;
    }
    updatePartner({
      enteredCode: partnerCodeInput.trim(),
      isLinked: true,
      partnerName: `Partner #${partnerCodeInput.trim()}`,
    });
    setPartnerMsg('Partner linked successfully!');
  };

  const handleUnlinkPartner = () => {
    updatePartner({
      enteredCode: '',
      isLinked: false,
      partnerName: '',
    });
    setPartnerCodeInput('');
    setPartnerMsg('Partner unlinked.');
  };

  const handleLockSession = () => {
    lockSession();
    router.replace('/(auth)/login' as any);
  };

  const handleReOpenOnboarding = () => {
    router.replace('/(onboarding)/step1-identity' as any);
  };

  const handleResetAll = () => {
    resetOnboarding();
    resetGameData();
    router.replace('/(onboarding)/step1-identity' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header Profile Card */}
        <View style={s.welcomeCard}>
          <View style={s.avatarBadge}>
            <User size={24} color={Colors.accent.copper} />
          </View>
          <View style={{ flex: 1 }}>
            {isEditingName ? (
              <View style={s.inlineEditRow}>
                <TextInput
                  style={s.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                />
                <TouchableOpacity style={s.saveIconBtn} onPress={handleSaveName}>
                  <Check size={16} color={Colors.accent.emerald} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.inlineNameRow}>
                <Text style={s.welcomeTitle}>{profile.identity.displayName || 'Anonymous Guest'}</Text>
                <TouchableOpacity onPress={() => setIsEditingName(true)}>
                  <Edit2 size={16} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={s.badgeTag}>
              <Text style={s.badgeTagText}>{profile.identity.whoYouAre || 'Not Set'}</Text>
            </View>
          </View>
        </View>

        {/* Lock Session Banner */}
        <TouchableOpacity style={s.lockBannerBtn} onPress={handleLockSession}>
          <Lock size={18} color={Colors.accent.crimson} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.lockBannerTitle}>Log Out / Lock Session</Text>
            <Text style={s.lockBannerSub}>Protect private lifestyle preferences & session data</Text>
          </View>
          <LogOut size={18} color={Colors.accent.crimson} />
        </TouchableOpacity>

        {/* Icebreakers Card */}
        <View style={s.card}>
          <Text style={s.cardHeader}>ICEBREAKER PROMPTS</Text>
          <View style={s.promptItem}>
            <Music size={16} color={Colors.accent.copper} />
            <Text style={s.promptLabel}>Karaoke:</Text>
            <Text style={s.promptVal}>{profile.identity.karaokeSong || 'None set'}</Text>
          </View>
          <View style={s.promptItem}>
            <Compass size={16} color={Colors.accent.copper} />
            <Text style={s.promptLabel}>Travel:</Text>
            <Text style={s.promptVal}>{profile.identity.favoriteTravelSpot || 'None set'}</Text>
          </View>
          <View style={s.promptItem}>
            <Zap size={16} color={Colors.accent.copper} />
            <Text style={s.promptLabel}>Hidden Skill:</Text>
            <Text style={s.promptVal}>{profile.identity.hiddenSkill || 'None set'}</Text>
          </View>
        </View>

        {/* Partner & Play Mode Card */}
        <View style={s.card}>
          <Text style={s.cardHeader}>PARTNER LINK & PLAY MODE</Text>
          <View style={s.rowBetween}>
            <Text style={s.cardSubLabel}>Your Random Code:</Text>
            <View style={s.codeGroup}>
              <Text style={s.codeHighlight}>{profile.partner.linkCode}</Text>
              <TouchableOpacity style={s.regenIconBtn} onPress={generatePartnerCode}>
                <RefreshCw size={14} color={Colors.accent.copper} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[s.rowBetween, { marginTop: 8 }]}>
            <Text style={s.cardSubLabel}>Status:</Text>
            <Text style={[s.statusBadge, profile.partner.isLinked ? s.statusLinked : s.statusUnlinked]}>
              {profile.partner.isLinked ? `Linked (${profile.partner.partnerName})` : 'Solo / Unlinked'}
            </Text>
          </View>

          <View style={s.linkBox}>
            <Text style={s.linkBoxLabel}>Enter Partner's 4-Digit Code:</Text>
            <View style={s.linkInputRow}>
              <TextInput
                style={s.linkInput}
                placeholder="4-digit code"
                placeholderTextColor={Colors.text.muted}
                keyboardType="number-pad"
                maxLength={4}
                value={partnerCodeInput}
                onChangeText={(v) => {
                  setPartnerCodeInput(v);
                  setPartnerMsg('');
                }}
              />
              {profile.partner.isLinked ? (
                <TouchableOpacity style={s.unlinkActionBtn} onPress={handleUnlinkPartner}>
                  <Text style={s.unlinkActionText}>Unlink</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.linkActionBtn} onPress={handleLinkPartner}>
                  <Text style={s.linkActionText}>Link</Text>
                </TouchableOpacity>
              )}
            </View>
            {partnerMsg ? <Text style={profile.partner.isLinked ? s.msgOk : s.msgErr}>{partnerMsg}</Text> : null}
          </View>

          <View style={[s.rowBetween, { marginTop: 12 }]}>
            <Text style={s.cardSubLabel}>Play Style:</Text>
            <Text style={s.valText}>{profile.partner.playStyle}</Text>
          </View>
        </View>

        {/* Private Matchmaking Card */}
        <View style={s.card}>
          <View style={s.rowGap}>
            <ShieldCheck size={16} color={Colors.accent.copper} />
            <Text style={s.cardHeader}>PRIVATE BOUNDARIES & MATCHMAKING</Text>
          </View>
          <Text style={s.sectionLabel}>Looking For:</Text>
          <View style={s.chipWrap}>
            {profile.preferences.lookingFor.length > 0 ? (
              profile.preferences.lookingFor.map((item) => (
                <View key={item} style={s.chip}>
                  <Text style={s.chipText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={s.emptyText}>No preference selected</Text>
            )}
          </View>

          <Text style={[s.sectionLabel, { marginTop: 8 }]}>Comfort Boundaries:</Text>
          <View style={s.chipWrap}>
            {profile.preferences.playBoundaries.length > 0 ? (
              profile.preferences.playBoundaries.map((item) => (
                <View key={item} style={s.chip}>
                  <Text style={s.chipText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={s.emptyText}>No boundaries selected</Text>
            )}
          </View>
        </View>

        {/* Onboarding Actions */}
        <View style={s.actionsGroup}>
          <TouchableOpacity style={s.primaryBtn} onPress={handleReOpenOnboarding}>
            <Sparkles size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={s.btnText}>Edit Onboarding Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.resetBtn} onPress={handleResetAll}>
            <RefreshCw size={16} color={Colors.accent.crimson} style={{ marginRight: 6 }} />
            <Text style={s.resetBtnText}>Reset Profile & Game Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  welcomeCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  avatarBadge: { width: 48, height: 48, borderRadius: BorderRadius.full, backgroundColor: '#231B18', borderWidth: 1, borderColor: Colors.accent.copper, justifyContent: 'center', alignItems: 'center' },
  welcomeTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, marginRight: 8 },
  inlineNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  inlineEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nameInput: { flex: 1, backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4, color: Colors.text.primary, fontSize: 16, fontWeight: '700' },
  saveIconBtn: { backgroundColor: 'rgba(46, 175, 125, 0.2)', borderRadius: BorderRadius.sm, padding: 6 },
  badgeTag: { alignSelf: 'flex-start', backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTagText: { color: Colors.accent.copper, fontSize: 11, fontWeight: '700' },
  lockBannerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217, 56, 58, 0.12)', borderWidth: 1, borderColor: Colors.accent.crimson, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  lockBannerTitle: { fontSize: 14, fontWeight: '800', color: Colors.accent.crimson },
  lockBannerSub: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  card: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { fontSize: 11, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 1, marginBottom: 8 },
  promptItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  promptLabel: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
  promptVal: { fontSize: 13, color: Colors.text.primary, flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardSubLabel: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
  codeGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeHighlight: { fontSize: 18, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 2 },
  regenIconBtn: { padding: 4, backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.sm },
  statusBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  statusLinked: { backgroundColor: 'rgba(46, 175, 125, 0.2)', color: Colors.accent.emerald },
  statusUnlinked: { backgroundColor: Colors.background.card, color: Colors.text.secondary },
  valText: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  linkBox: { backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 10, marginTop: 8 },
  linkBoxLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary, marginBottom: 6 },
  linkInputRow: { flexDirection: 'row', gap: 8 },
  linkInput: { flex: 1, backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 6, color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  linkActionBtn: { backgroundColor: Colors.accent.copper, paddingHorizontal: 14, borderRadius: BorderRadius.sm, justifyContent: 'center' },
  linkActionText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  unlinkActionBtn: { backgroundColor: 'rgba(217, 56, 58, 0.2)', borderWidth: 1, borderColor: Colors.accent.crimson, paddingHorizontal: 14, borderRadius: BorderRadius.sm, justifyContent: 'center' },
  unlinkActionText: { color: Colors.accent.crimson, fontWeight: '800', fontSize: 12 },
  msgOk: { color: Colors.accent.emerald, fontSize: 11, fontWeight: '700', marginTop: 4 },
  msgErr: { color: Colors.accent.crimson, fontSize: 11, fontWeight: '700', marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.text.primary, marginBottom: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: { backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, color: Colors.text.primary, fontWeight: '600' },
  emptyText: { fontSize: 12, color: Colors.text.muted, fontStyle: 'italic' },
  actionsGroup: { marginTop: Spacing.sm, gap: 10 },
  primaryBtn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: Colors.text.primary, fontSize: 15, fontWeight: '800' },
  resetBtn: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.accent.crimson, borderRadius: BorderRadius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resetBtnText: { color: Colors.accent.crimson, fontSize: 14, fontWeight: '700' },
});
