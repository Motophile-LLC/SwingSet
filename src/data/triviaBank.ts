export type TriviaGenre =
  | 'General Knowledge'
  | '90s Pop Culture'
  | '2000s Nostalgia'
  | 'Music & Movies'
  | 'TV & Streaming'
  | 'Sports'
  | 'Food & Drink'
  | 'Science & Space'
  | 'Travel & Geography'
  | 'Nashville / Local'
  | 'Seasonal / Holiday';

export interface TriviaQuestion {
  id: string;
  genre: TriviaGenre;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  points: number;
  isCustom?: boolean;
}

export const TRIVIA_GENRES: TriviaGenre[] = [
  'General Knowledge',
  '90s Pop Culture',
  '2000s Nostalgia',
  'Music & Movies',
  'TV & Streaming',
  'Sports',
  'Food & Drink',
  'Science & Space',
  'Travel & Geography',
  'Nashville / Local',
  'Seasonal / Holiday',
];

export const CURATED_TRIVIA_BANK: TriviaQuestion[] = [
  // General Knowledge
  {
    id: 'gk_1',
    genre: 'General Knowledge',
    question: 'Which planet in our solar system has the most moons?',
    options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    correctIndex: 1,
    points: 100,
  },
  {
    id: 'gk_2',
    genre: 'General Knowledge',
    question: 'What is the only letter that does not appear in any U.S. state name?',
    options: ['X', 'Z', 'Q', 'J'],
    correctIndex: 2,
    points: 100,
  },
  {
    id: 'gk_3',
    genre: 'General Knowledge',
    question: 'Which country is home to the most time zones (including overseas territories)?',
    options: ['Russia', 'United States', 'France', 'Canada'],
    correctIndex: 2,
    points: 100,
  },
  {
    id: 'gk_4',
    genre: 'General Knowledge',
    question: 'What does the "HTTP" in a web address stand for?',
    options: [
      'HyperText Transfer Protocol',
      'High Tech Transmission Path',
      'Hyperlink Text Tracking Process',
      'Host Terminal Transfer Protocol',
    ],
    correctIndex: 0,
    points: 100,
  },

  // 90s Pop Culture
  {
    id: '90s_1',
    genre: '90s Pop Culture',
    question: 'What was the name of the coffee shop where the cast of "Friends" hung out?',
    options: ['Java Joe’s', 'Central Perk', 'The Daily Grind', 'Cafe Nervosa'],
    correctIndex: 1,
    points: 100,
  },
  {
    id: '90s_2',
    genre: '90s Pop Culture',
    question: 'Which 1994 film famously featured the line "Life is like a box of chocolates"?',
    options: ['Pulp Fiction', 'The Shawshank Redemption', 'Forrest Gump', 'Speed'],
    correctIndex: 2,
    points: 100,
  },
  {
    id: '90s_3',
    genre: '90s Pop Culture',
    question: 'Which handheld digital pet took over classrooms in 1997?',
    options: ['Furby', 'Tamagotchi', 'Polly Pocket', 'Beanie Baby'],
    correctIndex: 1,
    points: 100,
  },
  {
    id: '90s_4',
    genre: '90s Pop Culture',
    question: 'Who sang the 1999 hit "...Baby One More Time"?',
    options: ['Christina Aguilera', 'Jessica Simpson', 'Britney Spears', 'Mandy Moore'],
    correctIndex: 2,
    points: 100,
  },

  // Music & Movies
  {
    id: 'mm_1',
    genre: 'Music & Movies',
    question: 'Which city is widely known as "Music City"?',
    options: ['Austin', 'Memphis', 'Nashville', 'New Orleans'],
    correctIndex: 2,
    points: 100,
  },
  {
    id: 'mm_2',
    genre: 'Music & Movies',
    question: 'In "The Matrix", what color pill does Neo take?',
    options: ['Blue', 'Red', 'Green', 'Gold'],
    correctIndex: 1,
    points: 100,
  },
  {
    id: 'mm_3',
    genre: 'Music & Movies',
    question: 'Which band released the iconic album "Rumours" in 1977?',
    options: ['Eagles', 'Fleetwood Mac', 'The Doors', 'Led Zeppelin'],
    correctIndex: 1,
    points: 100,
  },
  {
    id: 'mm_4',
    genre: 'Music & Movies',
    question: 'Who directed "Jurassic Park" (1993)?',
    options: ['James Cameron', 'George Lucas', 'Steven Spielberg', 'Ridley Scott'],
    correctIndex: 2,
    points: 100,
  },

  // Sports
  {
    id: 'sp_1',
    genre: 'Sports',
    question: 'How many players are on the field for one soccer team during play?',
    options: ['9', '10', '11', '12'],
    correctIndex: 2,
    points: 100,
  },
  {
    id: 'sp_2',
    genre: 'Sports',
    question: 'In bowling, what is it called when you knock down all 10 pins on your first roll?',
    options: ['Spare', 'Strike', 'Turkey', 'Split'],
    correctIndex: 1,
    points: 100,
  },
  {
    id: 'sp_3',
    genre: 'Sports',
    question: 'Which sport uses terms like "birdie", "eagle", and "albatross"?',
    options: ['Badminton', 'Tennis', 'Golf', 'Disc Golf'],
    correctIndex: 2,
    points: 100,
  },

  // Food & Drink
  {
    id: 'fd_1',
    genre: 'Food & Drink',
    question: 'Which spirit is traditionally used to make a classic Margarita?',
    options: ['Rum', 'Vodka', 'Tequila', 'Gin'],
    correctIndex: 2,
    points: 100,
  },
  {
    id: 'fd_2',
    genre: 'Food & Drink',
    question: 'What is the main ingredient in traditional guacamole?',
    options: ['Avocado', 'Tomatillo', 'Jalapeño', 'Cilantro'],
    correctIndex: 0,
    points: 100,
  },
  {
    id: 'fd_3',
    genre: 'Food & Drink',
    question: 'Which Italian cheese is traditionally used in Tiramisu?',
    options: ['Ricotta', 'Mozzarella', 'Mascarpone', 'Parmesan'],
    correctIndex: 2,
    points: 100,
  },
];
