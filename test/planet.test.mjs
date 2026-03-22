// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Planet } from '../src/planet';
import { Person } from '../src/person';
import { resources } from '../src/resource';
import * as t from '../src/common';

/* Ceres: large, subterranean, rocky, asteroids, black market,
 * manufacturing hub, capital. Faction CERES. Good trait variety. */
function makePlanet(body = 'ceres') {
  return new Planet(body);
}

/* Minimal player for methods that need a Person argument. */
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

/* Pick a craftable resource from the registry. */
function aCraftableResource() {
  for (const [name, res] of Object.entries(resources)) {
    if ('recipe' in res) return name;
  }
  throw new Error('no craftable resource found');
}

/* Pick a raw resource. */
function aRawResource() {
  for (const [name, res] of Object.entries(resources)) {
    if ('mine' in res) return name;
  }
  throw new Error('no raw resource found');
}


describe('Planet', () => {
  describe('construction', () => {
    it('creates a planet from a valid body key', () => {
      const p = makePlanet();
      expect(p.body).toBe('ceres');
      expect(p.name).toBe('Ceres');
    });

    it('has traits from data', () => {
      const p = makePlanet();
      expect(p.traits.length).toBeGreaterThan(0);
    });

    it('has a faction', () => {
      expect(makePlanet().faction.abbrev).toBe('CERES');
    });
  });

  describe('scale and properties', () => {
    it('scale(1) returns a positive multiplier', () => {
      expect(makePlanet().scale(1)).toBeGreaterThan(0);
    });

    it('larger planets have larger scale', () => {
      const ceres = makePlanet('ceres');  // large
      const phobos = makePlanet('phobos'); // tiny
      expect(ceres.scale(1)).toBeGreaterThan(phobos.scale(1));
    });

    it('hasTrait finds existing traits', () => {
      const p = makePlanet();
      expect(p.hasTrait('capital')).toBe(true);
      expect(p.hasTrait('black market')).toBe(true);
    });

    it('hasTrait returns false for absent traits', () => {
      expect(makePlanet().hasTrait('habitable')).toBe(false);
    });

    it('hasCondition returns false when no conditions', () => {
      expect(makePlanet().hasCondition('anything')).toBe(false);
    });
  });

  describe('economy queries (via planet.economy)', () => {
    it('getStock returns 0 for a fresh planet', () => {
      expect(makePlanet().economy.getStock('fuel')).toBe(0);
    });

    it('getDemand returns 0 for a fresh planet', () => {
      expect(makePlanet().economy.getDemand('fuel')).toBe(0);
    });

    it('getSupply returns 0 for a fresh planet', () => {
      expect(makePlanet().economy.getSupply('fuel')).toBe(0);
    });

    it('production returns values for resources the planet produces', () => {
      const e = makePlanet().economy;
      let hasProduction = false;
      for (const item of t.resources) {
        if (e.production(item) > 0) {
          hasProduction = true;
          break;
        }
      }
      expect(hasProduction).toBe(true);
    });

    it('netProduction equals production minus consumption', () => {
      const e = makePlanet().economy;
      const item = 'fuel';
      expect(e.netProduction(item)).toBeCloseTo(
        e.production(item) - e.consumption(item), 5
      );
    });
  });

  describe('need and shortage/surplus (via planet.economy)', () => {
    it('getNeed returns a number for any resource', () => {
      const need = makePlanet().economy.getNeed('fuel');
      expect(typeof need).toBe('number');
      expect(isNaN(need)).toBe(false);
    });

    it('isNetExporter returns boolean', () => {
      expect(typeof makePlanet().economy.isNetExporter('fuel')).toBe('boolean');
    });

    it('shortageFactor is 3 for net exporters', () => {
      const e = makePlanet().economy;
      for (const item of t.resources) {
        if (e.isNetExporter(item)) {
          expect(e.shortageFactor(item)).toBe(3);
          break;
        }
      }
    });

    it('shortageFactor is 6 for non-exporters', () => {
      const e = makePlanet().economy;
      for (const item of t.resources) {
        if (!e.isNetExporter(item)) {
          expect(e.shortageFactor(item)).toBe(6);
          break;
        }
      }
    });

    it('surplusFactor is 0.3 for net exporters', () => {
      const e = makePlanet().economy;
      for (const item of t.resources) {
        if (e.isNetExporter(item)) {
          expect(e.surplusFactor(item)).toBe(0.3);
          break;
        }
      }
    });

    it('surplusFactor is 0.6 for non-exporters', () => {
      const e = makePlanet().economy;
      for (const item of t.resources) {
        if (!e.isNetExporter(item)) {
          expect(e.surplusFactor(item)).toBe(0.6);
          break;
        }
      }
    });

    it('hasShortage is false with no stock history', () => {
      expect(makePlanet().economy.hasShortage('fuel')).toBe(false);
    });

    it('hasSurplus is false with no stock history', () => {
      expect(makePlanet().economy.hasSurplus('fuel')).toBe(false);
    });
  });

  /* Pricing methods (sellPrice, buyPrice, fuelPricePerTonne) call
   * getAvailabilityMarkup which accesses window.game.planets. These
   * cannot be unit tested without a full game state mock. They will be
   * testable after the planet/ restructure decouples the pricing pipeline. */

  describe('encounters (via planet.encounters)', () => {
    it('patrolRadius is positive', () => {
      expect(makePlanet().encounters.patrolRadius()).toBeGreaterThan(0);
    });

    it('patrolRate decays with distance', () => {
      const e = makePlanet().encounters;
      expect(e.patrolRate(0)).toBeGreaterThan(e.patrolRate(10));
    });

    it('piracyRadius is positive', () => {
      expect(makePlanet().encounters.piracyRadius()).toBeGreaterThan(0);
    });

    it('piracyRate decays with distance', () => {
      const e = makePlanet().encounters;
      expect(e.piracyRate(0)).toBeGreaterThan(e.piracyRate(10));
    });

    it('inspectionFine is positive', () => {
      expect(makePlanet().encounters.inspectionFine(makePlayer())).toBeGreaterThan(0);
    });
  });

  describe('fabrication', () => {
    it('fabricationAvailability starts at 100', () => {
      expect(makePlanet().fabricationAvailability()).toBe(100);
    });

    it('fabricationTime is positive for craftable items', () => {
      const item = aCraftableResource();
      expect(makePlanet().fabricationTime(item)).toBeGreaterThan(0);
    });

    /* fabricationFee calls sellPrice internally, which hits window.game.
     * Testable after pricing is decoupled. */

    it('hasFabricationResources is true at full health', () => {
      const item = aCraftableResource();
      expect(makePlanet().hasFabricationResources(item, 1)).toBe(true);
    });
  });

  describe('repair and addons', () => {
    it('hullRepairPrice is positive', () => {
      expect(makePlanet().hullRepairPrice(makePlayer())).toBeGreaterThan(0);
    });

    it('armorRepairPrice is positive', () => {
      expect(makePlanet().armorRepairPrice(makePlayer())).toBeGreaterThan(0);
    });

    it('hasRepairs is falsy with no metal stock', () => {
      expect(makePlanet().hasRepairs()).toBeFalsy();
    });

    it('hasRepairs is truthy when metal is stocked', () => {
      const p = makePlanet();
      p.stock.inc('metal', 10);
      expect(p.hasRepairs()).toBeTruthy();
    });

    it('addonPrice is positive', () => {
      expect(makePlanet().addonPrice('armor', makePlayer())).toBeGreaterThan(0);
    });
  });

  describe('estimateAvailability', () => {
    it('returns 0 when resource is in stock', () => {
      const p = makePlanet();
      p.stock.inc('fuel', 10);
      expect(p.estimateAvailability('fuel')).toBe(0);
    });

    it('returns 3 for a produced raw resource', () => {
      const p = makePlanet();
      const raw = aRawResource();
      if (p.economy.netProduction(raw) > 0) {
        expect(p.estimateAvailability(raw)).toBe(3);
      }
    });

    it('returns undefined when nothing is scheduled and not produced', () => {
      const p = makePlanet();
      for (const item of t.resources) {
        if (p.economy.netProduction(item) <= 0 && p.economy.getStock(item) === 0) {
          expect(p.estimateAvailability(item)).toBeUndefined();
          break;
        }
      }
    });
  });
});
