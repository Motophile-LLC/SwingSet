import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Trophy,
  Users,
  User,
  Crown,
  CheckCircle2,
  Clock,
  Play,
  Eye,
  PlusCircle,
  RotateCcw,
} from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { HostIntroBox } from '@/src/components/HostIntroBox';
import { supabase } from '@/src/lib/supabase';
import { EventAttendee } from '@/src/types/swingset';
import {
  CURATED_TRIVIA_BANK,
  TRIVIA_GENRES,
  TriviaGenre,
  TriviaQuestion,
} from '@/src/data/triviaBank';

export type TriviaPlayMode = 'teams' | 'solo';
export type TriviaGenreSelection = TriviaGenre | 'Random Mix';

const GENRE_CHOICES: TriviaGenreSelection[] = ['Random Mix', ...TRIVIA_GENRES];

interface TeamMemberPick {
  userId: string;
  displayName: string;
  optionIndex: number;
}

interface TriviaTeam {
  id: string;
  name: string;
  captainUserId: string;
  captainName: string;
  members: { userId: string; displayName: string }[];
  score: number;
}

interface TriviaLiveState {
  playMode: TriviaPlayMode;
  genre: TriviaGenreSelection;
  phase: 'lobby' | 'question' | 'revealed' | 'round_complete';
  activeQuestion: TriviaQuestion | null;
  questionIndex: number;
  roundNumber: number;
  questionsPerRound: number;
  roundQuestionIndex: number;
  questionDurationSec: number;
  questionEndsAt: number | null;
  teams: TriviaTeam[];
  soloScores: Record<string, { name: string; score: number }>;
  // Teammate suggested picks keyed by teamId -> userId -> pick
  teamSuggestions: Record<string, Record<string, TeamMemberPick>>;
  // Final locked answer keyed by teamId (in teams mode) or userId (in solo mode)
  lockedAnswers: Record<string, { optionIndex: number; label: string }>;
}

interface TriviaModuleProps {
  eventId: string;
  isHost: boolean;
  isTier2Pro: boolean;
  currentUserId: string | null;
  currentDisplayName: string;
  attendees?: EventAttendee[];
  hostUserId?: string;
  venueName?: string;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function TriviaModule({
  eventId,
  isHost,
  isTier2Pro,
  currentUserId,
  currentDisplayName,
  attendees = [],
  hostUserId,
  venueName = '',
}: TriviaModuleProps) {
  const [state, setState] = useState<TriviaLiveState>({
    playMode: 'teams',
    genre: 'Random Mix',
    phase: 'lobby',
    activeQuestion: null,
    questionIndex: 0,
    roundNumber: 1,
    questionsPerRound: 5,
    roundQuestionIndex: 0,
    questionDurationSec: 30,
    questionEndsAt: null,
    teams: [],
    soloScores: {},
    teamSuggestions: {},
    lockedAnswers: {},
  });

  const [customBank, setCustomBank] = useState<TriviaQuestion[]>([]);
  const [remoteBank, setRemoteBank] = useState<TriviaQuestion[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customQ, setCustomQ] = useState('');
  const [customOpts, setCustomOpts] = useState<[string, string, string, string]>(['', '', '', '']);
  const [customCorrect, setCustomCorrect] = useState<0 | 1 | 2 | 3>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);

  const channelRef = useRef<any>(null);

