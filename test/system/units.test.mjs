import { describe, it, expect } from 'vitest';
import { kmToMeters, metersToKM, AUToMeters, metersToAU } from '../../src/system/helpers/units';

describe('unit conversions', () => {
  describe('kmToMeters', () => {
    it('converts km to meters', () => expect(kmToMeters(1)).toBe(1000));
    it('handles 0', () => expect(kmToMeters(0)).toBe(0));
    it('handles fractional km', () => expect(kmToMeters(0.5)).toBe(500));
  });

  describe('metersToKM', () => {
    it('converts meters to km', () => expect(metersToKM(1000)).toBe(1));
    it('handles 0', () => expect(metersToKM(0)).toBe(0));
    it('round-trips with kmToMeters', () => expect(metersToKM(kmToMeters(42))).toBe(42));
  });

  describe('AUToMeters', () => {
    it('converts 1 AU to meters', () => expect(AUToMeters(1)).toBe(149597870700));
    it('handles 0', () => expect(AUToMeters(0)).toBe(0));
  });

  describe('metersToAU', () => {
    it('converts meters to AU', () => expect(metersToAU(149597870700)).toBe(1));
    it('handles 0', () => expect(metersToAU(0)).toBe(0));
    it('round-trips with AUToMeters', () => expect(metersToAU(AUToMeters(3.5))).toBeCloseTo(3.5));
  });
});
