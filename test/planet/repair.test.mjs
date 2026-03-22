// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PlanetState } from '../../src/planet/state';
import { Economy } from '../../src/planet/economy';
import { Repair } from '../../src/planet/repair';
import { Person } from '../../src/person';
import { resources } from '../../src/resource';

function makeRepair(body = 'ceres') {
  const state = new PlanetState(body);
  const economy = new Economy(state);
  return { repair: new Repair(state, economy), state, economy };
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

function aRawResource() {
  for (const [name, res] of Object.entries(resources)) {
    if ('mine' in res) return name;
  }
  throw new Error('no raw resource found');
}

describe('Repair', () => {
  describe('hullRepairPrice', () => {
    it('is positive', () => {
      expect(makeRepair().repair.hullRepairPrice(makePlayer())).toBeGreaterThan(0);
    });
  });

  describe('armorRepairPrice', () => {
    it('is positive', () => {
      expect(makeRepair().repair.armorRepairPrice(makePlayer())).toBeGreaterThan(0);
    });
  });

  describe('hasRepairs', () => {
    it('is falsy with no metal stock', () => {
      expect(makeRepair().repair.hasRepairs()).toBeFalsy();
    });

    it('is truthy when metal is stocked', () => {
      const { repair, state } = makeRepair();
      state.stock.inc('metal', 10);
      expect(repair.hasRepairs()).toBeTruthy();
    });
  });

  describe('addonPrice', () => {
    it('is positive', () => {
      expect(makeRepair().repair.addonPrice('armor', makePlayer())).toBeGreaterThan(0);
    });
  });

  describe('estimateAvailability', () => {
    it('returns 0 when resource is in stock', () => {
      const { repair, state } = makeRepair();
      state.stock.inc('fuel', 10);
      expect(repair.estimateAvailability('fuel')).toBe(0);
    });

    it('returns 3 for a produced raw resource', () => {
      const { repair, economy } = makeRepair();
      const raw = aRawResource();
      if (economy.netProduction(raw) > 0) {
        expect(repair.estimateAvailability(raw)).toBe(3);
      }
    });

    it('returns undefined when nothing is scheduled and not produced', () => {
      const { repair, economy } = makeRepair();
      const item = Object.keys(resources).find(
        i => economy.netProduction(i) <= 0 && economy.getStock(i) === 0
      );
      if (item) {
        expect(repair.estimateAvailability(item)).toBeUndefined();
      }
    });
  });

  describe('resourceDependencyPriceAdjustment', () => {
    it('returns 1 when no shortage or surplus', () => {
      expect(makeRepair().repair.resourceDependencyPriceAdjustment('metal')).toBe(1);
    });
  });
});
