import { describe, it, expect } from 'vitest';
import { from_euler, mul, rotate_vector } from '../src/quaternion';

// Floating-point comparisons need tolerance.
const EPSILON = 1e-10;
const close = (a, b) => Math.abs(a - b) < EPSILON;
const closeVec = (a, b) => a.every((v, i) => close(v, b[i]));

describe('quaternion', () => {
  describe('from_euler', () => {
    it('identity rotation (all zeros) produces [1,0,0,0]', () => {
      const q = from_euler(0, 0, 0);
      expect(q).toEqual([1, 0, 0, 0]);
    });

    it('produces a unit quaternion (length 1)', () => {
      const q = from_euler(0.1, 0.2, 0.3);
      const len = Math.sqrt(q[0]**2 + q[1]**2 + q[2]**2 + q[3]**2);
      expect(close(len, 1)).toBe(true);
    });
  });

  describe('mul', () => {
    it('identity * identity = identity', () => {
      const id = [1, 0, 0, 0];
      expect(mul(id, id)).toEqual([1, 0, 0, 0]);
    });

    it('q * identity = q', () => {
      const id = [1, 0, 0, 0];
      const q = from_euler(0.1, 0.2, 0.3);
      const result = mul(q, id);
      expect(closeVec(result, q)).toBe(true);
    });

    it('produces a unit quaternion', () => {
      const q1 = from_euler(0.1, 0.2, 0.3);
      const q2 = from_euler(0.4, 0.5, 0.6);
      const r = mul(q1, q2);
      const len = Math.sqrt(r[0]**2 + r[1]**2 + r[2]**2 + r[3]**2);
      expect(close(len, 1)).toBe(true);
    });
  });

  describe('rotate_vector', () => {
    it('identity rotation leaves vector unchanged', () => {
      const id = [1, 0, 0, 0];
      const v = [1, 2, 3];
      expect(closeVec(rotate_vector(id, v), v)).toBe(true);
    });

    it('180-degree rotation around Z flips X and Y', () => {
      // 180 deg around Z: phi = PI, theta = 0, psi = 0
      const q = from_euler(Math.PI, 0, 0);
      const v = [1, 0, 0];
      const r = rotate_vector(q, v);
      // Expect [-1, 0, 0] approximately
      expect(close(r[0], -1)).toBe(true);
      expect(close(r[1], 0)).toBe(true);
      expect(close(r[2], 0)).toBe(true);
    });

    it('preserves vector length', () => {
      const q = from_euler(0.3, 0.7, 1.1);
      const v = [3, 4, 0];
      const r = rotate_vector(q, v);
      const origLen = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
      const rotLen = Math.sqrt(r[0]**2 + r[1]**2 + r[2]**2);
      expect(close(origLen, rotLen)).toBe(true);
    });
  });
});
