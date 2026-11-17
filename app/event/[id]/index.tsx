import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Camera,
  CheckCircle2,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  Zap,
} from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { HostIntroBox } from '@/src/components/HostIntroBox';
import { HostLiveDashboard } from '@/src/components/HostLiveDashboard';
import { PhotoMadLibModule } from '@/src/components/PhotoMadLibModule';
import { TapsTonightDrawer } from '@/src/components/TapsTonightDrawer';
import { TriviaModule } from '@/src/components/TriviaModule';
import { GAME_SKINS } from '@/src/config/gameSkins';
import { CatalystGameEngine } from '@/src/engine/catalystGameEngine';
import { supabase } from '@/src/lib/supabase';
import { ContactExchangeService } from '@/src/services/contactExchangeService';
import {
  BlockState,
  EventAttendee,
  GameSkinId,
  LiveRoundBroadcast,
  TimelineBlock,
} from '@/src/types/swingset';

const SKIN_LIST: GameSkinId[] = [
  'fuse_spark',
  'outbreak',
  'drop_beat',
  'secret_agent',
  'cocktail_mixer',
];

const ARRIVAL_MISSIONS = [
  'Introduce yourself to someone new near the bar and learn their favorite drink.',
  'Find another couple or guest visiting from a different neighborhood.',
  'Compliment someone on their outfit and trade first names.',
];

