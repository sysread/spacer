// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Planet } from '../src/planet';
import { Person } from '../src/person';
import { resources } from '../src/resource';
import * as t from '../src/common';

/* Integration tests: verify Planet delegates are wired correctly.
 * Delegate-specific unit tests live in test/planet/<domain>.test.mjs. */

function makePlanet(body = 'ceres') {
  return new Planet(body);
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

function aCraftableResource() {
  for (const [name, res] of Object.entries(resources)) {
    if ('recipe' in res) return name;
  }
  throw new Error('no craftable resource found');
}

describe('Planet', () => {
  describe('construction', () => {
    it('creates a planet from a valid body key', () => {
      const p = makePlanet();
      expect(p.body).toBe('ceres');
      expect(p.name).toBe('Ceres');
    });

    it('has traits from data', () => {
      expect(makePlanet().traits.length).toBeGreaterThan(0);
    });

    it('has a faction', () => {
      expect(makePlanet().faction.abbrev).toBe('CERES');
    });

    it('creates all delegates', () => {
      const p = makePlanet();
      expect(p.state).toBeDefined();
      expect(p.encounters).toBeDefined();
      expect(p.economy).toBeDefined();
      expect(p.pricing).toBeDefined();
      expect(p.commerce).toBeDefined();
      expect(p.fabrication).toBeDefined();
      expect(p.contractMgr).toBeDefined();
      expect(p.repair).toBeDefined();
      expect(p.labor).toBeDefined();
    });
  });

  describe('scale and properties', () => {
    it('scale(1) returns a positive multiplier', () => {
      expect(makePlanet().scale(1)).toBeGreaterThan(0);
    });

    it('larger planets have larger scale', () => {
      const ceres = makePlanet('ceres');
      const phobos = makePlanet('phobos');
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

    it('isCapitol is true for capital planets', () => {
      expect(makePlanet('ceres').isCapitol()).toBe(true);
    });
  });

  /* Integration: verify delegates are accessible and return sane values
   * through the Planet wrapper. Delegate internals are tested in
   * test/planet/<domain>.test.mjs. */

  describe('delegate wiring: economy', () => {
    it('getStock accessible', () => {
      expect(makePlanet().economy.getStock('fuel')).toBe(0);
    });

    it('production returns values', () => {
      const e = makePlanet().economy;
      let any = false;
      for (const item of t.resources) {
        if (e.production(item) > 0) { any = true; break; }
      }
      expect(any).toBe(true);
    });

    it('getNeed returns a number', () => {
      expect(typeof makePlanet().economy.getNeed('fuel')).toBe('number');
    });

    it('isNetExporter returns boolean', () => {
      expect(typeof makePlanet().economy.isNetExporter('fuel')).toBe('boolean');
    });
  });

  describe('delegate wiring: encounters', () => {
    it('patrolRadius accessible', () => {
      expect(makePlanet().encounters.patrolRadius()).toBeGreaterThan(0);
    });

    it('piracyRadius accessible', () => {
      expect(makePlanet().encounters.piracyRadius()).toBeGreaterThan(0);
    });
  });

  describe('delegate wiring: fabrication', () => {
    it('fabricationAvailability accessible', () => {
      expect(makePlanet().fabrication.fabricationAvailability()).toBe(100);
    });

    it('fabricationTime accessible', () => {
      expect(makePlanet().fabrication.fabricationTime(aCraftableResource())).toBeGreaterThan(0);
    });
  });

  describe('delegate wiring: repair', () => {
    it('hullRepairPrice accessible', () => {
      expect(makePlanet().repair.hullRepairPrice(makePlayer())).toBeGreaterThan(0);
    });

    it('hasRepairs accessible', () => {
      expect(makePlanet().repair.hasRepairs()).toBeFalsy();
    });
  });

  describe('delegate wiring: labor', () => {
    it('hasPicketLine accessible', () => {
      expect(makePlanet().labor.hasPicketLine()).toBe(false);
    });
  });
});