  // Synced countdown computed from broadcast questionEndsAt timestamp
  useEffect(() => {
    if (state.phase !== 'question' || !state.questionEndsAt) {
      setSecondsLeft(state.questionDurationSec || 30);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((state.questionEndsAt! - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [state.phase, state.questionEndsAt, state.questionDurationSec]);

  const isTimeUp = state.phase === 'question' && Boolean(state.questionEndsAt) && secondsLeft <= 0;

  // Auto-reveal & award points when timer hits 0s (host triggers broadcast once)
  useEffect(() => {
    if (isHost && isTimeUp && state.phase === 'question' && state.activeQuestion) {
      handleRevealAndScore();
    }
  }, [isHost, isTimeUp, state.phase, state.activeQuestion]);

  // Auto-advance round after 4s reveal banner (until round finishes)
  useEffect(() => {
    if (!isHost || state.phase !== 'revealed') return;
    const timer = setTimeout(() => {
      const nextRoundQ = (state.roundQuestionIndex || 0) + 1;
      const perRound = state.questionsPerRound || 5;
      if (nextRoundQ >= perRound) {
        broadcastState({
          ...state,
          phase: 'round_complete',
          questionEndsAt: null,
        });
      } else {
        handleStartQuestion(state.questionIndex + 1, nextRoundQ);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isHost, state.phase, state.roundQuestionIndex, state.questionsPerRound, state.questionIndex]);

  // Load previously used questions for this host & venue so we avoid repeats
  useEffect(() => {
    if (!isHost || !hostUserId) return;
    const loadUsedHistory = async () => {
      try {
        const venueKey = (venueName || '').trim().toLowerCase();
        const query = supabase
          .from('trivia_question_history')
          .select('question_id')
          .eq('host_user_id', hostUserId)
          .order('used_at', { ascending: false })
          .limit(500);
        const { data, error } = venueKey
          ? await query.eq('venue_key', venueKey)
          : await query;
        if (!error && data) {
          setUsedQuestionIds(data.map((r: any) => r.question_id));
        }
      } catch {
        // Ignore if migration 009 not applied yet
      }
    };
    loadUsedHistory();
  }, [isHost, hostUserId, venueName]);

  const broadcastState = (next: TriviaLiveState) => {
    setState(next);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'trivia_state',
      payload: next,
    });
  };

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase.channel(`trivia:${eventId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on('broadcast', { event: 'trivia_state' }, ({ payload }: { payload: TriviaLiveState }) => {
      if (payload) setState(payload);
    }).subscribe();

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [eventId]);

  useEffect(() => {
    const loadActiveQuestions = async () => {
      try {
        let query = supabase
          .from('trivia_questions')
          .select('id, genre, question, options, correct_index, points, is_custom')
          .eq('status', 'active');

        if (state.genre !== 'Random Mix') {
          query = query.eq('genre', state.genre);
        }

        const { data, error } = await query.limit(600);
        if (error || !data || data.length === 0) {
          setRemoteBank([]);
          return;
        }

        const mapped: TriviaQuestion[] = data
          .filter((row: any) => Array.isArray(row.options) && row.options.length === 4)
          .map((row: any) => ({
            id: row.id,
            genre: row.genre as TriviaGenre,
            question: row.question,
            options: row.options as [string, string, string, string],
            correctIndex: row.correct_index as 0 | 1 | 2 | 3,
            points: row.points || 100,
            isCustom: Boolean(row.is_custom),
          }));
        setRemoteBank(mapped);
      } catch {
        // Fallback to CURATED_TRIVIA_BANK if offline or migration 005 not applied yet
      }
    };
    loadActiveQuestions();
  }, [state.genre]);

  const genreQuestions = useMemo(() => {
    const base = remoteBank.length > 0 ? remoteBank : CURATED_TRIVIA_BANK;
    const all =
      state.genre === 'Random Mix'
        ? [...customBank, ...base]
        : [...customBank, ...base].filter((q) => q.genre === state.genre);
    const unused = all.filter((q) => !usedQuestionIds.includes(q.id));
    const pool = unused.length > 0 ? unused : all;
    if (state.genre === 'Random Mix') {
      return [...pool].sort(() => Math.random() - 0.5);
    }
    return pool;
  }, [customBank, remoteBank, state.genre, usedQuestionIds]);

  const myTeam = useMemo(
    () =>
      currentUserId
        ? state.teams.find((t) => t.members.some((m) => m.userId === currentUserId)) || null
        : null,
    [state.teams, currentUserId]
  );

  const isCaptain = Boolean(myTeam && currentUserId && myTeam.captainUserId === currentUserId);

  // Team actions (attendees only — host does not compete)
  const handleCreateTeam = () => {
    if (isHost || !currentUserId || !teamNameInput.trim()) return;
    const cleaned = teamNameInput.trim();
    const newTeam: TriviaTeam = {
      id: `team_${Date.now()}`,
      name: cleaned,
      captainUserId: currentUserId,
      captainName: currentDisplayName,
      members: [{ userId: currentUserId, displayName: currentDisplayName }],
      score: 0,
    };
    const filteredTeams = state.teams.map((t) => ({
      ...t,
      members: t.members.filter((m) => m.userId !== currentUserId),
    }));
    setTeamNameInput('');
    broadcastState({
      ...state,
      teams: [...filteredTeams.filter((t) => t.members.length > 0), newTeam],
    });
  };

  const handleJoinTeam = (teamId: string) => {
    if (isHost || !currentUserId) return;
    const updatedTeams = state.teams
      .map((t) => {
        const withoutMe = t.members.filter((m) => m.userId !== currentUserId);
        if (t.id === teamId) {
          return {
            ...t,
            members: [...withoutMe, { userId: currentUserId, displayName: currentDisplayName }],
          };
        }
        return { ...t, members: withoutMe };
      })
      .filter((t) => t.members.length > 0);
    broadcastState({ ...state, teams: updatedTeams });
  };

  const recordQuestionUsed = async (questionId: string) => {
    setUsedQuestionIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
    if (!hostUserId) return;
    try {
      await supabase.from('trivia_question_history').insert({
        host_user_id: hostUserId,
        venue_key: (venueName || '').trim().toLowerCase(),
        question_id: questionId,
        event_id: eventId,
      });
    } catch {
      // Ignore if migration 009 not applied yet
    }
  };

  // Host actions
  const handleStartQuestion = (indexOverride?: number, roundQIdxOverride?: number, nextRoundNum?: number) => {
    const idx = indexOverride !== undefined ? indexOverride : state.questionIndex;
    const q = genreQuestions[idx % Math.max(genreQuestions.length, 1)] || CURATED_TRIVIA_BANK[0];
    const dur = state.questionDurationSec || 30;
    recordQuestionUsed(q.id);
    broadcastState({
      ...state,
      phase: 'question',
      activeQuestion: q,
      questionIndex: idx,
      roundNumber: nextRoundNum ?? state.roundNumber ?? 1,
      roundQuestionIndex: roundQIdxOverride ?? state.roundQuestionIndex ?? 0,
      questionEndsAt: Date.now() + dur * 1000,
      teamSuggestions: {},
      lockedAnswers: {},
    });
  };

  const handleStartNewRound = () => {
    const nextRound = state.phase === 'round_complete' ? (state.roundNumber || 1) + 1 : state.roundNumber || 1;
    handleStartQuestion(0, 0, nextRound);
  };

  const handleRevealAndScore = () => {
    if (!state.activeQuestion) return;
    const correctIdx = state.activeQuestion.correctIndex;
    const pts = state.activeQuestion.points;

    let nextTeams = state.teams;
    let nextSolo = { ...state.soloScores };

    if (state.playMode === 'teams') {
      nextTeams = state.teams.map((t) => {
        const locked = state.lockedAnswers[t.id];
        if (locked && locked.optionIndex === correctIdx) {
          return { ...t, score: t.score + pts };
        }
        return t;
      });
    } else {
      Object.entries(state.lockedAnswers).forEach(([uid, ans]) => {
        const prev = nextSolo[uid] || { name: ans.label, score: 0 };
        nextSolo[uid] = {
          name: ans.label,
          score: prev.score + (ans.optionIndex === correctIdx ? pts : 0),
        };
      });
    }

    broadcastState({
      ...state,
      phase: 'revealed',
      questionEndsAt: null,
      teams: nextTeams,
      soloScores: nextSolo,
    });
  };

  const handleNextQuestion = () => {
    const nextRoundQ = (state.roundQuestionIndex || 0) + 1;
    const perRound = state.questionsPerRound || 5;
    if (nextRoundQ >= perRound) {
      broadcastState({
        ...state,
        phase: 'round_complete',
        questionEndsAt: null,
      });
      return;
    }
    handleStartQuestion(state.questionIndex + 1, nextRoundQ);
  };

  const handleResetScores = () => {
    broadcastState({
      ...state,
      phase: 'lobby',
      activeQuestion: null,
      questionIndex: 0,
      roundNumber: 1,
      roundQuestionIndex: 0,
      questionEndsAt: null,
      teams: state.teams.map((t) => ({ ...t, score: 0 })),
      soloScores: {},
      teamSuggestions: {},
      lockedAnswers: {},
    });
  };

  const handleAddCustomQuestion = () => {
    if (!customQ.trim() || customOpts.some((o) => !o.trim())) return;
    const newQ: TriviaQuestion = {
      id: `custom_${Date.now()}`,
      genre: state.genre === 'Random Mix' ? 'General Knowledge' : state.genre,
      question: customQ.trim(),
      options: [customOpts[0].trim(), customOpts[1].trim(), customOpts[2].trim(), customOpts[3].trim()],
      correctIndex: customCorrect,
      points: 100,
      isCustom: true,
    };
    setCustomBank((prev) => [newQ, ...prev]);
    setCustomQ('');
    setCustomOpts(['', '', '', '']);
    setShowCustomForm(false);
  };

  // Player / Captain Answer actions (Host does not compete)
  const handleSuggestAnswer = (optionIndex: number) => {
    if (isHost || !currentUserId || state.phase !== 'question' || isTimeUp) return;

    if (state.playMode === 'solo') {
      broadcastState({
        ...state,
        lockedAnswers: {
          ...state.lockedAnswers,
          [currentUserId]: { optionIndex, label: currentDisplayName },
        },
      });
      return;
    }

    if (!myTeam) return;
    const prevTeamPicks = state.teamSuggestions[myTeam.id] || {};
    broadcastState({
      ...state,
      teamSuggestions: {
        ...state.teamSuggestions,
        [myTeam.id]: {
          ...prevTeamPicks,
          [currentUserId]: {
            userId: currentUserId,
            displayName: currentDisplayName,
            optionIndex,
          },
        },
      },
    });
  };

  const handleCaptainLockAnswer = (optionIndex: number) => {
    if (!myTeam || !isCaptain || state.phase !== 'question' || isTimeUp) return;
    broadcastState({
      ...state,
      lockedAnswers: {
        ...state.lockedAnswers,
        [myTeam.id]: { optionIndex, label: myTeam.name },
      },
    });
  };

  const leaderboard = useMemo(() => {
    if (state.playMode === 'teams') {
      return [...state.teams]
        .sort((a, b) => b.score - a.score)
        .map((t) => ({ id: t.id, name: t.name, score: t.score, sub: `Capt: ${t.captainName}` }));
    }

    const merged = new Map<string, { id: string; name: string; score: number; sub: string }>();

    // Seed all checked-in attendees at 0 pts (excluding the host)
    attendees
      .filter((a) => !a.is_removed && a.user_id !== hostUserId)
      .forEach((a) => {
        merged.set(a.user_id, {
          id: a.user_id,
          name: a.display_name,
          score: 0,
          sub: 'Checked In',
        });
      });

    // Overlay earned solo scores (excluding host)
    Object.entries(state.soloScores).forEach(([uid, val]) => {
      if (uid === hostUserId) return;
      merged.set(uid, {
        id: uid,
        name: val.name,
        score: val.score,
        sub: 'Solo Player',
      });
    });

    return Array.from(merged.values()).sort(
      (a, b) => b.score - a.score || a.name.localeCompare(b.name)
    );
  }, [state.playMode, state.teams, state.soloScores, attendees, hostUserId]);

  const myTeamSuggestions = myTeam ? Object.values(state.teamSuggestions[myTeam.id] || {}) : [];
  const myTeamLocked = myTeam ? state.lockedAnswers[myTeam.id] : undefined;
  const mySoloLocked = currentUserId ? state.lockedAnswers[currentUserId] : undefined;

  return (
    <View style={s.wrapper}>
      {/* Header */}
      <View style={s.headerCard}>
        <View style={s.headerRow}>
          <Trophy size={20} color={Colors.accent.copper} />
          <Text style={s.headerTitle}>LIVE TRIVIA ARENA</Text>
          <View style={s.modeBadge}>
            <Text style={s.modeBadgeText}>
              {state.playMode === 'teams' ? 'TEAM CAPTAIN MODE' : 'SOLO MODE'}
            </Text>
          </View>
        </View>
        <Text style={s.headerSub}>
          {state.playMode === 'teams'
            ? 'Teammates suggest answers; the Team Captain sees group picks and locks the final answer.'
            : 'Every phone answers independently for live leaderboard points.'}
        </Text>
      </View>

      {/* Host Controls */}
      {isHost ? (
        <View style={s.card}>
          <Text style={s.sectionLabel}>HOST TRIVIA CONTROLS</Text>

          {state.phase === 'lobby' && state.roundNumber === 1 ? (
            <HostIntroBox
              gameTitle={state.playMode === 'teams' ? 'Trivia — Team Mode' : 'Trivia — Solo Mode'}
              readAloudScript={
                state.playMode === 'teams'
                  ? '“Welcome to Live Trivia! Form a team and pick one Team Captain to create your team in the app. When a question goes live, everyone on your team taps their suggested answer—your Captain will see all your picks and lock in your team’s official final answer!”'
                  : '“Welcome to Live Trivia! Tonight is Solo Mode—every phone plays for itself. When a question hits your screen, tap your answer before I reveal the correct choice and update the live leaderboard!”'
              }
              howToPlay={
                state.playMode === 'teams'
                  ? [
                      'One person per table creates the team and automatically becomes Team Captain.',
                      'Teammates join the team and tap their suggested answer (A/B/C/D) on their own phones.',
                      'The Captain sees the group’s picks and taps Lock Final Answer before the host reveals.',
                    ]
                  : [
                      'Every checked-in attendee answers independently on their own phone.',
                      'Tap A, B, C, or D while the question is live.',
                      'Host reveals the answer and awards +100 points per correct response.',
                    ]
              }
              defaultExpanded={true}
            />
          ) : null}

          <View style={s.rowGap}>
            <TouchableOpacity
              style={[s.modeBtn, state.playMode === 'teams' && s.modeBtnActive]}
              onPress={() => broadcastState({ ...state, playMode: 'teams' })}
            >
              <Users size={14} color={state.playMode === 'teams' ? '#FFF' : Colors.text.secondary} />
              <Text style={[s.modeBtnText, state.playMode === 'teams' && s.modeBtnTextActive]}>
                Teams (Captain)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modeBtn, state.playMode === 'solo' && s.modeBtnActive]}
              onPress={() => broadcastState({ ...state, playMode: 'solo' })}
            >
              <User size={14} color={state.playMode === 'solo' ? '#FFF' : Colors.text.secondary} />
              <Text style={[s.modeBtnText, state.playMode === 'solo' && s.modeBtnTextActive]}>
                Solo / Singles
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.subLabel}>Round Topic / Genre ({genreQuestions.length} unused Qs)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.genreRow}>
            {GENRE_CHOICES.map((g) => {
              const active = state.genre === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[s.genreChip, active && s.genreChipActive]}
                  onPress={() => broadcastState({ ...state, genre: g, questionIndex: 0 })}
                >
                  <Text style={[s.genreChipText, active && s.genreChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={s.subLabel}>Question Timer</Text>
          <View style={s.rowGap}>
            {[15, 30, 45, 60].map((sec) => {
              const active = state.questionDurationSec === sec;
              return (
                <TouchableOpacity
                  key={sec}
                  style={[s.timerChoiceBtn, active && s.timerChoiceBtnActive]}
                  onPress={() => broadcastState({ ...state, questionDurationSec: sec })}
                >
                  <Clock size={12} color={active ? '#FFF' : Colors.text.secondary} />
                  <Text style={[s.timerChoiceText, active && s.timerChoiceTextActive]}>
                    {sec}s
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.subLabel}>Questions Per Round</Text>
          <View style={s.rowGap}>
            {[3, 5, 10].map((cnt) => {
              const active = state.questionsPerRound === cnt;
              return (
                <TouchableOpacity
                  key={cnt}
                  style={[s.timerChoiceBtn, active && s.timerChoiceBtnActive]}
                  onPress={() => broadcastState({ ...state, questionsPerRound: cnt })}
                >
                  <Text style={[s.timerChoiceText, active && s.timerChoiceTextActive]}>
                    {cnt} Qs
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.rowGap}>
            {state.phase === 'lobby' || state.phase === 'round_complete' ? (
              <TouchableOpacity style={s.primaryBtn} onPress={handleStartNewRound}>
                <Play size={15} color="#FFF" />
                <Text style={s.primaryBtnText}>
                  {state.phase === 'round_complete'
                    ? `Start Round ${(state.roundNumber || 1) + 1} (${state.questionsPerRound} Qs)`
                    : `Start Round ${state.roundNumber || 1} (${state.questionsPerRound} Qs)`}
                </Text>
              </TouchableOpacity>
            ) : state.phase === 'question' ? (
              <TouchableOpacity style={s.revealBtn} onPress={handleRevealAndScore}>
                <Eye size={15} color="#FFF" />
                <Text style={s.primaryBtnText}>Reveal Answer & Score</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.primaryBtn} onPress={handleNextQuestion}>
                <Play size={15} color="#FFF" />
                <Text style={s.primaryBtnText}>
                  {(state.roundQuestionIndex || 0) + 1 >= (state.questionsPerRound || 5)
                    ? 'Finish Round'
                    : 'Next Question Now'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.resetBtn} onPress={handleResetScores}>
              <RotateCcw size={15} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Tier 2 Custom Q&A Builder */}
          {isTier2Pro ? (
            <View style={{ marginTop: 6 }}>
              <TouchableOpacity
                style={s.customToggle}
                onPress={() => setShowCustomForm((prev) => !prev)}
              >
                <PlusCircle size={14} color={Colors.text.copper} />
                <Text style={s.customToggleText}>
                  {showCustomForm ? 'Close Custom Question Builder' : 'Tier 2 Pro: Add Custom Q&A'}
                </Text>
              </TouchableOpacity>

              {showCustomForm ? (
                <View style={s.customForm}>
                  <TextInput
                    style={s.input}
                    value={customQ}
                    onChangeText={setCustomQ}
                    placeholder="Enter custom trivia question..."
                    placeholderTextColor={Colors.text.muted}
                  />
                  {OPTION_LETTERS.map((letter, idx) => (
                    <View key={letter} style={s.customOptRow}>
                      <TouchableOpacity
                        style={[s.correctPick, customCorrect === idx && s.correctPickActive]}
                        onPress={() => setCustomCorrect(idx as 0 | 1 | 2 | 3)}
                      >
                        <Text style={s.correctPickText}>{letter}</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        value={customOpts[idx]}
                        onChangeText={(txt) => {
                          const next = [...customOpts] as [string, string, string, string];
                          next[idx] = txt;
                          setCustomOpts(next);
                        }}
                        placeholder={`Option ${letter}`}
                        placeholderTextColor={Colors.text.muted}
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={s.primaryBtn} onPress={handleAddCustomQuestion}>
                    <Text style={s.primaryBtnText}>Save Custom Question to {state.genre}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Team Setup (attendees only — host does not compete) */}
      {!isHost && state.playMode === 'teams' ? (
        <View style={s.card}>
          <Text style={s.sectionLabel}>
            {myTeam ? `YOUR TEAM: ${myTeam.name}` : 'JOIN OR CREATE A TEAM'}
          </Text>

          {myTeam ? (
            <View style={s.teamStatusBox}>
              <View style={s.rowGap}>
                <Crown size={15} color={Colors.accent.copper} />
                <Text style={s.teamStatusText}>
                  Captain: {myTeam.captainName} {isCaptain ? '(You)' : ''} • {myTeam.members.length} player(s)
                </Text>
              </View>
              <Text style={s.teamMembersText}>
                Roster: {myTeam.members.map((m) => m.displayName).join(', ')}
              </Text>
            </View>
          ) : null}

          <View style={s.rowGap}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={teamNameInput}
              onChangeText={setTeamNameInput}
              placeholder="New team name (you become Captain)"
              placeholderTextColor={Colors.text.muted}
            />
            <TouchableOpacity style={s.joinBtn} onPress={handleCreateTeam}>
              <Text style={s.joinBtnText}>Create</Text>
            </TouchableOpacity>
          </View>

          {state.teams.length > 0 ? (
            <View style={s.teamList}>
              {state.teams.map((t) => {
                const isMine = myTeam?.id === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.teamChip, isMine && s.teamChipActive]}
                    onPress={() => !isMine && handleJoinTeam(t.id)}
                  >
                    <Text style={[s.teamChipText, isMine && s.teamChipTextActive]}>
                      {t.name} ({t.members.length})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Round Complete Banner */}
      {state.phase === 'round_complete' ? (
        <View style={s.roundCompleteCard}>
          <Trophy size={26} color={Colors.accent.emerald} />
          <Text style={s.roundCompleteTitle}>Round {state.roundNumber} Complete!</Text>
          <Text style={s.roundCompleteSub}>
            Check the standings below. {isHost ? 'Pick a genre or tap Start Next Round when ready.' : 'Waiting for host to start the next round.'}
          </Text>
        </View>
      ) : null}

      {/* Active Question Card */}
      {state.activeQuestion && state.phase !== 'round_complete' ? (
        <View style={s.questionCard}>
          <View style={s.topicBannerRow}>
            <View style={s.topicBadge}>
              <Text style={s.topicBadgeText}>
                TOPIC: {state.activeQuestion.genre.toUpperCase()}
              </Text>
            </View>
            <Text style={s.roundProgressText}>
              ROUND {state.roundNumber} • Q {(state.roundQuestionIndex || 0) + 1} OF{' '}
              {state.questionsPerRound}
            </Text>
          </View>
          <View style={s.qHeaderRow}>
            <Text style={s.qMeta}>{state.activeQuestion.points} PTS</Text>
            {state.phase === 'question' ? (
              <View
                style={[
                  s.timerPill,
                  secondsLeft <= 5 && s.timerPillUrgent,
                ]}
              >
                <Clock
                  size={12}
                  color={secondsLeft <= 5 ? Colors.accent.crimson : Colors.text.copper}
                />
                <Text
                  style={[
                    s.timerPillText,
                    secondsLeft <= 5 && s.timerPillTextUrgent,
                  ]}
                >
                  {isTimeUp ? "TIME'S UP!" : `${secondsLeft}s`}
                </Text>
              </View>
            ) : (
              <Text style={s.qStatus}>ANSWER REVEALED</Text>
            )}
          </View>

          <Text style={s.qText}>{state.activeQuestion.question}</Text>

          {state.activeQuestion.options.map((opt, idx) => {
            const showResult = state.phase === 'revealed' || isTimeUp;
            const isCorrect =
              showResult && state.activeQuestion?.correctIndex === idx;
            const myPick =
              state.playMode === 'solo'
                ? mySoloLocked?.optionIndex === idx
                : myTeamSuggestions.some(
                    (p) => p.userId === currentUserId && p.optionIndex === idx
                  );
            const isTeamLocked = myTeamLocked?.optionIndex === idx;

            return (
              <TouchableOpacity
                key={idx}
                disabled={state.phase !== 'question' || isTimeUp}
                style={[
                  s.optionBtn,
                  myPick && s.optionBtnSelected,
                  isTeamLocked && s.optionBtnLocked,
                  isCorrect && s.optionBtnCorrect,
                ]}
                onPress={() => handleSuggestAnswer(idx)}
              >
                <View style={s.optionLetterBox}>
                  <Text style={s.optionLetter}>{OPTION_LETTERS[idx]}</Text>
                </View>
                <Text style={s.optionText}>{opt}</Text>
                {isCorrect ? <CheckCircle2 size={18} color={Colors.accent.emerald} /> : null}
              </TouchableOpacity>
            );
          })}

          {/* Result Feedback Banner (Right / Wrong / Points Earned) */}
          {(state.phase === 'revealed' || isTimeUp) && state.activeQuestion ? (() => {
            const correctIdx = state.activeQuestion.correctIndex;
            const pts = state.activeQuestion.points;
            const correctLetter = OPTION_LETTERS[correctIdx];
            const correctOptText = state.activeQuestion.options[correctIdx];
            const submitted =
              state.playMode === 'teams' ? myTeamLocked : mySoloLocked;
            const gotItRight = Boolean(submitted && submitted.optionIndex === correctIdx);

            return (
              <View
                style={[
                  s.resultBanner,
                  gotItRight ? s.resultBannerWin : s.resultBannerLoss,
                ]}
              >
                <Text
                  style={[
                    s.resultBannerTitle,
                    { color: gotItRight ? Colors.accent.emerald : Colors.accent.crimson },
                  ]}
                >
                  {gotItRight
                    ? `CORRECT! +${pts} pts${state.playMode === 'teams' && myTeam ? ` for ${myTeam.name}` : ''}`
                    : submitted
                    ? `WRONG! (+0 pts)`
                    : `TIME'S UP! No answer locked (+0 pts)`}
                </Text>
                {!gotItRight ? (
                  <Text style={s.resultBannerSub}>
                    Correct Answer: {correctLetter}. {correctOptText}
                  </Text>
                ) : null}
              </View>
            );
          })() : null}

          {/* Captain Consensus Panel */}
          {state.playMode === 'teams' && myTeam && isCaptain && state.phase === 'question' ? (
            <View style={s.captainPanel}>
              <View style={s.rowGap}>
                <Crown size={15} color={Colors.accent.copper} />
                <Text style={s.captainTitle}>CAPTAIN CONSENSUS PANEL</Text>
              </View>
              {myTeamSuggestions.length === 0 ? (
                <Text style={s.captainSub}>Waiting for teammates to suggest answers...</Text>
              ) : (
                <View style={s.suggestionList}>
                  {myTeamSuggestions.map((p) => (
                    <Text key={p.userId} style={s.suggestionItem}>
                      • {p.displayName} suggested{' '}
                      <Text style={{ fontWeight: '800', color: Colors.text.copper }}>
                        {OPTION_LETTERS[p.optionIndex]}
                      </Text>
                    </Text>
                  ))}
                </View>
              )}

              <Text style={s.captainSub}>Tap below to lock your team’s official final answer:</Text>
              <View style={s.lockRow}>
                {OPTION_LETTERS.map((letter, idx) => {
                  const locked = myTeamLocked?.optionIndex === idx;
                  return (
                    <TouchableOpacity
                      key={letter}
                      disabled={isTimeUp}
                      style={[s.lockBtn, locked && s.lockBtnActive, isTimeUp && { opacity: 0.5 }]}
                      onPress={() => handleCaptainLockAnswer(idx)}
                    >
                      <Text style={[s.lockBtnText, locked && s.lockBtnTextActive]}>
                        Lock {letter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : state.phase !== 'round_complete' ? (
        <View style={s.waitingCard}>
          <Trophy size={26} color={Colors.text.copper} />
          <Text style={s.waitingTitle}>
            {state.roundNumber > 1
              ? 'Waiting for the Next Round'
              : 'Waiting for Host to Launch Trivia'}
          </Text>
          <Text style={s.waitingSub}>
            {state.roundNumber > 1
              ? 'Hang tight—the host will start the next round shortly.'
              : state.playMode === 'teams'
              ? 'Join or create your team above before Round 1 starts.'
              : 'Get ready—every phone plays for itself once Round 1 goes live!'}
          </Text>
          {state.roundNumber === 1 ? (
            <View style={s.attendeeGuide}>
              <Text style={s.attendeeGuideTitle}>
                HOW TRIVIA WORKS ({state.playMode === 'teams' ? 'TEAM CAPTAIN MODE' : 'SOLO MODE'})
              </Text>
              {(state.playMode === 'teams'
                ? [
                    'Pick one person at your table to create the team (they become the Team Captain).',
                    'Everyone else joins that team and taps their suggested answer on their own phone.',
                    'The Captain sees all teammate picks and locks in the team’s final answer before reveal.',
                  ]
                : [
                    'Wait for the host to push each question live to your phone.',
                    'Tap A, B, C, or D before the host reveals the answer.',
                    'Earn +100 points per correct answer and climb the live leaderboard!',
                  ]
              ).map((step, i) => (
                <Text key={i} style={s.attendeeGuideStep}>
                  {i + 1}. {step}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Live Leaderboard */}
      {leaderboard.length > 0 ? (
        <View style={s.card}>
          <View style={s.rowGap}>
            <Trophy size={16} color={Colors.accent.copper} />
            <Text style={s.sectionLabel}>LIVE TRIVIA LEADERBOARD</Text>
          </View>
          {leaderboard.map((row, idx) => (
            <View key={row.id} style={s.leaderRow}>
              <Text style={s.leaderRank}>#{idx + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.leaderName}>{row.name}</Text>
                <Text style={s.leaderSub}>{row.sub}</Text>
              </View>
              <Text style={s.leaderScore}>{row.score} pts</Text>
            </View>
          ))}
        </View>
      ) : null}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 14, fontWeight: '800', color: Colors.text.primary, flex: 1 },
  modeBadge: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  modeBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.text.copper },
  headerSub: { fontSize: 12, color: Colors.text.secondary, lineHeight: 17 },
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
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    paddingVertical: 9,
    borderRadius: BorderRadius.sm,
  },
  modeBtnActive: { backgroundColor: Colors.accent.copper, borderColor: Colors.accent.copper },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  modeBtnTextActive: { color: '#FFFFFF' },
  genreRow: { gap: 8, paddingVertical: 2 },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  genreChipActive: { backgroundColor: Colors.accent.copper, borderColor: Colors.accent.copper },
  genreChipText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  genreChipTextActive: { color: '#FFFFFF' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent.copper,
    paddingVertical: 11,
    borderRadius: BorderRadius.sm,
  },
  revealBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent.emerald,
    paddingVertical: 11,
    borderRadius: BorderRadius.sm,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  resetBtn: {
    padding: 11,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  customToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  customToggleText: { fontSize: 12, fontWeight: '700', color: Colors.text.copper },
  customForm: { gap: 8, marginTop: 6 },
  customOptRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  correctPick: {
    width: 32,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctPickActive: {
    backgroundColor: Colors.accent.emerald,
    borderColor: Colors.accent.emerald,
  },
  correctPickText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  input: {
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.text.primary,
    fontSize: 13,
  },
  joinBtn: {
    backgroundColor: Colors.accent.copper,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  joinBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  teamStatusBox: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.sm,
    padding: 10,
    gap: 4,
  },
  teamStatusText: { color: Colors.text.primary, fontWeight: '700', fontSize: 12 },
  teamMembersText: { color: Colors.text.secondary, fontSize: 11 },
  teamList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  teamChipActive: { borderColor: Colors.accent.emerald, backgroundColor: 'rgba(52, 211, 153, 0.14)' },
  teamChipText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  teamChipTextActive: { color: Colors.accent.emerald },
  questionCard: {
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  qHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qMeta: { fontSize: 10, fontWeight: '800', color: Colors.text.copper },
  qStatus: { fontSize: 10, fontWeight: '800', color: Colors.accent.emerald },
  qText: { fontSize: 17, fontWeight: '800', color: Colors.text.primary, lineHeight: 23 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
    padding: 11,
  },
  optionBtnSelected: { borderColor: Colors.accent.copper, backgroundColor: 'rgba(90, 107, 255, 0.14)' },
  optionBtnLocked: { borderColor: Colors.accent.copper, borderWidth: 2 },
  optionBtnCorrect: { borderColor: Colors.accent.emerald, backgroundColor: 'rgba(52, 211, 153, 0.18)' },
  optionLetterBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.background.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetter: { color: Colors.text.primary, fontWeight: '800', fontSize: 12 },
  optionText: { flex: 1, color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  captainPanel: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.sm,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  captainTitle: { fontSize: 11, fontWeight: '800', color: Colors.text.copper },
  captainSub: { fontSize: 11, color: Colors.text.secondary },
  suggestionList: { gap: 3 },
  suggestionItem: { fontSize: 12, color: Colors.text.primary },
  lockRow: { flexDirection: 'row', gap: 6 },
  lockBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.inputBg,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    alignItems: 'center',
  },
  lockBtnActive: { backgroundColor: Colors.accent.copper, borderColor: Colors.accent.copper },
  lockBtnText: { color: Colors.text.secondary, fontSize: 11, fontWeight: '800' },
  lockBtnTextActive: { color: '#FFFFFF' },
  waitingCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  waitingTitle: { fontSize: 14, fontWeight: '800', color: Colors.text.primary },
  waitingSub: { fontSize: 12, color: Colors.text.secondary, textAlign: 'center' },
  attendeeGuide: {
    width: '100%',
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
    borderRadius: BorderRadius.sm,
    padding: 10,
    gap: 5,
    marginTop: 6,
  },
  attendeeGuideTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text.copper,
    letterSpacing: 0.4,
  },
  attendeeGuideStep: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 17,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background.card,
    padding: 10,
    borderRadius: BorderRadius.sm,
  },
  leaderRank: { fontSize: 15, fontWeight: '900', color: Colors.text.copper, width: 28 },
  leaderName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  leaderSub: { fontSize: 11, color: Colors.text.muted },
  leaderScore: { fontSize: 14, fontWeight: '800', color: Colors.accent.emerald },
  timerChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.steelGray,
  },
  timerChoiceBtnActive: {
    backgroundColor: Colors.accent.copper,
    borderColor: Colors.accent.copper,
  },
  timerChoiceText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  timerChoiceTextActive: { color: '#FFFFFF' },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(90, 107, 255, 0.16)',
    borderWidth: 1,
    borderColor: Colors.accent.copper,
  },
  timerPillUrgent: {
    backgroundColor: 'rgba(255, 92, 122, 0.16)',
    borderColor: Colors.accent.crimson,
  },
  timerPillText: { fontSize: 11, fontWeight: '800', color: Colors.text.copper },
  timerPillTextUrgent: { color: Colors.accent.crimson },
  resultBanner: {
    borderRadius: BorderRadius.sm,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  resultBannerWin: {
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: Colors.accent.emerald,
  },
  resultBannerLoss: {
    backgroundColor: 'rgba(255, 92, 122, 0.14)',
    borderColor: Colors.accent.crimson,
  },
  resultBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultBannerSub: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  topicBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  topicBadge: {
    backgroundColor: 'rgba(90, 107, 255, 0.18)',
    borderWidth: 1,
    borderColor: Colors.accent.copper,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  topicBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text.copper,
    letterSpacing: 0.4,
  },
  roundProgressText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text.secondary,
    letterSpacing: 0.4,
  },
  roundCompleteCard: {
    alignItems: 'center',
    backgroundColor: Colors.background.darkSteel,
    borderWidth: 1,
    borderColor: Colors.accent.emerald,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: 6,
  },
  roundCompleteTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.accent.emerald,
  },
  roundCompleteSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
