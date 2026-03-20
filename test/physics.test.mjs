import { describe, it, expect } from 'vitest';
import { loadAMD } from './helpers/amd.mjs';

const Physics = loadAMD('www/js/physics.js');

describe('Physics', () => {
  describe('constants', () => {
    it('C is speed of light in m/s', () => expect(Physics.C).toBe(299792458));
    it('G is standard gravity in m/s/s', () => expect(Physics.G).toBe(9.80665));
    it('AU is astronomical unit in meters', () => expect(Physics.AU).toBe(149597870700));
  });

  describe('distance', () => {
    it('distance between identical points is 0', () => {
      expect(Physics.distance([0, 0, 0], [0, 0, 0])).toBe(0);
    });

    it('distance along a single axis', () => {
      expect(Physics.distance([0, 0, 0], [3, 0, 0])).toBe(3);
    });

    it('3-4-5 right triangle', () => {
      expect(Physics.distance([0, 0, 0], [3, 4, 0])).toBe(5);
    });

    it('works with z omitted (defaults to 0)', () => {
      expect(Physics.distance([0, 0], [3, 4])).toBe(5);
    });

    it('3D distance', () => {
      // sqrt(1^2 + 2^2 + 2^2) = sqrt(9) = 3
      expect(Physics.distance([0, 0, 0], [1, 2, 2])).toBe(3);
    });
  });

  describe('range', () => {
    it('zero velocity and acceleration gives 0', () => {
      expect(Physics.range(10, 0, 0)).toBe(0);
    });

    it('constant velocity, no acceleration: d = v*t', () => {
      expect(Physics.range(5, 10, 0)).toBe(50);
    });

    it('acceleration from rest: d = 0.5*a*t^2', () => {
      expect(Physics.range(4, 0, 2)).toBe(16); // 0.5 * 2 * 16
    });

    it('combined velocity and acceleration', () => {
      // v=10, a=2, t=3: (10*3) + (0.5*2*9) = 30 + 9 = 39
      expect(Physics.range(3, 10, 2)).toBe(39);
    });
  });

  describe('segment', () => {
    it('t=0 returns the start point', () => {
      const p = Physics.segment([0, 0, 0], [10, 0, 0], 0);
      expect(p).toEqual([0, 0, 0]);
    });

    it('t=1 returns the end point', () => {
      const p = Physics.segment([0, 0, 0], [10, 0, 0], 10);
      expect(p[0]).toBeCloseTo(10);
    });

    it('midpoint of a segment', () => {
      const p = Physics.segment([0, 0, 0], [10, 0, 0], 5);
      expect(p[0]).toBeCloseTo(5);
      expect(p[1]).toBeCloseTo(0);
    });

    it('works in 3D', () => {
      // Line from [0,0,0] to [2,2,2], distance = sqrt(12), midpoint at d=sqrt(3)
      const p = Physics.segment([0, 0, 0], [2, 2, 2], Math.sqrt(3));
      expect(p[0]).toBeCloseTo(1);
      expect(p[1]).toBeCloseTo(1);
      expect(p[2]).toBeCloseTo(1);
    });
  });

  describe('centroid', () => {
    it('centroid of a single point is that point', () => {
      expect(Physics.centroid([3, 4, 5])).toEqual([3, 4, 5]);
    });

    it('centroid of two points is their midpoint', () => {
      const c = Physics.centroid([0, 0, 0], [2, 4, 6]);
      expect(c).toEqual([1, 2, 3]);
    });

    it('centroid of three points', () => {
      const c = Physics.centroid([0, 0, 0], [3, 0, 0], [0, 3, 0]);
      expect(c[0]).toBeCloseTo(1);
      expect(c[1]).toBeCloseTo(1);
      expect(c[2]).toBeCloseTo(0);
    });
  });
});
