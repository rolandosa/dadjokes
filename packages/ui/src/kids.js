// The kids (Kids mode): a boy and a girl side by side, drawn stand-ins until their puppet photos
// arrive. Five frames like Dad's (rest, talk, grin, blink, sad) at his photo size, so styles.css
// swaps and animates them exactly as it does his. Both kids share each expression. Each frame
// is an SVG data URL.

const INK = '#2a2024';
const W = 600;
const H = 712;

const line = (w) =>
  `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

/** Eyes open, closed in a blink, or squeezed shut in a laugh, around centre x `cx`. */
function eyes(cx, mode) {
  return [cx - 38, cx + 38]
    .map((x) => {
      if (mode === 'closed') {
        return `<path d="M${x - 18} 312 Q${x} 322 ${x + 18} 312" fill="none" ${line(5)}/>`;
      }
      if (mode === 'laugh') {
        return `<path d="M${x - 18} 316 Q${x} 298 ${x + 18} 316" fill="none" ${line(6)}/>`;
      }
      return `<ellipse cx="${x}" cy="310" rx="17" ry="20" fill="#fff" ${line(4)}/>
        <circle cx="${x}" cy="313" r="10" fill="${INK}"/>
        <circle cx="${x + 4}" cy="308" r="3.5" fill="#fff"/>`;
    })
    .join('');
}

function brows(cx, sad) {
  return [-1, 1]
    .map((side) => {
      const x = cx + side * 38;
      return sad
        ? `<path d="M${x - side * 20} 266 L${x + side * 16} 280" ${line(7)}/>`
        : `<path d="M${x - 18} 276 Q${x} 266 ${x + 18} 276" fill="none" ${line(7)}/>`;
    })
    .join('');
}

function mouth(cx, kind) {
  const y = 372;
  switch (kind) {
    case 'talk':
      return `<ellipse cx="${cx}" cy="${y + 6}" rx="20" ry="16" fill="#6e1f2b" ${line(4)}/>
        <ellipse cx="${cx}" cy="${y + 14}" rx="10" ry="5" fill="#e07a86"/>`;
    case 'grin':
      return `<path d="M${cx - 42} ${y - 6} Q${cx} ${y} ${cx + 42} ${y - 6} Q${cx + 36} ${y + 44} ${cx} ${y + 46} Q${cx - 36} ${y + 44} ${cx - 42} ${y - 6} Z" fill="#6e1f2b" ${line(5)}/>
        <path d="M${cx - 36} ${y - 3} Q${cx} ${y + 3} ${cx + 36} ${y - 3} L${cx + 34} ${y + 8} Q${cx} ${y + 14} ${cx - 34} ${y + 8} Z" fill="#fff"/>
        <ellipse cx="${cx}" cy="${y + 34}" rx="16" ry="6" fill="#e07a86"/>`;
    case 'frown':
      return `<path d="M${cx - 26} ${y + 18} Q${cx} ${y - 4} ${cx + 26} ${y + 18}" fill="none" ${line(7)}/>`;
    default:
      return `<path d="M${cx - 30} ${y - 2} Q${cx} ${y + 26} ${cx + 30} ${y - 2}" fill="none" ${line(6)}/>`;
  }
}

/** One kid: the body, then the head, then the hair for `who` ('boy' or 'girl'). */
function kid(cx, who, face) {
  const skin = who === 'boy' ? '#f1c27d' : '#e8b48f';
  const shirt =
    who === 'boy'
      ? `<path d="M${cx - 150} 712 C${cx - 146} 560 ${cx - 90} 520 ${cx} 520 C${cx + 90} 520 ${cx + 146} 560 ${cx + 150} 712 Z" fill="#4dabf7" ${line(5)}/>
         ${[580, 630, 680].map((y) => `<path d="M${cx - 140} ${y} L${cx + 140} ${y}" stroke="#fff" stroke-width="16"/>`).join('')}`
      : `<path d="M${cx - 150} 712 C${cx - 146} 560 ${cx - 90} 520 ${cx} 520 C${cx + 90} 520 ${cx + 146} 560 ${cx + 150} 712 Z" fill="#ffd43b" ${line(5)}/>
         ${[
           [-70, 600],
           [10, 640],
           [80, 590],
           [-30, 680],
           [100, 680],
         ]
           .map(([dx, y]) => `<circle cx="${cx + dx}" cy="${y}" r="9" fill="#ff8787"/>`)
           .join('')}`;
  const hairBack =
    who === 'girl'
      ? `<circle cx="${cx - 128}" cy="300" r="46" fill="#8d4f2a" ${line(5)}/>
         <circle cx="${cx + 128}" cy="300" r="46" fill="#8d4f2a" ${line(5)}/>`
      : '';
  const hairFront =
    who === 'girl'
      ? `<path d="M${cx - 112} 300 C${cx - 118} 196 ${cx - 60} 168 ${cx} 168 C${cx + 60} 168 ${cx + 118} 196 ${cx + 112} 300 C${cx + 90} 236 ${cx + 40} 222 ${cx} 230 C${cx - 40} 222 ${cx - 90} 236 ${cx - 112} 300 Z" fill="#8d4f2a" ${line(5)}/>
         <path d="M${cx + 56} 196 l34 -26 l6 40 Z M${cx + 56} 196 l40 6 l-24 32 Z" fill="#f06595" ${line(4)}/>
         <circle cx="${cx + 60}" cy="198" r="9" fill="#f06595" ${line(3)}/>`
      : `<path d="M${cx - 110} 290 C${cx - 116} 196 ${cx - 60} 168 ${cx} 168 C${cx + 60} 168 ${cx + 116} 196 ${cx + 110} 290 L${cx + 92} 246 L${cx + 70} 262 L${cx + 52} 232 L${cx + 26} 252 L${cx} 226 L${cx - 26} 252 L${cx - 52} 232 L${cx - 70} 262 L${cx - 92} 246 Z" fill="#343a40" ${line(5)}/>`;
  return `${shirt}
    <path d="M${cx - 30} 450 L${cx - 30} 530 Q${cx} 546 ${cx + 30} 530 L${cx + 30} 450 Z" fill="${skin}" ${line(4)}/>
    ${hairBack}
    <circle cx="${cx - 112}" cy="326" r="20" fill="${skin}" ${line(4)}/>
    <circle cx="${cx + 112}" cy="326" r="20" fill="${skin}" ${line(4)}/>
    <ellipse cx="${cx}" cy="320" rx="112" ry="130" fill="${skin}" ${line(5)}/>
    ${hairFront}
    ${brows(cx, face.sad)}
    ${eyes(cx, face.eyes)}
    <path d="M${cx - 6} 334 Q${cx} 346 ${cx + 6} 334" fill="none" ${line(4)}/>
    <circle cx="${cx - 66}" cy="356" r="15" fill="#ff8787" opacity=".4"/>
    <circle cx="${cx + 66}" cy="356" r="15" fill="#ff8787" opacity=".4"/>
    ${mouth(cx, face.mouth)}`;
}

function frame(face) {
  const f = { eyes: 'open', mouth: 'smile', sad: false, ...face };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  ${kid(170, 'boy', f)}
  ${kid(424, 'girl', f)}
</svg>`;
}

const url = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// Later frames stack on top: sad covers the grin when a joke is rated lowest.
const FRAMES = {
  rest: url(frame({})),
  talk: url(frame({ mouth: 'talk' })),
  grin: url(frame({ eyes: 'laugh', mouth: 'grin' })),
  blink: url(frame({ eyes: 'closed' })),
  sad: url(frame({ mouth: 'frown', sad: true })),
};

export function createKids() {
  const kids = document.createElement('div');
  kids.className = 'dad kids';
  kids.setAttribute('role', 'img');
  kids.setAttribute(
    'aria-label',
    'The kids: a boy in a striped T-shirt and a girl with pigtails and a pink bow',
  );
  for (const [name, src] of Object.entries(FRAMES)) {
    const img = document.createElement('img');
    img.className = `dad-${name}`;
    img.src = src;
    img.alt = '';
    img.draggable = false;
    kids.appendChild(img);
  }
  return kids;
}
