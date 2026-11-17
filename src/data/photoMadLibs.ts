export interface PhotoMadLibSlot {
  slotIndex: number;
  mode: 'Solo' | 'With Someone' | 'Group (2+)';
  prompt: string;
  storyTemplate: string; // Uses {name} placeholder
}

export interface PhotoMadLibStory {
  id: string;
  title: string;
  tagline: string;
  readAloudScript: string;
  howToPlay: string[];
  slots: PhotoMadLibSlot[];
}

export const PHOTO_MADLIB_STORIES: PhotoMadLibStory[] = [
  {
    id: 'night_went_wrong',
    title: 'The Night Everything Went Off-Script',
    tagline: '7 directed snapshots compiled into your own hilarious still-frame story.',
    readAloudScript:
      '“Time for a Mad-Lib Photo Story! Open your phone and snap the 7 photo prompts—some solo, some with people nearby. As I approve them, your photos compile into your own personal funny story reel right on your phone!”',
    howToPlay: [
      'Snap each of the 7 directed photo scenes (Solo, With Someone, or Group).',
      'Photos go to the host for quick approval, then unlock in your personal Story Timeline.',
      'Tap Play My Story Reel anytime to watch your still-frame story!',
    ],
    slots: [
      {
        slotIndex: 0,
        mode: 'Solo',
        prompt: 'Make your most dramatic “I just walked into the wrong party” face.',
        storyTemplate: 'Chapter 1: It all started at 8:15 PM when {name} realized this was definitely not a quiet book club...',
      },
      {
        slotIndex: 1,
        mode: 'With Someone',
        prompt: 'High-five someone new like you both just won the lottery.',
        storyTemplate: 'Chapter 2: Within five minutes, {name} recruited an accomplice and celebrated way too early...',
      },
      {
        slotIndex: 2,
        mode: 'Solo',
        prompt: 'Strike a fake-celebrity “paparazzi caught me” pose with your drink.',
        storyTemplate: 'Chapter 3: Confidence hit an all-time high as {name} decided to act like a minor celebrity...',
      },
      {
        slotIndex: 3,
        mode: 'With Someone',
        prompt: 'Look deeply confused while pointing at a menu, sign, or wall with a partner.',
        storyTemplate: 'Chapter 4: Nobody knew what the plan was, so {name} pretended to read the fine print...',
      },
      {
        slotIndex: 4,
        mode: 'Solo',
        prompt: 'Give your best “I swear I wasn’t the one who broke it” innocent look.',
        storyTemplate: 'Chapter 5: Right around 9:45 PM, something mysterious happened—and {name} pleaded the fifth...',
      },
      {
        slotIndex: 5,
        mode: 'Group (2+)',
        prompt: 'Huddle up with 2+ people like you’re calling the final play of the Super Bowl.',
        storyTemplate: 'Chapter 6: Emergency huddle! {name} & crew drew up a completely questionable exit strategy...',
      },
      {
        slotIndex: 6,
        mode: 'Group (2+)',
        prompt: 'Squish together and make your best “no regrets, see you next week” victory pose.',
        storyTemplate: 'Finale: By 11:00 PM, {name} & the squad decided it was officially a legendary night.',
      },
    ],
  },
  {
    id: 'secret_mission_log',
    title: 'Undercover Mission Gone Sideways',
    tagline: '7-scene spy comic strip starring you and tonight’s crowd.',
    readAloudScript:
      '“Agents, we need photographic evidence of tonight’s undercover mission! Complete the 7 spy scenes—solo and with fellow operatives—and watch your personal mission dossier come to life!”',
    howToPlay: [
      'Complete the 7 undercover photo scenes in any order.',
      'Once approved by the host, each frame unlocks in your Mission Story.',
      'Hit Play My Story Reel to watch your full spy comic strip!',
    ],
    slots: [
      {
        slotIndex: 0,
        mode: 'Solo',
        prompt: 'Pretend to whisper urgent orders into an invisible wristwatch.',
        storyTemplate: '20:00 HRS — Agent {name} received classified orders near the entrance...',
      },
      {
        slotIndex: 1,
        mode: 'With Someone',
        prompt: 'Stand back-to-back with another guest like an action movie poster.',
        storyTemplate: '20:20 HRS — Backup arrived as {name} formed a high-stakes alliance...',
      },
      {
        slotIndex: 2,
        mode: 'Solo',
        prompt: 'Peek around a corner or behind your hand like you’re tailing a suspect.',
        storyTemplate: '20:45 HRS — Stealth mode activated. {name} blended right in (mostly)...',
      },
      {
        slotIndex: 3,
        mode: 'With Someone',
        prompt: 'Trade sunglasses or a prop and look suspiciously over your shoulder.',
        storyTemplate: '21:10 HRS — The disguise worked—though {name} looked slightly suspicious...',
      },
      {
        slotIndex: 4,
        mode: 'Solo',
        prompt: 'Hold up your phone or a coaster like it’s a top-secret microchip.',
        storyTemplate: '21:35 HRS — Package secured! {name} recovered the mysterious artifact...',
      },
      {
        slotIndex: 5,
        mode: 'Group (2+)',
        prompt: 'Point dramatically off-camera like you just spotted the double agent.',
        storyTemplate: '22:00 HRS — Cover blown! {name} & team spotted trouble across the room...',
      },
      {
        slotIndex: 6,
        mode: 'Group (2+)',
        prompt: 'Do a slow-motion “walking away from an explosion” victory pose.',
        storyTemplate: '22:30 HRS — Mission accomplished. {name} vanished into the night like a pro.',
      },
    ],
  },
  {
    id: 'vip_red_carpet',
    title: 'VIP Red Carpet Disaster',
    tagline: '7 tabloid-worthy snapshots from your chaotic night of fame.',
    readAloudScript:
      '“Welcome to the VIP Red Carpet! Snap all 7 celebrity photo scenes—solo and with your co-stars—and build your own tabloid story timeline!”',
    howToPlay: [
      'Snap all 7 Red Carpet photo scenes.',
      'Wait for quick host approval to unlock each tabloid frame.',
      'Tap Play My Story Reel to watch your rise and fall in fame!',
    ],
    slots: [
      {
        slotIndex: 0,
        mode: 'Solo',
        prompt: 'Give your over-the-top Oscar acceptance speech face.',
        storyTemplate: 'Scene 1: First on the carpet, {name} thanked literally everyone in the building...',
      },
      {
        slotIndex: 1,
        mode: 'With Someone',
        prompt: 'Toast glasses with someone like you just closed a million-dollar deal.',
        storyTemplate: 'Scene 2: Minutes later, {name} inked a completely fictional movie contract...',
      },
      {
        slotIndex: 2,
        mode: 'Solo',
        prompt: 'Shield your face from the “paparazzi” with one hand.',
        storyTemplate: 'Scene 3: Fame got exhausting fast for {name} near the bar...',
      },
      {
        slotIndex: 3,
        mode: 'With Someone',
        prompt: 'Sign an imaginary autograph on a napkin or someone’s hand.',
        storyTemplate: 'Scene 4: Ever humble, {name} stopped to sign autographs for loyal fans...',
      },
      {
        slotIndex: 4,
        mode: 'Solo',
        prompt: 'Strike a dramatic “fashion magazine cover” runway stare.',
        storyTemplate: 'Scene 5: Vogue called—{name} delivered a pose nobody asked for...',
      },
      {
        slotIndex: 5,
        mode: 'Group (2+)',
        prompt: 'Do a chaotic boy-band / girl-group album cover pose.',
        storyTemplate: 'Scene 6: By 11:00 PM, {name} launched a brand-new supergroup...',
      },
      {
        slotIndex: 6,
        mode: 'Group (2+)',
        prompt: 'Take a triumphant “afterparty legends” group selfie.',
        storyTemplate: 'Scene 7: Critics agreed—{name} & co-stars stole the entire show.',
      },
    ],
  },
];
