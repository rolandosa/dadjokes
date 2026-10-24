/**
 * The joke library and the Groan-o-Meter, shared by the web app, the API and the Vault page.
 *
 * A joke's key is `<category>:<index>`. The API only stores jokes it can find here, so
 * append new jokes to the end of a category; reordering or deleting changes the keys of
 * jokes already stored.
 */

export type CategoryKey = 'classic' | 'food' | 'science' | 'vault' | 'animals';

export interface Category {
  label: string;
  icon: string;
  /** What the joke-writing prompt is asked to write about. */
  topic: string;
  /**
   * Where external jokes for this category come from: 'random' for any joke, search words to
   * pick from, or null when the external collection has nothing for it (SPEC "External jokes").
   */
  external: 'random' | readonly string[] | null;
  jokes: ReadonlyArray<readonly [setup: string, punchline: string]>;
}

export interface Joke {
  key: string;
  category: CategoryKey;
  setup: string;
  punchline: string;
}

export const CATEGORIES: Record<CategoryKey, Category> = {
  classic: {
    topic: 'anything at all: everyday life, home, school, work or hobbies',
    external: 'random',
    label: 'Classics',
    icon: '👔',
    jokes: [
      ["I'm reading a book about anti-gravity.", "It's impossible to put down."],
      ['Why did the scarecrow win an award?', 'Because he was outstanding in his field.'],
      ['I used to hate facial hair...', 'but then it grew on me.'],
      ['What do you call a fake noodle?', 'An impasta.'],
      ['Why don’t skeletons fight each other?', 'They don’t have the guts.'],
      ['I only know 25 letters of the alphabet.', "I don't know y."],
      ['What do you call a factory that makes okay products?', 'A satisfactory.'],
      ['Did you hear about the claustrophobic astronaut?', 'He just needed a little space.'],
      ['Why can’t you hear a pterodactyl go to the bathroom?', 'Because the P is silent.'],
      ['I would tell you a construction joke...', "but I'm still working on it."],
      ['Why did the bicycle fall over?', 'It was two-tired.'],
      ['What did the ocean say to the beach?', 'Nothing, it just waved.'],
      ['How do you organize a space party?', 'You planet.'],
      ["I'm afraid for the calendar.", 'Its days are numbered.'],
      ['Why did the math book look so sad?', 'Because it had too many problems.'],
    ],
  },
  food: {
    topic: 'food, cooking, grilling and the kitchen',
    external: [
      'food',
      'cheese',
      'pizza',
      'coffee',
      'bread',
      'egg',
      'cook',
      'potato',
      'cake',
      'soup',
    ],
    label: 'Grill Talk',
    icon: '🍔',
    jokes: [
      ['What do you call cheese that isn’t yours?', 'Nacho cheese.'],
      ['Why did the cookie go to the doctor?', 'Because it felt crummy.'],
      ['What did the grape do when it got stepped on?', 'Nothing but let out a little wine.'],
      [
        'Why shouldn’t you tell a secret on a farm?',
        'Because the potatoes have eyes and the corn has ears.',
      ],
      ['How do you fix a cracked pumpkin?', 'With a pumpkin patch.'],
      ['Why did the coffee file a police report?', 'It got mugged.'],
      ['What’s the best thing about Switzerland?', "I don't know, but the flag is a big plus."],
      ['Why did the tomato blush?', 'It saw the salad dressing.'],
      [
        'Why do burgers make terrible comedians?',
        'Their jokes are too cheesy... and they always grill the audience.',
      ],
      ['What do you call a sad strawberry?', 'A blueberry.'],
      ['Why did the banana go to the doctor?', "It wasn't peeling well."],
      ['What kind of shoes do frogs wear?', 'Open toad sandals.'],
    ],
  },
  science: {
    topic: 'science, maths, space and the lab',
    external: ['science', 'math', 'atom', 'space', 'moon', 'chemistry', 'physics', 'number'],
    label: 'Lab Coat',
    icon: '🧪',
    jokes: [
      ['Why can’t you trust an atom?', 'Because they make up everything.'],
      [
        'What did the thermometer say to the graduated cylinder?',
        'You may have graduated, but I have more degrees.',
      ],
      [
        'I asked the librarian if they had books on paranoia.',
        'She whispered, "They\'re right behind you."',
      ],
      ['Why are chemists great at solving problems?', 'They have all the solutions.'],
      ['Did you hear about the oxygen and magnesium relationship?', 'OMg.'],
      [
        'What do you do with a sick chemist?',
        "If you can't helium and you can't curium, you might as well barium.",
      ],
      ['Why did the photon refuse to check a bag?', 'It was traveling light.'],
      ['How does the moon cut his hair?', 'Eclipse it.'],
      ['What do you call an educated tube?', 'A graduated cylinder.'],
      ['Why is the obtuse triangle always upset?', "Because it's never right."],
    ],
  },
  vault: {
    topic:
      'insider jokes for Veeva employees about Veeva Vault and life-sciences work: documents ' +
      'and versions, lifecycles and workflows, MLR review and claims, regulatory submissions, ' +
      'clinical trials, quality and audits, pharma sales reps and pharmacies',
    external: null,
    label: 'Vault & Pharma',
    icon: '🗄️',
    jokes: [
      ['Why did the document go to therapy?', 'It had too many unresolved annotations.'],
      [
        'Why did the promo piece bring a ladder to MLR review?',
        'It heard the claims needed to be substantiated at a higher level.',
      ],
      [
        'What did the Approved document say to the Draft?',
        "Don't worry, you'll get there. It's just a phase... well, a lifecycle state.",
      ],
      ['Why don’t Vault objects ever get lost?', 'They always know their record ID.'],
      ['Why was the workflow so calm?', 'It knew how to handle every task.'],
      ['How does a pill introduce itself?', '"Hi, I’m a capsule of my former self."'],
      ['Why did the pharmacist get promoted?', 'She really knew how to fill a role.'],
      [
        'Why did the VQL query break up with the database?',
        'It needed more space in its WHERE clause.',
      ],
      ['What’s a regulator’s favourite dance move?', 'The submission shuffle.'],
      ['Why did the binder feel so supported?', 'All its sections had its back.'],
      ['What do you call a document that won’t stop changing?', 'A major version of itself.'],
      ['Why did the claim fail fact-check?', 'It was all reference and no substance.'],
    ],
  },
  animals: {
    topic: 'animals',
    external: ['dog', 'cat', 'cow', 'fish', 'bear', 'bird', 'horse', 'pig', 'duck', 'sheep'],
    label: 'Zoo Puns',
    icon: '🐻',
    jokes: [
      ['What do you call a bear with no teeth?', 'A gummy bear.'],
      ['Why do cows wear bells?', "Because their horns don't work."],
      ['What do you call a fish wearing a bowtie?', 'Sofishticated.'],
      ['Why are fish so smart?', 'Because they live in schools.'],
      ['What do you call a pile of cats?', 'A meowtain.'],
      ['What did the buffalo say when his son left for college?', 'Bison.'],
      ['Why don’t seagulls fly over the bay?', "Because then they'd be bagels."],
      ['What do you call a dinosaur with an extensive vocabulary?', 'A thesaurus.'],
      ['How do you count cows?', 'With a cowculator.'],
      ['What do you call a deer with no eyes?', 'No idea.'],
      ['Why did the owl invite his friends over?', "He didn't want to be owl by himself."],
    ],
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

/** The public site's categories: everything but Vault & Pharma, which is only for the Vault page. */
export const SITE_CATEGORIES: readonly CategoryKey[] = CATEGORY_KEYS.filter((k) => k !== 'vault');

export const isCategory = (k: string): k is CategoryKey => (CATEGORY_KEYS as string[]).includes(k);

/** The joke for a `<category>:<index>` key, or null when the key names no joke. */
export function jokeByKey(key: string): Joke | null {
  const m = /^([a-z]+):(\d{1,4})$/.exec(key);
  if (!m || !isCategory(m[1]!)) return null;
  const category = m[1];
  const entry = CATEGORIES[category].jokes[Number(m[2])];
  if (!entry) return null;
  return { key, category, setup: entry[0], punchline: entry[1] };
}

export function allJokes(category: CategoryKey | 'any' = 'any'): Joke[] {
  const keys = category === 'any' ? CATEGORY_KEYS : [category];
  return keys.flatMap((c) =>
    CATEGORIES[c].jokes.map(([setup, punchline], i) => ({
      key: `${c}:${i}`,
      category: c,
      setup,
      punchline,
    })),
  );
}

/** A random joke, avoiding setups already told until the category runs dry. */
export function generateJoke(
  category: CategoryKey | 'any',
  told: ReadonlySet<string>,
  random: () => number = Math.random,
): Joke {
  const pool = allJokes(category);
  const fresh = pool.filter((j) => !told.has(j.setup));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(random() * from.length)]!;
}

// The Groan-o-Meter. In dad-joke land, more groaning is better.
export type GroanKey =
  'polite_nod' | 'eye_roll' | 'audible_groan' | 'full_facepalm' | 'left_the_room';

export interface GroanLevel {
  score: 1 | 2 | 3 | 4 | 5;
  key: GroanKey;
  label: string;
  emoji: string;
  quip: string;
}

export const GROAN_LEVELS: readonly GroanLevel[] = [
  {
    score: 1,
    key: 'polite_nod',
    label: 'Polite Nod',
    emoji: '😐',
    quip: 'Dad is concerned. Dad is going to try harder.',
  },
  {
    score: 2,
    key: 'eye_roll',
    label: 'Eye Roll',
    emoji: '🙄',
    quip: 'An eye roll! The dad engine is warming up.',
  },
  {
    score: 3,
    key: 'audible_groan',
    label: 'Audible Groan',
    emoji: '😩',
    quip: 'A real groan. Dad does a small victory lap around the grill.',
  },
  {
    score: 4,
    key: 'full_facepalm',
    label: 'Full Facepalm',
    emoji: '🤦',
    quip: 'FACEPALM! Dad updates his LinkedIn: "Professional Punsmith".',
  },
  {
    score: 5,
    key: 'left_the_room',
    label: 'Left the Room',
    emoji: '🚪',
    quip: 'You physically left. This is the highest honour a dad can receive.',
  },
];

export const levelByKey = (key: string | null | undefined): GroanLevel | undefined =>
  GROAN_LEVELS.find((l) => l.key === key);

export const DAD_LINES = [
  'Hi Hungry, I’m Dad.',
  'Did you turn off the lights? Electricity isn’t free, you know.',
  'Who wants to see my lawn?',
  'Don’t make me turn this page around.',
  'Back in my day, we generated jokes uphill both ways.',
  'Ask your mother.',
];

export const randomDadLine = (): string => DAD_LINES[Math.floor(Math.random() * DAD_LINES.length)]!;
