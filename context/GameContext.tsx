import React, { createContext, useContext, useState } from 'react';

export type GameMode = 'chameleon' | 'bingo' | 'partnerCheckIn' | 'duoQuest';
export type BeaconColorType = 'Copper Flame' | 'Electric Teal' | 'Crimson Pulse' | 'Emerald Vibe';

export interface MockGuest {
  id: string;
  name: string;
  type: 'Single Female' | 'Single Male' | 'Couple' | 'Group Arrival';
  karaoke: string;
  travel: string;
  skill: string;
  boundaries: string[];
  lookingFor: string[];
  distance: 'HOT (< 5 ft)' | 'Warming Up (12 ft)' | 'Cold (25+ ft)';
  tapped: boolean;
  tappedAt?: string;
  greenLightFromMe: boolean;
  greenLightFromThem: boolean;
  pointsEarned: number;
  accolade: string;
}

export interface TapResult {
  guest: MockGuest;
  pointsAwarded: number;
  sharedInterest: string;
  icebreakerQuestion: string;
}

interface GameContextType {
  roomCode: string;
  isNfcBound: boolean;
  boundNfcTagId: string;
  userPoints: number;
  totalBusPoints: number;
  busGoal: number;
  activeGameMode: GameMode;
  beaconColor: BeaconColorType;
  beaconColorHex: string;
  bingoPrompt: string;
  proximityDistance: 'Cold (25+ ft)' | 'Warming Up (12 ft)' | 'HOT — Match Nearby (< 5 ft)!';
  mockGuests: MockGuest[];
  checkedInVenues: string[];
  toggleNfcBinding: () => void;
  cycleBeaconColor: () => void;
  cycleProximityDistance: () => void;
  setGameMode: (mode: GameMode) => void;
  setBingoPrompt: (prompt: string) => void;
  simulateNfcTap: (guestId: string) => TapResult | null;
  toggleGreenLight: (guestId: string) => void;
  checkInVenue: (venueId: string) => boolean;
  awardPoints: (pts: number) => void;
  resetGameData: () => void;
}

const BEACON_COLORS: { name: BeaconColorType; hex: string }[] = [
  { name: 'Copper Flame', hex: '#C86D51' },
  { name: 'Electric Teal', hex: '#2EAF7D' },
  { name: 'Crimson Pulse', hex: '#D9383A' },
  { name: 'Emerald Vibe', hex: '#10B981' },
];

