import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  CalendarPlus,
  Globe,
  Lock,
  MapPin,
  Layers,
  Trophy,
  ShieldAlert,
} from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { EVENT_CATEGORIES, EventCategory } from '@/app/(tabs)/locations';

const CREATE_CATEGORIES = EVENT_CATEGORIES.filter((c): c is EventCategory => c !== 'All');

type HostTierChoice = 'tier_1' | 'tier_2';

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

  // Step 1: Public vs. Private
  const [isPublic, setIsPublic] = useState<boolean>(false);
  // Step 2: Category / Vibe
  const [category, setCategory] = useState<EventCategory>('Social Mixer');
  // Step 3: Host Tier & Location Planner
  const [hostTier, setHostTier] = useState<HostTierChoice>('tier_1');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  // Step 4: Details & Codes
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dressCode, setDressCode] = useState('Smart Casual');
  const [doorPin, setDoorPin] = useState(generateRandomPin6);
  const [inviteCode, setInviteCode] = useState(generateInviteCode);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isLifestyle = category === 'Lifestyle';
  const isTrivia = category === 'Trivia Night';
  const isMultiLocation = hostTier === 'tier_2';

  const handleCreateEvent = async () => {
    if (!title.trim()) return setErrorMsg('Please enter an event title.');
    if (isPublic && !venueAddress.trim()) {
      return setErrorMsg('Public events in Nearby require a venue address so attendees know where to go.');
    }
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

      const basePayload = {
        owner_id: uid,
        title: title.trim(),
        description: description.trim() || `SwingSet ${category} Event`,
        dress_code: dressCode.trim(),
        is_lifestyle: isLifestyle,
        status: 'active' as const,
        invite_code: inviteCode.trim().toUpperCase(),
        checkin_pin_6: doorPin.trim(),
        starts_at: startsAt,
        ends_at: endsAt,
      };

      const extendedPayload = {
        ...basePayload,
        is_public: isPublic,
        category,
        venue_name: venueName.trim() || null,
        venue_address: venueAddress.trim() || null,
        host_tier: hostTier,
        is_multi_location: isMultiLocation,
      };

      let { data: newEv, error: evErr } = await supabase
        .from('events')
        .insert(extendedPayload)
        .select()
        .single();

      // Graceful fallback if migration 004 hasn't been applied to the remote DB yet
      if (evErr && /column .* does not exist/i.test(evErr.message)) {
        const retry = await supabase
          .from('events')
          .insert(basePayload)
          .select()
          .single();
        newEv = retry.data;
        evErr = retry.error;
      }

      if (evErr || !newEv) {
        setLoading(false);
        return setErrorMsg(evErr?.message || 'Failed to create event.');
      }

      const defaultBlockTitle = isTrivia
        ? 'Round 1: Live Trivia Kickoff'
        : 'Round 1: Fuse & Spark Scramble';

      await supabase.from('timeline_blocks').insert([
        {
          event_id: newEv.id,
          sort_order: 1,
          type: 'activity',
          state: 'planned',
          title: defaultBlockTitle,
          target_bucket: 'everyone',
          duration_minutes: 15,
          config: isTrivia
            ? {
                mode: 'trivia',
                team_mode: 'captain_consensus',
                points_enabled: true,
              }
            : {
                skin_id: 'fuse_spark',
                scramble_min_sec: 30,
                scramble_max_sec: 60,
                mingle_duration_sec: 180,
              },
        },
      ]);

      setLoading(false);
      Alert.alert(
        'Event Created!',
        `${isPublic ? 'Public (Nearby)' : 'Private (Invite-Only)'} • ${category}\nInvite Code: ${newEv.invite_code} | Door PIN: ${newEv.checkin_pin_6}`
      );
      router.replace(`/event/${newEv.id}` as any);
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e.message || 'Error creating event.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerBox}>
          <CalendarPlus size={22} color={Colors.accent.copper} />
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>CREATE EVENT</Text>
            <Text style={s.headerSub}>
              Step 1: Choose Public (Nearby) or Private, then set vibe & location planner
            </Text>
          </View>
        </View>

        {errorMsg ? (
          <View style={s.errBox}>
            <Text style={s.errText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* STEP 1: PUBLIC VS PRIVATE */}
        <View style={s.card}>
          <Text style={s.label}>1. Event Visibility *</Text>
          <View style={s.choiceRow}>
            <TouchableOpacity
              style={[s.choiceCard, isPublic && s.choiceCardActive]}
              onPress={() => setIsPublic(true)}
            >
              <Globe size={18} color={isPublic ? Colors.accent.copper : Colors.text.secondary} />
              <Text style={[s.choiceTitle, isPublic && s.choiceTitleActive]}>Public</Text>
              <Text style={s.choiceDesc}>Listed in Nearby with address. Join at venue via code/tap.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.choiceCard, !isPublic && s.choiceCardActive]}
              onPress={() => setIsPublic(false)}
            >
              <Lock size={18} color={!isPublic ? Colors.accent.copper : Colors.text.secondary} />
              <Text style={[s.choiceTitle, !isPublic && s.choiceTitleActive]}>Private</Text>
              <Text style={s.choiceDesc}>Hidden from Nearby. Invite-only via link, code, or NFC.</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* STEP 2: CATEGORY / VIBE */}
        <View style={s.card}>
          <Text style={s.label}>2. Event Vibe / Category *</Text>
          <View style={s.pillWrap}>
            {CREATE_CATEGORIES.map((cat) => {
              const active = category === cat;
              const isLife = cat === 'Lifestyle';
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    s.pill,
                    active && (isLife ? s.pillLifestyleActive : s.pillActive),
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[s.pillText, active && s.pillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isLifestyle ? (
            <View style={s.badgeInfo}>
              <ShieldAlert size={14} color="#FFB4C2" />
              <Text style={s.badgeInfoText}>
                Clearly badged as Lifestyle in Nearby so attendees know the vibe upfront.
              </Text>
            </View>
          ) : null}

          {isTrivia ? (
            <View style={s.badgeInfoTrivia}>
              <Trophy size={14} color={Colors.text.copper} />
              <Text style={s.badgeInfoTriviaText}>
                Enables Trivia points, Captain Consensus team mode, and live scoreboards.
              </Text>
            </View>
          ) : null}
        </View>

        {/* STEP 3: HOST TIER & LOCATION PLANNER */}
        <View style={s.card}>
          <Text style={s.label}>3. Host Tier & Planner Mode</Text>
          <View style={s.choiceRow}>
            <TouchableOpacity
              style={[s.choiceCard, hostTier === 'tier_1' && s.choiceCardActive]}
              onPress={() => setHostTier('tier_1')}
            >
              <MapPin
                size={18}
                color={hostTier === 'tier_1' ? Colors.accent.copper : Colors.text.secondary}
              />
              <Text style={[s.choiceTitle, hostTier === 'tier_1' && s.choiceTitleActive]}>
                Tier 1: Standard
              </Text>
              <Text style={s.choiceDesc}>Single-location event & simple preset planner.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.choiceCard, hostTier === 'tier_2' && s.choiceCardActive]}
              onPress={() => setHostTier('tier_2')}
            >
              <Layers
                size={18}
                color={hostTier === 'tier_2' ? Colors.accent.copper : Colors.text.secondary}
              />
              <Text style={[s.choiceTitle, hostTier === 'tier_2' && s.choiceTitleActive]}>
                Tier 2: Pro
              </Text>
              <Text style={s.choiceDesc}>Multi-location routes, custom Q&A, & live photo reel.</Text>
            </TouchableOpacity>
          </View>

          <Text style={[s.subLabel, { marginTop: 8 }]}>
            {isMultiLocation ? 'Starting Venue Name' : 'Venue Name'}
          </Text>
          <TextInput
            style={s.input}
            value={venueName}
            onChangeText={setVenueName}
            placeholder="e.g. The Nations Taproom"
            placeholderTextColor={Colors.text.muted}
          />

          <Text style={[s.subLabel, { marginTop: 6 }]}>
            Venue Address {isPublic ? '*' : '(Optional for Private)'}
          </Text>
          <TextInput
            style={s.input}
            value={venueAddress}
            onChangeText={setVenueAddress}
            placeholder="e.g. 5108 Centennial Blvd, Nashville, TN"
            placeholderTextColor={Colors.text.muted}
          />
        </View>

        {/* STEP 4: DETAILS */}
        <View style={s.card}>
          <Text style={s.label}>4. Event Title *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder={
              isTrivia
                ? 'e.g. Tuesday 90s Trivia Night'
                : 'e.g. Saturday Night Social Mixer'
            }
            placeholderTextColor={Colors.text.muted}
          />

          <Text style={[s.subLabel, { marginTop: 8 }]}>Event Description</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            placeholder="What should attendees expect?"
            placeholderTextColor={Colors.text.muted}
          />

          <Text style={[s.subLabel, { marginTop: 8 }]}>Dress Code</Text>
          <TextInput
            style={s.input}
            value={dressCode}
            onChangeText={setDressCode}
            placeholder="e.g. Casual / Smart Casual / Cocktail"
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
            <Text style={s.submitBtnText}>
              Create {isPublic ? 'Public' : 'Private'} Event & Launch Studio
            </Text>
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
    backgroundColor: 'rgba(255, 92, 122, 0.14)',
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
  subLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  choiceRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  choiceCard: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: 12,
    gap: 4,
  },
  choiceCardActive: {
    borderColor: Colors.accent.copper,
    backgroundColor: 'rgba(90, 107, 255, 0.14)',
  },
  choiceTitle: { fontSize: 14, fontWeight: '800', color: Colors.text.secondary },
  choiceTitleActive: { color: Colors.text.primary },
  choiceDesc: { fontSize: 11, color: Colors.text.muted, lineHeight: 15 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  pillActive: {
    backgroundColor: Colors.accent.copper,
    borderColor: Colors.accent.copper,
  },
  pillLifestyleActive: {
    backgroundColor: Colors.accent.crimson,
    borderColor: Colors.accent.crimson,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  pillTextActive: { color: '#FFFFFF' },
  badgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    padding: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
  },
  badgeInfoText: { fontSize: 11, color: '#FFB4C2', flex: 1, fontWeight: '600' },
  badgeInfoTrivia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    padding: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(90, 107, 255, 0.14)',
  },
  badgeInfoTriviaText: { fontSize: 11, color: Colors.text.copper, flex: 1, fontWeight: '600' },
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
