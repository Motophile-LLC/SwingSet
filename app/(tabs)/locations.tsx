import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { MapPin, Navigation, CheckCircle2, ShieldCheck, Sparkles, Award } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useGame } from '@/context/GameContext';

export interface VenueLocation {
  id: string;
  name: string;
  neighborhood: string;
  subtitle: string;
  vibeRating: string;
  dressCode: string;
  comfortFeatures: string[];
  sideQuestTitle: string;
  sideQuestDesc: string;
}

export const VENUE_LOCATIONS: VenueLocation[] = [
  {
    id: 'venue_1',
    name: 'The Nations Taproom Hub',
    neighborhood: 'West Nashville',
    subtitle: 'Casual Craft Cans & Patio Icebreaker Kickoff',
    vibeRating: '★ 4.9 Kickoff',
    dressCode: 'Rugged Refined',
    comfortFeatures: ['Patio Mingling', 'Easy Bus Parking', 'Food Trucks'],
    sideQuestTitle: 'Patio Kickoff Toast',
    sideQuestDesc: 'Meet 2 new attendees at patio bar and tap badges.',
  },
  {
    id: 'venue_2',
    name: 'Wedgewood-Houston Social Lounge',
    neighborhood: 'WeHo District',
    subtitle: 'Cocktail Speakeasy & Low-Light Vibe Check Stop',
    vibeRating: '★ 4.8 Speakeasy',
    dressCode: 'Upscale Casual',
    comfortFeatures: ['Private Booths', 'Low-Light Mood', 'Craft Cocktails'],
    sideQuestTitle: 'Speakeasy Vibe Check',
    sideQuestDesc: 'Find a couple at velvet lounge & compare drinks.',
  },
  {
    id: 'venue_3',
    name: 'Printers Alley Velvet Parlor',
    neighborhood: 'Downtown Nashville',
    subtitle: 'Downtown Private Mezzanine — Couple vs. Couple Side Quest',
    vibeRating: '★ 4.9 Velvet Parlor',
    dressCode: 'Velvet Chic',
    comfortFeatures: ['Couple vs Couple Zone', 'Curtained Alcoves', 'VIP Access'],
    sideQuestTitle: 'Parlor Duo Quest',
    sideQuestDesc: 'Pair up for 2v2 trivia mini-game on private mezzanine.',
  },
  {
    id: 'venue_4',
    name: 'Late-Night Private Oasis',
    neighborhood: 'Afterhours Club',
    subtitle: 'Members-Only Lifestyle Mixer & Mutual Green-Light Lounge',
    vibeRating: '★ 5.0 Private Oasis',
    dressCode: 'Afterhours Elegant',
    comfortFeatures: ['Green-Light Lounge', 'Members-Only', 'Live DJ Patio'],
    sideQuestTitle: 'Green-Light Check-In',
    sideQuestDesc: 'Privately toggle green lights & check-in for late matches.',
  },
];

