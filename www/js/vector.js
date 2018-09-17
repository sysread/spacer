define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');

  const Vector = class {
    constructor(x=0, y=0, z=0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    clone() {
      return new Vector(this.x, this.y, this.z);
    }

    get point() {
      return [this.x, this.y, this.z];
    }

    get length_squared() {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    get length() {
      return Math.sqrt(this.length_squared);
    }

    add(v)  {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }

    sub(v)  {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }

    mul(v)  {
      this.x *= v.x;
      this.y *= v.y;
      this.z *= v.z;
      return this;
    }

    div(v)  {
      this.x /= v.x;
      this.y /= v.y;
      this.z /= v.z;
      return this;
    }

    add_scalar(n)  {
      this.x += n;
      this.y += n;
      this.z += n;
      return this;
    }

    sub_scalar(n)  {
      this.x -= n;
      this.y -= n;
      this.z -= n;
      return this;
    }

    mul_scalar(n)  {
      this.x *= n;
      this.y *= n;
      this.z *= n;
      return this;
    }

    div_scalar(n)  {
      this.x /= n;
      this.y /= n;
      this.z /= n;
      return this;
    }

    cross(v)  {
      const x = this.y * v.z - this.z * v.y;
      const y = this.z * v.x - this.x * v.z;
      const z = this.x * v.y - this.y * v.x;

      this.x = x;
      this.y = y;
      this.z = z;

      return this;
    }

    negate()  {
      this.x = -this.x;
      this.y = -this.y;
      this.z = -this.z;
      return  this;
    }

    dot(v) {
      return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    angle_to(v) {
      const theta = this.dot(v) / (Math.sqrt(this.length_squared()) * v.length_squared());
      return Math.cos(Math.min(Math.max(theta, -1), 1));
    }

    distance_to_squared(v) {
      const x = this.x - v.x;
      const y = this.y - v.y;
      const z = this.z - v.z;
      return Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2);
    }

    distance_to(v) {
      return Math.sqrt(this.distance_to_squared(v));
    }

    normalize()  {
      return this.div_scalar(this.length());
    }

    set_length(n)  {
      return this.normalize().mul_scalar(n);
    }

    lerp(target , n)  {
      this.x += (target.x - this.x) * n;
      this.y += (target.y - this.y) * n;
      this.z += (target.z - this.z) * n;

      return this;
    }
  };

  function vec(x, y, z) {
    if (x instanceof Array) {
      [x, y, z] = x;
    }
    else if (x instanceof Object) {
      y = x.y;
      z = x.z;
      x = x.x;
    }

    return new Vector(x, y, z);
  }

  exports.Vector = Vector;
  exports.vec = vec;
});
