import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowRight,
  CalendarPlus,
  Compass,
  QrCode,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/src/lib/supabase';

interface ActiveEventSummary {
  id: string;
  title: string;
  invite_code: string;
  category?: string | null;
  venue_name?: string | null;
  role: 'Host' | 'Checked In';
}

export default function PlayHubScreen() {
  const router = useRouter();
  const { profile } = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeEvents, setActiveEvents] = useState<ActiveEventSummary[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const loadMyActiveEvents = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id || profile.userId;
      if (!uid) {
        setActiveEvents([]);
        setLoading(false);
        return;
      }

      const [hostedRes, attendedRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, invite_code, category, venue_name')
          .eq('owner_id', uid)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('event_attendees')
          .select('event_id, events!inner(id, title, invite_code, status, category, venue_name)')
          .eq('user_id', uid)
          .eq('is_removed', false)
          .eq('is_checked_in', true),
      ]);

      const map = new Map<string, ActiveEventSummary>();

      (hostedRes.data || []).forEach((ev: any) => {
        map.set(ev.id, {
          id: ev.id,
          title: ev.title,
          invite_code: ev.invite_code,
          category: ev.category,
          venue_name: ev.venue_name,
          role: 'Host',
        });
      });

      (attendedRes.data || []).forEach((row: any) => {
        const ev = row.events;
        if (ev && ev.status === 'active' && !map.has(ev.id)) {
          map.set(ev.id, {
            id: ev.id,
            title: ev.title,
            invite_code: ev.invite_code,
            category: ev.category,
            venue_name: ev.venue_name,
            role: 'Checked In',
          });
        }
      });

      setActiveEvents(Array.from(map.values()));
    } catch {
      setActiveEvents([]);
    } finally {
      setLoading(false);
    }
  }, [profile.userId]);

  useFocusEffect(
    useCallback(() => {
      loadMyActiveEvents();
    }, [loadMyActiveEvents])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMyActiveEvents();
    setRefreshing(false);
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError('Enter an Invite Code or 6-digit Door PIN.');
      return;
    }

    setJoinError('');
    setJoining(true);

    try {
      const { data: ev } = await supabase
        .from('events')
        .select('id')
        .or(`invite_code.eq.${code},checkin_pin_6.eq.${code}`)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      setJoining(false);
      if (!ev) {
        setJoinError('No active event found for that code or PIN.');
        return;
      }

      setJoinCode('');
      router.push(`/event/${ev.id}/checkin` as any);
    } catch {
      setJoining(false);
      setJoinError('Could not look up that event code right now.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent.copper}
          />
        }
      >
        {/* Welcome / Status Card */}
        <View style={s.heroCard}>
          <View style={s.heroRow}>
            <Zap size={20} color={Colors.accent.copper} />
            <Text style={s.heroTitle}>
              {activeEvents.length > 0 ? 'Your Active Event Room' : 'Not Checked Into an Event Yet'}
            </Text>
          </View>
          <Text style={s.heroSub}>
            {activeEvents.length > 0
              ? 'Tap below to jump back into your live event room, games, and Trivia.'
              : 'Games and live rooms unlock after you check in at an event with a Door PIN, Invite Code, or NFC/QR tap.'}
          </Text>
        </View>

        {/* Active Checked-In / Hosted Events */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={Colors.accent.copper} />
          </View>
        ) : activeEvents.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>ACTIVE EVENTS</Text>
            {activeEvents.map((ev) => (
              <TouchableOpacity
                key={ev.id}
                style={s.activeEventCard}
                onPress={() => router.push(`/event/${ev.id}` as any)}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={s.roleRow}>
                    <Radio size={13} color={Colors.accent.emerald} />
                    <Text style={s.roleText}>
                      {ev.role.toUpperCase()} • {ev.category || 'EVENT'}
                    </Text>
                  </View>
                  <Text style={s.eventTitle}>{ev.title}</Text>
                  <Text style={s.eventMeta}>
                    {ev.venue_name ? `${ev.venue_name} • ` : ''}Code: {ev.invite_code}
                  </Text>
                </View>
                <View style={s.enterBadge}>
                  <Text style={s.enterBadgeText}>Enter</Text>
                  <ArrowRight size={14} color="#FFF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Check-In with Code / PIN */}
        <View style={s.card}>
          <View style={s.rowGap}>
            <QrCode size={17} color={Colors.accent.copper} />
            <Text style={s.cardTitle}>CHECK IN WITH EVENT CODE OR DOOR PIN</Text>
          </View>
          <Text style={s.cardDesc}>
            At a venue or have a private invite? Enter the 6-character code or PIN to check in and unlock the live room.
          </Text>
          <View style={s.joinRow}>
            <TextInput
              style={s.codeInput}
              value={joinCode}
              onChangeText={(v) => {
                setJoinCode(v.toUpperCase());
                setJoinError('');
              }}
              placeholder="e.g. A7K9P2 or 482910"
              placeholderTextColor={Colors.text.muted}
              autoCapitalize="characters"
              maxLength={8}
            />
            <TouchableOpacity
              style={s.joinBtn}
              onPress={handleJoinByCode}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={s.joinBtnText}>Check In</Text>
              )}
            </TouchableOpacity>
          </View>
          {joinError ? <Text style={s.errText}>{joinError}</Text> : null}
        </View>

        {/* Quick Actions: Nearby & Host */}
        <TouchableOpacity
          style={s.actionCard}
          onPress={() => router.push('/(tabs)/locations' as any)}
        >
          <Compass size={20} color={Colors.accent.copper} />
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>Find Public Events Nearby</Text>
            <Text style={s.actionSub}>
              See Trivia Nights, Social Mixers, and local events happening near you.
            </Text>
          </View>
          <ArrowRight size={16} color={Colors.accent.copper} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.actionCard}
          onPress={() => router.push('/host/create' as any)}
        >
          <CalendarPlus size={20} color={Colors.accent.emerald} />
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>Host an Event</Text>
            <Text style={s.actionSub}>
              Create a Public (Nearby) or Private event and launch your host studio.
            </Text>
          </View>
          <ArrowRight size={16} color={Colors.accent.emerald} />
        </TouchableOpacity>

        <View style={s.footerNote}>
          <Sparkles size={14} color={Colors.text.muted} />
          <Text style={s.footerText}>
            Games, live timers, and tap connections only run inside an event after check-in.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
  heroCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 6,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, flex: 1 },
  heroSub: { fontSize: 13, color: Colors.text.secondary, lineHeight: 18 },
  loadingBox: { paddingVertical: 20, alignItems: 'center' },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text.copper,
    letterSpacing: 0.6,
  },
  activeEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.accent.emerald,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  roleText: { fontSize: 10, fontWeight: '800', color: Colors.accent.emerald, letterSpacing: 0.5 },
  eventTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  eventMeta: { fontSize: 12, color: Colors.text.secondary },
  enterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent.copper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  enterBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  card: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 8,
  },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 12, fontWeight: '800', color: Colors.text.primary, letterSpacing: 0.4 },
  cardDesc: { fontSize: 12, color: Colors.text.secondary, lineHeight: 17 },
  joinRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  joinBtn: {
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  errText: { color: Colors.accent.crimson, fontSize: 12, fontWeight: '700' },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  actionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  actionSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 6,
  },
  footerText: { fontSize: 11, color: Colors.text.muted },
});
