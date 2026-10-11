import { describe, expect, it } from 'vitest';
import { buildPublicShellCopy } from '../../scripts/generate-public-shell-copy';
import copy from './public-shell-copy.json';
import { translatePublicShell } from './public-shell';
import { translateUi } from './translate';
import { SUPPORTED_LOCALES } from './config';

describe('public shell translation isolation', () => {
  it('keeps public labels in sync with the reviewed catalogs', () => {
    expect(copy).toEqual(buildPublicShellCopy());
  });
  it('preserves translations and surrounding whitespace in every language', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const source of Object.keys(copy.fr)) {
        expect(translatePublicShell(` ${source} `, locale)).toBe(translateUi(` ${source} `, locale));
      }
    }
    expect(translatePublicShell('AP3K', 'fr')).toBe('AP3K');
  });
});
