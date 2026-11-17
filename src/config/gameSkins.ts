import { GameSkinId } from '../types/swingset';

export interface SkinRoleToken {
  id: string;
  label: string;
  colorHex: string;
  icon: string;
  matchesWithId: string; // Complementary target token ID for Hunters
}

export interface GameHostIntro {
  readAloudScript: string;
  howToPlay: string[];
}

export interface GameSkinDefinition {
  id: GameSkinId;
  name: string;
  tagline: string;
  hostIntro: GameHostIntro;
  catalystRole: {
    label: string;
    colorHex: string;
    icon: string;
    actionInstruction: string;
  };
  hunterTokens: SkinRoleToken[];
  minglePrompts: string[];
}

export const GAME_SKINS: Record<GameSkinId, GameSkinDefinition> = {
  fuse_spark: {
    id: 'fuse_spark',
    name: 'Fuse & Spark',
    tagline: 'Pass the live fuse before detonation while the room stabilizes circuits.',
    hostIntro: {
      readAloudScript:
        '“Everyone check your phone! A few of you are holding a LIVE FUSE—your job is to pass it off before time runs out by tapping phones or trading your 3-letter code. Everyone else has a colored circuit wire—find your matching partner, tap to lock in, and get ready for a quick icebreaker question!”',
      howToPlay: [
        'Live Fuse holders: Find the matching role on your screen and tap/enter their 3-char code to pass the fuse.',
        'Circuit Hunters: Find someone with your complementary wire (e.g., Blue Coolant ↔ Gold Relay) and tap to pair.',
        'When the scramble ends, chat with your matched partner using the on-screen Mingle prompt!',
      ],
    },
    catalystRole: {
      label: 'LIVE FUSE',
      colorHex: '#DC2626', // Crimson Red
      icon: 'flame',
      actionInstruction: 'Find & tap someone holding:',
    },
    hunterTokens: [
      { id: 'wire_blue', label: 'BLUE COOLANT', colorHex: '#0284C7', icon: 'droplet', matchesWithId: 'wire_gold' },
      { id: 'wire_gold', label: 'GOLD RELAY', colorHex: '#D97706', icon: 'zap', matchesWithId: 'wire_blue' },
      { id: 'wire_emerald', label: 'EMERALD SHIELD', colorHex: '#059669', icon: 'shield', matchesWithId: 'wire_violet' },
      { id: 'wire_violet', label: 'VIOLET BREAKER', colorHex: '#7C3AED', icon: 'cpu', matchesWithId: 'wire_emerald' },
    ],
    minglePrompts: [
      'You defused the room together. What is the most spontaneous trip you have ever taken?',
      'Crisis averted. What is one bucket-list experience you are determined to do this year?',
      'High-stakes teamwork. What is your go-to way to unwind after a wild week?',
    ],
  },

  outbreak: {
    id: 'outbreak',
    name: 'Contagion',
    tagline: 'Patient Zero spreads the spark while guests pair antibodies for immunity.',
    hostIntro: {
      readAloudScript:
        '“Heads up—we have a few PATIENT ZEROS in the room! If you are Patient Zero, you need to pass the contagion to your target before the timer hits zero. Everyone else: check your strain or antidote on your phone, track down your matching half, and tap to achieve immunity!”',
      howToPlay: [
        'Patient Zero: Pass the contagion to your assigned target via NFC tap or 3-char code.',
        'Everyone else: Pair your Strand with its matching Antidote (Alpha or Omega) before the clock runs out.',
        'Once paired, use the Immunity Mingle prompt on your screen to break the ice.',
      ],
    },
    catalystRole: {
      label: 'PATIENT ZERO',
      colorHex: '#EA580C', // Biohazard Orange
      icon: 'biohazard',
      actionInstruction: 'Pass the contagion to:',
    },
    hunterTokens: [
      { id: 'alpha_a', label: 'ALPHA STRAND', colorHex: '#0D9488', icon: 'dna', matchesWithId: 'alpha_b' },
      { id: 'alpha_b', label: 'ALPHA ANTIDOTE', colorHex: '#2563EB', icon: 'flask-conical', matchesWithId: 'alpha_a' },
      { id: 'omega_a', label: 'OMEGA STRAND', colorHex: '#9333EA', icon: 'atom', matchesWithId: 'omega_b' },
      { id: 'omega_b', label: 'OMEGA ANTIDOTE', colorHex: '#DB2777', icon: 'heart-pulse', matchesWithId: 'omega_a' },
    ],
    minglePrompts: [
      'You achieved full immunity. What is your #1 rule for surviving a chaotic weekend?',
      'Quarantine cleared. If you could teleport anywhere for dinner tonight, where are you going?',
      'Survivors stick together. What is the best live event or concert you have ever been to?',
    ],
  },

  drop_beat: {
    id: 'drop_beat',
    name: 'Drop the Beat',
    tagline: 'Offload the overheating mic before the bass drops while guests build a setlist.',
    hostIntro: {
      readAloudScript:
        '“Alright everybody, we’re building a live setlist! A few of you are stuck holding a HOT MIC—hand it off before the beat drops! Everyone else has an instrument or track on their phone—pair up with your matching sound, tap to lock in your duo, and share your music picks!”',
      howToPlay: [
        'Hot Mic holders: Pass the mic to your target before the countdown ends.',
        'Musicians: Pair Deep Bass ↔ Rhythm Drums or Analog Synth ↔ Rare Vinyl.',
        'When the beat drops, answer the Backstage Mingle prompt with your new partner.',
      ],
    },
    catalystRole: {
      label: 'HOT MIC',
      colorHex: '#E11D48', // Rose Neon
      icon: 'mic',
      actionInstruction: 'Pass the mic to:',
    },
    hunterTokens: [
      { id: 'bass', label: 'DEEP BASS', colorHex: '#4F46E5', icon: 'speaker', matchesWithId: 'drums' },
      { id: 'drums', label: 'RHYTHM DRUMS', colorHex: '#0891B2', icon: 'disc', matchesWithId: 'bass' },
      { id: 'synth', label: 'ANALOG SYNTH', colorHex: '#C026D3', icon: 'sliders', matchesWithId: 'vinyl' },
      { id: 'vinyl', label: 'RARE VINYL', colorHex: '#16A34A', icon: 'music', matchesWithId: 'synth' },
    ],
    minglePrompts: [
      'You just formed a headline act. What is your terrible band name and signature song?',
      'The beat dropped. What song instantly gets you onto the dance floor every time?',
      'Backstage pass unlocked. Who is an artist you could listen to on repeat forever?',
    ],
  },

  secret_agent: {
    id: 'secret_agent',
    name: 'Dead Drop',
    tagline: 'Pass the encrypted briefing before the trace finishes while operatives verify ciphers.',
    hostIntro: {
      readAloudScript:
        '“Agents, your phones just received classified intel. If you’re carrying THE BRIEFING, you need to hand it off before the trace completes! All other operatives: locate your matching cipher partner across the room, tap phones to verify the dead drop, and compare alibis!”',
      howToPlay: [
        'Briefing carriers: Hand off the case to your target via NFC tap or 3-char code.',
        'Operatives: Match Cipher Key ↔ Vault Lock or True North ↔ Ghost Signal.',
        'After the dead drop, trade answers to the Eyes-Only Mingle prompt.',
      ],
    },
    catalystRole: {
      label: 'THE BRIEFING',
      colorHex: '#B91C1C', // Deep Crimson
      icon: 'briefcase',
      actionInstruction: 'Hand off the case to:',
    },
    hunterTokens: [
      { id: 'cipher_key', label: 'CIPHER KEY', colorHex: '#1D4ED8', icon: 'key', matchesWithId: 'cipher_lock' },
      { id: 'cipher_lock', label: 'VAULT LOCK', colorHex: '#047857', icon: 'lock', matchesWithId: 'cipher_key' },
      { id: 'compass', label: 'TRUE NORTH', colorHex: '#B45309', icon: 'compass', matchesWithId: 'signal' },
      { id: 'signal', label: 'GHOST SIGNAL', colorHex: '#6D28D9', icon: 'radio', matchesWithId: 'compass' },
    ],
    minglePrompts: [
      'Your cover is blown. What is your immediate fake alibi for being at this venue tonight?',
      'Dead drop verified. What is a surprising skill or hobby most people do not know you have?',
      'Eyes only. What is the best piece of advice someone has given you recently?',
    ],
  },

  cocktail_mixer: {
    id: 'cocktail_mixer',
    name: 'Cocktail Mixer',
    tagline: 'Pass the overflowing coupe before it spills while guests pair spirits and mixers.',
    hostIntro: {
      readAloudScript:
        '“Time for Cocktail Mixer! A few lucky guests are holding THE SPILL—pass that overflowing glass off before time’s up! Everyone else has a spirit or mixer on their screen—find your cocktail’s other half, tap to mix the drink, and cheers with the prompt on your phone!”',
      howToPlay: [
        'The Spill holders: Hand off the overflowing glass before the timer runs out.',
        'Mixologists: Pair Aged Bourbon ↔ Aromatic Bitters or Reposado Tequila ↔ Fresh Lime.',
        'Once mixed, grab a sip and chat through the Cheers Mingle prompt!',
      ],
    },
    catalystRole: {
      label: 'THE SPILL',
      colorHex: '#BE123C', // Ruby
      icon: 'wine',
      actionInstruction: 'Hand the glass to:',
    },
    hunterTokens: [
      { id: 'bourbon', label: 'AGED BOURBON', colorHex: '#B45309', icon: 'glass-water', matchesWithId: 'bitters' },
      { id: 'bitters', label: 'AROMATIC BITTERS', colorHex: '#0F766E', icon: 'sparkles', matchesWithId: 'bourbon' },
      { id: 'tequila', label: 'REPOSADO TEQUILA', colorHex: '#0369A1', icon: 'sun', matchesWithId: 'lime' },
      { id: 'lime', label: 'FRESH LIME', colorHex: '#15803D', icon: 'citrus', matchesWithId: 'tequila' },
    ],
    minglePrompts: [
      'You crafted the house special. What is your actual go-to drink order at a great bar?',
      'Cheers to good company. What is your favorite hidden-gem spot in town?',
      'Top-shelf pairing. What is the best meal you have had in the last six months?',
    ],
  },
};

export function pickSkin(skinId: GameSkinId | 'random'): GameSkinDefinition {
  if (skinId === 'random') {
    const keys = Object.keys(GAME_SKINS) as GameSkinId[];
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return GAME_SKINS[randomKey];
  }
  return GAME_SKINS[skinId];
}