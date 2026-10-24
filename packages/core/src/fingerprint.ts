/**
 * Joke fingerprints (SPEC "No repeats"): the content words of a setup or punchline, lowercased,
 * de-pluralised, de-duplicated and sorted, so rewordings of the same joke match:
 * "Why did the scarecrow win a Nobel Prize?" and "...win the Nobel Prize?" are both
 * `s:nobel prize scarecrow win`.
 */

const STOP = new Set(
  (
    'a an the why what whats how when where who whom which whose did do does doing done is are ' +
    'was were be been being am im ive id ill it its itll this that thats these those there theres ' +
    'here of in on at to for from by with about into onto over under up down off out and or but ' +
    'so if then than because cause just ever never really very too also only even still not no ' +
    'dont doesnt didnt cant cannot wont wouldnt shouldnt couldnt isnt arent wasnt werent hasnt ' +
    'havent i me my mine you your youre yours he him his hes she her hers shes we us our ours ' +
    'they them their theirs theyre call called get got gets have has had can could would should ' +
    'will shall may might must one'
  ).split(' '),
);

function words(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)) {
    if (!raw || STOP.has(raw)) continue;
    // "prizes" -> "prize", "computers" -> "computer"; leave "glass", "bus" and short words alone.
    const w = raw.length > 3 && raw.endsWith('s') && !raw.endsWith('ss') ? raw.slice(0, -1) : raw;
    out.add(w);
  }
  return [...out].sort();
}

/**
 * Up to two keys: the setup's (2+ content words) and the punchline's (3+). Short punchlines
 * are left out: "I guess I just wasn't cut out for it" and "make me one with everything" would
 * otherwise match unrelated jokes.
 */
export function fingerprints(setup: string, punchline: string): string[] {
  const keys: string[] = [];
  const s = words(setup);
  const p = words(punchline);
  if (s.length >= 2) keys.push(`s:${s.join(' ')}`.slice(0, 400));
  if (p.length >= 3) keys.push(`p:${p.join(' ')}`.slice(0, 400));
  return keys;
}
