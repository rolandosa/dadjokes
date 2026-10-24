// Dad, a felt puppet photographed in five expressions. The frames are identical apart from
// the face, so they are stacked and swapped by styles.css. Inlined as data URLs by esbuild.
import rest from '../assets/dad-rest.webp';
import talk from '../assets/dad-talk.webp';
import grin from '../assets/dad-grin.webp';
import blink from '../assets/dad-blink.webp';
import sad from '../assets/dad-sad.webp';

// Later frames stack on top: sad covers the grin when a joke is rated lowest.
const FRAMES = { rest, talk, grin, blink, sad };

export function createDad() {
  const dad = document.createElement('div');
  dad.className = 'dad';
  dad.setAttribute('role', 'img');
  dad.setAttribute('aria-label', 'Dad, a bald puppet in a suit and orange tie');
  for (const [name, src] of Object.entries(FRAMES)) {
    const img = document.createElement('img');
    img.className = `dad-${name}`;
    img.src = src;
    img.alt = '';
    img.draggable = false;
    dad.appendChild(img);
  }
  return dad;
}
