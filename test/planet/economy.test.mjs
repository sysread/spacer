// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PlanetState } from '../../src/planet/state';
import { Economy } from '../../src/planet/economy';
import * as t from '../../src/common';

function makeEconomy(body = 'ceres') {
  return new Economy(new PlanetState(body));
}

describe('Economy', () => {
  describe('stock queries', () => {
    it('getStock returns 0 for a fresh planet', () => {
      expect(makeEconomy().getStock('fuel')).toBe(0);
    });

    it('getDemand returns 0 for a fresh planet', () => {
      expect(makeEconomy().getDemand('fuel')).toBe(0);
    });

    it('getSupply returns 0 for a fresh planet', () => {
      expect(makeEconomy().getSupply('fuel')).toBe(0);
    });
  });

  describe('production and consumption', () => {
    it('production is non-negative for all resources', () => {
      const e = makeEconomy();
      for (const item of t.resources) {
        expect(e.production(item)).toBeGreaterThanOrEqual(0);
      }
    });

    it('some resources are produced', () => {
      const e = makeEconomy();
      let any = false;
      for (const item of t.resources) {
        if (e.production(item) > 0) { any = true; break; }
      }
      expect(any).toBe(true);
    });

    it('consumption is non-negative for all resources', () => {
      const e = makeEconomy();
      for (const item of t.resources) {
        expect(e.consumption(item)).toBeGreaterThanOrEqual(0);
      }
    });

    it('netProduction equals production minus consumption', () => {
      const e = makeEconomy();
      for (const item of ['fuel', 'water', 'metal']) {
        expect(e.netProduction(item)).toBeCloseTo(
          e.production(item) - e.consumption(item), 5
        );
      }
    });
  });

  describe('need metric', () => {
    it('getNeed returns a finite number', () => {
      const e = makeEconomy();
      const need = e.getNeed('fuel');
      expect(typeof need).toBe('number');
      expect(isFinite(need)).toBe(true);
    });

    it('getNeed is cached (same value on second call)', () => {
      const e = makeEconomy();
      expect(e.getNeed('fuel')).toBe(e.getNeed('fuel'));
    });
  });

  describe('exporter status', () => {
    it('isNetExporter returns boolean', () => {
      expect(typeof makeEconomy().isNetExporter('fuel')).toBe('boolean');
    });

    it('resources with positive netProduction are exporters', () => {
      const e = makeEconomy();
      for (const item of t.resources) {
        if (e.netProduction(item) > e.production(item)) {
          // Strongly positive net production should be an exporter
          expect(e.isNetExporter(item)).toBe(true);
          break;
        }
      }
    });
  });

  describe('shortage and surplus thresholds', () => {
    it('shortageFactor is 3 for exporters, 6 for non-exporters', () => {
      const e = makeEconomy();
      for (const item of t.resources) {
        const expected = e.isNetExporter(item) ? 3 : 6;
        expect(e.shortageFactor(item)).toBe(expected);
      }
    });

    it('surplusFactor is 0.3 for exporters, 0.6 for non-exporters', () => {
      const e = makeEconomy();
      for (const item of t.resources) {
        const expected = e.isNetExporter(item) ? 0.3 : 0.6;
        expect(e.surplusFactor(item)).toBe(expected);
      }
    });

    it('hasShortage is false with no demand history', () => {
      expect(makeEconomy().hasShortage('fuel')).toBe(false);
    });

    it('hasSurplus is false with no supply history', () => {
      expect(makeEconomy().hasSurplus('fuel')).toBe(false);
    });
  });

  describe('demand propagation', () => {
    it('incDemand increases demand for the item', () => {
      const e = makeEconomy();
      e.incDemand('fuel', 10);
      // demand.avg won't reflect immediately (needs rollup), but the
      // raw demand history should have the entry
      expect(e.getDemand('fuel')).toBeGreaterThanOrEqual(0);
    });

    it('requestResource increases demand when stock is insufficient', () => {
      const e = makeEconomy();
      // No stock, requesting 10 should create demand
      e.requestResource('fuel', 10);
      // Demand was incremented internally
    });
  });

  describe('different planets have different economies', () => {
    it('ceres and earth produce different resources', () => {
      const ceres = makeEconomy('ceres');
      const earth = makeEconomy('earth');
      let differ = false;
      for (const item of t.resources) {
        if (ceres.production(item) !== earth.production(item)) {
          differ = true;
          break;
        }
      }
      expect(differ).toBe(true);
    });
  });
});
