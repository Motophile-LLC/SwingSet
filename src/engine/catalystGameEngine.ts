import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  AudienceBucket,
  AttendeeBucketType,
  CatalystGameConfig,
  EventAttendee,
  GenderType,
  GameSkinId,
  InterestedInType,
  LiveRoundBroadcast,
  PlayerRoundAssignment,
  VerificationMethod,
} from '../types/swingset';
import { GAME_SKINS, pickSkin } from '../config/gameSkins';

const SHORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes 0, O, 1, I
const ANTI_STALL_MS = 18_000;

export function isAttendeeInterestedIn(
  att: EventAttendee,
  targetGender?: GenderType,
  targetBucket?: AttendeeBucketType
): boolean {
  if (!att.interested_in || att.interested_in.length === 0 || att.interested_in.includes('everyone')) {
    return true;
  }
  if (targetBucket === 'couple' && att.interested_in.includes('couples')) {
    return true;
  }
  if (targetGender === 'man' && att.interested_in.includes('men')) {
    return true;
  }
  if (targetGender === 'woman' && att.interested_in.includes('women')) {
    return true;
  }
  return false;
}

export function areAttendeesCompatible(a?: EventAttendee, b?: EventAttendee): boolean {
  if (!a || !b) return true;
  return (
    isAttendeeInterestedIn(a, b.gender, b.bucket_type) &&
    isAttendeeInterestedIn(b, a.gender, a.bucket_type)
  );
}

function generateShortCode3(): string {
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += SHORT_CODE_ALPHABET[Math.floor(Math.random() * SHORT_CODE_ALPHABET.length)];
  }
  return code;
}

