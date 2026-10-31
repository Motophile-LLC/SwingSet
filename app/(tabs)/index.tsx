import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, Radio, RefreshCw, Trophy, Users, Check, Sparkles, X, Heart, Lock, MapPin, Grid, Shield, Play, HelpCircle, ArrowRight } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useGame, TapResult, MockGuest } from '@/context/GameContext';
import { useUser } from '@/context/UserContext';

export interface BingoSquare {
  id: string;
  trait: string;
  stamped: boolean;
  stampedBy?: string;
}

const INITIAL_BINGO_GRID: BingoSquare[] = [
  { id: 'b1', trait: 'Visited 5+ states this year', stamped: false },
  { id: 'b2', trait: 'Has a hidden talent', stamped: false },
  { id: 'b3', trait: 'Loves 90s Grunge', stamped: false },
  { id: 'b4', trait: 'First time at a mixer', stamped: false },
  { id: 'b5', trait: 'Espresso Martini Master', stamped: false },
  { id: 'b6', trait: 'Go-to Karaoke Singer', stamped: false },
  { id: 'b7', trait: 'Salsa Dancing Pro', stamped: false },
  { id: 'b8', trait: 'Amalfi Coast Fan', stamped: false },
  { id: 'b9', trait: 'Mixology Wizard', stamped: false },
];

