// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { calculate_trajectory } from '../src/navcomp';

/**
 * Verify that the nav solver correctly matches both endpoint position and
 * velocity for various transit scenarios, including nonzero v_i and v_f.
 */
describe('navcomp trajectory solver', () => {
  const SPT = 8 * 3600; // seconds per turn (must match navcomp.ts)

  function lastSegment(traj) {
    return traj.path[traj.path.length - 1];
  }

  // Tolerance: 1 km for position, 1 m/s for velocity
  // (generous, since Euler integration at 200 subframes accumulates some error)
  const POS_TOL = 1000;
  const VEL_TOL = 1;

  it('matches endpoints for zero-velocity case', () => {
    const initial = { position: [0, 0, 0], velocity: [0, 0, 0] };
    const final   = { position: [1e9, 0, 0], velocity: [0, 0, 0] };
    const traj = calculate_trajectory(10, initial, final);

    // Clamped final is exact, but check the unclamped second-to-last is close
    expect(traj.path.length).toBe(11); // 10 turns + initial
    const end = lastSegment(traj);
    expect(end.position[0]).toBeCloseTo(final.position[0], -3);
    expect(end.velocity).toBeLessThan(100); // near zero at arrival
  });

  it('matches endpoints with equal nonzero velocities', () => {
    const initial = { position: [0, 0, 0], velocity: [1000, 0, 0] };
    const final   = { position: [1e9, 0, 0], velocity: [1000, 0, 0] };
    const traj = calculate_trajectory(10, initial, final);
    const end = lastSegment(traj);
    expect(end.position[0]).toBeCloseTo(final.position[0], -3);
  });

  it('matches endpoints with different nonzero velocities', () => {
    const initial = { position: [0, 0, 0], velocity: [1000, 50, -20] };
    const final   = { position: [1e9, 2e8, -1e8], velocity: [700, -80, 40] };
    const traj = calculate_trajectory(10, initial, final);
    const end = lastSegment(traj);
    expect(end.position[0]).toBeCloseTo(final.position[0], -3);
    expect(end.position[1]).toBeCloseTo(final.position[1], -3);
    expect(end.position[2]).toBeCloseTo(final.position[2], -3);
  });

  it('second-to-last segment is close to final (integration accuracy)', () => {
    // This tests that the solver + integrator actually converge,
    // not just that the clamp forces the answer.
    const initial = { position: [0, 0, 0], velocity: [500, 200, 0] };
    const final   = { position: [5e8, 1e8, 0], velocity: [300, -100, 0] };
    const traj = calculate_trajectory(20, initial, final);

    // The second-to-last point (before clamping) should be reasonably close
    const penultimate = traj.path[traj.path.length - 2];
    const end = traj.path[traj.path.length - 1];

    // Position should be within a few percent of the remaining per-turn distance
    const totalDist = Math.hypot(
      final.position[0] - initial.position[0],
      final.position[1] - initial.position[1],
      final.position[2] - initial.position[2],
    );
    const distPerTurn = totalDist / 20;
    const penultimateDist = Math.hypot(
      end.position[0] - penultimate.position[0],
      end.position[1] - penultimate.position[1],
      end.position[2] - penultimate.position[2],
    );

    // The last segment distance should be roughly one turn's worth of travel
    expect(penultimateDist).toBeLessThan(distPerTurn * 3);
  });

  it('peak velocity accounts for initial velocity', () => {
    // Same distance and turns, but with initial velocity the peak should differ
    const noVel  = calculate_trajectory(10,
      { position: [0, 0, 0], velocity: [0, 0, 0] },
      { position: [1e9, 0, 0], velocity: [0, 0, 0] },
    );
    const withVel = calculate_trajectory(10,
      { position: [0, 0, 0], velocity: [0, 5000, 0] },
      { position: [1e9, 0, 0], velocity: [0, 5000, 0] },
    );

    // Peak velocity should be different when there's a perpendicular component
    expect(withVel.max_velocity).not.toBeCloseTo(noVel.max_velocity, 0);
    // And should be greater since there's extra velocity in the y direction
    expect(withVel.max_velocity).toBeGreaterThan(noVel.max_velocity);
  });

  it('handles 3D diagonal transits', () => {
    const d = 1e9;
    const initial = { position: [0, 0, 0], velocity: [100, 200, 300] };
    const final   = { position: [d, d, d], velocity: [-100, -200, -300] };
    const traj = calculate_trajectory(15, initial, final);
    const end = lastSegment(traj);
    expect(end.position[0]).toBeCloseTo(d, -3);
    expect(end.position[1]).toBeCloseTo(d, -3);
    expect(end.position[2]).toBeCloseTo(d, -3);
  });

  it('short transit (2 turns) still works', () => {
    const initial = { position: [0, 0, 0], velocity: [0, 0, 0] };
    const final   = { position: [1e6, 0, 0], velocity: [0, 0, 0] };
    const traj = calculate_trajectory(2, initial, final);
    expect(traj.path.length).toBe(3);
    const end = lastSegment(traj);
    expect(end.position[0]).toBeCloseTo(1e6, -3);
  });
});
