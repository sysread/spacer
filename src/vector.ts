export type Point = [number, number, number];

export function clone(p: Point): Point {
  return [ p[0], p[1], p[2] ];
}

export function add_scalar(p: Point, n: number): Point {
  return [ p[0] + n, p[1] + n, p[2] + n ];
}

export function sub_scalar(p: Point, n: number): Point {
  return [ p[0] - n, p[1] - n, p[2] - n ];
}

export function mul_scalar(p: Point, n: number): Point {
  return [ p[0] * n, p[1] * n, p[2] * n ];
}

export function div_scalar(p: Point, n: number): Point {
  return [ p[0] / n, p[1] / n, p[2] / n ];
}

export function add(a: Point, b: Point): Point {
  return [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];
}

export function sub(a: Point, b: Point): Point {
  return [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];
}

export function mul(a: Point, b: Point): Point {
  return [ a[0] * b[0], a[1] * b[1], a[2] * b[2] ];
}

export function div(a: Point, b: Point): Point {
  return [ a[0] / b[0], a[1] / b[1], a[2] / b[2] ];
}

export function length_squared(p: Point): number {
  return p[0] * p[0]
       + p[1] * p[1]
       + p[2] * p[2];
}

export function length(p: Point): number {
  return Math.sqrt(length_squared(p));
}
