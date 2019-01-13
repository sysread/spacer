export type PointArray = [number, number, number];

export interface PointObject {
  x: number;
  y: number;
  z: number;
}

export class Vector implements PointObject {
  x: number;
  y: number;
  z: number;

  constructor(x=0, y=0, z=0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone() {
    return new Vector(this.x, this.y, this.z);
  }

  get point(): PointArray {
    return [this.x, this.y, this.z];
  }

  get length_squared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  get length(): number {
    return Math.sqrt(this.length_squared);
  }

  add(v: PointObject): Vector {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v: PointObject): Vector {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  mul(v: PointObject): Vector {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  div(v: PointObject): Vector {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
  }

  add_scalar(n: number): Vector {
    this.x += n;
    this.y += n;
    this.z += n;
    return this;
  }

  sub_scalar(n: number): Vector {
    this.x -= n;
    this.y -= n;
    this.z -= n;
    return this;
  }

  mul_scalar(n: number): Vector {
    this.x *= n;
    this.y *= n;
    this.z *= n;
    return this;
  }

  div_scalar(n: number): Vector {
    this.x /= n;
    this.y /= n;
    this.z /= n;
    return this;
  }

  cross(v: PointObject): Vector {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;

    this.x = x;
    this.y = y;
    this.z = z;

    return this;
  }

  negate(): Vector {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  dot(v: PointObject): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  angle_to(v: Vector): number {
    const theta = this.dot(v) / (Math.sqrt(this.length_squared) * v.length_squared);
    return Math.cos(Math.min(Math.max(theta, -1), 1));
  }

  distance_to_squared(v: PointObject) {
    const x = this.x - v.x;
    const y = this.y - v.y;
    const z = this.z - v.z;
    return Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2);
  }

  distance_to(v: Vector): number {
    return Math.sqrt(this.distance_to_squared(v));
  }

  normalize(): Vector  {
    return this.div_scalar(this.length);
  }

  set_length(n: number): Vector  {
    return this.normalize().mul_scalar(n);
  }

  lerp(target: PointObject, n: number): Vector {
    this.x += (target.x - this.x) * n;
    this.y += (target.y - this.y) * n;
    this.z += (target.z - this.z) * n;

    return this;
  }
}

export function vec(p: PointObject | PointArray): Vector {
  if (p instanceof Array) {
    const [x, y, z] = p;
    return new Vector(x, y, z);
  }
  else if (p instanceof Object) {
    const {x, y, z} = p;
    return new Vector(x, y, z);
  }
  else {
    throw new Error('not a point object or array');
  }
}