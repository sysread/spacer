// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Planet } from '../src/planet';

/* Tests for Planet construction and PlanetState properties.
 * Delegate-specific tests live in test/planet/<domain>.test.mjs. */

function makePlanet(body = 'ceres') {
  return new Planet(body);
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
});
