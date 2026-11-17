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
    tagline: '4 directed snapshots compiled into a hilarious group story timeline.',
    readAloudScript:
      '“Time for a Mad-Lib Photo Story! Open your phone and check the 4 photo prompts. Some are solo, some require grabbing someone nearby. Snap your pics—they come straight to me, and we’ll play the compiled funny story reel live between rounds!”',
    howToPlay: [
      'Pick any open photo prompt on your screen (Solo, With Someone, or Group).',
      'Snap the directed pose using the in-app camera (photos go to the host first).',
      'Watch the Live Story Timeline fill in with funny captions and still frames!',
    ],
    slots: [
      {
        slotIndex: 0,
        mode: 'Solo',
        prompt: 'Make your most dramatic “I just saw my ex walk in” face.',
        storyTemplate: 'It all started at 8:15 PM when {name} spotted someone unexpected across the room...',
      },
      {
        slotIndex: 1,
        mode: 'With Someone',
        prompt: 'High-five someone new like you both just won the lottery.',
        storyTemplate: 'Within minutes, {name} recruited an accomplice and celebrated way too early...',
      },
      {
        slotIndex: 2,
        mode: 'Solo',
        prompt: 'Strike a fake-celebrity “paparazzi caught me” pose with your drink.',
        storyTemplate: 'Confidence hit an all-time high as {name} decided to act completely normal...',
      },
      {
        slotIndex: 3,
        mode: 'Group (2+)',
        prompt: 'Squish together and make your best “we definitely shouldn’t have done that” face.',
        storyTemplate: 'And by 10:30 PM, {name} & crew realized there was no turning back.',
      },
    ],
  },
  {
    id: 'secret_mission_log',
    title: 'Undercover Mission Gone Sideways',
    tagline: 'Spy-themed still-frame comic strip starring the room.',
    readAloudScript:
      '“Agents, we need photographic evidence of tonight’s undercover mission! Grab a partner or go solo on the 4 spy prompts—once I approve them, we’ll reveal the full mission dossier live on everyone’s screen!”',
    howToPlay: [
      'Choose one of the 4 spy photo prompts on your screen.',
      'Snap the photo in-app (with your partner if it says With Someone).',
      'Check the Live Story Reel as the host approves frames into the dossier!',
    ],
    slots: [
      {
        slotIndex: 0,
        mode: 'Solo',
        prompt: 'Pretend to whisper into an invisible wristwatch earpiece.',
        storyTemplate: '20:00 HRS — Agent {name} received classified orders at the bar...',
      },
      {
        slotIndex: 1,
        mode: 'With Someone',
        prompt: 'Stand back-to-back with another guest like an action movie poster.',
        storyTemplate: '20:25 HRS — Backup arrived as {name} formed an unlikely alliance...',
      },
      {
        slotIndex: 2,
        mode: 'With Someone',
        prompt: 'Trade sunglasses or a prop and look suspiciously over your shoulder.',
        storyTemplate: '21:10 HRS — The disguise worked... mostly, according to {name}...',
      },
      {
        slotIndex: 3,
        mode: 'Group (2+)',
        prompt: 'Point dramatically at something off-camera like you spotted the villain.',
        storyTemplate: '22:00 HRS — Mission compromised! {name} & team made a break for the patio.',
      },
    ],
  },
  {
    id: 'vip_red_carpet',
    title: 'VIP Red Carpet Disaster',
    tagline: 'Glamour, chaos, and dramatic poses from tonight’s crowd.',
    readAloudScript:
      '“Welcome to the VIP Red Carpet! Snap the 4 celebrity-style photo prompts—solo or with a co-star—and let’s build tonight’s tabloid story timeline live!”',
    howToPlay: [
      'Pick any of the 4 Red Carpet photo prompts.',
      'Capture your best (or worst) celebrity pose in-app.',
      'Watch the host compile the live tabloid still-frame timeline!',
    ],
    slots: [
      {
        slotIndex: 0,
        mode: 'Solo',
        prompt: 'Give your over-the-top Oscar acceptance speech face.',
        storyTemplate: 'First on the carpet, {name} thanked literally everyone in the building...',
      },
      {
        slotIndex: 1,
        mode: 'With Someone',
        prompt: 'Toast glasses with a stranger like you’re closing a million-dollar deal.',
        storyTemplate: 'Minutes later, {name} inked a completely fictional movie deal...',
      },
      {
        slotIndex: 2,
        mode: 'Solo',
        prompt: 'Shield your face from the “paparazzi” with one hand.',
        storyTemplate: 'Fame got exhausting fast for {name} near the appetizer table...',
      },
      {
        slotIndex: 3,
        mode: 'Group (2+)',
        prompt: 'Do a chaotic boy-band / girl-group album cover pose.',
        storyTemplate: 'By midnight, {name} launched a brand-new supergroup nobody asked for.',
      },
    ],
  },
];
