import { describe, it, expect } from 'vitest';
import { blockadeChance } from '../src/conflict-formulas';

describe('conflict formulas', () => {
  describe('blockadeChance', () => {
    it('returns 0.00025 for zero standing (neutral)', () => {
      expect(blockadeChance(0)).toBe(0.00025);
    });

    it('returns positive probability for negative standing', () => {
      expect(blockadeChance(-100)).toBeGreaterThan(0);
    });

    it('higher hostility means higher chance', () => {
      expect(blockadeChance(-200)).toBeGreaterThan(blockadeChance(-100));
    });

    it('scales linearly with negative standing magnitude', () => {
      // -100 / 2000 = 0.05, -200 / 2000 = 0.1
      expect(blockadeChance(-100)).toBeCloseTo(0.05, 5);
      expect(blockadeChance(-200)).toBeCloseTo(0.1, 5);
    });

    it('returns positive probability for positive standing', () => {
      expect(blockadeChance(10)).toBeGreaterThan(0);
    });

    it('higher friendship means lower chance', () => {
      expect(blockadeChance(10)).toBeGreaterThan(blockadeChance(50));
    });

    it('uses logarithmic decay for positive standing', () => {
      // (ln(100) - ln(standing)) / 2000
      const expected = (Math.log(100) - Math.log(50)) / 2000;
      expect(blockadeChance(50)).toBeCloseTo(expected, 8);
    });

    it('returns 0 when standing equals 100 (log ratio is 0)', () => {
      expect(blockadeChance(100)).toBe(0);
    });

    it('returns negative for standing above 100 (very friendly factions never blockade)', () => {
      // ln(100) - ln(200) < 0, so chance is negative (effectively 0 after util.chance)
      expect(blockadeChance(200)).toBeLessThan(0);
    });
  });
});