export default function LocationsTabScreen() {
  const { checkedInVenues, checkInVenue } = useGame();
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  const handleVenueCheckIn = (venue: VenueLocation) => {
    const newlyAdded = checkInVenue(venue.id);
    if (newlyAdded) {
      setActiveNotice(`Checked in at ${venue.name}! +200 pts unlocked.`);
    } else {
      setActiveNotice(`Already checked in at ${venue.name}. Timeline updated.`);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerCard}>
          <View style={s.headerTitleRow}>
            <MapPin size={22} color={Colors.accent.copper} />
            <Text style={s.headerTitle}>Nashville Excursion Crawl</Text>
          </View>
          <Text style={s.headerDesc}>
            Curated excursion stops & lifestyle-friendly venues with reserved access and live NFC side quests.
          </Text>
        </View>

        {activeNotice ? (
          <View style={s.noticeCard}>
            <Sparkles size={16} color={Colors.accent.emerald} />
            <Text style={s.noticeText}>{activeNotice}</Text>
          </View>
        ) : null}

        {VENUE_LOCATIONS.map((v, i) => {
          const isDone = checkedInVenues.includes(v.id);
          return (
            <View key={v.id} style={[s.venueCard, isDone && s.venueCardChecked]}>
              <View style={s.stopBadgeRow}>
                <View style={s.stopBadge}><Text style={s.stopBadgeText}>STOP {i + 1}</Text></View>
                <Text style={s.neighborhoodText}>{v.neighborhood}</Text>
                {isDone && (
                  <View style={s.checkedBadge}>
                    <CheckCircle2 size={12} color={Colors.accent.emerald} />
                    <Text style={s.checkedText}>Checked In</Text>
                  </View>
                )}
              </View>

              <Text style={s.venueName}>{v.name}</Text>
              <Text style={s.venueSub}>{v.subtitle}</Text>

              <View style={s.metaGrid}>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>VIBE RATING</Text>
                  <Text style={s.metaValue}>{v.vibeRating}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>DRESS CODE</Text>
                  <Text style={s.metaValue}>{v.dressCode}</Text>
                </View>
              </View>

              <Text style={s.sectionHeader}>COUPLE & LIFESTYLE COMFORT FEATURES</Text>
              <View style={s.featureGrid}>
                {v.comfortFeatures.map((f) => (
                  <View key={f} style={s.featureChip}>
                    <ShieldCheck size={12} color={Colors.accent.copper} />
                    <Text style={s.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={s.sideQuestCard}>
                <View style={s.sideQuestHeader}>
                  <Award size={16} color={Colors.accent.copper} />
                  <Text style={s.sideQuestTitle}>Side Quest: {v.sideQuestTitle}</Text>
                </View>
                <Text style={s.sideQuestDesc}>{v.sideQuestDesc}</Text>
              </View>

              <TouchableOpacity
                style={[s.checkInBtn, isDone && s.checkInBtnDone]}
                onPress={() => handleVenueCheckIn(v)}
              >
                <Navigation size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={s.checkInBtnText}>
                  {isDone ? 'Checked In — Re-verify (+200 pts)' : 'Check-In Here via NFC / Unlock Venue (+200 pts)'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  headerCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  headerDesc: { fontSize: 12, color: Colors.text.secondary, lineHeight: 17 },
  noticeCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(46, 175, 125, 0.15)', borderWidth: 1, borderColor: Colors.accent.emerald, borderRadius: BorderRadius.md, padding: 12, marginBottom: Spacing.md },
  noticeText: { color: Colors.accent.emerald, fontWeight: '700', fontSize: 13, flex: 1 },
  venueCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  venueCardChecked: { borderColor: Colors.accent.emerald, backgroundColor: '#121A17' },
  stopBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  stopBadge: { backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.accent.copper, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  stopBadgeText: { color: Colors.accent.copper, fontSize: 10, fontWeight: '800' },
  neighborhoodText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },
  checkedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', backgroundColor: 'rgba(46, 175, 125, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  checkedText: { color: Colors.accent.emerald, fontSize: 11, fontWeight: '700' },
  venueName: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, marginBottom: 2 },
  venueSub: { fontSize: 12, color: Colors.text.secondary, marginBottom: 12, lineHeight: 16 },
  metaGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaItem: { flex: 1, backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, padding: 8 },
  metaLabel: { fontSize: 9, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 0.5 },
  metaValue: { fontSize: 12, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  sectionHeader: { fontSize: 10, fontWeight: '800', color: Colors.text.secondary, letterSpacing: 0.5, marginBottom: 6 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  featureChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  featureText: { color: Colors.text.primary, fontSize: 11, fontWeight: '600' },
  sideQuestCard: { backgroundColor: 'rgba(200, 109, 81, 0.12)', borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.md, padding: 10, marginBottom: 12 },
  sideQuestHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sideQuestTitle: { color: Colors.accent.copper, fontSize: 12, fontWeight: '800' },
  sideQuestDesc: { color: Colors.text.primary, fontSize: 12, lineHeight: 16 },
  checkInBtn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  checkInBtnDone: { backgroundColor: '#217A5A' },
  checkInBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});
