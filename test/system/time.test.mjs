import { describe, it, expect } from 'vitest';
import {
  J2000, dayInSeconds, averageYearInDays,
  parse, addMilliseconds, addDays, daysBetween, centuriesBetween, secondsToDays,
} from '../../src/system/helpers/time';

describe('time helpers', () => {
  describe('constants', () => {
    it('J2000 is January 1, 2000 at noon UTC', () => {
      expect(J2000.getTime()).toBe(Date.UTC(2000, 0, 1, 12, 0, 0));
    });

    it('dayInSeconds is 86400', () => {
      expect(dayInSeconds).toBe(86400);
    });

    it('averageYearInDays is 365.24', () => {
      expect(averageYearInDays).toBe(365.24);
    });
  });

  describe('parse', () => {
    it('parses a date string to noon UTC', () => {
      const d = parse('2020-06-15');
      expect(d.getTime()).toBe(Date.UTC(2020, 5, 15, 12, 0, 0));
    });
  });

  describe('addMilliseconds', () => {
    it('adds positive milliseconds', () => {
      const base = new Date(Date.UTC(2000, 0, 1));
      const result = addMilliseconds(base, 5000);
      expect(result.getTime()).toBe(base.getTime() + 5000);
    });

    it('subtracts with negative milliseconds', () => {
      const base = new Date(Date.UTC(2000, 0, 1));
      const result = addMilliseconds(base, -1000);
      expect(result.getTime()).toBe(base.getTime() - 1000);
    });

    it('does not mutate the original date', () => {
      const base = new Date(Date.UTC(2000, 0, 1));
      const original = base.getTime();
      addMilliseconds(base, 5000);
      expect(base.getTime()).toBe(original);
    });
  });

  describe('addDays', () => {
    it('adds days to a date string', () => {
      const result = addDays('2020-01-01T12:00:00Z', 10);
      expect(result.getUTCDate()).toBe(11);
    });

    it('handles month rollover', () => {
      const result = addDays('2020-01-30T12:00:00Z', 5);
      expect(result.getUTCMonth()).toBe(1); // February
    });
  });

  describe('daysBetween', () => {
    it('returns positive days when a > b', () => {
      const a = new Date(Date.UTC(2000, 0, 11, 12, 0, 0));
      const b = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
      expect(daysBetween(a, b)).toBe(10);
    });

    it('returns negative days when a < b', () => {
      const a = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
      const b = new Date(Date.UTC(2000, 0, 11, 12, 0, 0));
      expect(daysBetween(a, b)).toBe(-10);
    });

    it('returns 0 for equal dates', () => {
      const d = new Date(Date.UTC(2000, 0, 1));
      expect(daysBetween(d, d)).toBe(0);
    });
  });

  describe('centuriesBetween', () => {
    it('returns approximately 1 for a 100-year span', () => {
      const a = new Date(Date.UTC(2100, 0, 1, 12, 0, 0));
      const b = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
      const centuries = centuriesBetween(a, b);
      expect(centuries).toBeCloseTo(1.0, 1);
    });

    it('returns 0 for equal dates', () => {
      const d = new Date(Date.UTC(2000, 0, 1));
      expect(centuriesBetween(d, d)).toBe(0);
    });
  });

  describe('secondsToDays', () => {
    it('converts 86400 seconds to 1 day', () => {
      expect(secondsToDays(86400)).toBe(1);
    });

    it('converts fractional days', () => {
      expect(secondsToDays(43200)).toBe(0.5);
    });

    it('handles 0', () => {
      expect(secondsToDays(0)).toBe(0);
    });
  });
});
