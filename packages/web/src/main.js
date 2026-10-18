import { mountDadOMatic } from '@dadjokes/ui';
import { loadBoard, nextJoke, rateJoke } from './api.js';

mountDadOMatic(document.getElementById('app'), {
  nextJoke,
  rateJoke,
  loadBoard,
  place: 'the Hall of Groans',
  tagline: 'Every joke is filed for posterity. Rate responsibly.',
});
