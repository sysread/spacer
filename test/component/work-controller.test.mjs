// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  gatherContracts, computePayRate, computeTotalPay,
  daysToTurns, workProgress, turnsToTimeSpent,
} from '../../src/component/work-controller';
import { installGameMock, removeGameMock } from '../helpers/game-mock.mjs';
import data from '../../src/data';

let game;

beforeEach(() => { game = installGameMock(); });
afterEach(() => removeGameMock());

describe('work-controller', () => {
  describe('computePayRate', () => {
    it('returns a positive number', () => {
      const task = data.work[0];
      const rate = computePayRate(game.planets.ceres, game.player, task);
      expect(rate).toBeGreaterThan(0);
    });

    it('varies by planet', () => {
      const task = data.work[0];
      const a = computePayRate(game.planets.ceres, game.player, task);
      const b = computePayRate(game.planets.mercury, game.player, task);
      // Different planets with different sizes/factions yield different rates
      expect(a).not.toBe(b);
    });
  });

  describe('computeTotalPay', () => {
    it('multiplies rate by days', () => {
      expect(computeTotalPay(100, 3)).toBe(300);
    });

    it('returns 0 for 0 days', () => {
      expect(computeTotalPay(100, 0)).toBe(0);
    });
  });

  describe('daysToTurns', () => {
    it('converts days to turns', () => {
      expect(daysToTurns(1)).toBe(24 / data.hours_per_turn);
    });

    it('scales linearly', () => {
      expect(daysToTurns(3)).toBe(daysToTurns(1) * 3);
    });
  });

  describe('workProgress', () => {
    it('returns 0 at start', () => {
      expect(workProgress(0, 10)).toBe(0);
    });

    it('returns 50 at halfway', () => {
      expect(workProgress(5, 10)).toBe(50);
    });

    it('caps at 100', () => {
      expect(workProgress(15, 10)).toBe(100);
    });
  });

  describe('turnsToTimeSpent', () => {
    it('returns 0 for less than a full day', () => {
      expect(turnsToTimeSpent(1)).toBe(0);
    });

    it('returns 1 for a full day of turns', () => {
      expect(turnsToTimeSpent(data.turns_per_day)).toBe(1);
    });
  });

  describe('gatherContracts', () => {
    it('returns an object', () => {
      const result = gatherContracts(
        game.planets.ceres,
        game.planets,
        game.get_conflicts(),
      );
      expect(typeof result).toBe('object');
    });

    it('returns empty for a fresh planet with no contracts', () => {
      const result = gatherContracts(
        game.planets.ceres,
        game.planets,
        game.get_conflicts(),
      );
      expect(Object.keys(result).length).toBe(0);
    });

    it('groups contracts by mission type', () => {
      // Refresh contracts to generate some
      game.planets.ceres.contractMgr.refreshContracts();

      const result = gatherContracts(
        game.planets.ceres,
        game.planets,
        game.get_conflicts(),
      );

      for (const type of Object.keys(result)) {
        expect(Array.isArray(result[type])).toBe(true);
        for (const c of result[type]) {
          expect(c.mission.mission_type).toBe(type);
        }
      }
    });

    it('sorts contracts by distance', () => {
      game.planets.ceres.contractMgr.refreshContracts();

      const result = gatherContracts(
        game.planets.ceres,
        game.planets,
        game.get_conflicts(),
      );

      for (const type of Object.keys(result)) {
        const list = result[type];
        for (let i = 1; i < list.length; i++) {
          const distA = game.planets.ceres.distance(list[i - 1].mission.issuer);
          const distB = game.planets.ceres.distance(list[i].mission.issuer);
          expect(distA).toBeLessThanOrEqual(distB);
        }
      }
    });
  });
});
