import { describe, it, expect } from 'vitest';
import { createLoader } from './helpers/amd.js';

const loader = createLoader();
const { ucfirst, csn, pct, uniq, R, clamp, resourceMap } = loader.load('www/js/util.js');

describe('util', () => {
  describe('ucfirst', () => {
    it('capitalizes the first letter of a single word', () => expect(ucfirst('hello')).toBe('Hello'));
    it('capitalizes first letter of each word', () => expect(ucfirst('hello world')).toBe('Hello World'));
    it('leaves already-capitalized strings unchanged', () => expect(ucfirst('Hello')).toBe('Hello'));
    it('handles empty string', () => expect(ucfirst('')).toBe(''));
    it('coerces non-strings via toString', () => expect(ucfirst(42)).toBe('42'));
  });

  describe('csn (comma-separated number)', () => {
    it('formats integers with commas', () => expect(csn(1000000)).toBe('1,000,000'));
    it('leaves small numbers unformatted', () => expect(csn(999)).toBe('999'));
    it('preserves decimal part', () => expect(csn(1234.56)).toBe('1,234.56'));
    it('handles negative numbers', () => expect(csn(-1000)).toBe('-1,000'));
    it('handles zero', () => expect(csn(0)).toBe('0'));
  });

  describe('R (round to places)', () => {
    it('rounds to integer when places is undefined', () => expect(R(3.7)).toBe(4));
    it('rounds to specified decimal places', () => expect(R(3.456, 2)).toBe(3.46));
    it('rounds down correctly', () => expect(R(3.414, 2)).toBe(3.41));
    it('handles zero', () => expect(R(0, 2)).toBe(0));
    it('handles negative numbers', () => expect(R(-3.456, 2)).toBe(-3.46));
  });

  describe('pct', () => {
    it('formats 1.0 as 100%', () => expect(pct(1.0)).toBe('100%'));
    it('formats 0.5 as 50%', () => expect(pct(0.5)).toBe('50%'));
    it('respects decimal places', () => expect(pct(0.1234, 1)).toBe('12.3%'));
    it('formats 0 as 0%', () => expect(pct(0)).toBe('0%'));
  });

  describe('uniq', () => {
    it('deduplicates an array, joining with space', () => {
      // uniq always returns a joined string; split to check membership regardless of order
      const result = uniq(['a', 'b', 'a']);
      expect(result.split(' ').sort()).toEqual(['a', 'b']);
    });

    it('splits a space-separated string and deduplicates', () => {
      const result = uniq('a b a');
      expect(result.split(' ').sort()).toEqual(['a', 'b']);
    });

    it('handles an already-unique array', () => {
      const result = uniq(['x', 'y']);
      expect(result.split(' ').sort()).toEqual(['x', 'y']);
    });

    it('uses a custom separator', () => {
      const result = uniq('a,b,a', ',');
      expect(result.split(',').sort()).toEqual(['a', 'b']);
    });
  });

  describe('clamp', () => {
    it('returns n when within range', () => expect(clamp(5, 0, 10)).toBe(5));
    it('clamps to min', () => expect(clamp(-1, 0, 10)).toBe(0));
    it('clamps to max', () => expect(clamp(11, 0, 10)).toBe(10));
    it('min only (no max)', () => expect(clamp(-5, 0, undefined)).toBe(0));
    it('max only (no min)', () => expect(clamp(15, undefined, 10)).toBe(10));
    it('returns n when min and max are both undefined', () => expect(clamp(42, undefined, undefined)).toBe(42));
  });

  describe('resourceMap', () => {
    it('returns an object with all resource keys', () => {
      const map = resourceMap();
      expect(typeof map).toBe('object');
      expect(Object.keys(map).length).toBeGreaterThan(0);
    });

    it('fills missing keys with the default value', () => {
      const map = resourceMap(0);
      for (const v of Object.values(map)) expect(v).toBe(0);
    });

    it('uses provided default', () => {
      const map = resourceMap(99);
      for (const v of Object.values(map)) expect(v).toBe(99);
    });

    it('preserves existing entries', () => {
      const map = resourceMap(0, { food: 5 });
      expect(map.food).toBe(5);
    });
  });
});
