import { describe, expect, it } from 'vitest';
import { importLexique4Tsv } from '../src/lexicons/lexique4-adapter';

describe('adaptateur Lexique 4', () => {
  const fixture = [
    'ortho\tfreqfilms2\tcgram',
    'été\t120\tNOM',
    'ETE\t80\tNOM',
    'chat\t60\tNOM',
    'xylophone\t0.2\tNOM',
    'TV\t500\tNOM',
  ].join('\n');

  it('produit un Lexicon v1 français avec provenance de source et licence', () => {
    const result = importLexique4Tsv(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema).toBe('cruciverbalis.lexicon.v1');
    expect(result.value.language).toBe('fr');
    expect(result.value.license).toBe('CC BY-SA 4.0');
  });

  it('normalise et déduplique les formes orthographiques', () => {
    const result = importLexique4Tsv(fixture);
    if (!result.ok) throw new Error('import attendu');
    expect(result.value.entries.map(({ word }) => word)).toEqual(['CHAT', 'ETE', 'XYLOPHONE']);
  });

  it('normalise logarithmiquement la fréquence et marque les termes très rares', () => {
    const result = importLexique4Tsv(fixture, { rareBelow: 1 });
    if (!result.ok) throw new Error('import attendu');
    const ete = result.value.entries.find(({ word }) => word === 'ETE');
    const xylophone = result.value.entries.find(({ word }) => word === 'XYLOPHONE');
    expect(ete?.frequency).toBe(1);
    expect(xylophone?.frequency).toBeGreaterThanOrEqual(0);
    expect(xylophone?.frequency).toBeLessThan(ete?.frequency ?? 0);
    expect(xylophone?.rare).toBe(true);
  });

  it('permet de choisir explicitement la colonne de fréquence', () => {
    const tsv = ['ortho\tfreqlivres\tfreqfilms2', 'chat\t10\t100'].join('\n');
    const result = importLexique4Tsv(tsv, { frequencyColumn: 'freqlivres' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.description).toContain('freqlivres');
  });

  it('refuse un export sans colonne orthographique exploitable', () => {
    const result = importLexique4Tsv('mot\tfrequence\nchat\t10');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.message).toContain('ortho');
  });
});
