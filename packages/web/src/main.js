import { SITE_CATEGORIES } from '@dadjokes/core/jokes';
import { mountDadOMatic } from '@dadjokes/ui';
import { loadBoard, nextJoke, rateJoke } from './api.js';

mountDadOMatic(document.getElementById('app'), {
  nextJoke,
  categories: SITE_CATEGORIES,
  rateJoke,
  loadBoard,
  place: 'the Hall of Groans',
  tagline: 'Every joke is filed for posterity. Rate responsibly.',
});
