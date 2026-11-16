import { SupabaseClient } from '@supabase/supabase-js';
import {
  TapTonightRecord,
  UnlockedContactPayload,
  UserProfile,
} from '../types/swingset';

/**
 * Builds the exact permitted contact payload based on the attendee's
 * event check-in `shared_field_keys` (Phone, Email, Instagram, Club, SLS, Custom 0-3).
 */
export function buildPermittedContactSnapshot(
  profile: UserProfile,
  displayName: string,
  eventPhotoUrl: string | null | undefined,
  sharedFieldKeys: string[]
): UnlockedContactPayload {
  const allowed = new Set(
    sharedFieldKeys && sharedFieldKeys.length > 0
      ? sharedFieldKeys
      : ['phone', 'email', 'instagram', 'club_account', 'sls', 'custom_0', 'custom_1', 'custom_2', 'custom_3']
  );
  const snapshot: UnlockedContactPayload = {
    partner_user_id: profile.id,
    display_name: displayName || profile.default_display_name,
    event_photo_url: eventPhotoUrl ?? profile.avatar_url ?? null,
    bio_tagline: profile.bio_tagline ?? null,
  };

  if (allowed.has('phone') && profile.contact_phone) {
    snapshot.phone = profile.contact_phone;
  }
  if (allowed.has('email') && profile.contact_email) {
    snapshot.email = profile.contact_email;
  }
  if (allowed.has('instagram') && profile.contact_instagram) {
    snapshot.instagram = profile.contact_instagram;
  }
  if (allowed.has('club_account') && profile.contact_club_account) {
    snapshot.club_account = profile.contact_club_account;
  }
  if (allowed.has('sls') && profile.contact_sls) {
    snapshot.sls = profile.contact_sls;
  }

  const unlockedCustom = (profile.contact_custom_fields || []).filter(
    (f, idx) =>
      allowed.has(`custom_${idx}`) &&
      f?.value &&
      !['boundaries', 'play_style', 'partner_code'].includes(f.label)
  );
  if (unlockedCustom.length > 0) {
    snapshot.custom_fields = unlockedCustom;
  }

  return snapshot;
}

