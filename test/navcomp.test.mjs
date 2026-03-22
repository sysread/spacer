// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { travel_time, calculate_trajectory } from '../src/navcomp';

describe('navcomp', () => {
  describe('travel_time', () => {
    it('returns 0 for zero distance', () => {
      expect(travel_time(0, 1)).toBe(0);
    });

    it('returns positive time for positive distance and acceleration', () => {
      expect(travel_time(1e11, 10)).toBeGreaterThan(0);
    });

    it('longer distance takes more time at same acceleration', () => {
      const t1 = travel_time(1e10, 10);
      const t2 = travel_time(1e11, 10);
      expect(t2).toBeGreaterThan(t1);
    });

    it('higher acceleration reduces travel time', () => {
      const t1 = travel_time(1e11, 5);
      const t2 = travel_time(1e11, 10);
      expect(t2).toBeLessThan(t1);
    });

    it('matches known formula: t = 2 * sqrt(s/a)', () => {
      const s = 1e10;
      const a = 9.8;
      const expected = 2 * Math.sqrt(a * s) / a;
      expect(travel_time(s, a)).toBeCloseTo(expected);
    });
  });

  describe('calculate_trajectory', () => {
    const origin = {
      position: [0, 0, 0],
      velocity: [0, 0, 0],
    };

    const destination = {
      position: [1e10, 0, 0],
      velocity: [0, 0, 0],
    };

    it('returns a trajectory with a path', () => {
      const traj = calculate_trajectory(10, origin, destination);
      expect(traj.path).toBeDefined();
      expect(traj.path.length).toBeGreaterThan(0);
    });

    it('path length equals turns + 1 (includes start position)', () => {
      const traj = calculate_trajectory(10, origin, destination);
      expect(traj.path.length).toBe(11);
    });

    it('first path segment starts at origin', () => {
      const traj = calculate_trajectory(10, origin, destination);
      expect(traj.path[0].position).toEqual([0, 0, 0]);
    });

    it('last path segment ends at destination (clamped)', () => {
      const traj = calculate_trajectory(10, origin, destination);
      const last = traj.path[traj.path.length - 1];
      expect(last.position).toEqual([1e10, 0, 0]);
    });

    it('reports maximum velocity', () => {
      const traj = calculate_trajectory(10, origin, destination);
      expect(traj.max_velocity).toBeGreaterThan(0);
    });

    it('intermediate positions are between origin and destination along x', () => {
      const traj = calculate_trajectory(10, origin, destination);
      for (let i = 1; i < traj.path.length - 1; i++) {
        expect(traj.path[i].position[0]).toBeGreaterThan(0);
        expect(traj.path[i].position[0]).toBeLessThan(1e10);
      }
    });

    it('velocity increases then decreases (flip-and-burn)', () => {
      const traj = calculate_trajectory(20, origin, destination);
      const mid = Math.floor(traj.path.length / 2);
      const v_start = traj.path[0].velocity;
      const v_mid = traj.path[mid].velocity;
      const v_end = traj.path[traj.path.length - 1].velocity;

      expect(v_mid).toBeGreaterThan(v_start);
      expect(v_mid).toBeGreaterThan(v_end);
    });

    it('handles 3D trajectories', () => {
      const dest3d = {
        position: [1e9, 2e9, 3e9],
        velocity: [100, 200, 300],
      };

      const traj = calculate_trajectory(10, origin, dest3d);
      const last = traj.path[traj.path.length - 1];
      expect(last.position).toEqual([1e9, 2e9, 3e9]);
      expect(last.vector).toEqual([100, 200, 300]);
    });
  });
});
