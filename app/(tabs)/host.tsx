import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarPlus, KeyRound, Radio, Sparkles, Trash2 } from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/src/lib/supabase';

export default function HostDeckScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [joinInviteCode, setJoinInviteCode] = useState('');

  const loadHostedEvents = async () => {
    setLoading(true);
    let { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      const { data: anonData } = await supabase.auth.signInAnonymously();
      sessionData = { session: anonData.session };
    }

    const uid = sessionData.session?.user?.id;
    if (uid) {
      const { data } = await supabase
        .from('events')
        .select('id, title, invite_code, checkin_pin_6, status')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
      setMyEvents(data || []);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadHostedEvents();
    }, [])
  );

  const handleDeleteEvent = (ev: any) => {
    Alert.alert(
      'Delete Event?',
      `Permanently delete "${ev.title}"? This removes the event, timeline, and check-ins.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('events').delete().eq('id', ev.id);
            if (error) {
              Alert.alert('Delete Failed', error.message);
              return;
            }
            setMyEvents((prev) => prev.filter((item) => item.id !== ev.id));
          },
        },
      ]
    );
  };

  const handleJoinByInvite = async () => {
    const code = joinInviteCode.trim().toUpperCase();
    if (!code) return;

    const { data: ev, error } = await supabase
      .from('events')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();

    if (error || !ev) {
      Alert.alert('Invalid Invite Code', 'No active SwingSet event found with that code.');
      return;
    }

    router.push(`/event/${ev.id}/checkin` as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.hostHeader}>
          <Radio size={20} color={Colors.accent.copper} />
          <View style={{ flex: 1 }}>
            <Text style={s.hostTitle}>SWINGSET EVENT STUDIO</Text>
            <Text style={s.hostSub}>Create timeline events & run live Catalyst rounds</Text>
          </View>
        </View>

        {/* Create Real Supabase Event */}
        <Pressable style={s.createBtn} onPress={() => router.push('/host/create' as any)}>
          <CalendarPlus size={18} color="#FFFFFF" />
          <Text style={s.createBtnText}>Create New Event Timeline</Text>
        </Pressable>

        {/* My Hosted Events */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>My Hosted Events</Text>
          {loading ? (
            <ActivityIndicator color={Colors.accent.copper} style={{ marginVertical: 16 }} />
          ) : myEvents.length === 0 ? (
            <View style={s.emptyCard}>
              <Sparkles size={18} color={Colors.accent.copper} />
              <Text style={s.emptyText}>
                No hosted events yet. Tap "Create New Event Timeline" above to generate a Door PIN and launch the live studio.
              </Text>
            </View>
          ) : (
            myEvents.map((ev) => (
              <Pressable
                key={ev.id}
                style={s.eventCard}
                onPress={() => router.push(`/event/${ev.id}` as any)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.eventTitle}>{ev.title}</Text>
                  <Text style={s.eventMeta}>
                    Invite: <Text style={s.codeHighlight}>{ev.invite_code}</Text> • Door PIN:{' '}
                    <Text style={s.codeHighlight}>{ev.checkin_pin_6}</Text>
                  </Text>
                </View>
                <Text style={s.launchText}>Open Studio →</Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(ev);
                  }}
                  style={s.deleteIconBtn}
                  hitSlop={8}
                >
                  <Trash2 size={16} color={Colors.accent.crimson} />
                </Pressable>
              </Pressable>
            ))
          )}
        </View>

        {/* Attendee Quick Join by Invite Code */}
        <View style={s.card}>
          <View style={s.rowHeader}>
            <KeyRound size={16} color={Colors.accent.copper} />
            <Text style={s.cardTitle}>Join Event by Invite Code</Text>
          </View>
          <TextInput
            style={s.input}
            value={joinInviteCode}
            onChangeText={(t) => setJoinInviteCode(t.toUpperCase())}
            placeholder="Enter 6-char Invite Code"
            placeholderTextColor={Colors.text.muted}
            autoCapitalize="characters"
            maxLength={8}
          />
          <Pressable style={s.joinBtn} onPress={handleJoinByInvite}>
            <Text style={s.joinBtnText}>Proceed to Event Door Check-In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: 140, gap: Spacing.md },
  hostHeader: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hostTitle: { fontSize: 13, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 0.5 },
  hostSub: { fontSize: 11, color: Colors.text.secondary },
  createBtn: {
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createBtnText: { color: Colors.text.primary, fontWeight: '800', fontSize: 15 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { color: Colors.text.secondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  eventCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventTitle: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  eventMeta: { fontSize: 12, color: Colors.text.secondary, marginTop: 3 },
  codeHighlight: { color: Colors.accent.copper, fontWeight: '800' },
  launchText: { color: Colors.accent.emerald, fontWeight: '800', fontSize: 13 },
  deleteIconBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
    marginLeft: 6,
  },
  card: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  input: {
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 14,
  },
  joinBtn: {
    backgroundColor: '#231B18',
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  joinBtnText: { color: Colors.accent.copper, fontWeight: '800', fontSize: 13 },
});
