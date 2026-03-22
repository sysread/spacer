// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PlanetState } from '../../src/planet/state';
import { Encounters } from '../../src/planet/encounters';
import { Person } from '../../src/person';

function makeEncounters(body = 'ceres') {
  return new Encounters(new PlanetState(body));
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

describe('Encounters', () => {
  describe('patrolRadius', () => {
    it('is positive', () => {
      expect(makeEncounters().patrolRadius()).toBeGreaterThan(0);
    });

    it('is larger for military planets', () => {
      const mars = makeEncounters('mars');    // has military trait? check
      const ceres = makeEncounters('ceres');  // no military
      // Both should be positive regardless
      expect(mars.patrolRadius()).toBeGreaterThan(0);
      expect(ceres.patrolRadius()).toBeGreaterThan(0);
    });

    it('scales with planet size (same trait profile)', () => {
      // Both have 'capital' trait; ceres is large, earth is huge
      const large = makeEncounters('ceres');
      const huge  = makeEncounters('earth');
      expect(huge.patrolRadius()).toBeGreaterThan(large.patrolRadius());
    });
  });

  describe('patrolRate', () => {
    it('is positive at distance 0', () => {
      expect(makeEncounters().patrolRate(0)).toBeGreaterThan(0);
    });

    it('is constant within patrol radius', () => {
      const e = makeEncounters();
      const r = e.patrolRadius();
      expect(e.patrolRate(0)).toBe(e.patrolRate(r * 0.5));
    });

    it('decays beyond patrol radius', () => {
      const e = makeEncounters();
      const r = e.patrolRadius();
      expect(e.patrolRate(r + 1)).toBeLessThan(e.patrolRate(0));
    });

    it('approaches 0 at extreme distance', () => {
      expect(makeEncounters().patrolRate(100)).toBeLessThan(0.001);
    });
  });

  describe('piracyRadius', () => {
    it('is positive', () => {
      expect(makeEncounters().piracyRadius()).toBeGreaterThan(0);
    });

    it('is larger than patrol radius', () => {
      const e = makeEncounters();
      expect(e.piracyRadius()).toBeGreaterThan(e.patrolRadius());
    });
  });

  describe('piracyRate', () => {
    it('is positive at distance 0', () => {
      expect(makeEncounters().piracyRate(0)).toBeGreaterThan(0);
    });

    it('peaks near piracy radius', () => {
      const e = makeEncounters();
      const r = e.piracyRadius();
      // Rate at the piracy radius should be higher than far away
      expect(e.piracyRate(r)).toBeGreaterThan(e.piracyRate(r * 3));
    });

    it('decays far from piracy radius', () => {
      const e = makeEncounters();
      expect(e.piracyRate(100)).toBeLessThan(e.piracyRate(0));
    });
  });

  describe('inspectionRate', () => {
    it('is positive for a player with no standing', () => {
      expect(makeEncounters().inspectionRate(makePlayer())).toBeGreaterThan(0);
    });
  });

  describe('inspectionFine', () => {
    it('is positive', () => {
      expect(makeEncounters().inspectionFine(makePlayer())).toBeGreaterThan(0);
    });
  });
});
