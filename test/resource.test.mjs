import { describe, it, expect } from 'vitest';
import { resources, isRaw, isCraft, Raw, Craft } from '../src/resource';

describe('resource', () => {
  describe('resources registry', () => {
    it('contains entries', () => {
      expect(Object.keys(resources).length).toBeGreaterThan(0);
    });

    it('has fuel', () => {
      expect(resources.fuel).toBeDefined();
    });

    it('has metal', () => {
      expect(resources.metal).toBeDefined();
    });
  });

  describe('isRaw / isCraft', () => {
    it('identifies raw resources', () => {
      const raw = Object.values(resources).find(r => r instanceof Raw);
      expect(raw).toBeDefined();
      expect(isRaw(raw)).toBe(true);
      expect(isCraft(raw)).toBe(false);
    });

    it('identifies crafted resources', () => {
      const craft = Object.values(resources).find(r => r instanceof Craft);
      expect(craft).toBeDefined();
      expect(isCraft(craft)).toBe(true);
      expect(isRaw(craft)).toBe(false);
    });
  });

  describe('Resource value computation', () => {
    it('all resources have positive value', () => {
      for (const [name, res] of Object.entries(resources)) {
        expect(res.value, `${name} should have positive value`).toBeGreaterThan(0);
      }
    });

    it('all resources have positive mass', () => {
      for (const [name, res] of Object.entries(resources)) {
        expect(res.mass, `${name} should have positive mass`).toBeGreaterThan(0);
      }
    });

    it('value is an integer (ceil applied)', () => {
      for (const res of Object.values(resources)) {
        expect(res.value).toBe(Math.ceil(res.value));
      }
    });
  });

  describe('price bounds', () => {
    it('minPrice <= value for all resources', () => {
      for (const [name, res] of Object.entries(resources)) {
        expect(res.minPrice, `${name} minPrice`).toBeLessThanOrEqual(res.value);
      }
    });

    it('maxPrice >= value for all resources', () => {
      for (const [name, res] of Object.entries(resources)) {
        expect(res.maxPrice, `${name} maxPrice`).toBeGreaterThanOrEqual(res.value);
      }
    });

    it('minPrice < maxPrice for all resources', () => {
      for (const [name, res] of Object.entries(resources)) {
        expect(res.minPrice, `${name}`).toBeLessThan(res.maxPrice);
      }
    });

    it('minPrice and maxPrice are integers', () => {
      for (const res of Object.values(resources)) {
        expect(res.minPrice).toBe(Math.ceil(res.minPrice));
        expect(res.maxPrice).toBe(Math.ceil(res.maxPrice));
      }
    });
  });

  describe('clampPrice', () => {
    it('clamps below minPrice to minPrice', () => {
      const res = Object.values(resources)[0];
      expect(res.clampPrice(0)).toBe(res.minPrice);
    });

    it('clamps above maxPrice to maxPrice', () => {
      const res = Object.values(resources)[0];
      expect(res.clampPrice(999999)).toBe(res.maxPrice);
    });

    it('returns the value unchanged when within bounds', () => {
      const res = Object.values(resources)[0];
      const mid = Math.ceil((res.minPrice + res.maxPrice) / 2);
      expect(res.clampPrice(mid)).toBe(mid);
    });
  });

  describe('Raw resources', () => {
    it('have mineTurns > 0', () => {
      const raws = Object.values(resources).filter(r => r instanceof Raw);
      expect(raws.length).toBeGreaterThan(0);
      for (const r of raws) {
        expect(r.mineTurns).toBeGreaterThan(0);
      }
    });
  });

  describe('Craft resources', () => {
    it('have craftTurns > 0', () => {
      const crafts = Object.values(resources).filter(r => r instanceof Craft);
      expect(crafts.length).toBeGreaterThan(0);
      for (const c of crafts) {
        expect(c.craftTurns).toBeGreaterThan(0);
      }
    });

    it('have at least one ingredient', () => {
      const crafts = Object.values(resources).filter(r => r instanceof Craft);
      for (const c of crafts) {
        expect(c.ingredients.length).toBeGreaterThan(0);
      }
    });

    it('ingredients reference valid resources', () => {
      const crafts = Object.values(resources).filter(r => r instanceof Craft);
      for (const c of crafts) {
        for (const ing of c.ingredients) {
          expect(resources[ing], `${ing} should exist in resources`).toBeDefined();
        }
      }
    });
  });
});