export default function EventDetailRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = params.id;

  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<any>(null);
  const [blocks, setBlocks] = useState<TimelineBlock[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [liveRound, setLiveRound] = useState<LiveRoundBroadcast | null>(null);
  const [engine, setEngine] = useState<CatalystGameEngine | null>(null);

  // Host game-builder state
  const [selectedSkin, setSelectedSkin] = useState<GameSkinId>('fuse_spark');
  const [addingBlock, setAddingBlock] = useState(false);

  // Attendee tap & mission state
  const [tapCodeInput, setTapCodeInput] = useState('');
  const [tapStatus, setTapStatus] = useState('');
  const [completedMissions, setCompletedMissions] = useState<number[]>([]);
  const [tapsDrawerOpen, setTapsDrawerOpen] = useState(false);
  const [roomMode, setRoomMode] = useState<'social' | 'trivia' | 'photos'>('social');
  const modeChannelRef = React.useRef<any>(null);

  useEffect(() => {
    let eng: CatalystGameEngine | null = null;
    let dbChannel: any = null;

    const loadEventRoom = async () => {
      setLoading(true);
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data: anonData } = await supabase.auth.signInAnonymously();
        sessionData = { session: anonData.session };
      }
      const uid = sessionData.session?.user?.id || null;
      setCurrentUserId(uid);

      if (!eventId) {
        setLoading(false);
        return;
      }

      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!ev) {
        setLoading(false);
        return;
      }
      setEventData(ev);
      if (ev.active_mode === 'social' || ev.active_mode === 'trivia' || ev.active_mode === 'photos') {
        setRoomMode(ev.active_mode);
      } else if (ev.category === 'Trivia Night') {
        setRoomMode('trivia');
      }
      const hostFlag = ev.owner_id === uid;
      setIsHost(hostFlag);

      const { data: blks } = await supabase
        .from('timeline_blocks')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });
      setBlocks(blks || []);

      const { data: atts } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId);
      setAttendees(atts || []);

      // If guest has not checked into this event yet, route to check-in
      if (!hostFlag && uid && !(atts || []).some((a) => a.user_id === uid)) {
        setLoading(false);
        router.replace(`/event/${eventId}/checkin` as any);
        return;
      }

      eng = new CatalystGameEngine(supabase, (updated) => {
        setLiveRound(updated);
      });
      eng.connectToEventChannel(eventId);
      setEngine(eng);

      // Subscribe to live attendee check-ins and block updates
      dbChannel = supabase
        .channel(`room_db_${eventId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'event_attendees', filter: `event_id=eq.${eventId}` },
          async () => {
            const { data: freshAtts } = await supabase
              .from('event_attendees')
              .select('*')
              .eq('event_id', eventId);
            if (freshAtts) setAttendees(freshAtts);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'timeline_blocks', filter: `event_id=eq.${eventId}` },
          async () => {
            const { data: freshBlks } = await supabase
              .from('timeline_blocks')
              .select('*')
              .eq('event_id', eventId)
              .order('sort_order', { ascending: true });
            if (freshBlks) setBlocks(freshBlks);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
          (payload: any) => {
            const nextMode = payload?.new?.active_mode;
            if (nextMode === 'social' || nextMode === 'trivia' || nextMode === 'photos') {
              setRoomMode(nextMode);
            }
          }
        )
        .on('broadcast', { event: 'room_mode' }, ({ payload }: { payload: { mode: 'social' | 'trivia' | 'photos' } }) => {
          if (payload?.mode) setRoomMode(payload.mode);
        })
        .subscribe();

      modeChannelRef.current = dbChannel;

      setLoading(false);
    };

    loadEventRoom();

    return () => {
      if (eng) eng.disconnect();
      if (dbChannel) supabase.removeChannel(dbChannel);
    };
  }, [eventId]);

  const handleHostChangeMode = async (nextMode: 'social' | 'trivia' | 'photos') => {
    setRoomMode(nextMode);
    modeChannelRef.current?.send({
      type: 'broadcast',
      event: 'room_mode',
      payload: { mode: nextMode },
    });
    try {
      await supabase
        .from('events')
        .update({ active_mode: nextMode })
        .eq('id', eventId);
    } catch {
      // Ignore if migration 010 not applied yet
    }
  };

  const handleDeleteEvent = () => {
    if (!eventData) return;
    Alert.alert(
      'Delete Event?',
      `Permanently delete "${eventData.title}"? This removes the event, timeline, and check-ins.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) {
              Alert.alert('Delete Failed', error.message);
              return;
            }
            router.replace('/(tabs)/host' as any);
          },
        },
      ]
    );
  };

  const handleShareInvite = async () => {
    if (!eventData) return;
    await Share.share({
      message: `Join "${eventData.title}" on SwingSet!\nInvite Code: ${eventData.invite_code}\nDoor PIN: ${eventData.checkin_pin_6}`,
    });
  };

  const handleAddGameBlock = async () => {
    if (!eventId) return;
    setAddingBlock(true);
    const skin = GAME_SKINS[selectedSkin];
    const nextOrder = blocks.length + 1;

    const { data: inserted, error } = await supabase
      .from('timeline_blocks')
      .insert({
        event_id: eventId,
        sort_order: nextOrder,
        type: 'activity',
        state: 'planned',
        title: `Round ${nextOrder}: ${skin.name}`,
        target_bucket: 'everyone',
        duration_minutes: 15,
        config: {
          skin_id: selectedSkin,
          scramble_min_sec: 30,
          scramble_max_sec: 60,
          mingle_duration_sec: 180,
        },
      })
      .select()
      .single();

    setAddingBlock(false);
    if (error) {
      Alert.alert('Could Not Add Round', error.message);
      return;
    }
    if (inserted) {
      setBlocks((prev) => [...prev, inserted]);
    }
  };

  const handleTransitionBlock = async (block: TimelineBlock, nextState: BlockState) => {
    if (!engine) return;

    await supabase
      .from('timeline_blocks')
      .update({ state: nextState })
      .eq('id', block.id);

    setBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, state: nextState } : b))
    );

    if (nextState === 'active') {
      await engine.startRound({
        eventId,
        blockId: block.id,
        attendees,
        targetBucket: block.target_bucket,
        config: block.config,
      });
    } else if (nextState === 'ended_early' || nextState === 'ended') {
      setLiveRound(null);
    }
  };

  const handleExtendMingle = async (seconds: number) => {
    if (engine) await engine.extendMingle(seconds);
  };

  const handleTogglePause = async (paused: boolean) => {
    if (engine) await engine.togglePause(paused);
  };

  const handleRateBlock = async (blockId: string, rating: 1 | 2 | 3) => {
    await supabase.from('timeline_blocks').update({ host_rating: rating }).eq('id', blockId);
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, host_rating: rating } : b))
    );
  };

  const handleRemoveAttendeeConfirmed = async (attendeeId: string) => {
    await supabase.from('event_attendees').update({ is_removed: true }).eq('id', attendeeId);
    setAttendees((prev) => prev.filter((a) => a.id !== attendeeId));
  };

  const handleVerifyTapCode = async () => {
    const code = tapCodeInput.trim().toUpperCase();
    if (code.length !== 3 || !myAttendee) return;
    const partner = attendees.find(
      (a) => a.id !== myAttendee.id && a.short_code_3?.toUpperCase() === code
    );
    if (!partner) {
      setTapStatus('No checked-in guest matches that 3-character code.');
      return;
    }

    const [attA, attB] =
      myAttendee.id < partner.id
        ? [myAttendee.id, partner.id]
        : [partner.id, myAttendee.id];

    await supabase.from('event_taps').upsert(
      {
        event_id: eventId,
        attendee_a_id: attA,
        attendee_b_id: attB,
        block_id: liveRound?.block_id || null,
        interaction_context: liveRound
          ? `Tapped in ${GAME_SKINS[liveRound.skin_id]?.name || 'Live Game'}`
          : 'Mingling Tap',
        verification_method: 'ble_code',
      },
      { onConflict: 'event_id,block_id,attendee_a_id,attendee_b_id' }
    );

    setTapCodeInput('');
    setTapStatus(`Connected with ${partner.display_name}! Added to Taps Tonight.`);
  };

  const toggleMission = (idx: number) => {
    setCompletedMissions((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={Colors.accent.copper} />
      </SafeAreaView>
    );
  }

  if (!eventData) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.errText}>Event not found.</Text>
      </SafeAreaView>
    );
  }

  const myAttendee = attendees.find((a) => a.user_id === currentUserId);
  const myAssignment =
    myAttendee && liveRound?.assignments ? liveRound.assignments[myAttendee.id] : null;

  if (isHost) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerStyle={{paddingBottom: 160}} keyboardShouldPersistTaps="handled">
          {/* Share Invite Code & Door PIN Card */}
          <View style={s.hostShareCard}>
            <View style={s.shareRow}>
              <View>
                <Text style={s.codeLabel}>INVITE CODE</Text>
                <Text style={s.shareCode}>{eventData.invite_code}</Text>
              </View>
              <View>
                <Text style={s.codeLabel}>DOOR PIN</Text>
                <Text style={s.shareCode}>{eventData.checkin_pin_6}</Text>
              </View>
              <TouchableOpacity style={s.shareBtn} onPress={handleShareInvite}>
                <Share2 size={16} color="#FFF" />
                <Text style={s.shareBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteEventBtn} onPress={handleDeleteEvent}>
                <Trash2 size={16} color={Colors.accent.crimson} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mode Switcher: Host controls active mode for the room */}
          <View style={s.roomModeBar}>
            <TouchableOpacity
              style={[s.roomModeBtn, roomMode === 'social' && s.roomModeBtnActive]}
              onPress={() => handleHostChangeMode('social')}
            >
              <Zap size={14} color={roomMode === 'social' ? '#FFF' : Colors.text.secondary} />
              <Text style={[s.roomModeText, roomMode === 'social' && s.roomModeTextActive]}>
                Social
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.roomModeBtn, roomMode === 'trivia' && s.roomModeBtnActive]}
              onPress={() => handleHostChangeMode('trivia')}
            >
              <Trophy size={14} color={roomMode === 'trivia' ? '#FFF' : Colors.text.secondary} />
              <Text style={[s.roomModeText, roomMode === 'trivia' && s.roomModeTextActive]}>
                Trivia
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.roomModeBtn, roomMode === 'photos' && s.roomModeBtnActive]}
              onPress={() => handleHostChangeMode('photos')}
            >
              <Camera size={14} color={roomMode === 'photos' ? '#FFF' : Colors.text.secondary} />
              <Text style={[s.roomModeText, roomMode === 'photos' && s.roomModeTextActive]}>
                Photo Story
              </Text>
            </TouchableOpacity>
          </View>

          {roomMode === 'trivia' ? (
            <View style={{ paddingHorizontal: Spacing.md }}>
              <TriviaModule
                eventId={eventId}
                isHost={true}
                isTier2Pro={eventData.host_tier === 'tier_2'}
                currentUserId={currentUserId}
                currentDisplayName="Host"
                attendees={attendees}
                hostUserId={eventData.owner_id}
                venueName={eventData.venue_name || ''}
              />
            </View>
          ) : roomMode === 'photos' ? (
            <View style={{ paddingHorizontal: Spacing.md }}>
              <PhotoMadLibModule
                eventId={eventId}
                isHost={true}
                currentUserId={currentUserId}
                currentDisplayName="Host"
              />
            </View>
          ) : (
            <>
          {/* Add Any of the 5 SwingSet Games */}
          <View style={s.builderCard}>
            <Text style={s.builderTitle}>ADD HOST-INITIATED GAME ROUND</Text>
            <ScrollView automaticallyAdjustKeyboardInsets={true} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SKIN_LIST.map((skinId) => {
                const skin = GAME_SKINS[skinId];
                const active = selectedSkin === skinId;
                return (
                  <Pressable
                    key={skinId}
                    onPress={() => setSelectedSkin(skinId)}
                    style={[s.skinChip, active && s.skinChipActive]}
                  >
                    <Text style={[s.skinChipText, active && s.skinChipTextActive]}>
                      {skin.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={s.skinTagline}>{GAME_SKINS[selectedSkin].tagline}</Text>
            <HostIntroBox
              gameTitle={GAME_SKINS[selectedSkin].name}
              readAloudScript={GAME_SKINS[selectedSkin].hostIntro.readAloudScript}
              howToPlay={GAME_SKINS[selectedSkin].hostIntro.howToPlay}
              defaultExpanded={true}
            />
            <TouchableOpacity
              style={s.addRoundBtn}
              onPress={handleAddGameBlock}
              disabled={addingBlock}
            >
              <Plus size={16} color="#FFF" />
              <Text style={s.addRoundText}>
                {addingBlock ? 'Adding...' : `Add ${GAME_SKINS[selectedSkin].name} to Timeline`}
              </Text>
            </TouchableOpacity>
          </View>

          <HostLiveDashboard
            eventTitle={eventData.title}
            blocks={blocks}
            attendees={attendees}
            liveRound={liveRound}
            onTransitionBlock={handleTransitionBlock}
            onExtendMingle={handleExtendMingle}
            onTogglePause={handleTogglePause}
            onRateBlock={handleRateBlock}
            onRemoveAttendeeConfirmed={handleRemoveAttendeeConfirmed}
          />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.headerBox}>
          <Text style={s.headerEyebrow}>SWINGSET LIVE ROOM</Text>
          <Text style={s.headerTitle}>{eventData.title}</Text>
          <Text style={s.headerSub}>
            Invite: {eventData.invite_code} • Your Tap Code: {myAttendee?.short_code_3 || '---'}
          </Text>
        </View>

        {roomMode === 'trivia' ? (
          <TriviaModule
            eventId={eventId}
            isHost={false}
            isTier2Pro={eventData.host_tier === 'tier_2'}
            currentUserId={currentUserId}
            currentDisplayName={myAttendee?.display_name || 'Guest'}
            attendees={attendees}
            hostUserId={eventData.owner_id}
            venueName={eventData.venue_name || ''}
          />
        ) : roomMode === 'photos' ? (
          <PhotoMadLibModule
            eventId={eventId}
            isHost={false}
            currentUserId={currentUserId}
            currentDisplayName={myAttendee?.display_name || 'Guest'}
          />
        ) : myAssignment && liveRound ? (
          <View style={s.liveCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Zap size={16} color={Colors.accent.copper} />
              <Text style={s.liveBadge}>
                LIVE ROUND: {GAME_SKINS[liveRound.skin_id]?.name.toUpperCase()} • {liveRound.phase.toUpperCase()}
              </Text>
            </View>
            <Text style={s.roleText}>Your Role: {myAssignment.role_label}</Text>
            <Text style={s.targetText}>Find & Tap: {myAssignment.target_label}</Text>

            <View style={s.codeBox}>
              <Text style={s.codeLabel}>YOUR 3-CHAR TAP CODE</Text>
              <Text style={s.codeText}>{myAttendee?.short_code_3 || myAssignment.short_code_3}</Text>
            </View>

            <View style={s.tapRow}>
              <TextInput
                style={s.tapInput}
                value={tapCodeInput}
                onChangeText={(t) => setTapCodeInput(t.toUpperCase())}
                placeholder="Enter partner's 3-char code"
                placeholderTextColor={Colors.text.muted}
                maxLength={3}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={s.tapBtn} onPress={handleVerifyTapCode}>
                <Text style={s.tapBtnText}>Verify Tap</Text>
              </TouchableOpacity>
            </View>
            {tapStatus ? <Text style={s.tapFeedback}>{tapStatus}</Text> : null}

            {GAME_SKINS[liveRound.skin_id] ? (
              <HostIntroBox
                gameTitle={`How to Play: ${GAME_SKINS[liveRound.skin_id].name}`}
                readAloudScript={GAME_SKINS[liveRound.skin_id].tagline}
                howToPlay={GAME_SKINS[liveRound.skin_id].hostIntro.howToPlay}
                defaultExpanded={false}
              />
            ) : null}
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Sparkles size={24} color={Colors.accent.copper} />
            <Text style={s.emptyTitle}>Checked In & Mingling</Text>
            <Text style={s.emptySub}>
              No competitive timers running. Read how the next game works below while you mingle!
            </Text>

            {(() => {
              const nextBlock = blocks.find(
                (b) => b.state === 'announced' || b.state === 'planned'
              );
              const nextSkinId = nextBlock?.config?.skin_id as GameSkinId | undefined;
              const nextSkin = nextSkinId && GAME_SKINS[nextSkinId] ? GAME_SKINS[nextSkinId] : null;
              return (
                <View style={s.guideCard}>
                  <Text style={s.guideHeader}>
                    {nextSkin ? `UP NEXT: ${nextSkin.name.toUpperCase()}` : 'HOW LIVE GAMES WORK'}
                  </Text>
                  <Text style={s.guideTagline}>
                    {nextSkin
                      ? nextSkin.tagline
                      : 'When your host launches a round, every phone receives a live role and target.'}
                  </Text>
                  {(nextSkin
                    ? nextSkin.hostIntro.howToPlay
                    : [
                        'Check your screen when the round starts to see your role or matching target.',
                        'Find your match in the room and tap phones (NFC) or enter their 3-char code.',
                        'Once paired, use the on-screen Mingle prompt to start a fun conversation!',
                      ]
                  ).map((step, i) => (
                    <Text key={i} style={s.guideStep}>
                      {i + 1}. {step}
                    </Text>
                  ))}
                </View>
              );
            })()}

            <View style={s.missionList}>
              <Text style={s.missionHeader}>OPTIONAL ARRIVAL MINI-MISSIONS (NO POINTS)</Text>
              {ARRIVAL_MISSIONS.map((m, idx) => {
                const done = completedMissions.includes(idx);
                return (
                  <Pressable
                    key={idx}
                    style={[s.missionItem, done && s.missionItemDone]}
                    onPress={() => toggleMission(idx)}
                  >
                    <CheckCircle2
                      size={18}
                      color={done ? Colors.accent.copper : Colors.text.muted}
                    />
                    <Text style={[s.missionText, done && s.missionTextDone]}>{m}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity style={s.tapsBtn} onPress={() => setTapsDrawerOpen(true)}>
          <Users size={18} color="#FFF" />
          <Text style={s.tapsBtnText}>Open Taps Tonight & Connections</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={s.backBtnText}>Return to Event Hub</Text>
        </TouchableOpacity>
      </ScrollView>

      {myAttendee && currentUserId ? (
        <TapsTonightDrawer
          visible={tapsDrawerOpen}
          eventId={eventId}
          userId={currentUserId}
          exchangeService={new ContactExchangeService(supabase)}
          onClose={() => setTapsDrawerOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  center: { flex: 1, backgroundColor: Colors.background.black, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  errText: { color: Colors.accent.crimson, fontSize: 16, fontWeight: '700' },
  hostShareCard: {
    backgroundColor: Colors.background.darkSteel,
    borderBottomWidth: 1,
    borderColor: Colors.border.steelGray,
    padding: Spacing.md,
  },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareCode: { color: Colors.accent.copper, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent.copper,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  shareBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  builderCard: {
    margin: Spacing.md,
    marginBottom: 0,
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  builderTitle: { color: Colors.accent.copper, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  skinChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  skinChipActive: { borderColor: Colors.accent.copper, backgroundColor: 'rgba(200,109,81,0.18)' },
  skinChipText: { color: Colors.text.secondary, fontSize: 12, fontWeight: '700' },
  skinChipTextActive: { color: Colors.accent.copper },
  skinTagline: { color: Colors.text.secondary, fontSize: 12 },
  addRoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent.copper,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  addRoundText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  headerBox: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  headerEyebrow: { color: Colors.accent.copper, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: Colors.text.primary, fontSize: 20, fontWeight: '800', marginTop: 2 },
  headerSub: { color: Colors.text.secondary, fontSize: 12, marginTop: 4 },
  liveCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 2,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  liveBadge: { color: Colors.accent.copper, fontWeight: '800', fontSize: 12 },
  roleText: { color: Colors.text.primary, fontSize: 19, fontWeight: '800' },
  targetText: { color: Colors.text.secondary, fontSize: 14, fontWeight: '700' },
  codeBox: {
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: 12,
    alignItems: 'center',
  },
  codeLabel: { fontSize: 10, color: Colors.text.secondary, fontWeight: '800' },
  codeText: { fontSize: 28, color: Colors.accent.copper, fontWeight: '900', letterSpacing: 4 },
  tapRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tapInput: {
    flex: 1,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    color: Colors.text.primary,
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
  },
  tapBtn: {
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  tapBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  tapFeedback: { color: Colors.accent.copper, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  emptyCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { color: Colors.text.primary, fontSize: 17, fontWeight: '800' },
  emptySub: { color: Colors.text.secondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  missionList: { width: '100%', gap: 8, marginTop: 8 },
  missionHeader: { color: Colors.accent.copper, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  missionItemDone: { borderColor: Colors.accent.copper, opacity: 0.75 },
  missionText: { flex: 1, color: Colors.text.primary, fontSize: 13 },
  missionTextDone: { textDecorationLine: 'line-through', color: Colors.text.secondary },
  tapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
  },
  tapsBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  backBtn: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: { color: Colors.text.secondary, fontWeight: '800', fontSize: 14 },
  roomModeBar: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  roomModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
  },
  roomModeBtnActive: {
    backgroundColor: Colors.accent.copper,
    borderColor: Colors.accent.copper,
  },
  roomModeText: { color: Colors.text.secondary, fontSize: 12, fontWeight: '800' },
  roomModeTextActive: { color: '#FFFFFF' },
  guideCard: {
    width: '100%',
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  guideHeader: {
    color: Colors.text.copper,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  guideTagline: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  guideStep: {
    color: Colors.text.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  deleteEventBtn: {
    padding: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 92, 122, 0.14)',
    borderWidth: 1,
    borderColor: Colors.accent.crimson,
  },
});