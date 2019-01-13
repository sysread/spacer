define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Vector = /** @class */ (function () {
        function Vector(x, y, z) {
            if (x === void 0) { x = 0; }
            if (y === void 0) { y = 0; }
            if (z === void 0) { z = 0; }
            this.x = x;
            this.y = y;
            this.z = z;
        }
        Vector.prototype.clone = function () {
            return new Vector(this.x, this.y, this.z);
        };
        Object.defineProperty(Vector.prototype, "point", {
            get: function () {
                return [this.x, this.y, this.z];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Vector.prototype, "length_squared", {
            get: function () {
                return this.x * this.x + this.y * this.y + this.z * this.z;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Vector.prototype, "length", {
            get: function () {
                return Math.sqrt(this.length_squared);
            },
            enumerable: true,
            configurable: true
        });
        Vector.prototype.add = function (v) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
            return this;
        };
        Vector.prototype.sub = function (v) {
            this.x -= v.x;
            this.y -= v.y;
            this.z -= v.z;
            return this;
        };
        Vector.prototype.mul = function (v) {
            this.x *= v.x;
            this.y *= v.y;
            this.z *= v.z;
            return this;
        };
        Vector.prototype.div = function (v) {
            this.x /= v.x;
            this.y /= v.y;
            this.z /= v.z;
            return this;
        };
        Vector.prototype.add_scalar = function (n) {
            this.x += n;
            this.y += n;
            this.z += n;
            return this;
        };
        Vector.prototype.sub_scalar = function (n) {
            this.x -= n;
            this.y -= n;
            this.z -= n;
            return this;
        };
        Vector.prototype.mul_scalar = function (n) {
            this.x *= n;
            this.y *= n;
            this.z *= n;
            return this;
        };
        Vector.prototype.div_scalar = function (n) {
            this.x /= n;
            this.y /= n;
            this.z /= n;
            return this;
        };
        Vector.prototype.cross = function (v) {
            var x = this.y * v.z - this.z * v.y;
            var y = this.z * v.x - this.x * v.z;
            var z = this.x * v.y - this.y * v.x;
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        };
        Vector.prototype.negate = function () {
            this.x = -this.x;
            this.y = -this.y;
            this.z = -this.z;
            return this;
        };
        Vector.prototype.dot = function (v) {
            return this.x * v.x + this.y * v.y + this.z * v.z;
        };
        Vector.prototype.angle_to = function (v) {
            var theta = this.dot(v) / (Math.sqrt(this.length_squared) * v.length_squared);
            return Math.cos(Math.min(Math.max(theta, -1), 1));
        };
        Vector.prototype.distance_to_squared = function (v) {
            var x = this.x - v.x;
            var y = this.y - v.y;
            var z = this.z - v.z;
            return Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2);
        };
        Vector.prototype.distance_to = function (v) {
            return Math.sqrt(this.distance_to_squared(v));
        };
        Vector.prototype.normalize = function () {
            return this.div_scalar(this.length);
        };
        Vector.prototype.set_length = function (n) {
            return this.normalize().mul_scalar(n);
        };
        Vector.prototype.lerp = function (target, n) {
            this.x += (target.x - this.x) * n;
            this.y += (target.y - this.y) * n;
            this.z += (target.z - this.z) * n;
            return this;
        };
        return Vector;
    }());
    exports.Vector = Vector;
    function vec(p) {
        if (p instanceof Array) {
            var x = p[0], y = p[1], z = p[2];
            return new Vector(x, y, z);
        }
        else if (p instanceof Object) {
            var x = p.x, y = p.y, z = p.z;
            return new Vector(x, y, z);
        }
        else {
            throw new Error('not a point object or array');
        }
    }
    exports.vec = vec;
});
