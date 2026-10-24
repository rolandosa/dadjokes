// Mom (Mom mode), a felt puppet photographed in five expressions like Dad. The frames are
// identical apart from the face, so they are stacked and swapped by styles.css. Inlined as data
// URLs by esbuild.
import rest from '../assets/mom-rest.webp';
import talk from '../assets/mom-talk.webp';
import grin from '../assets/mom-grin.webp';
import blink from '../assets/mom-blink.webp';
import sad from '../assets/mom-sad.webp';

// Named like Dad's frames, so styles.css treats them the same.
const FRAMES = { rest, talk, grin, blink, sad };

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