export class ContactExchangeService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Fetches the user's private all-time Taps history (or event-specific taps) along with exchange status.
   */
  public async getTapsHistory(userId: string, eventId?: string): Promise<TapTonightRecord[]> {
    let attendeeQuery = this.supabase
      .from('event_attendees')
      .select('id, event_id, events(title)')
      .eq('user_id', userId);

    if (eventId) {
      attendeeQuery = attendeeQuery.eq('event_id', eventId);
    }

    const { data: myAttendances, error: attErr } = await attendeeQuery;
    if (attErr || !myAttendances || myAttendances.length === 0) return [];

    const myAttendeeIds = myAttendances.map((a) => a.id);
    const eventTitleByEventId = new Map<string, string>();
    myAttendances.forEach((a: any) => {
      eventTitleByEventId.set(a.event_id, a.events?.title || 'SwingSet Event');
    });

    const { data: taps, error: tapErr } = await this.supabase
      .from('event_taps')
      .select(`
        id,
        event_id,
        attendee_a_id,
        attendee_b_id,
        interaction_context,
        tapped_at,
        attendee_a:event_attendees!event_taps_attendee_a_id_fkey(id, user_id, display_name, event_photo_url),
        attendee_b:event_attendees!event_taps_attendee_b_id_fkey(id, user_id, display_name, event_photo_url)
      `)
      .or(`attendee_a_id.in.(${myAttendeeIds.join(',')}),attendee_b_id.in.(${myAttendeeIds.join(',')})`)
      .order('tapped_at', { ascending: false });

    if (tapErr || !taps) return [];

    const { data: exchanges } = await this.supabase
      .from('contact_exchanges')
      .select('*')
      .or(`requester_user_id.eq.${userId},recipient_user_id.eq.${userId}`);

    const seenPartnerEvent = new Set<string>();
    const results: TapTonightRecord[] = [];

    for (const tap of taps as any[]) {
      const iAmA = myAttendeeIds.includes(tap.attendee_a_id);
      const partner = iAmA ? tap.attendee_b : tap.attendee_a;
      if (!partner) continue;

      const dedupeKey = `${tap.event_id}:${partner.user_id}`;
      if (seenPartnerEvent.has(dedupeKey)) continue;
      seenPartnerEvent.add(dedupeKey);

      const ex = (exchanges || []).find(
        (e: any) =>
          e.event_id === tap.event_id &&
          ((e.requester_user_id === userId && e.recipient_user_id === partner.user_id) ||
            (e.recipient_user_id === userId && e.requester_user_id === partner.user_id))
      );

      let exchangeStatus: TapTonightRecord['exchange_status'] = null;
      let unlockedContact: UnlockedContactPayload | null = null;

      if (ex) {
        if (ex.status === 'accepted') {
          exchangeStatus = 'accepted';
          unlockedContact =
            ex.requester_user_id === userId
              ? ex.recipient_unlocked_data
              : ex.requester_unlocked_data;
        } else if (ex.status === 'declined') {
          exchangeStatus = 'declined';
        } else if (ex.status === 'pending') {
          exchangeStatus =
            ex.recipient_user_id === userId ? 'incoming_pending' : 'pending';
        }
      }

      results.push({
        tap_id: tap.id,
        event_id: tap.event_id,
        event_title: eventTitleByEventId.get(tap.event_id) || 'SwingSet Event',
        partner_attendee_id: partner.id,
        partner_user_id: partner.user_id,
        partner_display_name: partner.display_name,
        partner_photo_url: partner.event_photo_url,
        interaction_context: tap.interaction_context,
        tapped_at: tap.tapped_at,
        exchange_status: exchangeStatus,
        exchange_id: ex?.id,
        unlocked_contact: unlockedContact,
      });
    }

    return results;
  }

  /**
   * Initiates a mutual "Request Contact Exchange" from a verified game tap
   */
  public async requestContactExchange(params: {
    eventId: string;
    requesterUserId: string;
    recipientUserId: string;
  }): Promise<{ error: string | null }> {
    const [{ data: profile }, { data: attendance }] = await Promise.all([
      this.supabase.from('profiles').select('*').eq('id', params.requesterUserId).maybeSingle(),
      this.supabase
        .from('event_attendees')
        .select('display_name, event_photo_url, shared_field_keys')
        .eq('event_id', params.eventId)
        .eq('user_id', params.requesterUserId)
        .maybeSingle(),
    ]);

    if (!profile) {
      return { error: 'Could not load your static profile.' };
    }

    const requesterSnapshot = buildPermittedContactSnapshot(
      profile as UserProfile,
      attendance?.display_name || profile.default_display_name,
      attendance?.event_photo_url || profile.avatar_url,
      attendance?.shared_field_keys || []
    );

    const { error } = await this.supabase.from('contact_exchanges').upsert(
      {
        event_id: params.eventId,
        requester_user_id: params.requesterUserId,
        recipient_user_id: params.recipientUserId,
        status: 'pending',
        requester_unlocked_data: requesterSnapshot,
      },
      { onConflict: 'event_id,requester_user_id,recipient_user_id' }
    );

    return { error: error ? error.message : null };
  }

  /**
   * Recipient accepts or declines an incoming contact exchange request.
   * Upon acceptance, both users' permitted snapshots unlock permanently in their Little Black Book.
   */
  public async respondToContactExchange(params: {
    exchangeId: string;
    recipientUserId: string;
    accept: boolean;
  }): Promise<{ error: string | null }> {
    if (!params.accept) {
      const { error } = await this.supabase
        .from('contact_exchanges')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', params.exchangeId)
        .eq('recipient_user_id', params.recipientUserId);

      return { error: error ? error.message : null };
    }

    const { data: exchange } = await this.supabase
      .from('contact_exchanges')
      .select('event_id')
      .eq('id', params.exchangeId)
      .maybeSingle();

    if (!exchange) return { error: 'Exchange request not found.' };

    const [{ data: profile }, { data: attendance }] = await Promise.all([
      this.supabase.from('profiles').select('*').eq('id', params.recipientUserId).maybeSingle(),
      this.supabase
        .from('event_attendees')
        .select('display_name, event_photo_url, shared_field_keys')
        .eq('event_id', exchange.event_id)
        .eq('user_id', params.recipientUserId)
        .maybeSingle(),
    ]);

    if (!profile) {
      return { error: 'Could not load your static profile.' };
    }

    const recipientSnapshot = buildPermittedContactSnapshot(
      profile as UserProfile,
      attendance?.display_name || profile.default_display_name,
      attendance?.event_photo_url || profile.avatar_url,
      attendance?.shared_field_keys || []
    );

    const { error } = await this.supabase
      .from('contact_exchanges')
      .update({
        status: 'accepted',
        recipient_unlocked_data: recipientSnapshot,
        responded_at: new Date().toISOString(),
      })
      .eq('id', params.exchangeId)
      .eq('recipient_user_id', params.recipientUserId);

    return { error: error ? error.message : null };
  }

  /**
   * Little Black Book (Permanent Address Book): returns all mutually accepted contacts across all past events,
   * merged with live static profile updates so contact info never goes stale.
   */
  public async getPermanentAddressBook(userId: string): Promise<UnlockedContactPayload[]> {
    const { data, error } = await this.supabase
      .from('contact_exchanges')
      .select(`
        id,
        event_id,
        requester_user_id,
        recipient_user_id,
        requester_unlocked_data,
        recipient_unlocked_data,
        responded_at,
        events(title)
      `)
      .eq('status', 'accepted')
      .or(`requester_user_id.eq.${userId},recipient_user_id.eq.${userId}`)
      .order('responded_at', { ascending: false });

    if (error || !data || data.length === 0) return [];

    const partnerUserIds = Array.from(
      new Set(
        data.map((row: any) =>
          row.requester_user_id === userId ? row.recipient_user_id : row.requester_user_id
        )
      )
    );

    // Fetch live static profiles for mutually accepted contacts (permitted by RLS policy)
    const { data: liveProfiles } = await this.supabase
      .from('profiles')
      .select('*')
      .in('id', partnerUserIds);

    const profileMap = new Map<string, UserProfile>();
    (liveProfiles || []).forEach((p: any) => profileMap.set(p.id, p as UserProfile));

    return data.map((row: any) => {
      const partnerId =
        row.requester_user_id === userId ? row.recipient_user_id : row.requester_user_id;
      const snap: UnlockedContactPayload =
        (row.requester_user_id === userId
          ? row.recipient_unlocked_data
          : row.requester_unlocked_data) || { display_name: 'Connected Guest' };
      const live = profileMap.get(partnerId);

      return {
        partner_user_id: partnerId,
        display_name: live?.default_display_name || snap.display_name || 'Connected Guest',
        event_title: row.events?.title || snap.event_title || 'SwingSet Event',
        responded_at: row.responded_at,
        event_photo_url: snap.event_photo_url || live?.avatar_url || null,
        bio_tagline: live?.bio_tagline || snap.bio_tagline || null,
        phone: live?.contact_phone || snap.phone,
        email: live?.contact_email || snap.email,
        instagram: live?.contact_instagram || snap.instagram,
        club_account: live?.contact_club_account || snap.club_account,
        sls: live?.contact_sls || snap.sls,
        custom_fields: snap.custom_fields,
      };
    });
  }
}
