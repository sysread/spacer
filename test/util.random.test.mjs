import { describe, it, expect, vi, afterEach } from 'vitest';
import { getRandomNum, getRandomInt, chance, fuzz, oneOf } from '../src/util';

afterEach(() => vi.restoreAllMocks());

// Pin Math.random to a fixed value so non-deterministic functions become testable.
function fixedRandom(value) {
  vi.spyOn(Math, 'random').mockReturnValue(value);
}

describe('util - random functions', () => {
  describe('getRandomNum', () => {
    it('returns min when random() is 0', () => {
      fixedRandom(0);
      expect(getRandomNum(5, 10)).toBe(5);
    });

    it('returns max when random() is 1', () => {
      fixedRandom(1);
      expect(getRandomNum(5, 10)).toBe(10);
    });

    it('returns midpoint when random() is 0.5', () => {
      fixedRandom(0.5);
      expect(getRandomNum(0, 10)).toBe(5);
    });
  });

  describe('getRandomInt', () => {
    it('returns min when random() is 0', () => {
      fixedRandom(0);
      expect(getRandomInt(3, 7)).toBe(3);
    });

    it('result is always an integer', () => {
      fixedRandom(0.7);
      expect(Number.isInteger(getRandomInt(0, 100))).toBe(true);
    });

    it('result is within [min, max)', () => {
      for (const v of [0, 0.25, 0.5, 0.75, 0.9999]) {
        fixedRandom(v);
        const n = getRandomInt(0, 10);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(10);
      }
    });
  });

  describe('chance', () => {
    it('always returns false for 0', () => {
      fixedRandom(0);
      expect(chance(0)).toBe(false);
    });

    it('returns true when random() <= pct', () => {
      fixedRandom(0.3);
      expect(chance(0.5)).toBe(true);
    });

    it('returns false when random() > pct', () => {
      fixedRandom(0.8);
      expect(chance(0.5)).toBe(false);
    });

    it('returns true at the boundary (random() === pct)', () => {
      fixedRandom(0.5);
      expect(chance(0.5)).toBe(true);
    });
  });

  describe('fuzz', () => {
    it('returns n unchanged when random() produces the midpoint', () => {
      // fuzz uses getRandomNum(low, high) where low = n*(1-pct), high = n*(1+pct).
      // At random()=0.5, result = n*(1-pct) + 0.5*(n*(1+pct) - n*(1-pct)) = n.
      fixedRandom(0.5);
      expect(fuzz(100, 0.1)).toBeCloseTo(100);
    });

    it('returns n*(1-pct) at the low end', () => {
      fixedRandom(0);
      expect(fuzz(100, 0.1)).toBeCloseTo(90);
    });

    it('returns n*(1+pct) at the high end', () => {
      fixedRandom(1);
      expect(fuzz(100, 0.1)).toBeCloseTo(110);
    });
  });

  describe('oneOf', () => {
    it('returns the first element when random() is 0', () => {
      fixedRandom(0);
      expect(oneOf(['a', 'b', 'c'])).toBe('a');
    });

    it('always returns an element from the array', () => {
      const options = ['x', 'y', 'z'];
      for (const v of [0, 0.3, 0.6, 0.99]) {
        fixedRandom(v);
        expect(options).toContain(oneOf(options));
      }
    });
  });
});
