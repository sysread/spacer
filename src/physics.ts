/**
 * physics - Newtonian mechanics and geometry utilities.
 *
 * All units are SI unless noted: meters for distance, seconds for time,
 * m/s for velocity, m/s² for acceleration.
 *
 * The Physics class is exported both as a module export and as window.Physics.
 * The global assignment predates the AMD module system and is retained because
 * the component layer (navcomp, transit, ships) accesses Physics directly via
 * window rather than through require(). Remove once those components are
 * migrated to the module system.
 */

type point = [number, number, number];

declare var window: {
  Physics: any;
};

class Physics {
  static readonly C  = 299792458;     // speed of light, m/s
  static readonly G  = 9.80665;       // standard gravity, m/s²
  static readonly AU = 149597870700;  // astronomical unit, m

  /**
   * Euclidean distance between two 3D points, in meters.
   * The z component is optional (defaults to 0) to support 2D projected
   * coordinates used in the navigation display.
   */
  static distance(p0: point, p1: point): number {
    return Math.hypot(
      p1[0] - p0[0],
      p1[1] - p0[1],
      (p1[2] || 0) - (p0[2] || 0),
    );
  }

  /**
   * Kinematic range: distance traveled under constant acceleration.
   *   d = v*t + 0.5*a*t²
   *
   * @param t - time in seconds
   * @param v - initial velocity in m/s
   * @param a - constant acceleration in m/s²
   * @returns distance in meters
   *
   * Callers typically convert game hours to seconds before calling
   * (e.g. burnTime * 3600). Result is often divided by AU for display.
   */
  static range(t: number, v: number, a: number): number {
    return (v * t) + (0.5 * a * t * t);
  }

  /**
   * Finds the point at distance d1 along the line segment from p0 to p1.
   * Uses linear interpolation: t = d1 / |p1 - p0|.
   *
   * Used by TransitPlan to locate the ship's current position along its
   * plotted course between two orbital positions.
   */
  static segment(p0: point, p1: point, d1: number): point {
    const [x0, y0, z0] = p0;
    const [x1, y1, z1] = p1;
    const d = Physics.distance(p0, p1);
    const t = d1 / d;
    return [
      (((1 - t) * x0) + (t * x1)),
      (((1 - t) * y0) + (t * y1)),
      (((1 - t) * z0) + (t * z1))
    ];
  }

  /**
   * Returns the centroid (arithmetic mean position) of any number of points.
   * Used in the navigation display to find the center of a set of orbital
   * bodies for viewport centering.
   */
  static centroid(...points: point[]): point {
    let sum_x = points.reduce((a, p) => a + p[0], 0);
    let sum_y = points.reduce((a, p) => a + p[1], 0);
    let sum_z = points.reduce((a, p) => a + (p[2] || 0), 0);
    return [
      sum_x / points.length,
      sum_y / points.length,
      sum_z / points.length,
    ];
  }
}

// Global alias for component layer access. See module doc comment.
window.Physics = Physics;

export = Physics;
