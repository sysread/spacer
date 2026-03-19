import { describe, it, expect } from 'vitest';
import { loadAMD } from './helpers/amd.js';

const {
  clone,
  add_scalar, sub_scalar, mul_scalar, div_scalar,
  add, sub, mul, div,
  length_squared, length,
} = loadAMD('www/js/vector.js');

describe('vector', () => {
  const v = [1, 2, 3];
  const u = [4, 5, 6];

  describe('clone', () => {
    it('returns a copy with equal values', () => expect(clone(v)).toEqual([1, 2, 3]));
    it('is a new array, not the same reference', () => expect(clone(v)).not.toBe(v));
  });

  describe('scalar operations', () => {
    it('add_scalar', () => expect(add_scalar(v, 10)).toEqual([11, 12, 13]));
    it('sub_scalar', () => expect(sub_scalar(v, 1)).toEqual([0, 1, 2]));
    it('mul_scalar', () => expect(mul_scalar(v, 2)).toEqual([2, 4, 6]));
    it('div_scalar', () => expect(div_scalar([2, 4, 6], 2)).toEqual([1, 2, 3]));
  });

  describe('component-wise operations', () => {
    it('add', () => expect(add(v, u)).toEqual([5, 7, 9]));
    it('sub', () => expect(sub(u, v)).toEqual([3, 3, 3]));
    it('mul', () => expect(mul(v, u)).toEqual([4, 10, 18]));
    it('div', () => expect(div(u, v)).toEqual([4, 2.5, 2]));
  });

  describe('length', () => {
    it('length_squared of [1,0,0] is 1', () => expect(length_squared([1, 0, 0])).toBe(1));
    it('length_squared of [1,2,3]', () => expect(length_squared(v)).toBe(14));
    it('length of [1,0,0] is 1', () => expect(length([1, 0, 0])).toBe(1));
    it('length of [3,4,0] is 5', () => expect(length([3, 4, 0])).toBe(5));
  });
});
