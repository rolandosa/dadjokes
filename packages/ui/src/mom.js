// Mom (Mom mode), a drawn stand-in until her puppet photos arrive. Five frames like Dad's
// (rest, talk, grin, blink, sad) at Dad's photo size and framing, so styles.css swaps and
// animates them exactly as it does his. Each frame is an SVG data URL.

const INK = '#2a2024';
const SKIN = '#f2c3a2';
const HAIR = '#b8875a';
const W = 600;
const H = 712;

const line = (w) =>
  `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

/** Eyes open (with lashes), closed in a blink, or squeezed shut in a laugh. */
function eyes(mode) {
  const eye = (cx) => {
    if (mode === 'closed') {
      return `<path d="M${cx - 30} 318 Q${cx} 332 ${cx + 30} 318" fill="none" ${line(5)}/>`;
    }
    if (mode === 'laugh') {
      return `<path d="M${cx - 30} 324 Q${cx} 300 ${cx + 30} 324" fill="none" ${line(6)}/>`;
    }
    return `
      <ellipse cx="${cx}" cy="318" rx="30" ry="22" fill="#fff" ${line(4)}/>
      <circle cx="${cx}" cy="320" r="14" fill="#3f7d5c"/>
      <circle cx="${cx}" cy="320" r="7" fill="${INK}"/>
      <circle cx="${cx + 5}" cy="314" r="4" fill="#fff"/>
      <path d="M${cx - 30} 312 Q${cx} 288 ${cx + 30} 312" fill="none" ${line(6)}/>
      <path d="M${cx + 22} 300 l10 -10 M${cx + 30} 308 l12 -6 M${cx + 12} 296 l6 -12" ${line(4)}/>`;
  };
  return eye(242) + eye(358);
}

/** Arched brows, or tilted up in the middle when she is disappointed. */
function brows(sad) {
  return sad
    ? `<path d="M208 278 Q240 262 270 262" fill="none" ${line(9)}/>
       <path d="M392 278 Q360 262 330 262" fill="none" ${line(9)}/>`
    : `<path d="M208 276 Q242 250 274 266" fill="none" ${line(9)}/>
       <path d="M392 276 Q358 250 326 266" fill="none" ${line(9)}/>`;
}

const MOUTHS = {
  smile: `<path d="M258 418 Q300 446 342 418 Q300 432 258 418 Z" fill="#d1495b" ${line(4)}/>`,
  talk: `<path d="M268 414 Q300 410 332 414 Q326 452 300 454 Q274 452 268 414 Z" fill="#6e1f2b" ${line(4)}/>
         <ellipse cx="300" cy="440" rx="14" ry="6" fill="#e07a86"/>`,
  grin: `<path d="M244 408 Q300 418 356 408 Q350 470 300 474 Q250 470 244 408 Z" fill="#6e1f2b" ${line(5)}/>
         <path d="M250 410 Q300 420 350 410 L348 426 Q300 434 252 426 Z" fill="#fff"/>
         <ellipse cx="300" cy="456" rx="26" ry="9" fill="#e07a86"/>`,
  frown: `<path d="M264 438 Q300 414 336 438" fill="none" stroke="#b23a48" stroke-width="9" stroke-linecap="round"/>`,
};

function frame({ eyes: eyeMode = 'open', mouth = 'smile', sad = false }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <path d="M130 360 C100 180 190 70 300 70 C410 70 500 180 470 360 C462 440 480 500 500 540 L100 540 C120 500 138 440 130 360 Z" fill="${HAIR}" ${line(5)}/>
  <path d="M262 470 L262 556 Q300 584 338 556 L338 470 Z" fill="#e2ad8c" ${line(4)}/>
  <path d="M10 712 C14 610 80 560 220 540 Q300 572 380 540 C520 560 586 610 590 712 Z" fill="#f4a3b8" ${line(5)}/>
  <path d="M220 540 Q300 572 380 540 L384 560 Q300 594 216 560 Z" fill="#ec8fa8" ${line(4)}/>
  <ellipse cx="300" cy="320" rx="148" ry="172" fill="${SKIN}" ${line(5)}/>
  <path d="M152 300 C150 170 230 120 300 124 C380 120 452 170 448 300 C420 230 370 196 300 206 C240 196 190 220 152 300 Z" fill="${HAIR}" ${line(5)}/>
  ${brows(sad)}
  ${eyes(eyeMode)}
  <rect x="196" y="282" width="94" height="72" rx="14" fill="none" ${line(11)}/>
  <rect x="310" y="282" width="94" height="72" rx="14" fill="none" ${line(11)}/>
  <path d="M290 306 Q300 298 310 306" fill="none" ${line(9)}/>
  <path d="M300 338 Q288 372 296 384 Q306 388 312 380" fill="none" ${line(4)}/>
  <circle cx="218" cy="380" r="22" fill="#f08a9b" opacity=".35"/>
  <circle cx="382" cy="380" r="22" fill="#f08a9b" opacity=".35"/>
  ${MOUTHS[mouth]}
</svg>`;
}

const url = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** The five frames, named like Dad's so styles.css treats them the same. */
const FRAMES = {
  rest: url(frame({})),
  talk: url(frame({ mouth: 'talk' })),
  grin: url(frame({ eyes: 'laugh', mouth: 'grin' })),
  blink: url(frame({ eyes: 'closed' })),
  sad: url(frame({ mouth: 'frown', sad: true })),
};

export function createMom() {
  const mom = document.createElement('div');
  mom.className = 'dad mom';
  mom.setAttribute('role', 'img');
  mom.setAttribute(
    'aria-label',
    'Mom, a puppet with a brown bob, black glasses and a pink sweater',
  );
  for (const [name, src] of Object.entries(FRAMES)) {
    const img = document.createElement('img');
    img.className = `dad-${name}`;
    img.src = src;
    img.alt = '';
    img.draggable = false;
    mom.appendChild(img);
  }
  return mom;
}
