import {
  CATEGORIES,
  GROAN_LEVELS,
  generateJoke,
  levelByKey,
  randomDadLine,
} from '@dadjokes/core/jokes';
// `?inline`: the CSS as a string (Vite); the Vault build's esbuild plugin strips the query.
import css from './styles.css?inline';
import { createDad } from './dad.js';

const FLOATERS = ['👔', '🧦', '🩴', '🍖', '🔧', '📺', '🧢', '☕', '🪓', '🌭', '⛳', '🔦'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children.filter(Boolean));
  return node;
};

// Semicircle gauge: five coloured segments, one per groan level.
function gaugeSvg() {
  const colors = ['#90be6d', '#f9c74f', '#f8961e', '#f3722c', '#e63946'];
  const segs = colors
    .map((c, i) => {
      const a0 = Math.PI + (i * Math.PI) / 5;
      const a1 = Math.PI + ((i + 1) * Math.PI) / 5;
      const p = (a, r) => `${140 + r * Math.cos(a)} ${140 + r * Math.sin(a)}`;
      return `<path d="M${p(a0, 120)} A120 120 0 0 1 ${p(a1, 120)} L${p(a1, 70)} A70 70 0 0 0 ${p(a0, 70)} Z" fill="${c}" stroke="#1d1b2f" stroke-width="4"/>`;
    })
    .join('');
  const emojis = GROAN_LEVELS.map((l, i) => {
    const a = Math.PI + ((i + 0.5) * Math.PI) / 5;
    return `<text x="${140 + 95 * Math.cos(a)}" y="${140 + 95 * Math.sin(a) + 8}" font-size="22" text-anchor="middle">${l.emoji}</text>`;
  }).join('');
  return `
  <svg class="djg-gauge" viewBox="0 0 280 165" role="img" aria-label="Groan-o-Meter">
    ${segs}${emojis}
    <g class="djg-needle"><path d="M136 140 L140 30 L144 140 Z" fill="#1d1b2f"/></g>
    <circle cx="140" cy="140" r="14" fill="#1d1b2f"/><circle cx="140" cy="140" r="6" fill="#ffb703"/>
    <text x="140" y="162" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="13" fill="#1d1b2f">GROAN-O-METER</text>
  </svg>`;
}

// The layer goes inside the page root so it still shows when the root is fullscreen.
function confetti(host, emojis, count = 40) {
  const layer = el('div', { class: 'djg-confetti' });
  host.appendChild(layer);
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const s = el('span', { text: emojis[i % emojis.length] });
    layer.appendChild(s);
    const x = w / 2 + (Math.random() - 0.5) * 120;
    s.style.left = `${x}px`;
    s.style.top = `${h * 0.45}px`;
    s.animate(
      [
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        {
          transform: `translate(${(Math.random() - 0.5) * w}px, ${-h * 0.4 + Math.random() * h * 0.9}px) rotate(${Math.random() * 720 - 360}deg)`,
          opacity: 0,
        },
      ],
      {
        duration: 1400 + Math.random() * 900,
        easing: 'cubic-bezier(.1,.8,.3,1)',
        fill: 'forwards',
      },
    );
  }
  setTimeout(() => layer.remove(), 2600);
}

function jokeItem(rec, lead) {
  const level = levelByKey(rec.level);
  return el(
    'li',
    {},
    lead,
    el(
      'div',
      {},
      el('div', { class: 's', text: rec.setup }),
      el('div', { class: 'p', text: rec.punchline }),
      el('div', {
        class: 's',
        text: level ? `${level.emoji} ${level.label}` : '🤷 Awaiting judgement',
      }),
    ),
  );
}

/** A header stat: icon, label and value. On phones the label hides (styles.css); the title and
 * aria-label keep it for a tap-and-hold and for screen readers. */
function statChip(icon, label, value) {
  return el(
    'span',
    { class: 'djg-chip', title: label, 'aria-label': label },
    el('span', { 'aria-hidden': 'true', text: `${icon} ` }),
    el('span', { class: 'djg-chip-label', text: `${label}: ` }),
    value,
  );
}

/**
 * A Fullscreen button, on its own row above the banner. Uses the browser's fullscreen when the
 * host allows it, else fills the window; Esc exits either way.
 */
