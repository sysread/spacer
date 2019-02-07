import * as V from './vector';

export type quaternion = [number, number, number, number];

export const from_euler = (phi: number, theta: number, psi: number): quaternion => {
  const _x = theta * 0.5;
  const _y = psi * 0.5;
  const _z = phi * 0.5;

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

export const rotate_vector = (q: quaternion, v: V.Point): V.Point => {
  const [w1, x1, y1, z1] = q;
  const w2 = 0, [x2, y2, z2] = v; // [0, v]

  // Q * [0, v]
  const w3 = /*w1 * w2*/ -x1 * x2 - y1 * y2 - z1 * z2;
  const x3 = w1 * x2 + /*x1 * w2 +*/ y1 * z2 - z1 * y2;
  const y3 = w1 * y2 + /*y1 * w2 +*/ z1 * x2 - x1 * z2;
  const z3 = w1 * z2 + /*z1 * w2 +*/ x1 * y2 - y1 * x2;

  const w4 = w3 * w1 + x3 * x1 + y3 * y1 + z3 * z1;
  const x4 = x3 * w1 - w3 * x1 - y3 * z1 + z3 * y1;
  const y4 = y3 * w1 - w3 * y1 - z3 * x1 + x3 * z1;
  const z4 = z3 * w1 - w3 * z1 - x3 * y1 + y3 * x1;

  return [x4, y4, z4];
};
