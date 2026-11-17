import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Check,
  Film,
  Image as ImageIcon,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { HostIntroBox } from '@/src/components/HostIntroBox';
import { PHOTO_MADLIB_STORIES, PhotoMadLibSlot } from '@/src/data/photoMadLibs';
import { supabase } from '@/src/lib/supabase';

export interface PhotoSubmission {
  id: string;
  userId: string;
  displayName: string;
  storyId: string;
  slotIndex: number;
  slotPrompt: string;
  storyCaption: string;
  imageDataUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface PhotoLiveState {
  storyId: string;
  autoApprove: boolean;
  screensaverActive: boolean;
  submissions: PhotoSubmission[];
}

interface PhotoMadLibModuleProps {
  eventId: string;
  isHost: boolean;
  currentUserId: string | null;
  currentDisplayName: string;
  onReelStart?: () => void;
}

export function PhotoMadLibModule({
  eventId,
  isHost,
  currentUserId,
  currentDisplayName,
  onReelStart,
}: PhotoMadLibModuleProps) {
  const [state, setState] = useState<PhotoLiveState>({
    storyId: PHOTO_MADLIB_STORIES[0].id,
    autoApprove: false,
    screensaverActive: false,
    submissions: [],
  });
  const [reelIndex, setReelIndex] = useState(0);
  const [localReelPlaying, setLocalReelPlaying] = useState(false);
  const [storyScope, setStoryScope] = useState<'mine' | 'room'>(isHost ? 'room' : 'mine');
  const [capturingSlot, setCapturingSlot] = useState<number | null>(null);
  const channelRef = useRef<any>(null);

  const activeStory = useMemo(
    () =>
      PHOTO_MADLIB_STORIES.find((st) => st.id === state.storyId) ||
      PHOTO_MADLIB_STORIES[0],
    [state.storyId]
  );

  const broadcastState = (next: PhotoLiveState) => {
    setState(next);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'photo_state',
      payload: next,
    });
  };

  const loadSavedPhotos = useCallback(async () => {
    if (!eventId) return;
    try {
      const { data, error } = await supabase
        .from('event_photo_submissions')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        const mapped: PhotoSubmission[] = data.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          displayName: r.display_name,
          storyId: r.story_id,
          slotIndex: r.slot_index,
          slotPrompt: r.slot_prompt,
          storyCaption: r.story_caption,
          imageDataUrl: r.image_data_url,
          status: r.status,
          createdAt: r.created_at,
        }));
        setState((prev) => ({ ...prev, submissions: mapped }));
      }
    } catch {
      // Ignore if migration 008 not applied yet
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    loadSavedPhotos();

    const ch = supabase.channel(`photos:${eventId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on('broadcast', { event: 'photo_state' }, ({ payload }: { payload: PhotoLiveState }) => {
      if (payload) setState(payload);
    })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_photo_submissions',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          loadSavedPhotos();
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [eventId, loadSavedPhotos]);

  const approvedForStory = useMemo(
    () =>
      state.submissions
        .filter((sub) => sub.storyId === activeStory.id && sub.status === 'approved')
        .sort((a, b) => a.slotIndex - b.slotIndex),
    [state.submissions, activeStory.id]
  );

  const visibleStoryFrames = useMemo(
    () =>
      storyScope === 'mine' && currentUserId
        ? approvedForStory.filter((sub) => sub.userId === currentUserId)
        : approvedForStory,
    [approvedForStory, storyScope, currentUserId]
  );

  const pendingSubmissions = useMemo(
    () => state.submissions.filter((sub) => sub.status === 'pending'),
    [state.submissions]
  );

  const hasMyPending = useMemo(
    () =>
      Boolean(
        currentUserId &&
          state.submissions.some(
            (sub) => sub.userId === currentUserId && sub.status === 'pending'
          )
      ),
    [state.submissions, currentUserId]
  );

  // Poll Supabase every 5s while user has pending photos (or host is waiting on inbox)
  useEffect(() => {
    if (!hasMyPending && !isHost) return;
    const poll = setInterval(() => {
      loadSavedPhotos();
    }, 5000);
    return () => clearInterval(poll);
  }, [hasMyPending, isHost, loadSavedPhotos]);

  const isReelActive = state.screensaverActive || localReelPlaying;
  const reelFrames = localReelPlaying ? visibleStoryFrames : approvedForStory;

  // Auto-cycle live downtime / personal story reel every 4 seconds
  useEffect(() => {
    if (!isReelActive || reelFrames.length <= 1) return;
    const timer = setInterval(() => {
      setReelIndex((prev) => (prev + 1) % reelFrames.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isReelActive, reelFrames.length]);

  const handleCapturePhoto = async (slot: PhotoMadLibSlot, useCamera: boolean) => {
    if (!currentUserId) return;
    setCapturingSlot(slot.slotIndex);

    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera Permission', 'Please allow camera access to snap challenge photos.');
          setCapturingSlot(null);
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photo Library Permission', 'Please allow photo library access.');
          setCapturingSlot(null);
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            quality: 0.35,
            base64: true,
            allowsEditing: true,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.35,
            base64: true,
            allowsEditing: true,
            aspect: [4, 3],
          });

      if (result.canceled || !result.assets?.[0]) {
        setCapturingSlot(null);
        return;
      }

      const asset = result.assets[0];
      const dataUrl = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      const caption = slot.storyTemplate.replace('{name}', currentDisplayName || 'A guest');
      const initialStatus: 'approved' | 'pending' = state.autoApprove ? 'approved' : 'pending';

      let insertedId = `photo_${Date.now()}`;
      try {
        const { data: inserted } = await supabase
          .from('event_photo_submissions')
          .insert({
            event_id: eventId,
            user_id: currentUserId,
            display_name: currentDisplayName || 'Guest',
            story_id: activeStory.id,
            slot_index: slot.slotIndex,
            slot_prompt: slot.prompt,
            story_caption: caption,
            image_data_url: dataUrl,
            status: initialStatus,
          })
          .select('id')
          .single();
        if (inserted?.id) insertedId = inserted.id;
      } catch {
        // Realtime broadcast still delivers it
      }

      const newSub: PhotoSubmission = {
        id: insertedId,
        userId: currentUserId,
        displayName: currentDisplayName || 'Guest',
        storyId: activeStory.id,
        slotIndex: slot.slotIndex,
        slotPrompt: slot.prompt,
        storyCaption: caption,
        imageDataUrl: dataUrl,
        status: initialStatus,
        createdAt: new Date().toISOString(),
      };

      const nextState: PhotoLiveState = {
        ...state,
        submissions: [...state.submissions, newSub],
      };
      broadcastState(nextState);

      Alert.alert(
        initialStatus === 'approved' ? 'Added to Story Timeline!' : 'Sent to Host Inbox!',
        initialStatus === 'approved'
          ? 'Your photo is live on the Mad-Lib Story Timeline.'
          : 'Your photo was sent to the host for approval onto the live story reel.'
      );
    } catch {
      Alert.alert('Photo Error', 'Could not capture photo. Try choosing from library.');
    } finally {
      setCapturingSlot(null);
    }
  };

  const handleModerate = async (subId: string, nextStatus: 'approved' | 'rejected') => {
    const nextSubs = state.submissions.map((sub) =>
      sub.id === subId ? { ...sub, status: nextStatus } : sub
    );
    broadcastState({ ...state, submissions: nextSubs });

    try {
      await supabase
        .from('event_photo_submissions')
        .update({ status: nextStatus })
        .eq('id', subId);
      await loadSavedPhotos();
    } catch {
      // Ignore if local-only ID
    }
  };

  const currentReelSlide =
    reelFrames.length > 0
      ? reelFrames[reelIndex % reelFrames.length]
      : null;

  return (
    <View style={s.wrapper}>
      {/* Header */}
      <View style={s.headerCard}>
        <View style={s.rowGap}>
          <Film size={20} color={Colors.accent.copper} />
          <Text style={s.headerTitle}>MAD-LIB PHOTO STORY</Text>
        </View>
        <Text style={s.headerSub}>{activeStory.title} — {activeStory.tagline}</Text>
        <View style={s.consentRow}>
          <ShieldCheck size={14} color={Colors.accent.emerald} />
          <Text style={s.consentText}>
            Privacy Notice: Challenge photos go to the host and may appear on the live event story reel.
          </Text>
        </View>
      </View>

      {/* Live Story / Downtime Reel (visible to host & all attendees) */}
      {isReelActive && currentReelSlide ? (
        <View style={s.reelCard}>
          <View style={s.reelHeader}>
            <Sparkles size={15} color={Colors.accent.copper} />
            <Text style={s.reelEyebrow}>
              {localReelPlaying ? 'MY STORY REEL' : 'LIVE ROOM STORY REEL'} • SCENE{' '}
              {(reelIndex % reelFrames.length) + 1} OF {reelFrames.length}
            </Text>
          </View>
          <Image
            source={{ uri: currentReelSlide.imageDataUrl }}
            style={s.reelImage}
            resizeMode="cover"
          />
          <Text style={s.reelCaption}>{currentReelSlide.storyCaption}</Text>
          <Text style={s.reelCredit}>Starring {currentReelSlide.displayName}</Text>
        </View>
      ) : null}

      {/* Host Controls & Inbox */}
      {isHost ? (
        <View style={s.card}>
          <Text style={s.sectionLabel}>HOST PHOTO STORY CONTROLS</Text>

          <HostIntroBox
            gameTitle="Mad-Lib Photo Story"
            readAloudScript={activeStory.readAloudScript}
            howToPlay={activeStory.howToPlay}
            defaultExpanded={true}
          />

          <Text style={s.subLabel}>Choose Story Template</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storyRow}>
            {PHOTO_MADLIB_STORIES.map((st) => {
              const active = st.id === activeStory.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[s.storyChip, active && s.storyChipActive]}
                  onPress={() => broadcastState({ ...state, storyId: st.id })}
                >
                  <Text style={[s.storyChipText, active && s.storyChipTextActive]}>
                    {st.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={s.rowGap}>
            <TouchableOpacity
              style={[s.toggleBtn, state.autoApprove && s.toggleBtnActive]}
              onPress={() =>
                broadcastState({ ...state, autoApprove: !state.autoApprove })
              }
            >
              <Text style={[s.toggleBtnText, state.autoApprove && { color: '#FFF' }]}>
                {state.autoApprove ? 'Auto-Approve: ON' : 'Host Inbox Approval: ON'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.toggleBtn, state.screensaverActive && s.reelBtnActive]}
              onPress={() => {
                const nextActive = !state.screensaverActive;
                broadcastState({ ...state, screensaverActive: nextActive });
                if (nextActive) onReelStart?.();
              }}
            >
              <Play size={13} color="#FFF" />
              <Text style={[s.toggleBtnText, { color: '#FFF' }]}>
                {state.screensaverActive ? 'Stop Reel' : 'Play Downtime Reel'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Host Inbox Queue */}
          <View style={[s.rowGap, { justifyContent: 'space-between' }]}>
            <Text style={s.subLabel}>
              Host Inbox ({pendingSubmissions.length} pending approval)
            </Text>
            <TouchableOpacity onPress={loadSavedPhotos} hitSlop={8}>
              <RefreshCw size={14} color={Colors.text.copper} />
            </TouchableOpacity>
          </View>
          {pendingSubmissions.length === 0 ? (
            <Text style={s.emptyInboxText}>No pending photos in your inbox yet.</Text>
          ) : (
            pendingSubmissions.map((sub) => (
              <View key={sub.id} style={s.inboxItem}>
                <Image
                  source={{ uri: sub.imageDataUrl }}
                  style={s.inboxThumb}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.inboxName}>{sub.displayName}</Text>
                  <Text style={s.inboxPrompt}>{sub.slotPrompt}</Text>
                  <View style={s.rowGap}>
                    <TouchableOpacity
                      style={s.approveBtn}
                      onPress={() => handleModerate(sub.id, 'approved')}
                    >
                      <Check size={14} color="#FFF" />
                      <Text style={s.modBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={() => handleModerate(sub.id, 'rejected')}
                    >
                      <X size={14} color="#FFF" />
                      <Text style={s.modBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.sectionLabel}>HOW THE PHOTO STORY WORKS</Text>
          {activeStory.howToPlay.map((step, i) => (
            <Text key={i} style={s.guideStep}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      )}

      {/* Directed Photo Prompts */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>DIRECTED PHOTO PROMPTS ({activeStory.slots.length})</Text>
        {activeStory.slots.map((slot) => {
          const isBusy = capturingSlot === slot.slotIndex;
          const mySub = state.submissions.find(
            (sub) =>
              sub.storyId === activeStory.id &&
              sub.slotIndex === slot.slotIndex &&
              sub.userId === currentUserId &&
              sub.status !== 'rejected'
          );
          const isDone = Boolean(mySub);

          return (
            <View key={slot.slotIndex} style={[s.slotCard, isDone && s.slotCardDone]}>
              <View style={s.slotTopRow}>
                <View style={s.slotBadge}>
                  <Text style={s.slotBadgeText}>
                    FRAME {slot.slotIndex + 1} • {slot.mode.toUpperCase()}
                  </Text>
                </View>
                {mySub ? (
                  <View style={s.doneBadge}>
                    <Check size={11} color={Colors.accent.emerald} />
                    <Text style={s.doneBadgeText}>
                      {mySub.status === 'approved' ? 'APPROVED' : 'SUBMITTED'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[s.slotPrompt, isDone && s.slotPromptDone]}>{slot.prompt}</Text>
              {isDone ? (
                <View style={s.doneBar}>
                  <Check size={14} color={Colors.accent.emerald} />
                  <Text style={s.doneBarText}>
                    {mySub?.status === 'approved'
                      ? 'Completed — Live on Story Timeline'
                      : 'Completed — Waiting for Host Approval'}
                  </Text>
                </View>
              ) : (
                <View style={s.rowGap}>
                  <TouchableOpacity
                    style={s.snapBtn}
                    disabled={isBusy}
                    onPress={() => handleCapturePhoto(slot, true)}
                  >
                    <Camera size={15} color="#FFF" />
                    <Text style={s.snapBtnText}>{isBusy ? 'Opening...' : 'Snap Photo'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.libBtn}
                    disabled={isBusy}
                    onPress={() => handleCapturePhoto(slot, false)}
                  >
                    <ImageIcon size={15} color={Colors.text.copper} />
                    <Text style={s.libBtnText}>Library</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Compiled Still-Frame Story Timeline */}
      <View style={s.card}>
        <View style={[s.rowGap, { justifyContent: 'space-between' }]}>
          <View style={s.rowGap}>
            <Film size={16} color={Colors.accent.copper} />
            <Text style={s.sectionLabel}>
              {storyScope === 'mine' ? 'MY STORY TIMELINE' : 'ROOM STORY TIMELINE'} (
              {visibleStoryFrames.length})
            </Text>
          </View>
          <TouchableOpacity onPress={loadSavedPhotos} hitSlop={8}>
            <RefreshCw size={14} color={Colors.text.copper} />
          </TouchableOpacity>
        </View>

        <View style={s.rowGap}>
          {!isHost ? (
            <TouchableOpacity
              style={[s.toggleBtn, storyScope === 'mine' && s.toggleBtnActive]}
              onPress={() => setStoryScope('mine')}
            >
              <Text style={[s.toggleBtnText, storyScope === 'mine' && { color: '#FFF' }]}>
                My Story
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[s.toggleBtn, storyScope === 'room' && s.toggleBtnActive]}
            onPress={() => setStoryScope('room')}
          >
            <Text style={[s.toggleBtnText, storyScope === 'room' && { color: '#FFF' }]}>
              Room Story
            </Text>
          </TouchableOpacity>
          {visibleStoryFrames.length > 0 ? (
            <TouchableOpacity
              style={[s.toggleBtn, localReelPlaying && s.reelBtnActive]}
              onPress={() => {
                const nextPlaying = !localReelPlaying;
                setReelIndex(0);
                setLocalReelPlaying(nextPlaying);
                if (nextPlaying) onReelStart?.();
              }}
            >
              <Play size={13} color="#FFF" />
              <Text style={[s.toggleBtnText, { color: '#FFF' }]}>
                {localReelPlaying ? 'Stop Reel' : 'Play Reel'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {visibleStoryFrames.length === 0 ? (
          <Text style={s.emptyInboxText}>
            {storyScope === 'mine'
              ? 'Your approved photos will compile into your personal story timeline here!'
              : 'Approved photos from the room will compile into a still-frame story here!'}
          </Text>
        ) : (
          visibleStoryFrames.map((frame, i) => (
            <View key={frame.id} style={s.timelineFrame}>
              <View style={s.timelineTop}>
                <Text style={s.timelineNum}>SCENE {i + 1}</Text>
                <Text style={s.timelineBy}>Starring {frame.displayName}</Text>
                {isHost ? (
                  <TouchableOpacity onPress={() => handleModerate(frame.id, 'rejected')}>
                    <Trash2 size={14} color={Colors.accent.crimson} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Image
                source={{ uri: frame.imageDataUrl }}
                style={s.timelineImage}
                resizeMode="cover"
              />
              <Text style={s.timelineCaption}>{frame.storyCaption}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { gap: Spacing.md },
  headerCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 6,
  },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  headerSub: { fontSize: 12, color: Colors.text.secondary, lineHeight: 17 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: BorderRadius.sm,
    padding: 8,
    marginTop: 4,
  },
  consentText: { fontSize: 11, color: Colors.accent.emerald, fontWeight: '600', flex: 1 },
  reelCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 2,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 8,
  },
  reelHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reelEyebrow: { fontSize: 11, fontWeight: '800', color: Colors.text.copper },
  reelImage: { width: '100%', height: 220, borderRadius: BorderRadius.sm, backgroundColor: '#000' },
  reelCaption: { fontSize: 15, fontWeight: '800', color: Colors.text.primary, lineHeight: 21 },
  reelCredit: { fontSize: 11, color: Colors.text.secondary },
  card: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.text.primary, letterSpacing: 0.5 },
  subLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  storyRow: { gap: 8 },
  storyChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  storyChipActive: { backgroundColor: Colors.accent.copper, borderColor: Colors.accent.copper },
  storyChipText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  storyChipTextActive: { color: '#FFFFFF' },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
    paddingVertical: 9,
  },
  toggleBtnActive: { backgroundColor: Colors.accent.emerald, borderColor: Colors.accent.emerald },
  reelBtnActive: { backgroundColor: Colors.accent.copper, borderColor: Colors.accent.copper },
  toggleBtnText: { fontSize: 11, fontWeight: '800', color: Colors.text.secondary },
  emptyInboxText: { fontSize: 12, color: Colors.text.muted, fontStyle: 'italic' },
  inboxItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.sm,
    padding: 8,
    alignItems: 'center',
  },
  inboxThumb: { width: 68, height: 68, borderRadius: BorderRadius.sm, backgroundColor: '#000' },
  inboxName: { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  inboxPrompt: { fontSize: 11, color: Colors.text.secondary },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent.emerald,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent.crimson,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  modBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  guideStep: { fontSize: 12, color: Colors.text.secondary, lineHeight: 18 },
  slotCard: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
    padding: 10,
    gap: 8,
  },
  slotTopRow: { flexDirection: 'row', alignItems: 'center' },
  slotBadge: {
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  slotBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.text.copper },
  slotPrompt: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, lineHeight: 19 },
  snapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent.copper,
    borderRadius: BorderRadius.sm,
    paddingVertical: 9,
  },
  snapBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  libBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  libBtnText: { color: Colors.text.copper, fontSize: 12, fontWeight: '800' },
  timelineFrame: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
    padding: 10,
    gap: 8,
  },
  timelineTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineNum: { fontSize: 10, fontWeight: '800', color: Colors.text.copper },
  timelineBy: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary, flex: 1 },
  timelineImage: { width: '100%', height: 190, borderRadius: BorderRadius.sm, backgroundColor: '#000' },
  timelineCaption: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, lineHeight: 19 },
  slotCardDone: {
    opacity: 0.58,
    borderColor: Colors.accent.emerald,
  },
  slotPromptDone: {
    color: Colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  doneBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.accent.emerald },
  doneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background.inputBg,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  doneBarText: { fontSize: 12, fontWeight: '700', color: Colors.accent.emerald },
});
