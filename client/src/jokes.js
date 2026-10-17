// Joke library for the Dad-O-Matic 3000. Each entry is [setup, punchline].

export const CATEGORIES = {
  classic: {
    label: 'Classics',
    icon: '👔',
    jokes: [
      ["I'm reading a book about anti-gravity.", "It's impossible to put down."],
      ['Why did the scarecrow win an award?', 'Because he was outstanding in his field.'],
      ["I used to hate facial hair...", 'but then it grew on me.'],
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
    label: 'Grill Talk',
    icon: '🍔',
    jokes: [
      ['What do you call cheese that isn’t yours?', 'Nacho cheese.'],
      ['Why did the cookie go to the doctor?', 'Because it felt crummy.'],
      ['What did the grape do when it got stepped on?', 'Nothing but let out a little wine.'],
      ['Why shouldn’t you tell a secret on a farm?', 'Because the potatoes have eyes and the corn has ears.'],
      ['How do you fix a cracked pumpkin?', 'With a pumpkin patch.'],
      ['Why did the coffee file a police report?', 'It got mugged.'],
      ['What’s the best thing about Switzerland?', "I don't know, but the flag is a big plus."],
      ['Why did the tomato blush?', 'It saw the salad dressing.'],
      ['Why do burgers make terrible comedians?', 'Their jokes are too cheesy... and they always grill the audience.'],
      ['What do you call a sad strawberry?', 'A blueberry.'],
      ['Why did the banana go to the doctor?', "It wasn't peeling well."],
      ['What kind of shoes do frogs wear?', 'Open toad sandals.'],
    ],
  },
  science: {
    label: 'Lab Coat',
    icon: '🧪',
    jokes: [
      ['Why can’t you trust an atom?', 'Because they make up everything.'],
      ['What did the thermometer say to the graduated cylinder?', 'You may have graduated, but I have more degrees.'],
      ['I asked the librarian if they had books on paranoia.', 'She whispered, "They\'re right behind you."'],
      ['Why are chemists great at solving problems?', 'They have all the solutions.'],
      ['Did you hear about the oxygen and magnesium relationship?', 'OMg.'],
      ['What do you do with a sick chemist?', "If you can't helium and you can't curium, you might as well barium."],
      ['Why did the photon refuse to check a bag?', 'It was traveling light.'],
      ['How does the moon cut his hair?', 'Eclipse it.'],
      ['What do you call an educated tube?', 'A graduated cylinder.'],
      ['Why is the obtuse triangle always upset?', "Because it's never right."],
    ],
  },
  vault: {
    label: 'Vault & Pharma',
    icon: '🗄️',
    jokes: [
      ['Why did the document go to therapy?', 'It had too many unresolved annotations.'],
      ['Why did the promo piece bring a ladder to MLR review?', 'It heard the claims needed to be substantiated at a higher level.'],
      ['What did the Approved document say to the Draft?', "Don't worry, you'll get there. It's just a phase... well, a lifecycle state."],
      ['Why don’t Vault objects ever get lost?', 'They always know their record ID.'],
      ['Why was the workflow so calm?', 'It knew how to handle every task.'],
      ['How does a pill introduce itself?', '"Hi, I’m a capsule of my former self."'],
      ['Why did the pharmacist get promoted?', 'She really knew how to fill a role.'],
      ['Why did the VQL query break up with the database?', 'It needed more space in its WHERE clause.'],
      ['What’s a regulator’s favourite dance move?', 'The submission shuffle.'],
      ['Why did the binder feel so supported?', 'All its sections had its back.'],
      ['What do you call a document that won’t stop changing?', 'A major version of itself.'],
      ['Why did the claim fail fact-check?', 'It was all reference and no substance.'],
    ],
  },
  animals: {
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

// The Groan-o-Meter. In dad-joke land, more groaning is better.
export const GROAN_LEVELS = [
  { score: 1, key: 'polite_nod__c', label: 'Polite Nod', emoji: '😐', quip: 'Dad is concerned. Dad is going to try harder.' },
  { score: 2, key: 'eye_roll__c', label: 'Eye Roll', emoji: '🙄', quip: 'An eye roll! The dad engine is warming up.' },
  { score: 3, key: 'audible_groan__c', label: 'Audible Groan', emoji: '😩', quip: 'A real groan. Dad does a small victory lap around the grill.' },
  { score: 4, key: 'full_facepalm__c', label: 'Full Facepalm', emoji: '🤦', quip: 'FACEPALM! Dad updates his LinkedIn: "Professional Punsmith".' },
  { score: 5, key: 'left_the_room__c', label: 'Left the Room', emoji: '🚪', quip: 'You physically left. This is the highest honour a dad can receive.' },
];

export const levelByScore = (score) => GROAN_LEVELS.find((l) => l.score === Number(score));
export const levelByKey = (key) => GROAN_LEVELS.find((l) => l.key === key);

export const DAD_LINES = [
  'Hi Hungry, I’m Dad.',
  'Did you turn off the lights? Electricity isn’t free, you know.',
  'Who wants to see my lawn?',
  'Don’t make me turn this page around.',
  'Back in my day, we generated jokes uphill both ways.',
  'Ask your mother.',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Pick a joke from a category (or any category), avoiding ones already told.
export function generateJoke(categoryKey, told) {
  const keys = categoryKey === 'any' ? Object.keys(CATEGORIES) : [categoryKey];
  let pool = keys.flatMap((k) => CATEGORIES[k].jokes.map(([setup, punchline]) => ({ setup, punchline, category: k })));
  const fresh = pool.filter((j) => !told.has(j.setup));
  if (fresh.length) pool = fresh;
  return pick(pool);
}

export const randomDadLine = () => pick(DAD_LINES);
