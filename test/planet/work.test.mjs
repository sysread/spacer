// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PlanetState } from '../../src/planet/state';
import { Work } from '../../src/planet/work';
import { Person } from '../../src/person';
import data from '../../src/data';
import * as t from '../../src/common';

function makeWork(body = 'ceres') {
  const state = new PlanetState(body);
  // Production function: returns the produces store value for the resource
  const production = (item) => state.produces.count(item);
  return { work: new Work(state, production), state };
}

function makePlayer() {
  return new Person({
    name: 'Test',
    ship: { type: 'schooner' },
    faction_name: 'CERES',
    home: 'ceres',
    money: 10000,
    standing: {},
  });
}

function aWorkTask() {
  return data.work[0];
}

describe('Work', () => {
  describe('hasPicketLine', () => {
    it('returns false when no strike condition', () => {
      expect(makeWork().work.hasPicketLine()).toBe(false);
    });
  });

  describe('payRate', () => {
    it('returns a positive number', () => {
      const { work } = makeWork();
      expect(work.payRate(makePlayer(), aWorkTask())).toBeGreaterThan(0);
    });

    it('varies by planet', () => {
      const a = makeWork('ceres');
      const b = makeWork('mercury');
      const task = aWorkTask();
      const player = makePlayer();
      // Different planets with different sizes/factions yield different rates
      const rateA = a.work.payRate(player, task);
      const rateB = b.work.payRate(player, task);
      expect(rateA).not.toBe(rateB);
    });
  });

  describe('work', () => {
    it('returns pay and items', () => {
      const { work } = makeWork();
      const result = work.work(makePlayer(), aWorkTask(), 1);
      expect(result).toHaveProperty('pay');
      expect(result).toHaveProperty('items');
      expect(result.pay).toBeGreaterThan(0);
    });

    it('more days means more pay', () => {
      const { work } = makeWork();
      const player = makePlayer();
      const task = aWorkTask();
      const r1 = work.work(player, task, 1);
      const r3 = work.work(player, task, 3);
      expect(r3.pay).toBeGreaterThan(r1.pay);
    });
  });

  describe('mine', () => {
    it('returns 0 for resources the planet does not produce', () => {
      const { work, state } = makeWork();
      // Find a resource this planet doesn't produce
      for (const item of t.resources) {
        if (state.produces.count(item) === 0) {
          expect(work.mine(item)).toBe(0);
          break;
        }
      }
    });

    it('returns between 0 and 1 for produced resources', () => {
      const { work, state } = makeWork();
      for (const item of t.resources) {
        if (state.produces.count(item) > 0) {
          const result = work.mine(item);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
          break;
        }
      }
    });
  });
});