const INITIAL_MOCK_GUESTS: MockGuest[] = [
  {
    id: 'guest_1',
    name: 'Taylor & Jordan',
    type: 'Couple',
    karaoke: "Don't Stop Believin'",
    travel: 'Amalfi Coast',
    skill: 'Espresso Martini Master',
    boundaries: ['Same Room', 'Soft Swap'],
    lookingFor: ['Couples Only'],
    distance: 'HOT (< 5 ft)',
    tapped: false,
    greenLightFromMe: false,
    greenLightFromThem: true,
    pointsEarned: 150,
    accolade: 'Fastest Icebreaker',
  },
  {
    id: 'guest_2',
    name: 'Samantha Vibe',
    type: 'Single Female',
    karaoke: 'Mr. Brightside',
    travel: 'Tokyo, Japan',
    skill: 'Salsa Dancing Pro',
    boundaries: ['Social / Vibe Check Only'],
    lookingFor: ['Just Friends / Socializing', 'Couples Only'],
    distance: 'HOT (< 5 ft)',
    tapped: false,
    greenLightFromMe: false,
    greenLightFromThem: true,
    pointsEarned: 100,
    accolade: 'Bridge Builder',
  },
  {
    id: 'guest_3',
    name: 'Marcus & Chloe',
    type: 'Couple',
    karaoke: 'Sweet Caroline',
    travel: 'Santorini',
    skill: 'Mixology Wizard',
    boundaries: ['Soft Swap', 'Full Swap'],
    lookingFor: ['Couples Only', 'Non-Singles / Open Partners'],
    distance: 'Warming Up (12 ft)',
    tapped: false,
    greenLightFromMe: false,
    greenLightFromThem: false,
    pointsEarned: 150,
    accolade: 'Social Legend',
  },
  {
    id: 'guest_4',
    name: 'Dave_Rock',
    type: 'Single Male',
    karaoke: 'Livin\' on a Prayer',
    travel: 'Costa Rica',
    skill: 'Fireplace Guitarist',
    boundaries: ['Social / Vibe Check Only'],
    lookingFor: ['Singles (Female)', 'Just Friends / Socializing'],
    distance: 'Warming Up (12 ft)',
    tapped: false,
    greenLightFromMe: false,
    greenLightFromThem: false,
    pointsEarned: 100,
    accolade: 'Vibe Master',
  },
  {
    id: 'guest_5',
    name: 'The Nashville Crew',
    type: 'Group Arrival',
    karaoke: 'Bohemian Rhapsody',
    travel: 'Miami Beach',
    skill: 'Party Bus DJ',
    boundaries: ['Social / Vibe Check Only'],
    lookingFor: ['Just Friends / Socializing'],
    distance: 'Cold (25+ ft)',
    tapped: false,
    greenLightFromMe: false,
    greenLightFromThem: true,
    pointsEarned: 120,
    accolade: 'Group Connector',
  },
];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const roomCode = 'NASH-25';
  const [isNfcBound, setIsNfcBound] = useState(false);
  const boundNfcTagId = 'NTAG-4829';
  const [userPoints, setUserPoints] = useState(250);
  const [totalBusPoints, setTotalBusPoints] = useState(1450);
  const busGoal = 2500;
  const [activeGameMode, setActiveGameMode] = useState<GameMode>('chameleon');
  const [beaconColorIdx, setBeaconColorIdx] = useState(0);
  const [bingoPrompt, setBingoPrompt] = useState('Find someone who has visited 5+ states this year');
  const [proximityIdx, setProximityIdx] = useState(2);
  const [mockGuests, setMockGuests] = useState<MockGuest[]>(INITIAL_MOCK_GUESTS);
  const [checkedInVenues, setCheckedInVenues] = useState<string[]>([]);

  const proximityOptions: ('Cold (25+ ft)' | 'Warming Up (12 ft)' | 'HOT — Match Nearby (< 5 ft)!')[] = [
    'Cold (25+ ft)',
    'Warming Up (12 ft)',
    'HOT — Match Nearby (< 5 ft)!',
  ];

  const toggleNfcBinding = () => setIsNfcBound((prev) => !prev);
  const cycleBeaconColor = () => setBeaconColorIdx((prev) => (prev + 1) % BEACON_COLORS.length);
  const cycleProximityDistance = () => setProximityIdx((prev) => (prev + 1) % proximityOptions.length);
  const setGameMode = (mode: GameMode) => setActiveGameMode(mode);

  const awardPoints = (pts: number) => {
    setUserPoints((prev) => prev + pts);
    setTotalBusPoints((prev) => prev + pts);
  };

  const checkInVenue = (venueId: string): boolean => {
    if (checkedInVenues.includes(venueId)) return false;
    setCheckedInVenues((prev) => [...prev, venueId]);
    awardPoints(200);
    return true;
  };

  const simulateNfcTap = (guestId: string): TapResult | null => {
    const guest = mockGuests.find((g) => g.id === guestId);
    if (!guest) return null;

    const points = guest.type === 'Couple' ? 150 : 100;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMockGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, tapped: true, tappedAt: nowStr } : g))
    );
    setUserPoints((prev) => prev + points);
    setTotalBusPoints((prev) => prev + points);

    const sharedInterests = [
      `Both love traveling to ${guest.travel}!`,
      `Mutual song vibe: "${guest.karaoke}"`,
      `Shared skill interest: ${guest.skill}!`,
    ];
    const icebreakerQuestions = [
      `Ask ${guest.name}: "What's the best memory from ${guest.travel}?"`,
      `Ask ${guest.name}: "If we queued up ${guest.karaoke} right now, duet or solo?"`,
      `Ask ${guest.name}: "What's your trick for ${guest.skill}?"`,
    ];
    const rIdx = Math.floor(Math.random() * sharedInterests.length);

    return {
      guest: { ...guest, tapped: true, tappedAt: nowStr },
      pointsAwarded: points,
      sharedInterest: sharedInterests[rIdx],
      icebreakerQuestion: icebreakerQuestions[rIdx],
    };
  };

  const toggleGreenLight = (guestId: string) => {
    setMockGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, greenLightFromMe: !g.greenLightFromMe } : g))
    );
  };

  const resetGameData = () => {
    setUserPoints(250);
    setTotalBusPoints(1450);
    setMockGuests(INITIAL_MOCK_GUESTS);
    setCheckedInVenues([]);
    setIsNfcBound(false);
    setBeaconColorIdx(0);
    setActiveGameMode('chameleon');
  };

  const currentBeacon = BEACON_COLORS[beaconColorIdx];

  return (
    <GameContext.Provider
      value={{
        roomCode,
        isNfcBound,
        boundNfcTagId,
        userPoints,
        totalBusPoints,
        busGoal,
        activeGameMode,
        beaconColor: currentBeacon.name,
        beaconColorHex: currentBeacon.hex,
        bingoPrompt,
        proximityDistance: proximityOptions[proximityIdx],
        mockGuests,
        checkedInVenues,
        toggleNfcBinding,
        cycleBeaconColor,
        cycleProximityDistance,
        setGameMode,
        setBingoPrompt,
        simulateNfcTap,
        toggleGreenLight,
        checkInVenue,
        awardPoints,
        resetGameData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
