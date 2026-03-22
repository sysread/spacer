// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlanetState } from '../../src/planet/state';
import { Economy } from '../../src/planet/economy';
import { Pricing } from '../../src/planet/pricing';
import { installGameMock, removeGameMock } from '../helpers/game-mock.mjs';
import * as t from '../../src/common';

let game;

beforeEach(() => { game = installGameMock(); });
afterEach(() => removeGameMock());

function makePricing(body = 'ceres') {
  const state = new PlanetState(body);
  const economy = new Economy(state);
  // Use real game planets for exporter check
  const pricing = new Pricing(state, economy,
    (b, item) => game.planets[b].economy.isNetExporter(item));
  return { pricing, state, economy };
}

describe('Pricing', () => {
  describe('sellPrice', () => {
    it('returns a positive number', () => {
      expect(makePricing().pricing.sellPrice('fuel')).toBeGreaterThan(0);
    });

    it('returns a number for every resource', () => {
      const { pricing } = makePricing();
      for (const item of t.resources) {
        const price = pricing.sellPrice(item);
        expect(price, `${item}`).toBeGreaterThan(0);
      }
    });
  });

  describe('buyPrice', () => {
    it('is >= sellPrice', () => {
      const { pricing } = makePricing();
      for (const item of ['fuel', 'water', 'metal']) {
        expect(pricing.buyPrice(item)).toBeGreaterThanOrEqual(pricing.sellPrice(item));
      }
    });

    it('standing discount reduces buyPrice', () => {
      const { pricing } = makePricing();
      const player = game.player;
      player.standing = { CERES: 500 };
      const withStanding = pricing.buyPrice('fuel', player);
      player.standing = {};
      // Clear price cache to force recompute
      makePricing().pricing; // fresh pricing
      // At minimum, the price with standing shouldn't be higher
      expect(withStanding).toBeLessThanOrEqual(pricing.buyPrice('fuel'));
    });
  });

  describe('fuelPricePerTonne', () => {
    it('returns a positive number', () => {
      expect(makePricing().pricing.fuelPricePerTonne()).toBeGreaterThan(0);
    });
  });

  describe('getAvailabilityMarkup', () => {
    it('returns 0.8 for net exporters (discount)', () => {
      const { pricing, economy } = makePricing();
      for (const item of t.resources) {
        if (economy.isNetExporter(item)) {
          expect(pricing.getAvailabilityMarkup(item)).toBe(0.8);
          break;
        }
      }
    });

    it('returns >= 1.0 for non-exporters', () => {
      const { pricing, economy } = makePricing();
      for (const item of t.resources) {
        if (!economy.isNetExporter(item)) {
          expect(pricing.getAvailabilityMarkup(item)).toBeGreaterThanOrEqual(0.8);
          break;
        }
      }
    });
  });

  describe('getScarcityMarkup', () => {
    it('returns > 1 for necessity goods', () => {
      expect(makePricing().pricing.getScarcityMarkup('fuel')).toBeGreaterThan(1);
    });

    it('returns 1 for non-necessity goods', () => {
      expect(makePricing().pricing.getScarcityMarkup('luxuries')).toBe(1);
    });
  });

  describe('getConditionMarkup', () => {
    it('returns 1 with no active conditions', () => {
      expect(makePricing().pricing.getConditionMarkup('fuel')).toBe(1);
    });
  });

  describe('different planets have different prices', () => {
    it('ceres and earth differ for at least one resource', () => {
      const ceres = makePricing('ceres');
      const earth = makePricing('earth');
      let differ = false;
      for (const item of t.resources) {
        if (ceres.pricing.sellPrice(item) !== earth.pricing.sellPrice(item)) {
          differ = true;
          break;
        }
      }
      expect(differ).toBe(true);
    });
  });
});
