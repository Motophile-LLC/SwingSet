import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/src/lib/supabase';

function generateRandomPin6(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

export default function HostCreateEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dressCode, setDressCode] = useState('Rugged Refined');
  const [doorPin, setDoorPin] = useState(generateRandomPin6);
  const [inviteCode, setInviteCode] = useState(generateInviteCode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateEvent = async () => {
    if (!title.trim()) return setErrorMsg('Please enter an event title.');
    if (doorPin.trim().length !== 6) return setErrorMsg('Door PIN must be 6 digits.');

    setLoading(true);
    setErrorMsg('');

    try {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        setLoading(false);
        return setErrorMsg('Missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY in .env (restart Expo with -c).');
      }

      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
        if (anonErr) {
          setLoading(false);
          return setErrorMsg(`Supabase Auth Error: ${anonErr.message}`);
        }
        sessionData = { session: anonData.session };
      }
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        setLoading(false);
        return setErrorMsg('Auth session error: no user ID returned.');
      }

      await supabase.from('profiles').upsert(
        { id: uid, default_display_name: 'Host User', bucket_type: 'single' },
        { onConflict: 'id', ignoreDuplicates: true }
      );

      const startsAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();

      const { data: newEv, error: evErr } = await supabase
        .from('events')
        .insert({
          owner_id: uid,
          title: title.trim(),
          description: description.trim() || 'SwingSet Social Event',
          dress_code: dressCode.trim(),
          status: 'active',
          invite_code: inviteCode.trim().toUpperCase(),
          checkin_pin_6: doorPin.trim(),
          starts_at: startsAt,
          ends_at: endsAt,
        })
        .select()
        .single();

      if (evErr || !newEv) {
        setLoading(false);
        return setErrorMsg(evErr?.message || 'Failed to create event.');
      }

      await supabase.from('timeline_blocks').insert([
        {
          event_id: newEv.id,
          sort_order: 1,
          type: 'activity',
          state: 'planned',
          title: 'Round 1: Fuse & Spark Scramble',
          target_bucket: 'everyone',
          duration_minutes: 15,
          config: {
            skin_id: 'fuse_spark',
            scramble_min_sec: 30,
            scramble_max_sec: 60,
            mingle_duration_sec: 180,
          },
        },
      ]);

      setLoading(false);
      Alert.alert('Event Created!', `Invite Code: ${newEv.invite_code} | Door PIN: ${newEv.checkin_pin_6}`);
      router.replace(`/event/${newEv.id}` as any);
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e.message || 'Error creating event.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.headerBox}>
          <CalendarPlus size={22} color={Colors.accent.copper} />
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>CREATE EVENT TIMELINE</Text>
            <Text style={s.headerSub}>Generate door PIN and invite code for attendees</Text>
          </View>
        </View>

        {errorMsg ? (
          <View style={s.errBox}>
            <Text style={s.errText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.label}>Event Title *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Saturday Night Social Crawl"
            placeholderTextColor={Colors.text.muted}
          />
        </View>

        <View style={s.card}>
          <Text style={s.label}>Event Description</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Invite-only social event in downtown"
            placeholderTextColor={Colors.text.muted}
          />
        </View>

        <View style={s.rowCards}>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.label}>Door PIN (6 digits) *</Text>
            <TextInput
              style={s.pinInput}
              value={doorPin}
              onChangeText={setDoorPin}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.label}>Invite Code *</Text>
            <TextInput
              style={s.pinInput}
              value={inviteCode}
              onChangeText={(v) => setInviteCode(v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
            />
          </View>
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={handleCreateEvent} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.submitBtnText}>Create Event & Launch Studio</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
  headerBox: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { fontSize: 13, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 0.5 },
  headerSub: { fontSize: 11, color: Colors.text.secondary },
  errBox: {
    backgroundColor: 'rgba(217, 56, 58, 0.15)',
    borderColor: Colors.accent.crimson,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 10,
  },
  errText: { color: Colors.accent.crimson, fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 6,
  },
  rowCards: { flexDirection: 'row', gap: Spacing.md },
  label: { fontSize: 11, fontWeight: '800', color: Colors.text.primary, textTransform: 'uppercase' },
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
  pinInput: {
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.accent.copper,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: Colors.text.primary, fontWeight: '800', fontSize: 15 },
});