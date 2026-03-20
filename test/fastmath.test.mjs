import { describe, it, expect } from 'vitest';
import { loadAMD } from './helpers/amd.mjs';

const { abs, ceil, floor, round, sign } = loadAMD('www/js/fastmath.js');

describe('fastmath', () => {
  describe('abs', () => {
    it('returns positive values unchanged', () => expect(abs(3)).toBe(3));
    it('negates negative values', () => expect(abs(-3)).toBe(3));
    it('handles zero', () => expect(abs(0)).toBe(0));
    it('coerces strings', () => expect(abs('-5')).toBe(5));
  });

  describe('ceil', () => {
    it('leaves integers unchanged', () => expect(ceil(3)).toBe(3));
    it('rounds positive fractions up', () => expect(ceil(3.1)).toBe(4));
    it('rounds negative fractions toward zero', () => expect(ceil(-3.1)).toBe(-3));
    it('handles zero', () => expect(ceil(0)).toBe(0));
  });

  describe('floor', () => {
    it('leaves integers unchanged', () => expect(floor(3)).toBe(3));
    it('rounds positive fractions down', () => expect(floor(3.9)).toBe(3));
    it('rounds negative fractions away from zero', () => expect(floor(-3.1)).toBe(-4));
    it('handles zero', () => expect(floor(0)).toBe(0));
  });

  describe('round', () => {
    it('rounds 0.5 up', () => expect(round(0.5)).toBe(1));
    it('rounds 0.4 down', () => expect(round(0.4)).toBe(0));
    it('rounds negative 0.5 away from zero (half-away-from-zero rule)', () => expect(round(-0.5)).toBe(-1));
    it('leaves integers unchanged', () => expect(round(3)).toBe(3));
  });

  describe('sign', () => {
    it('returns 1 for positive', () => expect(sign(5)).toBe(1));
    it('returns -1 for negative', () => expect(sign(-5)).toBe(-1));
    it('returns 0 for zero', () => expect(sign(0)).toBe(0));
  });
});
