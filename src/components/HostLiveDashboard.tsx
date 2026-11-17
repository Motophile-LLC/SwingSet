import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Pause,
  Play,
  PlusCircle,
  SkipForward,
  Square,
  ThumbsDown,
  ThumbsUp,
  UserX,
} from 'lucide-react-native';
import { GAME_SKINS } from '../config/gameSkins';
import { HostIntroBox } from './HostIntroBox';
import {
  BlockState,
  EventAttendee,
  GameSkinId,
  LiveRoundBroadcast,
  TimelineBlock,
} from '../types/swingset';

interface HostLiveDashboardProps {
  eventTitle: string;
  blocks: TimelineBlock[];
  attendees: EventAttendee[];
  liveRound: LiveRoundBroadcast | null;
  onTransitionBlock: (block: TimelineBlock, nextState: BlockState) => Promise<void>;
  onExtendMingle: (seconds: number) => Promise<void>;
  onTogglePause: (paused: boolean) => Promise<void>;
  onRateBlock: (blockId: string, rating: 1 | 2 | 3) => Promise<void>;
  onRemoveAttendeeConfirmed: (attendeeId: string) => Promise<void>;
}

export const HostLiveDashboard: React.FC<HostLiveDashboardProps> = ({
  eventTitle,
  blocks,
  attendees,
  liveRound,
  onTransitionBlock,
  onExtendMingle,
  onTogglePause,
  onRateBlock,
  onRemoveAttendeeConfirmed,
}) => {
  const [confirmRemoveStep1Id, setConfirmRemoveStep1Id] = useState<string | null>(null);

  const activeAttendees = attendees.filter((a) => !a.is_removed && a.is_checked_in);

  // Two-step confirmation guard for emergency attendee removal (Phase 7 rule)
  const handleEmergencyRemovePress = (attendee: EventAttendee) => {
    if (confirmRemoveStep1Id !== attendee.id) {
      setConfirmRemoveStep1Id(attendee.id);
      return;
    }

    Alert.alert(
      'Confirm Permanent Removal',
      `Remove ${attendee.display_name} from ${eventTitle}? This is a last-resort moderation action and cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setConfirmRemoveStep1Id(null),
        },
        {
          text: 'Remove Attendee',
          style: 'destructive',
          onPress: async () => {
            setConfirmRemoveStep1Id(null);
            await onRemoveAttendeeConfirmed(attendee.id);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48, gap: 18 }}>
      <View style={styles.headerBox}>
        <Text style={styles.eyebrow}>HOST COMMAND CENTER</Text>
        <Text style={styles.title}>{eventTitle}</Text>
        <Text style={styles.sub}>{activeAttendees.length} Checked-In Attendees Active</Text>
      </View>

      {/* Live Round Quick Controls */}
      {liveRound ? (
        <View style={styles.liveCard}>
          <Text style={styles.liveBadge}>
            LIVE: {liveRound.phase.toUpperCase()} ({liveRound.skin_id})
          </Text>
          <View style={styles.rowBtns}>
            <Pressable
              style={styles.ctrlBtn}
              onPress={() => onTogglePause(!liveRound.is_paused)}
            >
              {liveRound.is_paused ? <Play color="#34D399" size={18} /> : <Pause color="#FBBF24" size={18} />}
              <Text style={styles.ctrlText}>{liveRound.is_paused ? 'Resume' : 'Pause'}</Text>
            </Pressable>

            {liveRound.phase === 'mingle' ? (
              <Pressable style={styles.ctrlBtn} onPress={() => onExtendMingle(60)}>
                <PlusCircle color="#38BDF8" size={18} />
                <Text style={styles.ctrlText}>+1 Min Mingle</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Linear Event Timeline Blocks */}
      <Text style={styles.sectionTitle}>Event Timeline</Text>
      {blocks.map((block) => (
        <View key={block.id} style={styles.blockCard}>
          <View style={styles.blockTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockState}>{block.state.toUpperCase()}</Text>
              <Text style={styles.blockTitle}>{block.title}</Text>
              <Text style={styles.blockMeta}>
                Target: {block.target_bucket} • {block.duration_minutes}m
              </Text>
            </View>
          </View>

          {(() => {
            const skinId = block.config?.skin_id as GameSkinId | undefined;
            const skin = skinId && GAME_SKINS[skinId] ? GAME_SKINS[skinId] : null;
            if (!skin || block.state === 'ended' || block.state === 'ended_early' || block.state === 'skipped') {
              return null;
            }
            return (
              <HostIntroBox
                gameTitle={skin.name}
                readAloudScript={skin.hostIntro.readAloudScript}
                howToPlay={skin.hostIntro.howToPlay}
                defaultExpanded={false}
              />
            );
          })()}

          <View style={styles.rowBtns}>
            {(block.state === 'planned' || block.state === 'announced') && (
              <>
                <Pressable
                  style={[styles.ctrlBtn, styles.primaryBtn]}
                  onPress={() => onTransitionBlock(block, 'active')}
                >
                  <Play color="#FFFFFF" size={16} />
                  <Text style={styles.primaryBtnText}>Launch Now</Text>
                </Pressable>
                <Pressable
                  style={styles.ctrlBtn}
                  onPress={() => onTransitionBlock(block, 'skipped')}
                >
                  <SkipForward color="#94A3B8" size={16} />
                  <Text style={styles.ctrlText}>Skip</Text>
                </Pressable>
              </>
            )}

            {(block.state === 'active' || block.state === 'paused') && (
              <Pressable
                style={[styles.ctrlBtn, styles.dangerBtn]}
                onPress={() => onTransitionBlock(block, 'ended_early')}
              >
                <Square color="#FFFFFF" size={16} />
                <Text style={styles.primaryBtnText}>End Early</Text>
              </Pressable>
            )}
          </View>

          {/* Post-Round Host Learning Loop Rating */}
          {(block.state === 'ended' || block.state === 'ended_early') && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Rate Round:</Text>
              <Pressable
                style={[styles.rateBtn, block.host_rating === 3 && styles.rateBtnActive]}
                onPress={() => onRateBlock(block.id, 3)}
              >
                <ThumbsUp color="#34D399" size={15} />
                <Text style={styles.rateText}>Worked Great</Text>
              </Pressable>
              <Pressable
                style={[styles.rateBtn, block.host_rating === 1 && styles.rateBtnActive]}
                onPress={() => onRateBlock(block.id, 1)}
              >
                <ThumbsDown color="#F87171" size={15} />
                <Text style={styles.rateText}>Skip Next Time</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {/* Attendee Roster & 2-Step Emergency Moderation */}
      <Text style={styles.sectionTitle}>Checked-In Roster (2-Step Moderation)</Text>
      {activeAttendees.map((att) => {
        const armed = confirmRemoveStep1Id === att.id;
        return (
          <View key={att.id} style={styles.rosterRow}>
            <View>
              <Text style={styles.rosterName}>{att.display_name}</Text>
              <Text style={styles.rosterSub}>{att.bucket_type.toUpperCase()}</Text>
            </View>
            <Pressable
              style={[styles.removeBtn, armed && styles.removeBtnArmed]}
              onPress={() => handleEmergencyRemovePress(att)}
            >
              <UserX color={armed ? '#FFFFFF' : '#F87171'} size={16} />
              <Text style={[styles.removeText, armed && { color: '#FFFFFF' }]}>
                {armed ? 'Tap Again to Confirm' : 'Remove'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 20,
  },
  headerBox: {
    gap: 4,
  },
  eyebrow: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
  },
  sub: {
    color: '#94A3B8',
    fontSize: 14,
  },
  liveCard: {
    backgroundColor: '#1E1B4B',
    borderColor: '#6366F1',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  liveBadge: {
    color: '#A5B4FC',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  blockCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  blockTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blockState: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  blockTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  blockMeta: {
    color: '#94A3B8',
    fontSize: 13,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryBtn: {
    backgroundColor: '#7C3AED',
  },
  dangerBtn: {
    backgroundColor: '#DC2626',
  },
  ctrlText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  ratingLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rateBtnActive: {
    borderWidth: 1,
    borderColor: '#C084FC',
  },
  rateText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  rosterName: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 15,
  },
  rosterSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F1216',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  removeBtnArmed: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  removeText: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 12,
  },
});