function fullscreenToggle(root) {
  const isFull = () =>
    document.fullscreenElement === root || root.classList.contains('is-maximized');
  const sync = () => {
    btn.textContent = isFull() ? '✕ Exit fullscreen' : '⛶ Fullscreen';
    btn.setAttribute('aria-pressed', String(isFull()));
  };
  const toggle = async () => {
    if (document.fullscreenElement === root) await document.exitFullscreen();
    else if (root.classList.contains('is-maximized')) root.classList.remove('is-maximized');
    else {
      try {
        await root.requestFullscreen();
      } catch {
        root.classList.add('is-maximized');
      }
    }
    sync();
  };
  const btn = el('button', { class: 'djg-fullscreen', type: 'button', onclick: toggle });
  sync();
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-maximized')) {
      root.classList.remove('is-maximized');
      sync();
    }
  });
  return el('div', { class: 'djg-toolbar' }, btn);
}

/**
 * Mounts the Dad-O-Matic into `element`. The backend stores jokes and ratings:
 *   nextJoke(category) -> Promise<ToldJoke> when the backend writes and stores jokes itself,
 *   or saveJoke(joke) -> Promise<id> to store one picked here from the library;
 *   rateJoke(id, level) -> Promise, loadBoard() -> Promise<Board>,
 *   place: where jokes are filed ("Vault", "the cloud"), tagline: the line under the lever,
 *   fullscreen: true to offer a Fullscreen button (the Vault page; the public site has none),
 *   categories: the category keys to offer (default: all).
 * Board rows are { setup, punchline, category, level } (core/types ToldJoke).
 */
