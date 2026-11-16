import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, KeyRound } from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/src/lib/supabase';
import { GenderType, InterestedInType } from '@/src/types/swingset';

const GENDER_OPTIONS: { label: string; value: GenderType }[] = [
  { label: 'Man', value: 'man' },
  { label: 'Woman', value: 'woman' },
  { label: 'Non-Binary', value: 'non_binary' },
];

const MATCH_OPTIONS: { label: string; value: InterestedInType }[] = [
  { label: 'Women', value: 'women' },
  { label: 'Men', value: 'men' },
  { label: 'Couples', value: 'couples' },
  { label: 'Everyone', value: 'everyone' },
];

export default function EventCheckinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = params.id;
  const { profile } = useUser();

  const [doorPin, setDoorPin] = useState('');
  const [displayName, setDisplayName] = useState(() => profile.identity.displayName || '');
  const [gender, setGender] = useState<GenderType>(() => profile.identity.gender || 'man');
  const [interestedIn, setInterestedIn] = useState<InterestedInType[]>(
    () => profile.identity.interestedIn || ['everyone']
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleInterestedIn = (item: InterestedInType) => {
    if (item === 'everyone') {
      setInterestedIn(['everyone']);
      return;
    }
    const filtered = interestedIn.filter((i) => i !== 'everyone');
    if (filtered.includes(item)) {
      const next = filtered.filter((i) => i !== item);
      setInterestedIn(next.length === 0 ? ['everyone'] : next);
    } else {
      setInterestedIn([...filtered, item]);
    }
  };

  const handleCheckIn = async () => {
    if (!displayName.trim()) return setErrorMsg('Please enter your display name.');
    if (!doorPin.trim()) return setErrorMsg('Please enter the 6-digit door PIN.');

    setLoading(true);
    setErrorMsg('');

    try {
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .select('id, checkin_pin_6, title')
        .eq('id', eventId)
        .single();

      if (evErr || !ev) {
        setLoading(false);
        return setErrorMsg('Event not found.');
      }

      if (ev.checkin_pin_6 !== doorPin.trim()) {
        setLoading(false);
        return setErrorMsg('Incorrect Door PIN.');
      }

      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data: anonData } = await supabase.auth.signInAnonymously();
        sessionData = { session: anonData.session };
      }
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        setLoading(false);
        return setErrorMsg('Auth session error.');
      }

      const { error: attErr } = await supabase.from('event_attendees').upsert(
        {
          event_id: eventId,
          user_id: uid,
          display_name: displayName.trim(),
          bucket_type: 'single',
          gender,
          interested_in: interestedIn,
          is_checked_in: true,
          checked_in_at: new Date().toISOString(),
          shared_field_keys: ['phone', 'instagram'],
        },
        { onConflict: 'event_id,user_id' }
      );

      if (attErr) {
        setLoading(false);
        return setErrorMsg(attErr.message || 'Check-in failed.');
      }

      setLoading(false);
      Alert.alert('Checked In!', 'Welcome to SwingSet!');
      router.replace(`/(tabs)` as any);
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e.message || 'Check-in error.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.headerBox}>
          <KeyRound size={22} color={Colors.accent.copper} />
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>SWINGSET EVENT CHECK-IN</Text>
            <Text style={s.headerSub}>Verify Door PIN & Match Preferences</Text>
          </View>
        </View>

        {errorMsg ? (
          <View style={s.errBox}>
            <Text style={s.errText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.cardTitle}>Event Door PIN *</Text>
          <TextInput
            style={s.pinInput}
            value={doorPin}
            onChangeText={setDoorPin}
            placeholder="6-digit PIN"
            placeholderTextColor={Colors.text.muted}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Display Name *</Text>
          <TextInput
            style={s.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Alex_Vibe"
            placeholderTextColor={Colors.text.muted}
          />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Your Individual Gender *</Text>
          <View style={s.chipGrid}>
            {GENDER_OPTIONS.map((item) => {
              const sel = gender === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[s.chipCard, sel && s.chipCardSel]}
                  onPress={() => setGender(item.value)}
                >
                  <Text style={[s.chipCardText, sel && s.chipCardTextSel]}>{item.label}</Text>
                  {sel && <Check size={14} color={Colors.accent.copper} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Open to Matching With *</Text>
          <View style={s.chipGrid}>
            {MATCH_OPTIONS.map((item) => {
              const sel = interestedIn.includes(item.value);
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[s.chipCard, sel && s.chipCardSel]}
                  onPress={() => toggleInterestedIn(item.value)}
                >
                  <Text style={[s.chipCardText, sel && s.chipCardTextSel]}>{item.label}</Text>
                  {sel && <Check size={14} color={Colors.accent.copper} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={handleCheckIn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.submitBtnText}>Complete Check-In & Enter Event Hub</Text>
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
  headerTitle: { fontSize: 13, fontWeight: '800', color: Colors.accent.copper },
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
    gap: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: '800', color: Colors.text.primary, textTransform: 'uppercase' },
  pinInput: {
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent.copper,
    textAlign: 'center',
  },
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
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipCard: {
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipCardSel: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  chipCardText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  chipCardTextSel: { color: Colors.accent.copper, fontWeight: '700' },
  submitBtn: {
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: Colors.text.primary, fontWeight: '800', fontSize: 15 },
});