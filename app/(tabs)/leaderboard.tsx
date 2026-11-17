import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  BookUser,
  Check,
  Clock,
  Crown,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/src/lib/supabase';
import { ContactExchangeService } from '@/src/services/contactExchangeService';
import { TapTonightRecord, UnlockedContactPayload } from '@/src/types/swingset';

export default function LittleBlackBookScreen() {
  const router = useRouter();
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState<'mutual' | 'taps'>('mutual');
  const [loading, setLoading] = useState(true);
  const [allTaps, setAllTaps] = useState<TapTonightRecord[]>([]);
  const [mutualContacts, setMutualContacts] = useState<UnlockedContactPayload[]>([]);
  const [statusBanner, setStatusBanner] = useState('');

  const exchangeService = useMemo(() => new ContactExchangeService(supabase), []);

  const loadLittleBlackBook = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id || profile.userId;

    if (!uid) {
      setLoading(false);
      return;
    }

    const [tapsHistory, permanentContacts] = await Promise.all([
      exchangeService.getTapsHistory(uid),
      exchangeService.getPermanentAddressBook(uid),
    ]);

    setAllTaps(tapsHistory);
    setMutualContacts(permanentContacts);
    setLoading(false);
  }, [exchangeService, profile.userId]);

  useFocusEffect(
    useCallback(() => {
      if (profile.swingsetOptedIn) {
        loadLittleBlackBook();
      }
    }, [loadLittleBlackBook, profile.swingsetOptedIn])
  );

  const handleRequestContact = async (item: TapTonightRecord) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id || profile.userId;
    if (!uid) return;

    const { error } = await exchangeService.requestContactExchange({
      eventId: item.event_id,
      requesterUserId: uid,
      recipientUserId: item.partner_user_id,
    });

    if (error) {
      setStatusBanner(`Could not send request: ${error}`);
    } else {
      setStatusBanner(`Contact request sent to ${item.partner_display_name}!`);
      await loadLittleBlackBook();
    }
  };

  const handleRespondToRequest = async (exchangeId: string, accept: boolean, name: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id || profile.userId;
    if (!uid) return;

    const { error } = await exchangeService.respondToContactExchange({
      exchangeId,
      recipientUserId: uid,
      accept,
    });

    if (error) {
      setStatusBanner(`Error: ${error}`);
    } else {
      setStatusBanner(
        accept
          ? `Mutual Contact Unlocked with ${name}! Added to your Little Black Book.`
          : `Request from ${name} declined.`
      );
      await loadLittleBlackBook();
    }
  };

  const incomingCount = allTaps.filter((t) => t.exchange_status === 'incoming_pending').length;

  if (!profile.swingsetOptedIn) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.gateWrap}>
          <View style={s.gateCard}>
            <View style={s.gateIconCircle}>
              <Lock size={26} color={Colors.accent.crimson} />
            </View>
            <Text style={s.gateTitle}>Little Black Book Is Inside SwingSet</Text>
            <Text style={s.gateDesc}>
              Your private mutual-contact vault and tap connections are isolated inside the SwingSet Lifestyle space. Accept the SwingSet Code of Conduct to unlock access.
            </Text>
            <TouchableOpacity
              style={s.gateBtn}
              onPress={() => router.push('/swingset-gate' as any)}
            >
              <ShieldCheck size={17} color="#FFFFFF" />
              <Text style={s.gateBtnText}>Open SwingSet Gate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header Card */}
        <View style={s.headerCard}>
          <View style={s.headerTopRow}>
            <View style={s.iconCircle}>
              <BookUser size={22} color={Colors.accent.copper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>MY LITTLE BLACK BOOK</Text>
              <Text style={s.headerSub}>
                Zero public directory • Only people you tapped in a game appear here
              </Text>
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={loadLittleBlackBook}>
              <RefreshCw size={16} color={Colors.accent.copper} />
            </TouchableOpacity>
          </View>

          <View style={s.tierRow}>
            <Crown size={14} color={Colors.accent.copper} />
            <Text style={s.tierText}>
              Account Tier: {(profile.membership.tier || 'free').toUpperCase()} • All-Time History Saved
            </Text>
          </View>
        </View>

        {statusBanner ? (
          <View style={s.bannerBox}>
            <Sparkles size={16} color={Colors.accent.emerald} />
            <Text style={s.bannerText}>{statusBanner}</Text>
            <TouchableOpacity onPress={() => setStatusBanner('')}>
              <X size={16} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Two-Tab Selector */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'mutual' && s.tabBtnActive]}
            onPress={() => setActiveTab('mutual')}
          >
            <UserCheck
              size={15}
              color={activeTab === 'mutual' ? Colors.accent.copper : Colors.text.secondary}
            />
            <Text style={[s.tabBtnText, activeTab === 'mutual' && s.tabBtnTextActive]}>
              Mutual Contacts ({mutualContacts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'taps' && s.tabBtnActive]}
            onPress={() => setActiveTab('taps')}
          >
            <Users
              size={15}
              color={activeTab === 'taps' ? Colors.accent.copper : Colors.text.secondary}
            />
            <Text style={[s.tabBtnText, activeTab === 'taps' && s.tabBtnTextActive]}>
              All-Time Tapped ({allTaps.length})
              {incomingCount > 0 ? ` • ${incomingCount} New` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.accent.copper} style={{ marginTop: 36 }} />
        ) : activeTab === 'mutual' ? (
          <View style={s.section}>
            {mutualContacts.length === 0 ? (
              <View style={s.emptyCard}>
                <ShieldCheck size={28} color={Colors.accent.copper} />
                <Text style={s.emptyTitle}>No Mutual Contacts Unlocked Yet</Text>
                <Text style={s.emptySub}>
                  Switch to "All-Time Tapped" to request contact exchange with anyone you have tapped in a game. Once both sides accept, their phone, email, Instagram, and SLS stay unlocked here permanently.
                </Text>
              </View>
            ) : (
              mutualContacts.map((contact, idx) => (
                <View key={`${contact.partner_user_id || idx}`} style={s.contactCard}>
                  <View style={s.contactHeader}>
                    <View style={s.avatarSmall}>
                      <Text style={s.avatarInitial}>
                        {(contact.display_name || 'G').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.contactName}>{contact.display_name}</Text>
                      <Text style={s.contactEvent}>
                        Met at {contact.event_title || 'SwingSet Event'}
                      </Text>
                    </View>
                    <View style={s.unlockedBadge}>
                      <Check size={12} color={Colors.accent.emerald} />
                      <Text style={s.unlockedBadgeText}>MUTUAL</Text>
                    </View>
                  </View>

                  {contact.bio_tagline ? (
                    <Text style={s.taglineText}>{contact.bio_tagline}</Text>
                  ) : null}

                  <View style={s.vaultList}>
                    {contact.phone ? (
                      <View style={s.vaultRow}>
                        <Phone size={14} color={Colors.accent.copper} />
                        <Text style={s.vaultLabel}>Phone:</Text>
                        <Text style={s.vaultVal}>{contact.phone}</Text>
                      </View>
                    ) : null}
                    {contact.email ? (
                      <View style={s.vaultRow}>
                        <Mail size={14} color={Colors.accent.copper} />
                        <Text style={s.vaultLabel}>Email:</Text>
                        <Text style={s.vaultVal}>{contact.email}</Text>
                      </View>
                    ) : null}
                    {contact.instagram ? (
                      <View style={s.vaultRow}>
                        <Sparkles size={14} color={Colors.accent.copper} />
                        <Text style={s.vaultLabel}>Instagram:</Text>
                        <Text style={s.vaultVal}>{contact.instagram}</Text>
                      </View>
                    ) : null}
                    {contact.sls ? (
                      <View style={s.vaultRow}>
                        <ShieldCheck size={14} color={Colors.accent.copper} />
                        <Text style={s.vaultLabel}>SLS:</Text>
                        <Text style={s.vaultVal}>{contact.sls}</Text>
                      </View>
                    ) : null}
                    {contact.club_account ? (
                      <View style={s.vaultRow}>
                        <Crown size={14} color={Colors.accent.copper} />
                        <Text style={s.vaultLabel}>Club:</Text>
                        <Text style={s.vaultVal}>{contact.club_account}</Text>
                      </View>
                    ) : null}
                    {(contact.custom_fields || []).map((cf, cIdx) => (
                      <View key={cIdx} style={s.vaultRow}>
                        <Sparkles size={14} color={Colors.accent.copper} />
                        <Text style={s.vaultLabel}>{cf.label}:</Text>
                        <Text style={s.vaultVal}>{cf.value}</Text>
                      </View>
                    ))}
                    {!contact.phone &&
                    !contact.email &&
                    !contact.instagram &&
                    !contact.sls &&
                    !contact.club_account &&
                    (!contact.custom_fields || contact.custom_fields.length === 0) ? (
                      <Text style={s.noVaultHint}>
                        Connected! They haven't added phone/socials to their Contact Vault yet.
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={s.section}>
            {allTaps.length === 0 ? (
              <View style={s.emptyCard}>
                <Users size={28} color={Colors.accent.copper} />
                <Text style={s.emptyTitle}>No Game Taps Logged Yet</Text>
                <Text style={s.emptySub}>
                  Whenever you tap badges or enter a 3-character tap code with someone in an event game, they are permanently added to your all-time Tapped list here so you can request contact anytime.
                </Text>
              </View>
            ) : (
              allTaps.map((item) => (
                <View key={item.tap_id} style={s.tapCard}>
                  <View style={s.contactHeader}>
                    <View style={s.avatarSmall}>
                      <Text style={s.avatarInitial}>
                        {(item.partner_display_name || 'G').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.contactName}>{item.partner_display_name}</Text>
                      <Text style={s.contactEvent}>
                        {item.event_title} • {item.interaction_context}
                      </Text>
                      <Text style={s.tapDate}>
                        Tapped {new Date(item.tapped_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {item.exchange_status === 'accepted' ? (
                    <TouchableOpacity
                      style={s.acceptedPill}
                      onPress={() => setActiveTab('mutual')}
                    >
                      <Check size={14} color={Colors.accent.emerald} />
                      <Text style={s.acceptedPillText}>
                        Mutual Contact Unlocked — View in Mutual Contacts
                      </Text>
                    </TouchableOpacity>
                  ) : item.exchange_status === 'pending' ? (
                    <View style={s.pendingPill}>
                      <Clock size={14} color={Colors.accent.copper} />
                      <Text style={s.pendingPillText}>
                        Contact Request Sent • Waiting for {item.partner_display_name}
                      </Text>
                    </View>
                  ) : item.exchange_status === 'incoming_pending' && item.exchange_id ? (
                    <View style={s.incomingBox}>
                      <Text style={s.incomingTitle}>
                        {item.partner_display_name} wants to mutually exchange contact info!
                      </Text>
                      <View style={s.incomingBtns}>
                        <TouchableOpacity
                          style={s.acceptBtn}
                          onPress={() =>
                            handleRespondToRequest(
                              item.exchange_id!,
                              true,
                              item.partner_display_name
                            )
                          }
                        >
                          <Check size={14} color="#FFF" />
                          <Text style={s.acceptBtnText}>Accept & Unlock</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.declineBtn}
                          onPress={() =>
                            handleRespondToRequest(
                              item.exchange_id!,
                              false,
                              item.partner_display_name
                            )
                          }
                        >
                          <X size={14} color={Colors.accent.crimson} />
                          <Text style={s.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.requestBtn}
                      onPress={() => handleRequestContact(item)}
                    >
                      <Send size={14} color="#FFF" />
                      <Text style={s.requestBtnText}>Request Mutual Contact Exchange</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  headerCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 10,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#231B18',
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 0.5 },
  headerSub: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  refreshBtn: {
    padding: 8,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200, 109, 81, 0.12)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tierText: { fontSize: 11, fontWeight: '700', color: Colors.accent.copper },
  bannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(46, 175, 125, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accent.emerald,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.md,
  },
  bannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.accent.emerald },
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
  },
  tabBtnActive: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  tabBtnTextActive: { color: Colors.accent.copper, fontWeight: '800' },
  section: { gap: 10 },
  emptyCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  emptySub: { fontSize: 12, color: Colors.text.secondary, textAlign: 'center', lineHeight: 18 },
  contactCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  tapCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  contactHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#231B18',
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 16, fontWeight: '800', color: Colors.accent.copper },
  contactName: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  contactEvent: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  tapDate: { fontSize: 10, color: Colors.text.muted, marginTop: 2 },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 175, 125, 0.18)',
    borderWidth: 1,
    borderColor: Colors.accent.emerald,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unlockedBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.accent.emerald },
  taglineText: { fontSize: 12, color: Colors.text.secondary, fontStyle: 'italic' },
  vaultList: {
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: 10,
    gap: 6,
  },
  vaultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vaultLabel: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, width: 72 },
  vaultVal: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  noVaultHint: { fontSize: 11, color: Colors.text.muted, fontStyle: 'italic' },
  acceptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 175, 125, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accent.emerald,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
  },
  acceptedPillText: { fontSize: 12, fontWeight: '800', color: Colors.accent.emerald },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
  },
  pendingPillText: { fontSize: 12, fontWeight: '700', color: Colors.accent.copper },
  incomingBox: {
    backgroundColor: 'rgba(200, 109, 81, 0.14)',
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    padding: 10,
    gap: 8,
  },
  incomingTitle: { fontSize: 12, fontWeight: '800', color: Colors.text.primary },
  incomingBtns: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent.emerald,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
  },
  acceptBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 56, 58, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accent.crimson,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  declineBtnText: { fontSize: 12, fontWeight: '800', color: Colors.accent.crimson },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 11,
  },
  requestBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  gateWrap: { flex: 1, justifyContent: 'center', padding: Spacing.md },
  gateCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.accent.crimson,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 12,
  },
  gateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 92, 122, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
  gateDesc: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center', lineHeight: 19 },
  gateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    marginTop: 4,
  },
  gateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
