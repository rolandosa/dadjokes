import { definePage } from '@veeva/vault';
import { mountDadOMatic } from '@dadjokes/ui';
import { loadBoard, rateJoke, saveJoke } from './vault.js';

// The Vault Custom Page: the shared Dad-O-Matic, storing jokes as dad_joke__c records.
export default definePage(({ element }) => {
  mountDadOMatic(element, {
    saveJoke,
    rateJoke,
    loadBoard,
    place: 'Vault',
    tagline: 'Every joke is filed in Vault. For posterity. And compliance.',
  });
});
