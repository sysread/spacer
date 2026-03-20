/**
 * vector - immutable 3D vector arithmetic.
 *
 * All functions return new Point values; none mutate their inputs.
 * Used throughout the orbital mechanics and navigation systems for
 * positions and displacements in meters (SI units).
 *
 * A Point is a tuple [x, y, z] where all values are in meters unless
 * otherwise noted at the call site.
 */

export type Point = [number, number, number];

/** Returns a copy of p. */
export const clone = (p: Point): Point =>
  [ p[0], p[1], p[2] ];

/** Adds scalar n to each component of p. */
export const add_scalar = (p: Point, n: number): Point =>
  [ p[0] + n, p[1] + n, p[2] + n ];

/** Subtracts scalar n from each component of p. */
export const sub_scalar = (p: Point, n: number): Point =>
  [ p[0] - n, p[1] - n, p[2] - n ];

/** Multiplies each component of p by scalar n. */
export const mul_scalar = (p: Point, n: number): Point =>
  [ p[0] * n, p[1] * n, p[2] * n ];

/** Divides each component of p by scalar n. */
export const div_scalar = (p: Point, n: number): Point =>
  [ p[0] / n, p[1] / n, p[2] / n ];

/** Component-wise addition: a + b. */
export const add = (a: Point, b: Point): Point =>
  [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];

/** Component-wise subtraction: a - b. */
export const sub = (a: Point, b: Point): Point =>
  [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];

/** Component-wise multiplication: a * b. Not a dot or cross product. */
export const mul = (a: Point, b: Point): Point =>
  [ a[0] * b[0], a[1] * b[1], a[2] * b[2] ];

/** Component-wise division: a / b. */
export const div = (a: Point, b: Point): Point =>
  [ a[0] / b[0], a[1] / b[1], a[2] / b[2] ];

/** Returns the squared Euclidean length of p. Cheaper than length() when only
 *  relative magnitudes need to be compared (avoids the square root). */
export const length_squared = (p: Point): number =>
  Math.pow(p[0], 2) + Math.pow(p[1], 2) + Math.pow(p[2], 2);

/** Returns the Euclidean length (magnitude) of p. */
export const length = (p: Point): number =>
  Math.hypot(p[0], p[1], p[2]);
