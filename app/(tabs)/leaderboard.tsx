import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Trophy, Users, Heart, Sparkles, ShieldCheck, Check, ThumbsUp } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useGame } from '@/context/GameContext';
import { useUser } from '@/context/UserContext';

export default function LeaderboardTabScreen() {
  const { profile } = useUser();
  const { totalBusPoints, busGoal, userPoints, mockGuests, toggleGreenLight } = useGame();

  const progressPercent = Math.min(100, Math.round((totalBusPoints / busGoal) * 100));
  const tappedGuests = mockGuests.filter((g) => g.tapped);

  // Ranked leaderboard list including current user + mock guests sorted by points
  const leaderboardList = [
    {
      id: 'me',
      name: `${profile.identity.displayName || 'You'} (You)`,
      points: userPoints,
      taps: tappedGuests.length,
      accolade: 'Host Favorite',
      type: profile.identity.whoYouAre || 'Guest',
    },
    ...mockGuests.map((g) => ({
      id: g.id,
      name: g.name,
      points: g.pointsEarned,
      taps: g.tapped ? 1 : 0,
      accolade: g.accolade,
      type: g.type,
    })),
  ].sort((a, b) => b.points - a.points);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Collective Goal Progress Card */}
        <View style={s.goalCard}>
          <View style={s.goalHeaderRow}>
            <Trophy size={18} color={Colors.accent.copper} />
            <Text style={s.goalTitle}>BUS PARTY METER</Text>
            <Text style={s.goalVal}>{totalBusPoints} / {busGoal} PTS</Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={s.goalDesc}>
            {progressPercent >= 100 ? '🎉 Next VIP Round Unlocked for the Bus!' : `${2500 - totalBusPoints} points needed to unlock Next VIP Party Round!`}
          </Text>
        </View>

        {/* Leaderboard Section */}
        <View style={s.group}>
          <Text style={s.label}>Live Event Leaderboard</Text>
          {leaderboardList.map((item, idx) => {
            const isMe = item.id === 'me';
            return (
              <View key={item.id} style={[s.rankCard, isMe && s.rankCardMe]}>
                <View style={s.rankBadge}>
                  <Text style={[s.rankNum, idx < 3 && { color: Colors.accent.copper }]}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rankName, isMe && { color: Colors.accent.copper }]}>{item.name}</Text>
                  <View style={s.rowGap}>
                    <Text style={s.rankSub}>{item.type}</Text>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.accoladeText}>{item.accolade}</Text>
                  </View>
                </View>
                <View style={s.pointsColumn}>
                  <Text style={s.ptsText}>{item.points} pts</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Met Tonight & Green Light Log */}
        <View style={s.group}>
          <Text style={s.label}>People You Tapped Tonight ({tappedGuests.length})</Text>
          {tappedGuests.length > 0 ? (
            tappedGuests.map((guest) => {
              const isMutuallyGreen = guest.greenLightFromMe && guest.greenLightFromThem;
              return (
                <View key={guest.id} style={s.tapCard}>
                  <View style={s.tapCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tapName}>{guest.name}</Text>
                      <Text style={s.tapMeta}>{guest.type} • Tapped at {guest.tappedAt}</Text>
                    </View>
                    <TouchableOpacity
                      style={[s.vibeBtn, guest.greenLightFromMe && s.vibeBtnActive]}
                      onPress={() => toggleGreenLight(guest.id)}
                    >
                      <ThumbsUp size={14} color={guest.greenLightFromMe ? '#FFF' : Colors.accent.copper} />
                      <Text style={[s.vibeBtnText, guest.greenLightFromMe && s.vibeBtnTextActive]}>
                        {guest.greenLightFromMe ? 'Green-Lit' : 'Green-Light'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Mutual Match / Contact Card Unlocked Banner */}
                  {isMutuallyGreen ? (
                    <View style={s.mutualBox}>
                      <View style={s.mutualHeader}>
                        <Sparkles size={14} color={Colors.accent.emerald} />
                        <Text style={s.mutualTitle}>MUTUAL GREEN-LIGHT! CONTACT UNLOCKED</Text>
                      </View>
                      <Text style={s.mutualBody}>
                        Both of you gave a Green-Light vibe check! Feel free to connect and exchange contact details.
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.privateHint}>
                      🔒 Your Green-Light choice is 100% private unless both of you toggle it on.
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>You haven't tapped any badges yet tonight.</Text>
              <Text style={s.emptySubText}>Head over to the "Play" tab and tap nearby guest badges!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  goalCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  goalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  goalTitle: { fontSize: 13, fontWeight: '800', color: Colors.accent.copper, letterSpacing: 0.5, flex: 1 },
  goalVal: { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  progressBg: { height: 8, backgroundColor: Colors.background.inputBg, borderRadius: 4, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.accent.copper, borderRadius: 4 },
  goalDesc: { fontSize: 12, color: Colors.text.secondary },
  group: { marginBottom: Spacing.md },
  label: { fontSize: 11, fontWeight: '800', color: Colors.text.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  rankCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  rankCardMe: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.background.card, justifyContent: 'center', alignItems: 'center' },
  rankNum: { fontWeight: '800', fontSize: 13, color: Colors.text.primary },
  rankName: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, marginBottom: 2 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankSub: { fontSize: 11, color: Colors.text.secondary },
  dot: { fontSize: 11, color: Colors.text.muted },
  accoladeText: { fontSize: 11, color: Colors.accent.copper, fontWeight: '600' },
  pointsColumn: { alignItems: 'flex-end' },
  ptsText: { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  tapCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  tapCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tapName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  tapMeta: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  vibeBtn: { backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  vibeBtnActive: { backgroundColor: Colors.accent.copper },
  vibeBtnText: { fontSize: 12, fontWeight: '700', color: Colors.accent.copper },
  vibeBtnTextActive: { color: Colors.text.primary },
  mutualBox: { marginTop: Spacing.sm, backgroundColor: 'rgba(46, 175, 125, 0.15)', borderWidth: 1, borderColor: Colors.accent.emerald, borderRadius: BorderRadius.md, padding: 10 },
  mutualHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  mutualTitle: { color: Colors.accent.emerald, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  mutualBody: { color: Colors.text.primary, fontSize: 12, lineHeight: 16 },
  privateHint: { fontSize: 11, color: Colors.text.muted, marginTop: 8, fontStyle: 'italic' },
  emptyCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center' },
  emptyText: { color: Colors.text.primary, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  emptySubText: { color: Colors.text.secondary, fontSize: 12, textAlign: 'center' },
});
