export type Point = [number, number, number];


export const clone = (p: Point): Point =>
  [ p[0], p[1], p[2] ];


export const add_scalar = (p: Point, n: number): Point =>
  [ p[0] + n, p[1] + n, p[2] + n ];


export const sub_scalar = (p: Point, n: number): Point =>
  [ p[0] - n, p[1] - n, p[2] - n ];


export const mul_scalar = (p: Point, n: number): Point =>
  [ p[0] * n, p[1] * n, p[2] * n ];


export const div_scalar = (p: Point, n: number): Point =>
  [ p[0] / n, p[1] / n, p[2] / n ];


export const add = (a: Point, b: Point): Point =>
  [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];


export const sub = (a: Point, b: Point): Point =>
  [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];


export const mul = (a: Point, b: Point): Point =>
  [ a[0] * b[0], a[1] * b[1], a[2] * b[2] ];


export const div = (a: Point, b: Point): Point =>
  [ a[0] / b[0], a[1] / b[1], a[2] / b[2] ];


export const length_squared = (p: Point): number =>
  Math.pow(p[0], 2) + Math.pow(p[1], 2) + Math.pow(p[2], 2);


export const length = (p: Point): number =>
  Math.hypot(p[0], p[1], p[2]);
