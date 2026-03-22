import { describe, it, expect } from 'vitest';
import {
  flightRisk, flightChance, effectiveIntercept, effectiveDodge,
  damagePct, isPlayerTurn, currentRound,
} from '../src/combat-formulas';

describe('combat formulas', () => {
  describe('flightRisk', () => {
    it('returns 0 at full hull', () => {
      expect(flightRisk(1.0)).toBe(0);
    });

    it('returns 0.5 at zero hull', () => {
      expect(flightRisk(0)).toBe(0.5);
    });

    it('returns 0.25 at half hull', () => {
      expect(flightRisk(0.5)).toBe(0.25);
    });

    it('scales linearly with damage', () => {
      const r25 = flightRisk(0.75);
      const r50 = flightRisk(0.50);
      expect(r50).toBeCloseTo(r25 * 2, 5);
    });
  });

  describe('flightChance', () => {
    it('returns 0 when dodge is 0', () => {
      expect(flightChance(0, 0.5)).toBe(0);
    });

    it('higher dodge means higher flight chance', () => {
      expect(flightChance(0.6, 0.3)).toBeGreaterThan(flightChance(0.3, 0.3));
    });

    it('higher opponent rawDodge means lower flight chance', () => {
      expect(flightChance(0.5, 0.5)).toBeGreaterThan(flightChance(0.5, 1.0));
    });

    it('divides by 5 to keep rates low', () => {
      expect(flightChance(0.5, 0.5)).toBeCloseTo(0.2, 5);
    });
  });

  describe('effectiveIntercept', () => {
    it('returns base when no damage', () => {
      expect(effectiveIntercept(0.35, 0)).toBe(0.35);
    });

    it('reduces by malus', () => {
      expect(effectiveIntercept(0.35, 0.1)).toBeCloseTo(0.25, 5);
    });

    it('floors at 0', () => {
      expect(effectiveIntercept(0.1, 0.5)).toBe(0);
    });
  });

  describe('effectiveDodge', () => {
    it('returns base when no damage', () => {
      expect(effectiveDodge(0.5, 0)).toBe(0.5);
    });

    it('reduces by malus', () => {
      expect(effectiveDodge(0.5, 0.2)).toBeCloseTo(0.3, 5);
    });

    it('floors at 0', () => {
      expect(effectiveDodge(0.1, 0.5)).toBe(0);
    });
  });

  describe('damagePct', () => {
    it('returns 100 for total HP damage', () => {
      expect(damagePct(30, 20, 10)).toBe(100);
    });

    it('returns 50 for half HP damage', () => {
      expect(damagePct(15, 20, 10)).toBe(50);
    });

    it('returns 0 for no damage', () => {
      expect(damagePct(0, 20, 10)).toBe(0);
    });
  });

  describe('isPlayerTurn', () => {
    it('player goes first when player has initiative', () => {
      expect(isPlayerTurn('player', 1)).toBe(true);
    });

    it('opponent goes first when opponent has initiative', () => {
      expect(isPlayerTurn('opponent', 1)).toBe(false);
    });

    it('alternates each half-round (player initiative)', () => {
      expect(isPlayerTurn('player', 1)).toBe(true);
      expect(isPlayerTurn('player', 2)).toBe(false);
      expect(isPlayerTurn('player', 3)).toBe(true);
      expect(isPlayerTurn('player', 4)).toBe(false);
    });

    it('alternates each half-round (opponent initiative)', () => {
      expect(isPlayerTurn('opponent', 1)).toBe(false);
      expect(isPlayerTurn('opponent', 2)).toBe(true);
      expect(isPlayerTurn('opponent', 3)).toBe(false);
      expect(isPlayerTurn('opponent', 4)).toBe(true);
    });
  });

  describe('currentRound', () => {
    it('round 1 is display round 1', () => {
      expect(currentRound(1)).toBe(1);
    });

    it('round 2 is display round 1', () => {
      expect(currentRound(2)).toBe(1);
    });

    it('round 3 is display round 2', () => {
      expect(currentRound(3)).toBe(2);
    });

    it('round 4 is display round 2', () => {
      expect(currentRound(4)).toBe(2);
    });
  });
});
