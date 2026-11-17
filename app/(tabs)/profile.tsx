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
import {
  Check,
  Compass,
  Crown,
  Edit2,
  Lock,
  LogOut,
  Mail,
  Music,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useGame } from '@/context/GameContext';
import { supabase } from '@/src/lib/supabase';
import { SubscriptionTier } from '@/src/types/swingset';

const TIER_OPTIONS: { tier: SubscriptionTier; label: string; desc: string }[] = [
  { tier: 'free', label: 'Free Guest', desc: 'Standard event access & recent taps' },
  { tier: 'plus', label: 'SwingSet Plus', desc: 'Unlimited Little Black Book & custom contact fields' },
  { tier: 'vip', label: 'VIP Member', desc: 'Priority duo matchmaking & full vault unlock' },
  { tier: 'host_pro', label: 'Host Pro', desc: 'Create unlimited multi-round events & live studio' },
];

export default function ProfileTabScreen() {
  const router = useRouter();
  const {
    profile,
    updateIdentity,
    updatePartner,
    updateContactVault,
    updateMembership,
    refreshProfileFromSupabase,
    generatePartnerCode,
    resetOnboarding,
    lockSession,
  } = useUser();
  const { resetGameData } = useGame();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(() => profile.identity.displayName || '');
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [partnerMsg, setPartnerMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Contact Vault local state synced with profile.contactVault
  const [phone, setPhone] = useState(() => profile.contactVault.phone || '');
  const [email, setEmail] = useState(() => profile.contactVault.email || '');
  const [instagram, setInstagram] = useState(() => profile.contactVault.instagram || '');
  const [sls, setSls] = useState(() => profile.contactVault.sls || '');
  const [clubAccount, setClubAccount] = useState(() => profile.contactVault.clubAccount || '');
  const [vaultSavedMsg, setVaultSavedMsg] = useState('');

  useEffect(() => {
    refreshProfileFromSupabase();
  }, [refreshProfileFromSupabase]);

  useEffect(() => {
    setEditName(profile.identity.displayName || '');
    setPhone(profile.contactVault.phone || '');
    setEmail(profile.contactVault.email || '');
    setInstagram(profile.contactVault.instagram || '');
    setSls(profile.contactVault.sls || '');
    setClubAccount(profile.contactVault.clubAccount || '');
  }, [
    profile.identity.displayName,
    profile.contactVault.phone,
    profile.contactVault.email,
    profile.contactVault.instagram,
    profile.contactVault.sls,
    profile.contactVault.clubAccount,
  ]);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setIsEditingName(false);
      return;
    }
    setSyncing(true);
    updateIdentity({ displayName: trimmed });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({
          default_display_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);
    }
    setSyncing(false);
    setIsEditingName(false);
  };

  const handleSaveContactVault = async () => {
    setSyncing(true);
    setVaultSavedMsg('');
    updateContactVault({
      phone: phone.trim(),
      email: email.trim(),
      instagram: instagram.trim(),
      sls: sls.trim(),
      clubAccount: clubAccount.trim(),
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from('profiles')
        .update({
          contact_phone: phone.trim() || null,
          contact_email: email.trim() || null,
          contact_instagram: instagram.trim() || null,
          contact_sls: sls.trim() || null,
          contact_club_account: clubAccount.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      setVaultSavedMsg(error ? `Error: ${error.message}` : 'Contact Vault saved to your static profile!');
    }
    setSyncing(false);
  };

  const handleSelectTier = async (tier: SubscriptionTier) => {
    const status = tier === 'free' ? 'none' : 'active';
    updateMembership({ tier, status });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({
          subscription_tier: tier,
          subscription_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);
    }
  };

  const handleLinkPartner = async () => {
    if (partnerCodeInput.trim().length < 4) {
      setPartnerMsg('Enter a valid 4-digit code.');
      return;
    }
    const code = partnerCodeInput.trim();
    updatePartner({
      enteredCode: code,
      isLinked: true,
      partnerName: `Partner #${code}`,
    });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ linked_partner_code: code, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }
    setPartnerMsg('Partner linked & saved!');
  };

  const handleUnlinkPartner = async () => {
    updatePartner({
      enteredCode: '',
      isLinked: false,
      partnerName: '',
    });
    setPartnerCodeInput('');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ linked_partner_code: null, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }
    setPartnerMsg('Partner unlinked.');
  };

  const handleLockSession = async () => {
    await supabase.auth.signOut();
    lockSession();
    router.replace('/(auth)/login' as any);
  };

  const handleReOpenOnboarding = () => {
    router.replace('/(onboarding)/step1-identity' as any);
  };

  const handleResetAll = async () => {
    resetOnboarding();
    resetGameData();
    router.replace('/(onboarding)/step1-identity' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerStyle={s.scroll}>
        {/* Header Static Profile Card */}
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
                <TouchableOpacity style={s.saveIconBtn} onPress={handleSaveName} disabled={syncing}>
                  {syncing ? (
                    <ActivityIndicator size="small" color={Colors.accent.emerald} />
                  ) : (
                    <Check size={16} color={Colors.accent.emerald} />
                  )}
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
            {profile.identity.ssoFullName ? (
              <Text style={s.ssoSubText}>
                SSO Account: {profile.identity.ssoFullName}{' '}
                {profile.contactVault.email ? `(${profile.contactVault.email})` : ''}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              <View style={s.badgeTag}>
                <Text style={s.badgeTagText}>{(profile.identity.whoYouAre || 'single').toUpperCase()}</Text>
              </View>
              <View style={s.badgeTag}>
                <Text style={s.badgeTagText}>{(profile.identity.gender || 'man').toUpperCase()}</Text>
              </View>
              <View style={[s.badgeTag, s.tierBadgeTag]}>
                <Crown size={11} color={Colors.accent.emerald} />
                <Text style={s.tierBadgeText}>{(profile.membership.tier || 'free').toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* My Contact Vault (For Mutual Little Black Book Exchanges) */}
        <View style={s.card}>
          <View style={s.rowGap}>
            <ShieldCheck size={16} color={Colors.accent.copper} />
            <Text style={s.cardHeader}>MY PRIVATE CONTACT VAULT (LITTLE BLACK BOOK)</Text>
          </View>
          <Text style={s.vaultDesc}>
            Saved to your static profile. Strictly private — only shared when you and someone you tapped in a game mutually accept a contact exchange.
          </Text>

          <View style={s.vaultFieldRow}>
            <Phone size={15} color={Colors.accent.copper} />
            <TextInput
              style={s.vaultInput}
              placeholder="Phone Number (e.g. 615-555-0199)"
              placeholderTextColor={Colors.text.muted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={s.vaultFieldRow}>
            <Mail size={15} color={Colors.accent.copper} />
            <TextInput
              style={s.vaultInput}
              placeholder="Email Address"
              placeholderTextColor={Colors.text.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={s.vaultFieldRow}>
            <Sparkles size={15} color={Colors.accent.copper} />
            <TextInput
              style={s.vaultInput}
              placeholder="Instagram Handle (e.g. @handle)"
              placeholderTextColor={Colors.text.muted}
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
            />
          </View>

          {profile.swingsetOptedIn ? (
            <>
              <View style={s.vaultFieldRow}>
                <ShieldCheck size={15} color={Colors.accent.copper} />
                <TextInput
                  style={s.vaultInput}
                  placeholder="SLS / Lifestyle Handle"
                  placeholderTextColor={Colors.text.muted}
                  value={sls}
                  onChangeText={setSls}
                  autoCapitalize="none"
                />
              </View>

              <View style={s.vaultFieldRow}>
                <Crown size={15} color={Colors.accent.copper} />
                <TextInput
                  style={s.vaultInput}
                  placeholder="Club / Venue Membership Handle"
                  placeholderTextColor={Colors.text.muted}
                  value={clubAccount}
                  onChangeText={setClubAccount}
                  autoCapitalize="none"
                />
              </View>
            </>
          ) : null}

          <TouchableOpacity style={s.saveVaultBtn} onPress={handleSaveContactVault} disabled={syncing}>
            <Save size={15} color="#FFF" />
            <Text style={s.saveVaultBtnText}>
              {syncing ? 'Saving...' : 'Save Contact Vault to Profile'}
            </Text>
          </TouchableOpacity>
          {vaultSavedMsg ? <Text style={s.msgOk}>{vaultSavedMsg}</Text> : null}
        </View>

        {/* Membership & Monetization Access Level Card */}
        <View style={s.card}>
          <View style={s.rowGap}>
            <Crown size={16} color={Colors.accent.copper} />
            <Text style={s.cardHeader}>MEMBERSHIP TIER & ACCESS LEVEL</Text>
          </View>
          <Text style={s.vaultDesc}>
            Database-backed user tier (`public.profiles.subscription_tier`) for differentiating Free vs. Paid VIP / Host Pro capabilities.
          </Text>

          <View style={{ gap: 8, marginTop: 4 }}>
            {TIER_OPTIONS.map((item) => {
              const active = profile.membership.tier === item.tier;
              return (
                <TouchableOpacity
                  key={item.tier}
                  style={[s.tierCard, active && s.tierCardActive]}
                  onPress={() => handleSelectTier(item.tier)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tierTitle, active && { color: Colors.accent.copper }]}>
                      {item.label}
                    </Text>
                    <Text style={s.tierSub}>{item.desc}</Text>
                  </View>
                  {active ? (
                    <Check size={16} color={Colors.accent.copper} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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

        {/* SwingSet Lifestyle Gate / Partner & Play Mode Card */}
        {!profile.swingsetOptedIn ? (
          <View style={s.card}>
            <View style={s.rowGap}>
              <Lock size={16} color={Colors.accent.crimson} />
              <Text style={s.cardHeader}>SWINGSET (LIFESTYLE SPACE) — LOCKED</Text>
            </View>
            <Text style={s.vaultDesc}>
              SwingSet is our separated Lifestyle section. Partner linking, Lifestyle play boundaries, and community contact fields stay hidden until you accept the SwingSet Code of Conduct.
            </Text>
            <TouchableOpacity
              style={s.saveVaultBtn}
              onPress={() => router.push('/swingset-gate' as any)}
            >
              <ShieldCheck size={15} color="#FFF" />
              <Text style={s.saveVaultBtnText}>Open SwingSet Gate</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.cardHeader}>SWINGSET • PARTNER LINK & PLAY MODE</Text>
            <Text style={[s.statusBadge, s.statusLinked]}>Gate Accepted</Text>
          </View>
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
        )}

        {/* Private Matchmaking Card */}
        <View style={s.card}>
          <View style={s.rowGap}>
            <ShieldCheck size={16} color={Colors.accent.copper} />
            <Text style={s.cardHeader}>PRIVATE BOUNDARIES & MATCHMAKING</Text>
          </View>
          <Text style={s.sectionLabel}>Interested In:</Text>
          <View style={s.chipWrap}>
            {profile.identity.interestedIn?.length > 0 ? (
              profile.identity.interestedIn.map((item) => (
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

        {/* Onboarding & Session Actions */}
        <View style={s.actionsGroup}>
          <TouchableOpacity style={s.primaryBtn} onPress={handleReOpenOnboarding}>
            <Sparkles size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={s.btnText}>Edit Onboarding Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.lockBannerBtn} onPress={handleLockSession}>
            <Lock size={18} color={Colors.accent.crimson} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={s.lockBannerTitle}>Sign Out of Session</Text>
              <Text style={s.lockBannerSub}>Your static profile & Little Black Book remain saved in Supabase</Text>
            </View>
            <LogOut size={18} color={Colors.accent.crimson} />
          </TouchableOpacity>

          <TouchableOpacity style={s.resetBtn} onPress={handleResetAll}>
            <RefreshCw size={16} color={Colors.accent.crimson} style={{ marginRight: 6 }} />
            <Text style={s.resetBtnText}>Re-Run Onboarding Wizard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: 140 },
  welcomeCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  avatarBadge: { width: 48, height: 48, borderRadius: BorderRadius.full, backgroundColor: '#231B18', borderWidth: 1, borderColor: Colors.accent.copper, justifyContent: 'center', alignItems: 'center' },
  welcomeTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, marginRight: 8 },
  ssoSubText: { fontSize: 11, color: Colors.text.secondary, marginBottom: 2 },
  inlineNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  inlineEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nameInput: { flex: 1, backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4, color: Colors.text.primary, fontSize: 16, fontWeight: '700' },
  saveIconBtn: { backgroundColor: 'rgba(46, 175, 125, 0.2)', borderRadius: BorderRadius.sm, padding: 6 },
  badgeTag: { alignSelf: 'flex-start', backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTagText: { color: Colors.accent.copper, fontSize: 11, fontWeight: '700' },
  tierBadgeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderColor: Colors.accent.emerald, backgroundColor: 'rgba(46, 175, 125, 0.15)' },
  tierBadgeText: { color: Colors.accent.emerald, fontSize: 11, fontWeight: '800' },
  lockBannerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217, 56, 58, 0.12)', borderWidth: 1, borderColor: Colors.accent.crimson, borderRadius: BorderRadius.md, padding: Spacing.md },
  lockBannerTitle: { fontSize: 14, fontWeight: '800', color: Colors.accent.crimson },
  lockBannerSub: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  card: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { fontSize: 11, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 1 },
  vaultDesc: { fontSize: 11, color: Colors.text.secondary, marginTop: 4, marginBottom: 10, lineHeight: 16 },
  vaultFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  vaultInput: { flex: 1, color: Colors.text.primary, fontSize: 13, fontWeight: '600' },
  saveVaultBtn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  saveVaultBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  tierCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 10 },
  tierCardActive: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  tierTitle: { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  tierSub: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  promptItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  promptLabel: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
  promptVal: { fontSize: 13, color: Colors.text.primary, flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
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
  msgOk: { color: Colors.accent.emerald, fontSize: 11, fontWeight: '700', marginTop: 6 },
  msgErr: { color: Colors.accent.crimson, fontSize: 11, fontWeight: '700', marginTop: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.text.primary, marginTop: 8, marginBottom: 4 },
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
