import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Compass,
  Heart,
  MapPin,
  Clock,
  Search,
  Sparkles,
  QrCode,
  ShieldAlert,
  Trophy,
  Users,
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/src/lib/supabase';

export type EventCategory =
  | 'Social Mixer'
  | 'Singles'
  | 'Trivia Night'
  | 'Bar / Pub Crawl'
  | 'Lifestyle'
  | 'Corporate / Team';

export type TimeBucket = 'All' | 'Tonight' | 'This Weekend';

export interface NearbyPublicEvent {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  category: EventCategory;
  isLifestyle: boolean;
  venueName: string;
  address: string;
  distanceMiles: number;
  timeLabel: string;
  timeBucket: 'Tonight' | 'This Weekend';
  dressCode: string;
  entryNote: string;
  description: string;
  hasTriviaPoints?: boolean;
}

export const EVENT_CATEGORIES: ('All' | EventCategory)[] = [
  'All',
  'Trivia Night',
  'Social Mixer',
  'Singles',
  'Bar / Pub Crawl',
  'Lifestyle',
  'Corporate / Team',
];

const SAMPLE_NEARBY_EVENTS: NearbyPublicEvent[] = [];

export default function NearbyTabScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | EventCategory>('All');
  const [selectedTime, setSelectedTime] = useState<TimeBucket>('All');
  const [showLifestyle, setShowLifestyle] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<NearbyPublicEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [savedHostKeys, setSavedHostKeys] = useState<string[]>([]);
  const [followingOnly, setFollowingOnly] = useState(false);

  const loadSavedHosts = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from('saved_hosts')
        .select('host_key')
        .eq('user_id', uid);
      if (!error && data) {
        setSavedHostKeys(data.map((r: any) => r.host_key));
      }
    } catch {
      // Ignore if migration 007 not applied yet
    }
  }, []);

  const toggleFollowHost = async (hostId: string, hostName: string) => {
    const isFollowing = savedHostKeys.includes(hostId);
    setSavedHostKeys((prev) =>
      isFollowing ? prev.filter((k) => k !== hostId) : [...prev, hostId]
    );
    setNotice(
      isFollowing
        ? `Unfollowed ${hostName}.`
        : `Following ${hostName}! Filter by "Following" anytime to see their upcoming events.`
    );

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;

      if (isFollowing) {
        await supabase
          .from('saved_hosts')
          .delete()
          .eq('user_id', uid)
          .eq('host_key', hostId);
      } else {
        await supabase.from('saved_hosts').upsert(
          { user_id: uid, host_key: hostId, host_name: hostName },
          { onConflict: 'user_id,host_key' }
        );
      }
    } catch {
      // Local state still works smoothly if migration 007 not applied yet
    }
  };

  const loadLivePublicEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, owner_id, title, description, dress_code, is_lifestyle, category, venue_name, venue_address, starts_at')
        .eq('is_public', true)
        .eq('status', 'active')
        .order('starts_at', { ascending: true })
        .limit(25);

      if (error || !data) return;

      const mapped: NearbyPublicEvent[] = data.map((row: any) => {
        const cat: EventCategory = EVENT_CATEGORIES.includes(row.category)
          ? row.category
          : row.is_lifestyle
          ? 'Lifestyle'
          : 'Social Mixer';
        return {
          id: row.id,
          hostId: row.owner_id || `host_${row.id}`,
          hostName: row.venue_name || 'Live Event Host',
          title: row.title,
          category: cat,
          isLifestyle: Boolean(row.is_lifestyle || cat === 'Lifestyle'),
          venueName: row.venue_name || 'Live Hosted Venue',
          address: row.venue_address || 'Check in at venue for details',
          distanceMiles: 0.5,
          timeLabel: 'Live Now',
          timeBucket: 'Tonight',
          dressCode: row.dress_code || 'Casual',
          entryNote: 'Check in at venue via Door Code or NFC/QR Tap',
          description: row.description || 'Live public SwingSet event.',
          hasTriviaPoints: cat === 'Trivia Night',
        };
      });
      setLiveEvents(mapped);
    } catch {
      // Silently keep sample events if offline or migration 004 not yet applied
    }
  }, []);

  useEffect(() => {
    loadLivePublicEvents();
    loadSavedHosts();
  }, [loadLivePublicEvents, loadSavedHosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadLivePublicEvents(), loadSavedHosts()]);
    setRefreshing(false);
  };

  const allEvents = useMemo(
    () => [...liveEvents, ...SAMPLE_NEARBY_EVENTS],
    [liveEvents]
  );

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEvents.filter((ev) => {
      if (followingOnly && !savedHostKeys.includes(ev.hostId)) return false;
      if (!showLifestyle && ev.isLifestyle) return false;
      if (selectedCategory !== 'All' && ev.category !== selectedCategory) return false;
      if (selectedTime !== 'All' && ev.timeBucket !== selectedTime) return false;
      if (q) {
        const hay = `${ev.title} ${ev.hostName} ${ev.venueName} ${ev.address} ${ev.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [allEvents, followingOnly, savedHostKeys, searchQuery, selectedCategory, selectedTime, showLifestyle]);

  const handleCheckInPress = (ev: NearbyPublicEvent) => {
    setNotice(`Ready to join "${ev.title}" — enter the venue Door Code or tap NFC at ${ev.venueName}.`);
    router.push(`/event/${ev.id}/checkin` as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent.copper}
          />
        }
      >
        {/* Header */}
        <View style={s.headerCard}>
          <View style={s.headerTitleRow}>
            <Compass size={22} color={Colors.accent.copper} />
            <Text style={s.headerTitle}>Nearby Public Events</Text>
          </View>
          <Text style={s.headerDesc}>
            Looking for something to do? Browse public events around you, head to the address, and check in at the venue with a door code or NFC/QR tap.
          </Text>

          {/* Search */}
          <View style={s.searchBox}>
            <Search size={16} color={Colors.text.muted} />
            <TextInput
              style={s.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search venue, event, or neighborhood..."
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          {/* Time & Lifestyle Quick Toggles */}
          <View style={s.quickFilterRow}>
            <View style={s.timePillGroup}>
              {(['All', 'Tonight', 'This Weekend'] as TimeBucket[]).map((bucket) => {
                const active = selectedTime === bucket;
                return (
                  <TouchableOpacity
                    key={bucket}
                    style={[s.timePill, active && s.timePillActive]}
                    onPress={() => setSelectedTime(bucket)}
                  >
                    <Text style={[s.timePillText, active && s.timePillTextActive]}>{bucket}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.followingToggle, followingOnly && s.followingToggleActive]}
              onPress={() => setFollowingOnly((prev) => !prev)}
            >
              <Heart
                size={12}
                color={followingOnly ? '#FFFFFF' : Colors.accent.copper}
                fill={followingOnly ? '#FFFFFF' : 'transparent'}
              />
              <Text style={[s.followingToggleText, followingOnly && { color: '#FFFFFF' }]}>
                Following ({savedHostKeys.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.lifestyleToggle, !showLifestyle && s.lifestyleToggleOff]}
              onPress={() => setShowLifestyle((prev) => !prev)}
            >
              <Text style={[s.lifestyleToggleText, !showLifestyle && s.lifestyleToggleTextOff]}>
                {showLifestyle ? 'Lifestyle: Shown' : 'Lifestyle: Hidden'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filter Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryStrip}
        >
          {EVENT_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            const isLifestyleChip = cat === 'Lifestyle';
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  s.categoryChip,
                  active && s.categoryChipActive,
                  isLifestyleChip && active && s.categoryChipLifestyleActive,
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  if (isLifestyleChip && !showLifestyle) setShowLifestyle(true);
                }}
              >
                <Text
                  style={[
                    s.categoryChipText,
                    active && s.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {notice ? (
          <View style={s.noticeCard}>
            <Sparkles size={16} color={Colors.accent.emerald} />
            <Text style={s.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {/* Event List */}
        {filteredEvents.length === 0 ? (
          <View style={s.emptyCard}>
            <Users size={24} color={Colors.text.muted} />
            <Text style={s.emptyTitle}>No matching public events nearby</Text>
            <Text style={s.emptyDesc}>
              Try clearing your search or switching category/time filters.
            </Text>
          </View>
        ) : (
          filteredEvents.map((ev) => (
            <View
              key={ev.id}
              style={[s.eventCard, ev.isLifestyle && s.eventCardLifestyle]}
            >
              {/* Top Badges Row */}
              <View style={s.badgeRow}>
                <View
                  style={[
                    s.categoryBadge,
                    ev.isLifestyle && s.lifestyleBadge,
                  ]}
                >
                  {ev.isLifestyle ? (
                    <ShieldAlert size={11} color="#FFB4C2" />
                  ) : ev.hasTriviaPoints ? (
                    <Trophy size={11} color={Colors.text.copper} />
                  ) : null}
                  <Text
                    style={[
                      s.categoryBadgeText,
                      ev.isLifestyle && s.lifestyleBadgeText,
                    ]}
                  >
                    {ev.category.toUpperCase()}
                  </Text>
                </View>

                <Text style={s.distanceText}>{ev.distanceMiles.toFixed(1)} mi away</Text>
              </View>

              <Text style={s.eventTitle}>{ev.title}</Text>

              {/* Host & Follow Row */}
              <View style={s.hostRow}>
                <Text style={s.hostText}>Hosted by {ev.hostName}</Text>
                <TouchableOpacity
                  style={[
                    s.followBtn,
                    savedHostKeys.includes(ev.hostId) && s.followBtnActive,
                  ]}
                  onPress={() => toggleFollowHost(ev.hostId, ev.hostName)}
                >
                  <Heart
                    size={12}
                    color={savedHostKeys.includes(ev.hostId) ? '#FFFFFF' : Colors.text.copper}
                    fill={savedHostKeys.includes(ev.hostId) ? '#FFFFFF' : 'transparent'}
                  />
                  <Text
                    style={[
                      s.followBtnText,
                      savedHostKeys.includes(ev.hostId) && s.followBtnTextActive,
                    ]}
                  >
                    {savedHostKeys.includes(ev.hostId) ? 'Following' : 'Follow Host'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Venue & Address */}
              <View style={s.metaRow}>
                <MapPin size={14} color={Colors.accent.copper} />
                <View style={{ flex: 1 }}>
                  <Text style={s.venueName}>{ev.venueName}</Text>
                  <Text style={s.addressText}>{ev.address}</Text>
                </View>
              </View>

              <View style={s.metaRow}>
                <Clock size={14} color={Colors.text.secondary} />
                <Text style={s.timeText}>
                  {ev.timeLabel} • Dress: {ev.dressCode}
                </Text>
              </View>

              <Text style={s.eventDesc}>{ev.description}</Text>

              <View style={s.entryBox}>
                <QrCode size={14} color={Colors.accent.emerald} />
                <Text style={s.entryText}>{ev.entryNote}</Text>
              </View>

              <TouchableOpacity
                style={s.checkInBtn}
                onPress={() => handleCheckInPress(ev)}
              >
                <QrCode size={16} color="#FFFFFF" />
                <Text style={s.checkInBtnText}>Join at Venue (Code / Tap)</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  headerCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  headerDesc: { fontSize: 12, color: Colors.text.secondary, lineHeight: 17, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: 13, padding: 0 },
  quickFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePillGroup: { flexDirection: 'row', gap: 6 },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  timePillActive: {
    backgroundColor: Colors.accent.copper,
    borderColor: Colors.accent.copper,
  },
  timePillText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  timePillTextActive: { color: '#FFFFFF' },
  lifestyleToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent.crimson,
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
  },
  lifestyleToggleOff: {
    borderColor: Colors.border.steelGray,
    backgroundColor: Colors.background.card,
  },
  lifestyleToggleText: { fontSize: 11, fontWeight: '700', color: '#FFB4C2' },
  lifestyleToggleTextOff: { color: Colors.text.muted },
  categoryStrip: {
    paddingVertical: 8,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent.copper,
    borderColor: Colors.accent.copper,
  },
  categoryChipLifestyleActive: {
    backgroundColor: Colors.accent.crimson,
    borderColor: Colors.accent.crimson,
  },
  categoryChipText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  categoryChipTextActive: { color: '#FFFFFF' },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderWidth: 1,
    borderColor: Colors.accent.emerald,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: Spacing.md,
  },
  noticeText: { color: Colors.accent.emerald, fontWeight: '700', fontSize: 12, flex: 1 },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background.darkSteel,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  emptyDesc: { fontSize: 12, color: Colors.text.secondary, textAlign: 'center' },
  eventCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  eventCardLifestyle: {
    borderColor: 'rgba(255, 92, 122, 0.45)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  lifestyleBadge: {
    borderColor: Colors.accent.crimson,
    backgroundColor: 'rgba(255, 92, 122, 0.14)',
  },
  categoryBadgeText: {
    color: Colors.text.copper,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  lifestyleBadgeText: {
    color: '#FFB4C2',
  },
  distanceText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  venueName: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  addressText: { fontSize: 12, color: Colors.text.secondary, marginTop: 1 },
  timeText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, flex: 1 },
  eventDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  entryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  entryText: { fontSize: 12, fontWeight: '600', color: Colors.accent.emerald, flex: 1 },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent.copper,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
  },
  checkInBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  followingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    backgroundColor: Colors.background.card,
  },
  followingToggleActive: {
    backgroundColor: Colors.accent.copper,
  },
  followingToggleText: { fontSize: 11, fontWeight: '700', color: Colors.text.copper },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  hostText: { fontSize: 12, fontWeight: '700', color: Colors.text.copper, flex: 1 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
  },
  followBtnActive: {
    backgroundColor: Colors.accent.copper,
  },
  followBtnText: { fontSize: 11, fontWeight: '800', color: Colors.text.copper },
  followBtnTextActive: { color: '#FFFFFF' },
});