function generateEphemeralBleId(): string {
  return `SS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

function isAttendeeTargeted(attendee: EventAttendee, target: AudienceBucket): boolean {
  if (attendee.is_removed || !attendee.is_checked_in) return false;
  if (target === 'everyone') return true;
  if (target === 'singles') return attendee.bucket_type === 'single';
  if (target === 'couples') return attendee.bucket_type === 'couple';
  if (target === 'groups') return attendee.bucket_type === 'group';
  return true;
}

export class CatalystGameEngine {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private state: LiveRoundBroadcast | null = null;
  private antiStallInterval: ReturnType<typeof setInterval> | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private onStateUpdate?: (state: LiveRoundBroadcast) => void;

  constructor(supabase: SupabaseClient, onStateUpdate?: (state: LiveRoundBroadcast) => void) {
    this.supabase = supabase;
    this.onStateUpdate = onStateUpdate;
  }

  /**
   * Subscribe to the event's live Realtime Broadcast channel (used by both Hosts & Attendees)
   */
  public connectToEventChannel(eventId: string): RealtimeChannel {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
    }

    this.channel = this.supabase.channel(`swingset:event:${eventId}`, {
      config: {
        broadcast: { self: true, ack: true },
      },
    });

    this.channel
      .on('broadcast', { event: 'round_state' }, ({ payload }) => {
        this.state = payload as LiveRoundBroadcast;
        this.onStateUpdate?.(this.state);
      })
      .on('broadcast', { event: 'tap_attempt' }, async ({ payload }) => {
        // Host device acts as authoritative arbiter to avoid race conditions
        await this.processTapAttempt(
          payload.initiatorId,
          payload.targetId,
          payload.method as VerificationMethod
        );
      })
      .subscribe();

    return this.channel;
  }

  public disconnect(): void {
    this.clearTimers();
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  public getCurrentState(): LiveRoundBroadcast | null {
    return this.state;
  }

  /**
   * HOST ACTION: Initialize and start Phase 1 (The Scramble)
   */
  public async startRound(params: {
    eventId: string;
    blockId: string;
    attendees: EventAttendee[];
    targetBucket: AudienceBucket;
    config: CatalystGameConfig;
  }): Promise<LiveRoundBroadcast> {
    this.clearTimers();

    const skin = pickSkin(params.config.skin_id);
    const activePlayers = params.attendees.filter((a) =>
      isAttendeeTargeted(a, params.targetBucket)
    );
    const spectators = params.attendees.filter(
      (a) => !a.is_removed && a.is_checked_in && !isAttendeeTargeted(a, params.targetBucket)
    );

    // Shuffle active players
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);

    // Crowd scaling:
    // - 2 players: 0 Catalysts, 1 guaranteed complementary Hunter pair so they match each other
    // - 3 players: 1 Catalyst + 1 complementary Hunter pair
    // - 4+ players: 1 Catalyst per ~8 players + complete complementary Hunter pairs
    const catalystCount =
      shuffled.length <= 2 ? 0 : shuffled.length === 3 ? 1 : Math.max(1, Math.floor(shuffled.length / 8));

    const usedCodes = new Set<string>();
    const uniqueCode = () => {
      let c = generateShortCode3();
      while (usedCodes.has(c)) c = generateShortCode3();
      usedCodes.add(c);
      return c;
    };

    const now = Date.now();
    const minSec = Math.max(15, params.config.scramble_min_sec || 30);
    const maxSec = Math.max(minSec, params.config.scramble_max_sec || 60);
    const randomDurationMs =
      (Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec) * 1000;

    const assignments: Record<string, PlayerRoundAssignment> = {};
    const hunters = shuffled.slice(catalystCount);
    const assignedHunterTokens: typeof skin.hunterTokens = [];

    // Assign hunters in guaranteed complementary pairs (0<->1, 2<->3, ...)
    hunters.forEach((player, hIdx) => {
      const pairGroup = Math.floor(hIdx / 2) % Math.max(1, Math.floor(skin.hunterTokens.length / 2));
      const isSecondInPair = hIdx % 2 === 1;
      const baseToken = skin.hunterTokens[pairGroup * 2] || skin.hunterTokens[0];
      const partnerToken =
        skin.hunterTokens.find((t) => t.id === baseToken.matchesWithId) ||
        skin.hunterTokens[pairGroup * 2 + 1] ||
        skin.hunterTokens[1] ||
        baseToken;

      const assignedToken = isSecondInPair ? partnerToken : baseToken;
      const matchToken = isSecondInPair ? baseToken : partnerToken;
      assignedHunterTokens.push(assignedToken);

      assignments[player.id] = {
        attendee_id: player.id,
        ephemeral_ble_id: generateEphemeralBleId(),
        short_code_3: uniqueCode(),
        is_catalyst: false,
        role_label: assignedToken.label,
        role_color_hex: assignedToken.colorHex,
        role_icon: assignedToken.icon,
        target_label: matchToken.label,
        target_icon: matchToken.icon,
        paired_with_ids: [],
      };
    });

    // Assign Catalysts targeting only tokens actually held by hunters in this round
    const catalystPool = assignedHunterTokens.length > 0 ? assignedHunterTokens : skin.hunterTokens;
    shuffled.slice(0, catalystCount).forEach((player, cIdx) => {
      const targetToken = catalystPool[cIdx % catalystPool.length];
      assignments[player.id] = {
        attendee_id: player.id,
        ephemeral_ble_id: generateEphemeralBleId(),
        short_code_3: uniqueCode(),
        is_catalyst: true,
        role_label: skin.catalystRole.label,
        role_color_hex: skin.catalystRole.colorHex,
        role_icon: skin.catalystRole.icon,
        target_label: targetToken.label,
        target_icon: targetToken.icon,
        last_catalyst_received_at: now,
        paired_with_ids: [],
      };
    });

    // Non-targeted attendees get a clean Lounge / Spectator card
    spectators.forEach((spec) => {
      assignments[spec.id] = {
        attendee_id: spec.id,
        ephemeral_ble_id: generateEphemeralBleId(),
        short_code_3: uniqueCode(),
        is_catalyst: false,
        role_label: 'LOUNGE BREAK',
        role_color_hex: '#334155',
        role_icon: 'coffee',
        target_label: 'Mingle freely until next round',
        target_icon: 'users',
        paired_with_ids: [],
      };
    });

    const roundState: LiveRoundBroadcast = {
      block_id: params.blockId,
      event_id: params.eventId,
      skin_id: skin.id,
      phase: 'scramble',
      is_paused: false,
      phase_started_at: now,
      phase_ends_at: now + randomDurationMs,
      promo_reward_text: params.config.promo_reward_text,
      assignments,
    };

    this.state = roundState;
    await this.broadcastState();
    this.startHostTimers(params.config.mingle_duration_sec ?? 180);

    return roundState;
  }

  /**
   * ATTENDEE ACTION: Broadcast a tap/code verification request to the Host arbiter
   */
  public async submitTap(
    initiatorId: string,
    targetId: string,
    method: VerificationMethod
  ): Promise<void> {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'tap_attempt',
      payload: { initiatorId, targetId, method },
    });
  }

  /**
   * HOST ARBITER: Validates tap rules, transfers Catalyst or pairs Hunters, and logs Taps Tonight
   */
  public async processTapAttempt(
    initiatorId: string,
    targetId: string,
    method: VerificationMethod,
    nearbyBleMap?: Record<string, string[]>
  ): Promise<boolean> {
    if (!this.state || this.state.phase !== 'scramble' || this.state.is_paused) {
      return false;
    }

    const initiator = this.state.assignments[initiatorId];
    const target = this.state.assignments[targetId];
    if (!initiator || !target || initiatorId === targetId) return false;
    if (initiator.role_label === 'LOUNGE BREAK' || target.role_label === 'LOUNGE BREAK') {
      return false;
    }

    const skin = GAME_SKINS[this.state.skin_id];
    const now = Date.now();
    let interactionContext = '';

    // CASE A: Catalyst transfers the heat to a Hunter (overrides Hunter's current pair)
    if (initiator.is_catalyst && !target.is_catalyst) {
      if (target.role_label !== initiator.target_label) return false;

      // Clear target's old hunter pairing if they had one
      target.paired_with_ids.forEach((oldPartnerId) => {
        const oldPartner = this.state?.assignments[oldPartnerId];
        if (oldPartner) {
          oldPartner.paired_with_ids = oldPartner.paired_with_ids.filter((id) => id !== targetId);
        }
      });

      // Swap roles
      const nextTargetToken =
        skin.hunterTokens[Math.floor(Math.random() * skin.hunterTokens.length)];

      target.is_catalyst = true;
      target.role_label = skin.catalystRole.label;
      target.role_color_hex = skin.catalystRole.colorHex;
      target.role_icon = skin.catalystRole.icon;
      target.target_label = nextTargetToken.label;
      target.target_icon = nextTargetToken.icon;
      target.last_catalyst_received_at = now;
      target.paired_with_ids = [];

      // Former catalyst becomes a standard Hunter
      const restoredToken =
        skin.hunterTokens[Math.floor(Math.random() * skin.hunterTokens.length)];
      const restoredMatch =
        skin.hunterTokens.find((t) => t.id === restoredToken.matchesWithId) ||
        skin.hunterTokens[0];

      initiator.is_catalyst = false;
      initiator.role_label = restoredToken.label;
      initiator.role_color_hex = restoredToken.colorHex;
      initiator.role_icon = restoredToken.icon;
      initiator.target_label = restoredMatch.label;
      initiator.target_icon = restoredMatch.icon;

      interactionContext = `Passed the ${skin.catalystRole.label} in ${skin.name}`;
    }
    // CASE B: Two Hunters complete a complementary pair
    else if (!initiator.is_catalyst && !target.is_catalyst) {
      if (initiator.target_label !== target.role_label) return false;
      if (initiator.paired_with_ids.includes(targetId)) return false;

      initiator.paired_with_ids = Array.from(new Set([...initiator.paired_with_ids, targetId]));
      target.paired_with_ids = Array.from(new Set([...target.paired_with_ids, initiatorId]));
      interactionContext = `Paired up in ${skin.name}`;
    } else {
      return false;
    }

    await this.recordTapToDatabase(initiatorId, targetId, interactionContext, method);
    await this.broadcastState();
    return true;
  }

  /**
   * HOST ACTION: Transition from Phase 1 (Scramble) to Phase 2 (Mingle)
   * Automatically resolves odd-number solos via BLE proximity into pairs or trios.
   */
  public async transitionToMingle(
    mingleDurationSec: number,
    bleProximityPairs?: Array<[string, string]>
  ): Promise<void> {
    if (!this.state) return;
    this.clearTimers();

    const skin = GAME_SKINS[this.state.skin_id];
    const allAssignments = Object.values(this.state.assignments).filter(
      (a) => a.role_label !== 'LOUNGE BREAK'
    );

    // 1. Award promo banner to final Catalyst holders
    allAssignments.forEach((p) => {
      if (p.is_catalyst && this.state?.promo_reward_text) {
        p.won_promo_reward = true;
      }
    });

    // 2. Collect all unpaired non-catalyst players so nobody stands alone
    const unpaired = allAssignments.filter(
      (p) => !p.is_catalyst && p.paired_with_ids.length === 0
    );

    // Sort unpaired players using BLE proximity hints if available
    const remaining = [...unpaired];
    if (bleProximityPairs && bleProximityPairs.length > 0) {
      for (const [idA, idB] of bleProximityPairs) {
        const idxA = remaining.findIndex((p) => p.attendee_id === idA);
        const idxB = remaining.findIndex((p) => p.attendee_id === idB);
        if (idxA !== -1 && idxB !== -1) {
          const pA = remaining[idxA];
          const pB = remaining[idxB];
          pA.paired_with_ids = [pB.attendee_id];
          pB.paired_with_ids = [pA.attendee_id];
          await this.recordTapToDatabase(
            pA.attendee_id,
            pB.attendee_id,
            `Mingle Match in ${skin.name}`,
            'ble_auto_pair'
          );
          remaining.splice(Math.max(idxA, idxB), 1);
          remaining.splice(Math.min(idxA, idxB), 1);
        }
      }
    }

    // Pair remaining sequentially; if an odd 1 player remains, merge into an existing pair as a Trio
    while (remaining.length >= 2) {
      const pA = remaining.shift()!;
      const pB = remaining.shift()!;
      pA.paired_with_ids = [pB.attendee_id];
      pB.paired_with_ids = [pA.attendee_id];
      await this.recordTapToDatabase(
        pA.attendee_id,
        pB.attendee_id,
        `Mingle Match in ${skin.name}`,
        'ble_auto_pair'
      );
    }

    if (remaining.length === 1) {
      const oddSolo = remaining[0];
      const existingPairMember = allAssignments.find(
        (p) => !p.is_catalyst && p.paired_with_ids.length === 1 && p.attendee_id !== oddSolo.attendee_id
      );
      if (existingPairMember) {
        const partnerId = existingPairMember.paired_with_ids[0];
        const partner = this.state.assignments[partnerId];
        oddSolo.paired_with_ids = [existingPairMember.attendee_id, partnerId];
        existingPairMember.paired_with_ids.push(oddSolo.attendee_id);
        if (partner) partner.paired_with_ids.push(oddSolo.attendee_id);

        await this.recordTapToDatabase(
          oddSolo.attendee_id,
          existingPairMember.attendee_id,
          `Trio Mingle Match in ${skin.name}`,
          'ble_auto_pair'
        );
      }
    }

    // 3. Assign identical icebreaker prompt to each matched pair/trio
    const assignedPromptGroups = new Set<string>();
    allAssignments.forEach((p) => {
      if (assignedPromptGroups.has(p.attendee_id)) return;
      const prompt =
        skin.minglePrompts[Math.floor(Math.random() * skin.minglePrompts.length)];
      p.mingle_prompt = prompt;
      assignedPromptGroups.add(p.attendee_id);

      p.paired_with_ids.forEach((partnerId) => {
        const partner = this.state?.assignments[partnerId];
        if (partner) {
          partner.mingle_prompt = prompt;
          assignedPromptGroups.add(partnerId);
        }
      });
    });

    const now = Date.now();
    this.state.phase = 'mingle';
    this.state.phase_started_at = now;
    this.state.phase_ends_at = now + Math.max(0, mingleDurationSec) * 1000;

    await this.broadcastState();
  }

  /**
   * HOST LIVE CONTROLS: Extend Mingle (+1 min) or End Early
   */
  public async extendMingle(extraSeconds = 60): Promise<void> {
    if (!this.state || this.state.phase !== 'mingle') return;
    this.state.phase_ends_at += extraSeconds * 1000;
    await this.broadcastState();
  }

  public async togglePause(paused: boolean): Promise<void> {
    if (!this.state) return;
    this.state.is_paused = paused;
    await this.broadcastState();
  }

  private startHostTimers(mingleDurationSec: number): void {
    if (!this.state) return;

    // 1. Anti-Stall Check every 3s: auto-transfer any Catalyst held > 18s
    this.antiStallInterval = setInterval(async () => {
      if (!this.state || this.state.phase !== 'scramble' || this.state.is_paused) return;
      const now = Date.now();
      const players = Object.values(this.state.assignments).filter(
        (p) => p.role_label !== 'LOUNGE BREAK'
      );
      const stalledCatalysts = players.filter(
        (p) =>
          p.is_catalyst &&
          p.last_catalyst_received_at &&
          now - p.last_catalyst_received_at >= ANTI_STALL_MS
      );
      const availableHunters = players.filter((p) => !p.is_catalyst);

      if (stalledCatalysts.length > 0 && availableHunters.length > 0) {
        const stalled = stalledCatalysts[0];
        const randomHunter =
          availableHunters[Math.floor(Math.random() * availableHunters.length)];
        // Force matching target label so transfer succeeds cleanly
        stalled.target_label = randomHunter.role_label;
        await this.processTapAttempt(stalled.attendee_id, randomHunter.attendee_id, 'ble_auto_pair');
      }
    }, 3000);

    // 2. Randomized Scramble End Timer -> Auto-transition to Mingle
    const remainingMs = Math.max(1000, this.state.phase_ends_at - Date.now());
    this.phaseTimer = setTimeout(async () => {
      await this.transitionToMingle(mingleDurationSec);
    }, remainingMs);
  }

  private clearTimers(): void {
    if (this.antiStallInterval) {
      clearInterval(this.antiStallInterval);
      this.antiStallInterval = null;
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private async broadcastState(): Promise<void> {
    if (!this.channel || !this.state) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'round_state',
      payload: this.state,
    });
  }

  private async recordTapToDatabase(
    id1: string,
    id2: string,
    interactionContext: string,
    method: VerificationMethod
  ): Promise<void> {
    if (!this.state) return;
    // Always order UUIDs deterministically to satisfy unique(event_id, block_id, attendee_a_id, attendee_b_id)
    const [attendee_a_id, attendee_b_id] = id1 < id2 ? [id1, id2] : [id2, id1];

    await this.supabase.from('event_taps').upsert(
      {
        event_id: this.state.event_id,
        block_id: this.state.block_id,
        attendee_a_id,
        attendee_b_id,
        interaction_context: interactionContext,
        verification_method: method,
      },
      { onConflict: 'event_id,block_id,attendee_a_id,attendee_b_id' }
    );
  }
}