export function mountDadOMatic(element, backend) {
  const told = new Set();
  let category = 'any';
  let current = null; // { setup, punchline, category, id, saving }
  let busy = false;

  element.replaceChildren();
  const root = el('div', { class: 'djg' });
  root.appendChild(el('style', { text: css }));
  element.appendChild(root);

  const floaters = el('div', { class: 'djg-floaters' });
  FLOATERS.forEach((f, i) => {
    const s = el('span', { text: f });
    s.style.left = `${(i / FLOATERS.length) * 100 + Math.random() * 5}%`;
    s.style.animationDuration = `${14 + Math.random() * 14}s`;
    s.style.animationDelay = `${-Math.random() * 20}s`;
    floaters.appendChild(s);
  });
  root.appendChild(floaters);

  const wrap = el('div', { class: 'djg-wrap' });
  root.appendChild(wrap);

  // Header
  const statTold = el('b', { text: '–' });
  const statRated = el('b', { text: '–' });
  const statAvg = el('b', { text: '–' });
  if (backend.fullscreen) wrap.appendChild(fullscreenToggle(root));

  const bulbStrip = (edge) => {
    const strip = el('div', { class: `djg-bulbs ${edge}` });
    for (let i = 0; i < 60; i++) strip.appendChild(el('i'));
    return strip;
  };
  wrap.appendChild(
    el(
      'header',
      { class: 'djg-marquee' },
      bulbStrip('top'),
      bulbStrip('bottom'),
      el('h1', { class: 'djg-title', text: 'DAD-O-MATIC 3000' }),
      el(
        'div',
        { class: 'djg-stats' },
        statChip('🎤', 'Jokes told', statTold),
        statChip('⚖️', 'Judged', statRated),
        statChip('😩', 'Avg groan', statAvg),
      ),
    ),
  );

  // Theatre: dad + bubbles
  const setupText = el('span', { text: randomDadLine() });
  const caret = el('span', { class: 'djg-caret' });
  const bubble = el('div', { class: 'djg-bubble' }, setupText, caret);
  const drum = el('div', { class: 'djg-drumroll', text: '🥁 drrrrrrrrrrrr...' });
  const punch = el('div', { class: 'djg-punch' });
  // External jokes credit their source (SPEC "External jokes").
  const credit = el('a', {
    class: 'djg-credit',
    href: 'https://icanhazdadjoke.com',
    target: '_blank',
    rel: 'noopener',
    hidden: '',
    text: '📚 via icanhazdadjoke.com',
  });
  const reveal = el('button', {
    class: 'djg-reveal',
    type: 'button',
    hidden: '',
    text: '👉 Hit me with it!',
  });
  const badum = el('div', { class: 'djg-badum', text: 'BA-DUM-TSS!' });
  const dadHolder = createDad();

  // The controls sit in the joke card, under the bubble: pick a topic and pull, read the setup,
  // ask for the punchline, rate it, pull again, all in one place.
  const catButtons = [];
  const catRow = el('div', { class: 'djg-cats' });
  const addCat = (key, label) => {
    const b = el('button', {
      class: 'djg-cat',
      type: 'button',
      'aria-pressed': String(key === category),
      text: label,
      onclick: () => {
        category = key;
        catButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      },
    });
    catButtons.push(b);
    catRow.appendChild(b);
  };
  addCat('any', '🎲 Surprise me');
  // backend.categories limits the chips (the public site has no Vault & Pharma).
  Object.entries(CATEGORIES)
    .filter(([k]) => !backend.categories || backend.categories.includes(k))
    .forEach(([k, c]) => addCat(k, `${c.icon} ${c.label}`));

  const lever = el(
    'button',
    {
      class: 'djg-lever',
      type: 'button',
      'aria-label': 'Pull the lever',
      onclick: () => tellJoke(),
    },
    el('span', { class: 'slot' }),
    el('span', { class: 'arm' }, el('span', { class: 'knob' })),
  );
  const pull = el('button', {
    class: 'djg-pull',
    type: 'button',
    text: 'PULL FOR PUN 🎰',
    onclick: () => tellJoke(),
  });
  const machineError = el('div', { class: 'djg-error' });
  const controls = el(
    'div',
    { class: 'djg-controls' },
    el('div', { class: 'djg-controls-label', text: 'Pick a topic, then pull:' }),
    catRow,
    el('div', { class: 'djg-lever-row' }, lever, pull),
    el('p', { class: 'djg-quote', text: backend.tagline }),
    machineError,
  );

  const bubbles = el(
    'div',
    { class: 'djg-bubbles' },
    bubble,
    reveal,
    drum,
    punch,
    credit,
    controls,
  );
  const theatre = el(
    'section',
    { class: 'djg-panel' },
    el('div', { class: 'djg-theatre' }, dadHolder, bubbles, badum),
  );
  wrap.appendChild(el('div', { class: 'djg-stage' }, theatre));

  // Groan-o-Meter
  const gaugeHolder = el('div');
  gaugeHolder.innerHTML = gaugeSvg();
  const needle = gaugeHolder.querySelector('.djg-needle');
  const verdict = el('div', {
    class: 'djg-verdict',
    text: 'Pull the lever, then tell Dad how much it hurt.',
  });
  const levelButtons = GROAN_LEVELS.map((l) =>
    el(
      'button',
      { class: 'djg-level', type: 'button', disabled: '', onclick: () => rate(l) },
      el('span', { class: 'e', text: l.emoji }),
      el('span', { text: l.label }),
    ),
  );
  const rating = el(
    'div',
    { class: 'djg-rating' },
    el('div', { class: 'djg-rating-ask', text: '👇 Rate the groan' }),
    el('div', { class: 'djg-levels' }, ...levelButtons),
    verdict,
  );
  const meterSlot = el('div');
  wrap.appendChild(
    el(
      'section',
      { class: 'djg-panel djg-meter' },
      el('h2', { text: '📟 Rate the Damage' }),
      el('div', { class: 'djg-meter-grid' }, gaugeHolder, meterSlot),
    ),
  );

  // On phones the rating sits right under the punchline, so nobody misses it; on wider
  // screens it lives in the Groan-o-Meter panel. One set of buttons, moved between the two.
  const phone = window.matchMedia('(max-width: 560px)');
  const placeRating = () => {
    if (phone.matches) bubbles.insertBefore(rating, controls);
    else meterSlot.appendChild(rating);
  };
  placeRating();
  phone.addEventListener('change', placeRating);

  // Lists
  const hall = el('ol');
  const recent = el('ol');
  wrap.appendChild(
    el(
      'div',
      { class: 'djg-lists' },
      el('section', { class: 'djg-panel djg-list' }, el('h2', { text: '🏆 Hall of Groans' }), hall),
      el(
        'section',
        { class: 'djg-panel djg-list' },
        el('h2', { text: '🔥 Fresh Off the Grill' }),
        recent,
      ),
    ),
  );

  const setNeedle = (score) => {
    needle.style.transform = `rotate(${-90 + (score - 0.5) * 36}deg)`;
  };

  async function refresh() {
    try {
      const { top, recent: latest, stats } = await backend.loadBoard();
      statTold.textContent = stats.told;
      statRated.textContent = stats.rated;
      statAvg.textContent = stats.rated ? `${stats.avg.toFixed(1)} / 5` : '–';
      latest.forEach((r) => told.add(r.setup));
      hall.replaceChildren(
        ...(top.length
          ? top.map((r, i) =>
              jokeItem(
                r,
                el('span', { class: 'rank', text: ['🥇', '🥈', '🥉'][i] || `#${i + 1}` }),
              ),
            )
          : [
              el(
                'li',
                { class: 'djg-empty' },
                el('span', { class: 'e', text: '🦗' }),
                el('span', { text: 'No groans yet. Suspicious.' }),
              ),
            ]),
      );
      recent.replaceChildren(
        ...(latest.length
          ? latest.map((r) =>
              jokeItem(r, el('span', { class: 'e', text: CATEGORIES[r.category]?.icon || '🃏' })),
            )
          : [
              el(
                'li',
                { class: 'djg-empty' },
                el('span', { class: 'e', text: '🍳' }),
                el('span', { text: 'The grill is cold. Pull the lever!' }),
              ),
            ]),
      );
    } catch (e) {
      machineError.textContent = `Couldn't load the Hall of Groans: ${e.message}`;
    }
  }

  async function typeOut(text) {
    setupText.textContent = '';
    for (const ch of text) {
      setupText.textContent += ch;
      await wait(ch === ' ' ? 18 : 32);
    }
  }

  async function tellJoke() {
    if (busy) return;
    busy = true;
    machineError.textContent = '';
    lever.disabled = pull.disabled = true;
    levelButtons.forEach((b) => {
      b.disabled = true;
      b.classList.remove('chosen');
    });
    lever.classList.add('pulled');
    setTimeout(() => lever.classList.remove('pulled'), 450);
    root.classList.remove('is-punchline', 'has-punchline');
    punch.classList.remove('show');
    badum.classList.remove('show');
    verdict.textContent = 'Dad is loading a pun...';
    setNeedle(0.5);

    root.classList.add('is-thinking');
    let joke;
    if (backend.nextJoke) {
      // The backend writes (and stores) the joke; Dad mutters while it does.
      setupText.textContent = 'Hmm, let me think of a good one...';
      try {
        joke = await backend.nextJoke(category);
      } catch (e) {
        machineError.textContent = `Dad's joke engine stalled: ${e.message}`;
        root.classList.remove('is-thinking');
        setupText.textContent = randomDadLine();
        verdict.textContent = 'Pull the lever to try again.';
        lever.disabled = pull.disabled = false;
        busy = false;
        return;
      }
      current = { ...joke, saving: Promise.resolve(joke.id) };
    } else {
      joke = generateJoke(category, told);
      current = { ...joke, id: null };
      // Store it straight away; the rating lands on the same record later.
      current.saving = backend.saveJoke(joke).then(
        (id) => (current && current.setup === joke.setup ? (current.id = id) : id),
        (e) => {
          machineError.textContent = `Couldn't file that joke: ${e.message}`;
          return null;
        },
      );
    }
    told.add(joke.setup);

    await typeOut(joke.setup);
    root.classList.remove('is-thinking');

    // Dad waits for the audience to ask for it.
    verdict.textContent = 'Go on, ask Dad for the punchline...';
    reveal.hidden = false;
    reveal.focus();
    await new Promise((resolve) => (reveal.onclick = resolve));
    reveal.hidden = true;

    root.classList.add('is-drumroll');
    await wait(900);
    root.classList.remove('is-drumroll');

    punch.textContent = joke.punchline;
    credit.hidden = !String(joke.key ?? '').startsWith('ext:');
    void punch.offsetWidth; // restart the slam animation
    punch.classList.add('show');
    badum.classList.add('show');
    root.classList.add('is-punchline', 'has-punchline');
    confetti(root, ['😂', '🥁', '👔', '🤣', '💥', '🧔']);
    verdict.textContent = joke.reusedFrom
      ? '🔁 Encore! A repeat from the joke bank, by popular demand. Rate it again.'
      : 'How bad was it? Be honest. Dad can take it.';

    levelButtons.forEach((b) => (b.disabled = false));
    lever.disabled = pull.disabled = false;
    busy = false;
    refresh();
  }

  async function rate(level) {
    if (!current) return;
    const joke = current;
    levelButtons.forEach((b, i) => {
      b.disabled = true;
      b.classList.toggle('chosen', GROAN_LEVELS[i] === level);
    });
    setNeedle(level.score);
    verdict.textContent = `${level.emoji} ${level.quip}`;
    verdict.classList.remove('pop');
    void verdict.offsetWidth;
    verdict.classList.add('pop');
    if (level.score >= 4) confetti(root, [level.emoji, '🏆', '⭐', '👏'], 30);
    try {
      const id = joke.id ?? (await joke.saving);
      if (!id) throw new Error('the joke was not filed');
      await backend.rateJoke(id, level);
      verdict.textContent += `  (+${level.score * 10} Dad Points, filed in ${backend.place})`;
      refresh();
    } catch (e) {
      machineError.textContent = `The Groan-o-Meter jammed: ${e.message}`;
    }
    // On phones the rating pushes the pull button below the screen: once the verdict has its
    // final length, bring the button back into view for the next joke.
    if (window.matchMedia('(max-width: 560px)').matches) {
      pull.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Default gauge resting position.
  setNeedle(0.5);
  refresh();
}