export default function PlayArenaScreen() {
  const router = useRouter();
  const { profile, lockSession } = useUser();
  const {
    roomCode,
    isNfcBound,
    boundNfcTagId,
    userPoints,
    beaconColor,
    beaconColorHex,
    mockGuests,
    toggleNfcBinding,
    cycleBeaconColor,
    setGameMode,
    simulateNfcTap,
    toggleGreenLight,
    awardPoints,
  } = useGame();

  const [currentMode, setCurrentMode] = useState<'chameleon' | 'bingo' | 'duoQuest' | 'partnerCheckIn'>('chameleon');
  const [chameleonTimer, setChameleonTimer] = useState(15);
  const [isTimerActive, setIsTimerActive] = useState(true);

  const [triviaGuest, setTriviaGuest] = useState<MockGuest | null>(null);
  const [triviaModalVisible, setTriviaModalVisible] = useState(false);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  const [triviaCorrect, setTriviaCorrect] = useState<boolean | null>(null);

  const [bingoGrid, setBingoGrid] = useState<BingoSquare[]>(INITIAL_BINGO_GRID);
  const [selectedBingoSquare, setSelectedBingoSquare] = useState<BingoSquare | null>(null);
  const [bingoModalVisible, setBingoModalVisible] = useState(false);

  const [duoStep1, setDuoStep1] = useState(false);
  const [duoStep2, setDuoStep2] = useState(false);
  const [duoCompleted, setDuoCompleted] = useState(false);

  const [partnerTimer, setPartnerTimer] = useState(60);
  const [isPartnerTimerRunning, setIsPartnerTimerRunning] = useState(false);
  const [partnerTapped, setPartnerTapped] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && currentMode === 'chameleon') {
      interval = setInterval(() => {
        setChameleonTimer((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, currentMode]);

  useEffect(() => {
    if (chameleonTimer === 0) {
      cycleBeaconColor();
      setChameleonTimer(15);
    }
  }, [chameleonTimer, cycleBeaconColor]);

  useEffect(() => {
    let interval: any = null;
    if (isPartnerTimerRunning && partnerTimer > 0) {
      interval = setInterval(() => {
        setPartnerTimer((prev) => prev - 1);
      }, 1000);
    } else if (partnerTimer === 0) {
      setIsPartnerTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isPartnerTimerRunning, partnerTimer]);

  const handleLockSession = () => {
    lockSession();
    router.replace('/(auth)/login' as any);
  };

  const handleOpenTrivia = (guest: MockGuest) => {
    setTriviaGuest(guest);
    setTriviaAnswered(false);
    setTriviaCorrect(null);
    setTriviaModalVisible(true);
  };

  const handleSelectTriviaOption = (isCorrect: boolean) => {
    setTriviaAnswered(true);
    setTriviaCorrect(isCorrect);
    if (isCorrect && triviaGuest) {
      simulateNfcTap(triviaGuest.id);
      awardPoints(100);
      setFeedbackMsg(`Correct Trivia! +100 pts for connecting with ${triviaGuest.name}`);
    }
  };

  const handleStampBingoSquare = (guest: MockGuest) => {
    if (!selectedBingoSquare) return;
    setBingoGrid((prev) =>
      prev.map((sq) =>
        sq.id === selectedBingoSquare.id ? { ...sq, stamped: true, stampedBy: guest.name } : sq
      )
    );
    awardPoints(150);
    setBingoModalVisible(false);
    setSelectedBingoSquare(null);
    setFeedbackMsg(`Stamped "${selectedBingoSquare.trait}" with ${guest.name}! +150 pts`);
  };

  const handleCompleteDuoChallenge = () => {
    if (duoStep1 && duoStep2 && !duoCompleted) {
      setDuoCompleted(true);
      awardPoints(250);
      setFeedbackMsg('Duo Venue Quest Completed! +250 pts awarded!');
    }
  };

  const handlePartnerReconnectTap = () => {
    setPartnerTapped(true);
    awardPoints(150);
    setIsPartnerTimerRunning(true);
    setPartnerTimer(60);
    setFeedbackMsg('Partner Home-Base Reconnect Successful! +150 bonus pts awarded.');
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        
        {/* Top Header Bar */}
        <View style={s.topBar}>
          <View style={s.roomBadge}>
            <Radio size={14} color={Colors.accent.copper} />
            <Text style={s.roomText}>#{roomCode}</Text>
          </View>
          <View style={s.statsRow}>
            <View style={s.statBadge}>
              <Trophy size={14} color={Colors.accent.copper} />
              <Text style={s.statText}>{userPoints} pts</Text>
            </View>
            <TouchableOpacity style={s.lockBtn} onPress={handleLockSession}>
              <Lock size={14} color={Colors.accent.crimson} />
            </TouchableOpacity>
          </View>
        </View>

        {/* NFC Binding Status */}
        <TouchableOpacity style={s.bindChip} onPress={toggleNfcBinding}>
          <View style={[s.bindDot, isNfcBound ? s.bindDotActive : s.bindDotInactive]} />
          <Text style={s.bindText}>
            {isNfcBound ? `NFC Tag Bound (${boundNfcTagId})` : 'Tap to Bind My NFC Badge'}
          </Text>
        </TouchableOpacity>

        {/* Feedback Alert Banner */}
        {feedbackMsg ? (
          <View style={s.feedbackCard}>
            <Sparkles size={16} color={Colors.accent.emerald} />
            <Text style={s.feedbackText}>{feedbackMsg}</Text>
            <TouchableOpacity onPress={() => setFeedbackMsg(null)}>
              <X size={16} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Venue Crawl Banner */}
        <TouchableOpacity style={s.venueCrawlBanner} onPress={() => router.push('/(tabs)/locations' as any)}>
          <MapPin size={18} color={Colors.accent.copper} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.crawlTitle}>Nashville Venue Crawl Active</Text>
            <Text style={s.crawlSub}>Tap to view curated stops & check-in for +200 pts</Text>
          </View>
          <ArrowRight size={16} color={Colors.accent.copper} />
        </TouchableOpacity>

        {/* Interactive Game Mode Selector */}
        <Text style={s.sectionHeaderTitle}>SELECT INTERACTIVE GAME MODE</Text>
        <View style={s.modeTabGrid}>
          <TouchableOpacity
            style={[s.modeTab, currentMode === 'chameleon' && s.modeTabActive]}
            onPress={() => {
              setCurrentMode('chameleon');
              setGameMode('chameleon');
            }}
          >
            <Zap size={16} color={currentMode === 'chameleon' ? Colors.accent.copper : Colors.text.secondary} />
            <Text style={[s.modeTabText, currentMode === 'chameleon' && s.modeTabTextActive]}>Chameleon</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeTab, currentMode === 'bingo' && s.modeTabActive]}
            onPress={() => {
              setCurrentMode('bingo');
              setGameMode('bingo');
            }}
          >
            <Grid size={16} color={currentMode === 'bingo' ? Colors.accent.copper : Colors.text.secondary} />
            <Text style={[s.modeTabText, currentMode === 'bingo' && s.modeTabTextActive]}>Bingo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeTab, currentMode === 'duoQuest' && s.modeTabActive]}
            onPress={() => {
              setCurrentMode('duoQuest');
              setGameMode('duoQuest');
            }}
          >
            <Users size={16} color={currentMode === 'duoQuest' ? Colors.accent.copper : Colors.text.secondary} />
            <Text style={[s.modeTabText, currentMode === 'duoQuest' && s.modeTabTextActive]}>Duo Quest</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeTab, currentMode === 'partnerCheckIn' && s.modeTabActive]}
            onPress={() => {
              setCurrentMode('partnerCheckIn');
              setGameMode('partnerCheckIn');
            }}
          >
            <Heart size={16} color={currentMode === 'partnerCheckIn' ? Colors.accent.copper : Colors.text.secondary} />
            <Text style={[s.modeTabText, currentMode === 'partnerCheckIn' && s.modeTabTextActive]}>Home-Base</Text>
          </TouchableOpacity>
        </View>

        {/* GAME 1: CHAMELEON COLOR MATCH */}
        {currentMode === 'chameleon' && (
          <View style={[s.gameCard, { borderColor: beaconColorHex }]}>
            <View style={s.gameCardHeader}>
              <Zap size={20} color={beaconColorHex} />
              <Text style={[s.gameCardTitle, { color: beaconColorHex }]}>CHAMELEON COLOR MATCH</Text>
              <View style={s.timerChip}>
                <Text style={s.timerText}>{chameleonTimer}s Round</Text>
              </View>
            </View>
            <Text style={s.gameCardDesc}>
              Your signal beacon is cycling! Find nearby guests matching this color and tap badges for trivia (+100 pts).
            </Text>

            <View style={[s.beaconDisplayBox, { backgroundColor: beaconColorHex }]}>
              <Text style={s.beaconNameText}>{beaconColor}</Text>
              <Text style={s.beaconSubText}>Active Beacon Signal</Text>
            </View>

            <TouchableOpacity style={s.cycleBeaconBtn} onPress={cycleBeaconColor}>
              <RefreshCw size={14} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={s.cycleBeaconText}>Manually Cycle Beacon Color</Text>
            </TouchableOpacity>

            <Text style={[s.sectionHeaderTitle, { marginTop: Spacing.md }]}>NEARBY COMPATIBLE MATCHES</Text>
            {mockGuests.map((guest) => (
              <View key={guest.id} style={[s.guestRowCard, guest.tapped && s.guestRowTapped]}>
                <View style={{ flex: 1 }}>
                  <View style={s.guestNameRow}>
                    <Text style={s.guestNameText}>{guest.name}</Text>
                    <View style={s.guestBadge}><Text style={s.guestBadgeText}>{guest.type}</Text></View>
                  </View>
                  <Text style={s.guestSubText}>Karaoke: "{guest.karaoke}" | Travel: {guest.travel}</Text>
                </View>
                <TouchableOpacity style={s.tapTriviaBtn} onPress={() => handleOpenTrivia(guest)}>
                  <HelpCircle size={14} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={s.tapTriviaText}>Trivia Tap</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* GAME 2: HUMAN BINGO / TRAIT HUNT */}
        {currentMode === 'bingo' && (
          <View style={[s.gameCard, { borderColor: Colors.accent.copper }]}>
            <View style={s.gameCardHeader}>
              <Grid size={20} color={Colors.accent.copper} />
              <Text style={[s.gameCardTitle, { color: Colors.accent.copper }]}>3x3 TRAIT HUNT BINGO</Text>
            </View>
            <Text style={s.gameCardDesc}>
              Click any trait square, then scan/tap a matching guest's NFC badge to stamp it for +150 pts!
            </Text>

            <View style={s.bingoGridContainer}>
              {bingoGrid.map((square) => (
                <TouchableOpacity
                  key={square.id}
                  style={[s.bingoCell, square.stamped && s.bingoCellStamped]}
                  onPress={() => {
                    if (!square.stamped) {
                      setSelectedBingoSquare(square);
                      setBingoModalVisible(true);
                    }
                  }}
                >
                  {square.stamped ? (
                    <View style={s.stampedCenter}>
                      <Check size={20} color={Colors.accent.emerald} />
                      <Text style={s.stampedByText}>{square.stampedBy}</Text>
                    </View>
                  ) : (
                    <Text style={s.bingoCellText}>{square.trait}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {/* GAME 3: VENUE SIDE QUEST / DUO CHALLENGE */}
        {currentMode === 'duoQuest' && (
          <View style={[s.gameCard, { borderColor: Colors.accent.copper }]}>
            <View style={s.gameCardHeader}>
              <Users size={20} color={Colors.accent.copper} />
              <Text style={[s.gameCardTitle, { color: Colors.accent.copper }]}>DUO VENUE SIDE QUEST</Text>
            </View>
            <Text style={s.gameCardDesc}>
              Filtered strictly by your private lifestyle preferences ({profile.preferences.playBoundaries.join(', ') || 'General'}).
            </Text>

            <View style={s.matchPairBox}>
              <Text style={s.matchPairTitle}>Matched Duo Pair: Marcus & Chloe</Text>
              <Text style={s.matchPairSub}>Comfort Level: Soft Swap | Looking For: Couples Only</Text>
            </View>

            <View style={s.questStepsBox}>
              <Text style={s.questStepsHeader}>2-STEP VENUE CHALLENGE (+250 PTS)</Text>

              <TouchableOpacity
                style={[s.stepRow, duoStep1 && s.stepRowDone]}
                onPress={() => setDuoStep1((prev) => !prev)}
              >
                <View style={[s.checkBox, duoStep1 && s.checkBoxDone]}>
                  {duoStep1 && <Check size={14} color="#FFF" />}
                </View>
                <Text style={s.stepText}>Step 1: Toast with matched couple at main bar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.stepRow, duoStep2 && s.stepRowDone]}
                onPress={() => setDuoStep2((prev) => !prev)}
              >
                <View style={[s.checkBox, duoStep2 && s.checkBoxDone]}>
                  {duoStep2 && <Check size={14} color="#FFF" />}
                </View>
                <Text style={s.stepText}>Step 2: Share go-to travel story with Marcus & Chloe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.completeQuestBtn, (!duoStep1 || !duoStep2 || duoCompleted) && s.btnDisabled]}
                disabled={!duoStep1 || !duoStep2 || duoCompleted}
                onPress={handleCompleteDuoChallenge}
              >
                <Sparkles size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={s.completeQuestText}>
                  {duoCompleted ? 'Duo Quest Completed! (+250 pts)' : 'Complete Duo Challenge (+250 pts)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* GAME 4: PARTNER HOME-BASE CHECK-IN */}
        {currentMode === 'partnerCheckIn' && (
          <View style={[s.gameCard, { borderColor: Colors.accent.copper }]}>
            <View style={s.gameCardHeader}>
              <Heart size={20} color={Colors.accent.copper} />
              <Text style={[s.gameCardTitle, { color: Colors.accent.copper }]}>PARTNER "HOME-BASE" CHECK-IN</Text>
            </View>
            <Text style={s.gameCardDesc}>
              Interactive couple reconnect mode! Tap badges with your partner for +150 bonus pts, then privately toggle green lights on guests you met.
            </Text>

            <View style={s.homeBaseBox}>
              <Text style={s.homeBaseTimerTitle}>
                {isPartnerTimerRunning ? `Reconnect Window: ${partnerTimer}s` : '60-Second Reconnect Window'}
              </Text>
              <TouchableOpacity style={s.partnerTapBtn} onPress={handlePartnerReconnectTap}>
                <Heart size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={s.partnerTapBtnText}>
                  {partnerTapped ? 'Partners Reconnected (+150 pts)' : 'Tap Partner Badges Together (+150 pts)'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.sectionHeaderTitle, { marginTop: Spacing.md }]}>PRIVATE GREEN-LIGHT LOUNGE</Text>
            <Text style={s.greenLightSub}>Toggle Thumbs-Up / Green-Light for attendees you'd like to connect with further.</Text>

            {mockGuests.map((guest) => (
              <View key={guest.id} style={s.greenLightRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.guestNameText}>{guest.name}</Text>
                  <Text style={s.guestSubText}>{guest.type} • {guest.distance}</Text>
                </View>
                <TouchableOpacity
                  style={[s.greenLightBtn, guest.greenLightFromMe && s.greenLightBtnActive]}
                  onPress={() => toggleGreenLight(guest.id)}
                >
                  <Heart size={14} color={guest.greenLightFromMe ? Colors.accent.emerald : Colors.border.brushedSteel} />
                  <Text style={[s.greenLightText, guest.greenLightFromMe && s.greenLightTextActive]}>
                    {guest.greenLightFromMe ? 'Green-Lit!' : 'Green-Light'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {/* TRIVIA MODAL FOR CHAMELEON */}
        <Modal visible={triviaModalVisible} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeaderRow}>
                <HelpCircle size={20} color={Colors.accent.copper} />
                <Text style={s.modalTitleText}>15-Second Icebreaker Trivia</Text>
                <TouchableOpacity onPress={() => setTriviaModalVisible(false)}>
                  <X size={18} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {triviaGuest && (
                <>
                  <Text style={s.triviaQuestionText}>
                    "What is {triviaGuest.name}'s go-to karaoke anthem?"
                  </Text>

                  {!triviaAnswered ? (
                    <View style={s.triviaOptionsGroup}>
                      <TouchableOpacity
                        style={s.triviaOptionBtn}
                        onPress={() => handleSelectTriviaOption(true)}
                      >
                        <Text style={s.triviaOptionText}>1. "{triviaGuest.karaoke}"</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={s.triviaOptionBtn}
                        onPress={() => handleSelectTriviaOption(false)}
                      >
                        <Text style={s.triviaOptionText}>2. "Bohemian Rhapsody"</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={s.triviaOptionBtn}
                        onPress={() => handleSelectTriviaOption(false)}
                      >
                        <Text style={s.triviaOptionText}>3. "Sweet Child O' Mine"</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={s.triviaResultBox}>
                      <Text style={triviaCorrect ? s.triviaSuccessText : s.triviaFailText}>
                        {triviaCorrect ? 'Correct Answer! +100 Points Awarded!' : 'Incorrect Answer! Try another guest.'}
                      </Text>
                      <TouchableOpacity
                        style={s.closeTriviaBtn}
                        onPress={() => setTriviaModalVisible(false)}
                      >
                        <Text style={s.closeTriviaText}>Close Trivia</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* BINGO STAMP MODAL */}
        <Modal visible={bingoModalVisible} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeaderRow}>
                <Grid size={20} color={Colors.accent.copper} />
                <Text style={s.modalTitleText}>Stamp Trait Square</Text>
                <TouchableOpacity onPress={() => setBingoModalVisible(false)}>
                  <X size={18} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {selectedBingoSquare && (
                <>
                  <Text style={s.bingoPromptText}>
                    Prompt: "{selectedBingoSquare.trait}"
                  </Text>
                  <Text style={s.bingoSubText}>Select a guest you scanned/tapped to stamp this square:</Text>

                  {mockGuests.map((guest) => (
                    <TouchableOpacity
                      key={guest.id}
                      style={s.stampGuestBtn}
                      onPress={() => handleStampBingoSquare(guest)}
                    >
                      <Text style={s.stampGuestName}>{guest.name} ({guest.type})</Text>
                      <Text style={s.stampActionText}>Stamp Square (+150 pts)</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.black },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  roomBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.accent.copper, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  roomText: { color: Colors.accent.copper, fontWeight: '800', fontSize: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statText: { color: Colors.text.primary, fontWeight: '700', fontSize: 12 },
  lockBtn: { backgroundColor: 'rgba(217, 56, 58, 0.15)', borderWidth: 1, borderColor: Colors.accent.crimson, padding: 6, borderRadius: BorderRadius.full },
  bindChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: Spacing.sm, alignSelf: 'flex-start' },
  bindDot: { width: 8, height: 8, borderRadius: 4 },
  bindDotActive: { backgroundColor: Colors.accent.emerald },
  bindDotInactive: { backgroundColor: Colors.text.muted },
  bindText: { color: Colors.text.secondary, fontSize: 11, fontWeight: '700' },
  feedbackCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(46, 175, 125, 0.15)', borderWidth: 1, borderColor: Colors.accent.emerald, borderRadius: BorderRadius.md, padding: 10, marginBottom: Spacing.sm },
  feedbackText: { color: Colors.accent.emerald, fontWeight: '700', fontSize: 12, flex: 1 },
  venueCrawlBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  crawlTitle: { fontSize: 13, fontWeight: '800', color: Colors.accent.copper },
  crawlSub: { fontSize: 11, color: Colors.text.secondary },
  sectionHeaderTitle: { fontSize: 11, fontWeight: '800', color: Colors.text.primary, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  modeTabGrid: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  modeTab: { flex: 1, backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 4 },
  modeTabActive: { borderColor: Colors.accent.copper, backgroundColor: '#231B18' },
  modeTabText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  modeTabTextActive: { color: Colors.accent.copper, fontWeight: '800' },
  gameCard: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  gameCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  gameCardTitle: { fontSize: 14, fontWeight: '800', flex: 1, letterSpacing: 0.5 },
  timerChip: { backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  timerText: { fontSize: 11, fontWeight: '800', color: Colors.accent.copper },
  gameCardDesc: { fontSize: 12, color: Colors.text.secondary, marginBottom: Spacing.md, lineHeight: 16 },
  beaconDisplayBox: { paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  beaconNameText: { color: '#FFF', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  beaconSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },
  cycleBeaconBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, paddingVertical: 10, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  cycleBeaconText: { color: Colors.text.primary, fontSize: 12, fontWeight: '700' },
  guestRowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 10, marginBottom: 8 },
  guestRowTapped: { borderColor: Colors.accent.emerald, backgroundColor: '#13211B' },
  guestNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guestNameText: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  guestBadge: { backgroundColor: Colors.background.darkSteel, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  guestBadgeText: { fontSize: 10, color: Colors.accent.copper, fontWeight: '700' },
  guestSubText: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  tapTriviaBtn: { backgroundColor: Colors.accent.copper, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md },
  tapTriviaText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  bingoGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  bingoCell: { width: '31.8%', height: 80, backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 6, justifyContent: 'center', alignItems: 'center' },
  bingoCellStamped: { borderColor: Colors.accent.emerald, backgroundColor: '#13211B' },
  bingoCellText: { fontSize: 10, fontWeight: '700', color: Colors.text.primary, textAlign: 'center' },
  stampedCenter: { alignItems: 'center' },
  stampedByText: { fontSize: 9, color: Colors.accent.emerald, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  matchPairBox: { backgroundColor: 'rgba(200, 109, 81, 0.12)', borderWidth: 1, borderColor: Colors.accent.copper, borderRadius: BorderRadius.md, padding: 12, marginBottom: Spacing.md },
  matchPairTitle: { fontSize: 14, fontWeight: '800', color: Colors.accent.copper },
  matchPairSub: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  questStepsBox: { backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 12 },
  questStepsHeader: { fontSize: 11, fontWeight: '800', color: Colors.text.primary, marginBottom: 8, letterSpacing: 0.5 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border.steelGray },
  stepRowDone: { opacity: 0.7 },
  checkBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: Colors.border.steelGray, justifyContent: 'center', alignItems: 'center' },
  checkBoxDone: { backgroundColor: Colors.accent.emerald, borderColor: Colors.accent.emerald },
  stepText: { fontSize: 12, color: Colors.text.primary, flex: 1, fontWeight: '600' },
  completeQuestBtn: { backgroundColor: Colors.accent.copper, borderRadius: BorderRadius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  completeQuestText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.5, backgroundColor: Colors.background.darkSteel },
  homeBaseBox: { backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 12, alignItems: 'center', marginBottom: Spacing.md },
  homeBaseTimerTitle: { fontSize: 14, fontWeight: '800', color: Colors.accent.copper, marginBottom: 8 },
  partnerTapBtn: { backgroundColor: Colors.accent.copper, paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center' },
  partnerTapBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  greenLightSub: { fontSize: 11, color: Colors.text.secondary, marginBottom: 8 },
  greenLightRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 10, marginBottom: 6 },
  greenLightBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  greenLightBtnActive: { borderColor: Colors.accent.emerald, backgroundColor: 'rgba(46, 175, 125, 0.2)' },
  greenLightText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  greenLightTextActive: { color: Colors.accent.emerald },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: Spacing.md },
  modalBox: { backgroundColor: Colors.background.darkSteel, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: Spacing.md },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  modalTitleText: { fontSize: 14, fontWeight: '800', color: Colors.accent.copper, flex: 1 },
  triviaQuestionText: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.md, textAlign: 'center' },
  triviaOptionsGroup: { gap: 8 },
  triviaOptionBtn: { backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 12 },
  triviaOptionText: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  triviaResultBox: { alignItems: 'center', marginTop: 8 },
  triviaSuccessText: { color: Colors.accent.emerald, fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  triviaFailText: { color: Colors.accent.crimson, fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  closeTriviaBtn: { backgroundColor: Colors.accent.copper, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md },
  closeTriviaText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  bingoPromptText: { fontSize: 14, fontWeight: '800', color: Colors.accent.copper, marginBottom: 4 },
  bingoSubText: { fontSize: 12, color: Colors.text.secondary, marginBottom: 12 },
  stampGuestBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background.inputBg, borderWidth: 1, borderColor: Colors.border.steelGray, borderRadius: BorderRadius.md, padding: 10, marginBottom: 6 },
  stampGuestName: { fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  stampActionText: { fontSize: 11, fontWeight: '800', color: Colors.accent.copper },
});
