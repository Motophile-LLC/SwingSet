export type EventStatus = 'draft' | 'scheduled' | 'active' | 'ended';
export type HostRole = 'owner' | 'co_host';
export type BlockType = 'activity' | 'travel_transition' | 'couple_reconnect';
export type BlockState =
  | 'planned'
  | 'announced'
  | 'active'
  | 'paused'
  | 'ended'
  | 'skipped'
  | 'ended_early';

export type AudienceBucket = 'everyone' | 'singles' | 'couples' | 'groups';
export type AttendeeBucketType = 'single' | 'couple' | 'group';
export type GenderType = 'man' | 'woman' | 'non_binary';
export type InterestedInType = 'women' | 'men' | 'couples' | 'everyone';
export type ExchangeStatus = 'pending' | 'accepted' | 'declined';
export type VerificationMethod = 'nfc' | 'ble_code' | 'ble_auto_pair';

export type SubscriptionTier = 'free' | 'plus' | 'vip' | 'host_pro';
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export type GameSkinId =
  | 'fuse_spark'
  | 'outbreak'
  | 'drop_beat'
  | 'secret_agent'
  | 'cocktail_mixer';

export interface CustomContactField {
  label: string;
  value: string;
}

export interface UserProfile {
  id: string;
  default_display_name: string;
  sso_full_name?: string | null;
  avatar_url?: string | null;
  bucket_type: AttendeeBucketType;
  gender: GenderType;
  interested_in: InterestedInType[];
  bio_tagline?: string | null;
  karaoke_song?: string | null;
  favorite_travel_spot?: string | null;
  hidden_skill?: string | null;
  play_style?: string | null;
  play_boundaries?: string[] | null;
  partner_link_code?: string | null;
  linked_partner_code?: string | null;
  onboarding_completed?: boolean;
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  subscription_expires_at?: string | null;
  can_host_events?: boolean;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_instagram?: string | null;
  contact_club_account?: string | null;
  contact_sls?: string | null;
  contact_custom_fields: CustomContactField[];
}

export interface CouplePrivateCheckin {
  id: string;
  event_id?: string | null;
  user_id: string;
  partner_user_id?: string | null;
  note?: string | null;
  mood?: string | null;
  checked_in_at: string;
  created_at: string;
}

export interface UnlockedContactPayload {
  partner_user_id?: string;
  display_name: string;
  event_title?: string;
  responded_at?: string;
  event_photo_url?: string | null;
  bio_tagline?: string | null;
  phone?: string;
  email?: string;
  instagram?: string;
  club_account?: string;
  sls?: string;
  custom_fields?: CustomContactField[];
}

export interface CatalystGameConfig {
  skin_id: GameSkinId | 'random';
  scramble_min_sec: number; // Default 30
  scramble_max_sec: number; // Default 60
  mingle_duration_sec: number; // 0 (Off), 120, 180, 300
  promo_reward_text?: string;
}

export interface TimelineBlock {
  id: string;
  event_id: string;
  venue_id?: string | null;
  sort_order: number;
  type: BlockType;
  state: BlockState;
  title: string;
  target_bucket: AudienceBucket;
  config: CatalystGameConfig & Record<string, unknown>;
  scheduled_start?: string | null;
  duration_minutes: number;
  host_rating?: 1 | 2 | 3 | null;
  host_feedback_note?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  display_name: string;
  bucket_type: AttendeeBucketType;
  gender: GenderType;
  interested_in: InterestedInType[];
  event_photo_url?: string | null;
  is_checked_in: boolean;
  checked_in_at?: string | null;
  current_venue_id?: string | null;
  shared_field_keys: string[];
  short_code_3?: string | null;
  is_removed: boolean;
}

// ==========================================
// REAL-TIME GAME ENGINE STATE (WebSockets)
// ==========================================
export type GamePhase = 'scramble' | 'mingle' | 'spectator';

export interface PlayerRoundAssignment {
  attendee_id: string;
  ephemeral_ble_id: string; // Rotating BLE beacon token
  short_code_3: string; // 3-char fallback code (e.g. "K7M")
  is_catalyst: boolean;
  role_label: string;
  role_color_hex: string;
  role_icon: string;
  target_label: string; // What they are looking for
  target_icon: string;
  last_catalyst_received_at?: number; // Epoch ms for 18s anti-stall check
  paired_with_ids: string[]; // Attendee IDs matched in Phase 1
  mingle_prompt?: string;
  won_promo_reward?: boolean;
}

export interface LiveRoundBroadcast {
  block_id: string;
  event_id: string;
  skin_id: GameSkinId;
  phase: GamePhase;
  is_paused: boolean;
  phase_started_at: number; // Server epoch ms
  phase_ends_at: number; // Server epoch ms (randomized for scramble)
  promo_reward_text?: string;
  assignments: Record<string, PlayerRoundAssignment>; // Keyed by attendee_id
}

export interface TapTonightRecord {
  tap_id: string;
  event_id: string;
  event_title: string;
  partner_attendee_id: string;
  partner_user_id: string;
  partner_display_name: string;
  partner_photo_url?: string | null;
  interaction_context: string;
  tapped_at: string;
  exchange_status?: ExchangeStatus | 'incoming_pending' | null;
  exchange_id?: string;
  unlocked_contact?: UnlockedContactPayload | null;
}
