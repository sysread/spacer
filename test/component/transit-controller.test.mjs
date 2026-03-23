// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  computePatrolRates, totalPatrolRate, computePiracyRate,
  piracyEvasionMalusCargo, piracyEvasionBonusSpeed, adjustedPiracyRate,
  computePrivateerRates, applyEncounterReduction,
} from '../../src/component/transit-controller';
import { installGameMock, removeGameMock } from '../helpers/game-mock.mjs';
import Physics from '../../src/physics';

let game;

beforeEach(() => { game = installGameMock(); });
afterEach(() => removeGameMock());

function nearbyRanges() {
  // Simulated nearby body distances in meters
  return {
    'ceres': 0.1 * Physics.AU,
    'earth': 0.5 * Physics.AU,
    'mars':  1.2 * Physics.AU,
  };
}

describe('transit-controller', () => {
  describe('computePatrolRates', () => {
    it('returns rates for each nearby body', () => {
      const rates = computePatrolRates(nearbyRanges(), game.planets);
      expect(Object.keys(rates).length).toBe(3);
    });

    it('all rates are non-negative', () => {
      const rates = computePatrolRates(nearbyRanges(), game.planets);
      for (const rate of Object.values(rates)) {
        expect(rate).toBeGreaterThanOrEqual(0);
      }
    });

    it('closer bodies have higher patrol rates', () => {
      const ranges = { 'ceres': 0.01 * Physics.AU, 'earth': 5 * Physics.AU };
      const rates = computePatrolRates(ranges, game.planets);
      expect(rates['ceres']).toBeGreaterThan(rates['earth']);
    });
  });

  describe('totalPatrolRate', () => {
    it('sums rates and clamps to [0, 1]', () => {
      const result = totalPatrolRate({ a: 0.3, b: 0.4 });
      expect(result).toBeCloseTo(0.7, 5);
    });

    it('clamps to 1', () => {
      expect(totalPatrolRate({ a: 0.8, b: 0.8 })).toBe(1);
    });

    it('clamps to 0', () => {
      expect(totalPatrolRate({})).toBe(0);
    });
  });

  describe('computePiracyRate', () => {
    it('is non-negative', () => {
      const patrol = computePatrolRates(nearbyRanges(), game.planets);
      const rate = computePiracyRate(nearbyRanges(), patrol, game.planets);
      expect(rate).toBeGreaterThanOrEqual(0);
    });

    it('is reduced by patrol presence', () => {
      const nearby = nearbyRanges();
      const noPatrol = computePiracyRate(nearby, {}, game.planets);
      const patrol = computePatrolRates(nearby, game.planets);
      const withPatrol = computePiracyRate(nearby, patrol, game.planets);
      expect(withPatrol).toBeLessThanOrEqual(noPatrol);
    });
  });

  describe('piracyEvasionMalusCargo', () => {
    it('returns 0 for no cargo value', () => {
      expect(piracyEvasionMalusCargo(0)).toBe(0);
    });

    it('returns positive for valuable cargo', () => {
      expect(piracyEvasionMalusCargo(10000)).toBeGreaterThan(0);
    });

    it('higher value means higher malus', () => {
      expect(piracyEvasionMalusCargo(100000))
        .toBeGreaterThan(piracyEvasionMalusCargo(1000));
    });
  });

  describe('piracyEvasionBonusSpeed', () => {
    it('returns 0 at or below max velocity', () => {
      expect(piracyEvasionBonusSpeed(100)).toBe(0);
    });

    it('returns positive above max velocity', () => {
      expect(piracyEvasionBonusSpeed(1000)).toBeGreaterThan(0);
    });
  });

  describe('adjustedPiracyRate', () => {
    it('returns 0 when hold is empty', () => {
      expect(adjustedPiracyRate(0.5, 0, 0, 0, true, 0)).toBe(0);
    });

    it('stealth reduces rate', () => {
      const noStealth = adjustedPiracyRate(0.5, 0, 100, 0, false, 0);
      const withStealth = adjustedPiracyRate(0.5, 0.3, 100, 0, false, 0);
      expect(withStealth).toBeLessThan(noStealth);
    });

    it('each encounter halves the rate', () => {
      const zero = adjustedPiracyRate(0.5, 0, 100, 0, false, 0);
      const one = adjustedPiracyRate(0.5, 0, 100, 0, false, 1);
      const two = adjustedPiracyRate(0.5, 0, 100, 0, false, 2);
      expect(one).toBeLessThan(zero);
      expect(two).toBeLessThan(one);
    });

    it('clamps to [0, 1]', () => {
      const rate = adjustedPiracyRate(0.9, 0, 999999, 0, false, 0);
      expect(rate).toBeLessThanOrEqual(1);
      expect(rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applyEncounterReduction', () => {
    it('stealth reduces rate multiplicatively', () => {
      expect(applyEncounterReduction(1.0, 0.5, 0)).toBeCloseTo(0.5, 5);
    });

    it('each encounter halves rate', () => {
      const base = applyEncounterReduction(1.0, 0, 0);
      const once = applyEncounterReduction(1.0, 0, 1);
      expect(once).toBeCloseTo(base / 2, 5);
    });

    it('combines stealth and encounters', () => {
      // 0.5 stealth, 1 encounter: 1.0 * 0.5 / 2 = 0.25
      expect(applyEncounterReduction(1.0, 0.5, 1)).toBeCloseTo(0.25, 5);
    });
  });

  describe('computePrivateerRates', () => {
    it('returns empty when no conflicts', () => {
      const rates = computePrivateerRates(
        nearbyRanges(), game.planets, [], 'CERES', 'ceres', 'earth',
      );
      expect(Object.keys(rates).length).toBe(0);
    });
  });
});
