import type { Persona } from '../types.js';

/**
 * The joke-writing prompt (SPEC "Joke generation"). Each call asks for JOKES_PER_CALL different
 * jokes, so a repeat can be skipped without another call; parseJokeReplies keeps the valid ones.
 */

/** Candidates per call: the first one not told before is used (SPEC "No repeats"). */
export const JOKES_PER_CALL = 3;

export const JOKE_MAX_TOKENS = 500;

/** Some variety, unlike Pantry's parses: pulling the lever again should give a new joke. */
export const JOKE_TEMPERATURE = 1;

const RULES = `The user message is JSON: {"topic": string, "avoid": string[]}. "avoid" lists setups already told.

Return ONLY a JSON object with no other text:
{"jokes": [{"setup": string, "punchline": string}, {"setup": string, "punchline": string}, {"setup": string, "punchline": string}]}

Rules:
- Each is a classic dad joke: a short setup and a groan-worthy pun or wordplay punchline.
- The three jokes are different from each other: different setups and different puns.
- The joke is about the topic, and only the topic. Do not mention Veeva, Vault, software, pharma, medicine or life sciences unless the topic asks for them.
- Family-friendly for all ages: no profanity, innuendo, insults, politics, religion, violence or real people.
- When the topic is about Veeva or Vault: affectionate insider humour. Tease the work, never mock the company, its products, customers or competitors, and make no claims about real drugs or patient safety.
- None is one of the "avoid" setups, or a close rewording of one.
- setup: at most 140 characters. punchline: at most 120 characters. Plain text, one line each, no emoji, no quotation marks around the whole thing.
- Leave out any joke that would break a rule; if none follows every rule, return {"jokes": []}.`;

/**
 * The system prompt for a persona (SPEC "Mom mode", "Kids mode"). Mom tells the same kind of
 * joke as Dad, from a mom's point of view, never "yo mama" jokes; the kids tell kids' jokes.
 */
export function jokeSystem(persona: Persona = 'dad'): string {
  if (persona === 'mom') {
    return `You write three brand-new mom jokes for the Mom-O-Matic 3000, a joke page shared among colleagues at a software company.

A mom joke is a dad joke told by Mom: the same short setup and groan-worthy pun, often from a mom's point of view (laundry, snacks, car pools, "because I said so"). Never a "yo mama" joke, and never mocking mothers or anyone else.

${RULES}`;
  }
  if (persona === 'kids') {
    return `You write three brand-new jokes for the Kid-O-Matic 3000, where a brother and sister take turns telling jokes.

These are kids' jokes, for children of about 6 to 12 and the grown-ups listening: simple puns, silly riddles and knock-knock-style wordplay about things kids know (school, pets, animals, snacks, dinosaurs, space, sports, toys). Words a 7-year-old knows. Nothing about work, money, dating, drinking or anything scary, gross-out or mean.

${RULES}`;
  }
  return `You write three brand-new dad jokes for the Dad-O-Matic 3000, a joke page shared among colleagues at a software company.

${RULES}`;
}

export const JOKE_SYSTEM = jokeSystem('dad');

export interface JokeTopic {
  /** What the prompt asks the joke to be about. */
  topic: string;
}

export function jokeUserMessage(topic: string, avoid: readonly string[]): string {
  return JSON.stringify({ topic, avoid: avoid.slice(0, 30) });
}

/** Words that, if they appear, mean the reply is not going on a public page. */
const BLOCKED =
  /\b(damn|hell|crap|sex\w*|kill\w*|dead|die|drunk|beer|wine|nazi|stupid|idiot|fat)\b/i;

/**
 * The valid jokes in a model reply, in order, at most JOKES_PER_CALL. Accepts
 * {"jokes": [...]} and, from older replies or fixtures, a single {"setup", "punchline"}.
 * Anything that breaks the schema, the lengths or the word rules is dropped.
 */
export function parseJokeReplies(text: string): Array<{ setup: string; punchline: string }> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return [];
  let v: unknown;
  try {
    v = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!v || typeof v !== 'object') return [];
  const o = v as Record<string, unknown>;
  const list: unknown[] = Array.isArray(o.jokes) ? o.jokes : [o];
  const out: Array<{ setup: string; punchline: string }> = [];
  for (const item of list.slice(0, JOKES_PER_CALL)) {
    if (!item || typeof item !== 'object') continue;
    const { setup, punchline } = item as Record<string, unknown>;
    if (typeof setup !== 'string' || typeof punchline !== 'string') continue;
    const joke = checkJoke(setup, punchline);
    if (joke) out.push(joke);
  }
  return out;
}

/** The first valid joke in a model reply, or null. */
export function parseJokeReply(text: string): { setup: string; punchline: string } | null {
  return parseJokeReplies(text)[0] ?? null;
}

/** The joke when both parts are within length and free of blocked words, else null. */
export function checkJoke(
  setup: string,
  punchline: string,
): { setup: string; punchline: string } | null {
  const s = setup.replace(/\s+/g, ' ').trim();
  const p = punchline.replace(/\s+/g, ' ').trim();
  if (s.length < 8 || s.length > 160 || p.length < 2 || p.length > 140) return null;
  if (BLOCKED.test(s) || BLOCKED.test(p)) return null;
  return { setup: s, punchline: p };
}
