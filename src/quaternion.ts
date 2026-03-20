/**
 * quaternion - unit quaternion math for 3D rotations.
 *
 * Used by the orbital mechanics system to apply axial tilts and orbital plane
 * inclinations when computing body positions. A quaternion [w, x, y, z]
 * represents a rotation without gimbal lock.
 *
 * Rotations here follow the standard right-hand rule. All angles are in radians.
 */

import * as V from './vector';

/** A unit quaternion represented as [w, x, y, z]. */
export type quaternion = [number, number, number, number];

/**
 * Constructs a quaternion from three Euler angles (intrinsic ZXY convention).
 *   rz - rotation around Z axis (e.g. longitude of ascending node)
 *   rx - rotation around X axis (e.g. inclination / axial tilt)
 *   ry - rotation around Y axis (e.g. argument of periapsis)
 *
 * The result is a unit quaternion representing the composed rotation.
 * Used in CelestialBody.getPositionAtTime to orient orbital planes.
 */
export const from_euler = (rz: number, rx: number, ry: number): quaternion => {
  const _x = rx * 0.5;
  const _y = ry * 0.5;
  const _z = rz * 0.5;

  const cX = Math.cos(_x);
  const cY = Math.cos(_y);
  const cZ = Math.cos(_z);

  const sX = Math.sin(_x);
  const sY = Math.sin(_y);
  const sZ = Math.sin(_z);

  const w = cX * cY * cZ - sX * sY * sZ;
  const x = sX * cY * cZ + cX * sY * sZ;
  const y = cX * sY * cZ - sX * cY * sZ;
  const z = cX * cY * sZ + sX * sY * cZ;

  return [w, x, y, z];
};

/**
 * Hamilton product of two quaternions: a * b.
 * Composes two rotations - applies b first, then a.
 * Result is a unit quaternion when both inputs are unit quaternions.
 */
export const mul = (a: quaternion, b: quaternion): quaternion => {
  const [w1, x1, y1, z1] = a;
  const [w2, x2, y2, z2] = b;

  return [
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 + y1 * w2 + z1 * x2 - x1 * z2,
    w1 * z2 + z1 * w2 + x1 * y2 - y1 * x2,
  ];
};

/**
 * Rotates vector v by quaternion q using the sandwich product: q * [0,v] * q'.
 * The w=0 terms are elided from the intermediate products as an optimization
 * (commented-out terms would be multiplied by w2=0 anyway).
 * Returns the rotated vector as a Point.
 */
export const rotate_vector = (q: quaternion, v: V.Point): V.Point => {
  const [w1, x1, y1, z1] = q;
  const w2 = 0, [x2, y2, z2] = v; // [0, v]

  // Q * [0, v]
  const w3 = /*w1 * w2*/ -x1 * x2 - y1 * y2 - z1 * z2;
  const x3 = w1 * x2 + /*x1 * w2 +*/ y1 * z2 - z1 * y2;
  const y3 = w1 * y2 + /*y1 * w2 +*/ z1 * x2 - x1 * z2;
  const z3 = w1 * z2 + /*z1 * w2 +*/ x1 * y2 - y1 * x2;

  // (Q * [0, v]) * Q'  (conjugate: negate x,y,z components)
  //const w4 = w3 * w1 + x3 * x1 + y3 * y1 + z3 * z1;
  const x4 = x3 * w1 - w3 * x1 - y3 * z1 + z3 * y1;
  const y4 = y3 * w1 - w3 * y1 - z3 * x1 + x3 * z1;
  const z4 = z3 * w1 - w3 * z1 - x3 * y1 + y3 * x1;

  return [x4, y4, z4];
};
