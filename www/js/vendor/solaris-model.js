(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.SolarSystem = factory());
}(this, (function () { 'use strict';

var publicize;
var slice = [].slice;

var publicize$1 = publicize = function(PrivateClass, params) {
  var PublicClass, fn, fn1, fn2, i, j, k, len, len1, len2, method, property, ref, ref1, ref2, ref3;
  PrivateClass.privateInstances = new WeakMap;
  PrivateClass.publicInstances = new WeakMap;
  PublicClass = (function() {
    function PublicClass() {
      var args, privateInstance;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      privateInstance = (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(PrivateClass, args, function(){});
      PrivateClass.publicInstances.set(privateInstance, this);
      PrivateClass.privateInstances.set(this, privateInstance);
    }

    return PublicClass;

  })();
  if ((params != null ? params.properties : void 0) != null) {
    ref = params.properties;
    fn = function(property) {
      return Object.defineProperty(PublicClass.prototype, property, {
        get: function() {
          return PrivateClass.privateInstances.get(this)[property];
        },
        set: function(v) {
          return PrivateClass.privateInstances.get(this)[property] = v;
        }
      });
    };
    for (i = 0, len = ref.length; i < len; i++) {
      property = ref[i];
      fn(property);
    }
  }
  if ((params != null ? params.methods : void 0) != null) {
    ref1 = params.methods;
    fn1 = function(method) {
      return PublicClass.prototype[method] = function() {
        var args, ref2;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return (ref2 = PrivateClass.privateInstances.get(this))[method].apply(ref2, args);
      };
    };
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      method = ref1[j];
      fn1(method);
    }
  }
  if ((params != null ? (ref2 = params["static"]) != null ? ref2.methods : void 0 : void 0) != null) {
    ref3 = params["static"].methods;
    fn2 = function(method) {
      return PublicClass[method] = function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return PrivateClass[method].apply(PrivateClass, args);
      };
    };
    for (k = 0, len2 = ref3.length; k < len2; k++) {
      method = ref3[k];
      fn2(method);
    }
  }
  if ((params != null ? params.expose : void 0) || publicize.expose || (typeof process !== "undefined" && process !== null ? process.env.PUBLICIZER_EXPOSE : void 0)) {
    PublicClass.PrivateClass = PrivateClass;
    Object.defineProperty(PublicClass.prototype, 'privateInstance', {
      get: function() {
        return PrivateClass.privateInstances.get(this);
      }
    });
  }
  return PublicClass;
};

var constants = Object.freeze({
  G: 6.67408e-11,
  metersInAU: 149597870700
});

var units = {
  kmToMeters: function(v) {
    return v * 1000;
  },
  metersToKM: function(v) {
    return v / 1000;
  },
  AUToMeters: function(v) {
    return v * constants.metersInAU;
  },
  metersToAU: function(v) {
    return v / constants.metersInAU;
  }
};

var J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));

var dayInSeconds = 86400;

var averageYearInDays = 365.24;

var parse = function(str) {
  return new Date(str + 'T12:00:00Z');
};

var addMilliseconds = function(date, ms) {
  return date.getTime() + ms;
};

var addDays = function(date, days) {
  var result;
  result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

var daysBetween = function(a, b) {
  return (a - b) / 1000 / dayInSeconds;
};

var centuriesBetween = function(a, b) {
  return (a - b) / 1000 / dayInSeconds / averageYearInDays / 100;
};

var secondsToDays = function(secs) {
  return secs / dayInSeconds;
};

var time = {
  J2000: J2000,
  dayInSeconds: dayInSeconds,
  averageYearInDays: averageYearInDays,
  parse: parse,
  addMilliseconds: addMilliseconds,
  addDays: addDays,
  daysBetween: daysBetween,
  centuriesBetween: centuriesBetween,
  secondsToDays: secondsToDays
};

var circleInRadians;

circleInRadians = 2 * Math.PI;

var angles = {
  degreesToRadians: function(v) {
    return v * (Math.PI / 180);
  },
  radiansToDegrees: function(v) {
    return v * (180 / Math.PI);
  },
  normalizeRadians: function(v) {
    return v % circleInRadians;
  }
};

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var quaternion = createCommonjsModule(function (module, exports) {
/**
 * @license Quaternion.js v2.0.0 22/02/2016
 *
 * Copyright (c) 2016, Robert Eisele (robert@xarg.org)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 **/
(function(root) {

  'use strict';

  /**
   * Calculates log(sqrt(a^2+b^2)) in a way to avoid overflows
   *
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  function logHypot(a, b) {

    var _a = Math.abs(a);
    var _b = Math.abs(b);

    if (a === 0) {
      return Math.log(_b);
    }

    if (b === 0) {
      return Math.log(_a);
    }

    if (_a < 3000 && _b < 3000) {
      return Math.log(a * a + b * b) * 0.5;
    }

    return Math.log(a / Math.cos(Math.atan2(b, a)));
  }

  /*
   * Default is the multiplicative one element
   *
   */
  var P = {
    'w': 1,
    'x': 0,
    'y': 0,
    'z': 0
  };

  function parse(dest, w, x, y, z) {

    // Most common internal use case with 4 params
    if (z !== undefined) {
      dest['w'] = w;
      dest['x'] = x;
      dest['y'] = y;
      dest['z'] = z;
      return;
    }

    if (typeof w === 'object' && y === undefined) {

      // Check for quats, for example when an object gets cloned
      if ('w' in w || 'x' in w || 'y' in w || 'z' in w) {
        dest['w'] = w['w'] || 0;
        dest['x'] = w['x'] || 0;
        dest['y'] = w['y'] || 0;
        dest['z'] = w['z'] || 0;
        return;
      }

      // Check for complex numbers
      if ('re' in w && 'im' in w) {
        dest['w'] = w['re'];
        dest['x'] = w['im'];
        dest['y'] = 0;
        dest['z'] = 0;
        return;
      }

      // Check for array
      if (w.length === 4) {
        dest['w'] = w[0];
        dest['x'] = w[1];
        dest['y'] = w[2];
        dest['z'] = w[3];
        return;
      }

      // Check for augmented vector
      if (w.length === 3) {
        dest['w'] = 0;
        dest['x'] = w[0];
        dest['y'] = w[1];
        dest['z'] = w[2];
        return;
      }

      throw new Error('Invalid object');
    }

    // Parse string values
    if (typeof w === 'string' && y === undefined) {

      var tokens = w.match(/\d+\.?\d*e[+-]?\d+|\d+\.?\d*|\.\d+|./g);
      var plus = 1;
      var minus = 0;

      var iMap = {'i': 'x', 'j': 'y', 'k': 'z'};

      if (tokens === null) {
        throw new Error('Parse error');
      }

      // Reset the current state
      dest['w'] =
      dest['x'] =
      dest['y'] =
      dest['z'] = 0;

      for (var i = 0; i < tokens.length; i++) {

        var c = tokens[i];
        var d = tokens[i + 1];

        if (c === ' ' || c === '\t' || c === '\n') {
          /* void */
        } else if (c === '+') {
          plus++;
        } else if (c === '-') {
          minus++;
        } else {

          if (plus + minus === 0) {
            throw new Error('Parse error' + c);
          }
          var g = iMap[c];

          // Is the current token an imaginary sign?
          if (g !== undefined) {

            // Is the following token a number?
            if (d !== ' ' && !isNaN(d)) {
              c = d;
              i++;
            } else {
              c = '1';
            }

          } else {

            if (isNaN(c)) {
              throw new Error('Parser error');
            }

            g = iMap[d];

            if (g !== undefined) {
              i++;
            }
          }

          dest[g || 'w'] += parseFloat((minus % 2 ? '-' : '') + c);
          plus = minus = 0;
        }
      }

      // Still something on the stack
      if (plus + minus > 0) {
        throw new Error('Parser error');
      }
      return;
    }

    // If no single variable was given AND it was the constructor, set it to the identity
    if (w === undefined && dest !== P) {
      dest['w'] = 1;
      dest['x'] =
        dest['y'] =
          dest['z'] = 0;
    } else {

      dest['w'] = w || 0;

      // Note: This isn't setFromAxis, it's just syntactic sugar!
      if (x && x.length === 3) {
        dest['x'] = x[0];
        dest['y'] = x[1];
        dest['z'] = x[2];
      } else {
        dest['x'] = x || 0;
        dest['y'] = y || 0;
        dest['z'] = z || 0;
      }
    }
  }

  function numToStr(n, char, prev) {

    var ret = '';

    if (n !== 0) {

      if (prev !== '') {
        ret += n < 0 ? ' - ' : ' + ';
      } else if (n < 0) {
        ret += '-';
      }

      n = Math.abs(n);

      if (1 !== n || char === '') {
        ret += n;
      }
      ret += char;
    }
    return ret;
  }

  /**
   * Quaternion constructor
   *
   * @constructor
   * @param {number|Object|string} w real
   * @param {number=} x imag
   * @param {number=} y imag
   * @param {number=} z imag
   * @returns {Quaternion}
   */
  function Quaternion(w, x, y, z) {

    if (!(this instanceof Quaternion)) {
      return new Quaternion(w, x, y, z);
    }

    parse(this, w, x, y, z);
  }

  Quaternion.prototype = {
    'w': 1,
    'x': 0,
    'y': 0,
    'z': 0,
    /**
     * Adds two quaternions Q1 and Q2
     *
     * @param {number|Object|string} w real
     * @param {number=} x imag
     * @param {number=} y imag
     * @param {number=} z imag
     * @returns {Quaternion}
     */
    'add': function(w, x, y, z) {

      parse(P, w, x, y, z);

      // Q1 + Q2 := [w1, v1] + [w2, v2] = [w1 + w2, v1 + v2]

      return new Quaternion(
        this['w'] + P['w'],
        this['x'] + P['x'],
        this['y'] + P['y'],
        this['z'] + P['z']);
    },
    /**
     * Subtracts a quaternions Q2 from Q1
     *
     * @param {number|Object|string} w real
     * @param {number=} x imag
     * @param {number=} y imag
     * @param {number=} z imag
     * @returns {Quaternion}
     */
    'sub': function(w, x, y, z) {

      parse(P, w, x, y, z);

      // Q1 - Q2 := Q1 + (-Q2)
      //          = [w1, v1] - [w2, v2] = [w1 - w2, v1 - v2]

      return new Quaternion(
        this['w'] - P['w'],
        this['x'] - P['x'],
        this['y'] - P['y'],
        this['z'] - P['z']);
    },
    /**
     * Calculates the additive inverse, or simply it negates the quaternion
     *
     * @returns {Quaternion}
     */
    'neg': function() {

      // -Q := [-w, -v]

      return new Quaternion(-this['w'], -this['x'], -this['y'], -this['z']);
    },
    /**
     * Calculates the length/modulus/magnitude or the norm of a quaternion
     *
     * @returns {number}
     */
    'norm': function() {

      // |Q| := sqrt(|Q|^2)

      // The unit quaternion has |Q| = 1

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];

      return Math.sqrt(w * w + x * x + y * y + z * z);
    },
    /**
     * Calculates the squared length/modulus/magnitude or the norm of a quaternion
     *
     * @returns {number}
     */
    'normSq': function() {

      // |Q|^2 := [w, v] * [w, -v]
      //        = [w^2 + dot(v, v), -w * v + w * v + cross(v, -v)]
      //        = [w^2 + |v|^2, 0]
      //        = [w^2 + dot(v, v), 0]
      //        = dot(Q, Q)
      //        = Q * Q'

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];

      return w * w + x * x + y * y + z * z;
    },
    /**
     * Normalizes the quaternion to have |Q| = 1 as long as the norm is not zero
     * Alternative names are the signum, unit or versor
     *
     * @returns {Quaternion}
     */
    'normalize': function() {

      // Q* := Q / |Q|

      // unrolled Q.scale(1 / Q.norm())

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];

      var norm = Math.sqrt(w * w + x * x + y * y + z * z);

      if (norm < Quaternion['EPSILON']) {
        return Quaternion['ZERO'];
      }

      norm = 1 / norm;

      return new Quaternion(w * norm, x * norm, y * norm, z * norm);
    },
    /**
     * Calculates the Hamilton product of two quaternions
     * Leaving out the imaginary part results in just scaling the quat
     *
     * @param {number|Object|string} w real
     * @param {number=} x imag
     * @param {number=} y imag
     * @param {number=} z imag
     * @returns {Quaternion}
     */
    'mul': function(w, x, y, z) {

      parse(P, w, x, y, z);

      // Q1 * Q2 = [w1 * w2 - dot(v1, v2), w1 * v2 + w2 * v1 + cross(v1, v2)]

      // Not commutative because cross(v1, v2) != cross(v2, v1)!

      var w1 = this['w'];
      var x1 = this['x'];
      var y1 = this['y'];
      var z1 = this['z'];

      var w2 = P['w'];
      var x2 = P['x'];
      var y2 = P['y'];
      var z2 = P['z'];

      return new Quaternion(
        w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
        w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
        w1 * y2 + y1 * w2 + z1 * x2 - x1 * z2,
        w1 * z2 + z1 * w2 + x1 * y2 - y1 * x2);
    },
    /**
     * Scales a quaternion by a scalar, faster than using multiplication
     *
     * @param {number} s scaling factor
     * @returns {Quaternion}
     */
    'scale': function(s) {

      return new Quaternion(
        this['w'] * s,
        this['x'] * s,
        this['y'] * s,
        this['z'] * s);
    },
    /**
     * Calculates the dot product of two quaternions
     *
     * @param {number|Object|string} w real
     * @param {number=} x imag
     * @param {number=} y imag
     * @param {number=} z imag
     * @returns {number}
     */
    'dot': function(w, x, y, z) {

      parse(P, w, x, y, z);

      // dot(Q1, Q2) := w1 * w2 + dot(v1, v2)

      return this['w'] * P['w'] + this['x'] * P['x'] + this['y'] * P['y'] + this['z'] * P['z'];
    },
    /**
     * Calculates the inverse of a quat for non-normalized quats such that
     * Q^-1 * Q = 1 and Q * Q^-1 = 1
     *
     * @returns {Quaternion}
     */
    'inverse': function() {

      // Q^-1 := Q' / |Q|^2
      //       = [w / (w^2 + |v|^2), -v / (w^2 + |v|^2)]

      // Proof:
      // Q * Q^-1 = [w, v] * [w / (w^2 + |v|^2), -v / (w^2 + |v|^2)]
      //          = [1, 0]
      // Q^-1 * Q = [w / (w^2 + |v|^2), -v / (w^2 + |v|^2)] * [w, v]
      //          = [1, 0].

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];

      var normSq = w * w + x * x + y * y + z * z;

      if (normSq === 0) {
        return Quaternion['ZERO']; // TODO: Is the result zero or one when the norm is zero?
      }

      normSq = 1 / normSq;

      return new Quaternion(w * normSq, -x * normSq, -y * normSq, -z * normSq);
    },
    /**
     * Multiplies a quaternion with the inverse of a second quaternion
     *
     * @param {number|Object|string} w real
     * @param {number=} x imag
     * @param {number=} y imag
     * @param {number=} z imag
     * @returns {Quaternion}
     */
    'div': function(w, x, y, z) {

      parse(P, w, x, y, z);

      // Q1 / Q2 := Q1 * Q2^-1

      var w1 = this['w'];
      var x1 = this['x'];
      var y1 = this['y'];
      var z1 = this['z'];

      var w2 = P['w'];
      var x2 = P['x'];
      var y2 = P['y'];
      var z2 = P['z'];

      var normSq = w2 * w2 + x2 * x2 + y2 * y2 + z2 * z2;

      if (normSq === 0) {
        return Quaternion['ZERO']; // TODO: Is the result zero or one when the norm is zero?
      }

      normSq = 1 / normSq;

      return new Quaternion(
        (w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2) * normSq,
        (x1 * w2 - w1 * x2 - y1 * z2 + z1 * y2) * normSq,
        (y1 * w2 - w1 * y2 - z1 * x2 + x1 * z2) * normSq,
        (z1 * w2 - w1 * z2 - x1 * y2 + y1 * x2) * normSq);
    },
    /**
     * Calculates the conjugate of a quaternion
     *
     * @returns {Quaternion}
     */
    'conjugate': function() {

      // Q' = [s, -v]

      // If the quaternion is normalized,
      // the conjugate is the inverse of the quaternion - but faster
      // Q' * Q = Q * Q' = 1

      // Additionally, the conjugate of a unit quaternion is a rotation with the same
      // angle but the opposite axis.

      // Moreover the following property holds:
      // (Q1 * Q2)' = Q2' * Q1'

      return new Quaternion(this['w'], -this['x'], -this['y'], -this['z']);
    },
    /**
     * Calculates the natural exponentiation of the quaternion
     *
     * @returns {Quaternion}
     */
    'exp': function() {

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];

      var vNorm = Math.sqrt(x * x + y * y + z * z);
      var wExp = Math.exp(w);
      var scale = wExp / vNorm * Math.sin(vNorm);

      if (vNorm === 0) {
        //return new Quaternion(wExp * Math.cos(vNorm), 0, 0, 0);
        return new Quaternion(wExp, 0, 0, 0);
      }

      return new Quaternion(
        wExp * Math.cos(vNorm),
        x * scale,
        y * scale,
        z * scale);
    },
    /**
     * Calculates the natural logarithm of the quaternion
     *
     * @returns {Quaternion}
     */
    'log': function() {

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];

      if (y === 0 && z === 0) {
        return new Quaternion(
          logHypot(w, x),
          Math.atan2(x, w), 0, 0);
      }

      var qNorm2 = x * x + y * y + z * z + w * w;
      var vNorm = Math.sqrt(x * x + y * y + z * z);

      var scale = Math.atan2(vNorm, w) / vNorm;

      return new Quaternion(
        Math.log(qNorm2) * 0.5,
        x * scale,
        y * scale,
        z * scale);
    },
    /**
     * Calculates the power of a quaternion raised to a real number or another quaternion
     *
     * @param {number|Object|string} w real
     * @param {number=} x imag
     * @param {number=} y imag
     * @param {number=} z imag
     * @returns {Quaternion}
     */
    'pow': function(w, x, y, z) {

      parse(P, w, x, y, z);

      if (P['y'] === 0 && P['z'] === 0) {

        if (P['w'] === 1 && P['x'] === 0) {
          return this;
        }

        if (P['w'] === 0 && P['x'] === 0) {
          return Quaternion['ONE'];
        }

        // Check if we can operate in C
        // Borrowed from complex.js
        if (this['y'] === 0 && this['z'] === 0) {

          var a = this['w'];
          var b = this['x'];

          if (a === 0 && b === 0) {
            return Quaternion['ZERO'];
          }

          var arg = Math.atan2(b, a);
          var loh = logHypot(a, b);

          if (P['x'] === 0) {

            if (b === 0 && a >= 0) {

              return new Quaternion(Math.pow(a, P['w']), 0, 0, 0);

            } else if (a === 0) {

              switch (P['w'] % 4) {
                case 0:
                  return new Quaternion(Math.pow(b, P['w']), 0, 0, 0);
                case 1:
                  return new Quaternion(0, Math.pow(b, P['w']), 0, 0);
                case 2:
                  return new Quaternion(-Math.pow(b, P['w']), 0, 0, 0);
                case 3:
                  return new Quaternion(0, -Math.pow(b, P['w']), 0, 0);
              }
            }
          }

          a = Math.exp(P['w'] * loh - P['x'] * arg);
          b = P['x'] * loh + P['w'] * arg;
          return new Quaternion(
            a * Math.cos(b),
            a * Math.sin(b), 0, 0);
        }
      }

      // Normal quaternion behavior
      // q^p = e^ln(q^p) = e^(ln(q)*p)
      return this.log().mul(P).exp();
    },
    /**
     * Checks if two quats are the same
     *
     * @param {number|Object|string} w real
     * @param {number=} x imag
     * @param {number=} y imag
     * @param {number=} z imag
     * @returns {boolean}
     */
    'equals': function(w, x, y, z) {

      parse(P, w, x, y, z);

      var eps = Quaternion['EPSILON'];

      // maybe check for NaN's here?
      return Math.abs(P['w'] - this['w']) < eps
        && Math.abs(P['x'] - this['x']) < eps
        && Math.abs(P['y'] - this['y']) < eps
        && Math.abs(P['z'] - this['z']) < eps;
    },
    /**
     * Checks if all parts of a quaternion are finite
     *
     * @returns {boolean}
     */
    'isFinite': function() {

      return isFinite(this['w']) && isFinite(this['x']) && isFinite(this['y']) && isFinite(this['z']);
    },
    /**
     * Checks if any of the parts of the quaternion is not a number
     *
     * @returns {boolean}
     */
    'isNaN': function() {

      return isNaN(this['w']) || isNaN(this['x']) || isNaN(this['y']) || isNaN(this['z']);
    },
    /**
     * Gets the Quaternion as a well formatted string
     *
     * @returns {string}
     */
    'toString': function() {

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];
      var ret = '';

      if (isNaN(w) || isNaN(x) || isNaN(y) || isNaN(z)) {
        return 'NaN';
      }

      // Alternative design?
      // '(%f, [%f %f %f])'

      ret = numToStr(w, '', ret);
      ret += numToStr(x, 'i', ret);
      ret += numToStr(y, 'j', ret);
      ret += numToStr(z, 'k', ret);

      if ('' === ret)
        return '0';

      return ret;
    },
    /**
     * Returns the real part of the quaternion
     *
     * @returns {number}
     */
    'real': function() {

      return this['w'];
    },
    /**
     * Returns the imaginary part of the quaternion as a 3D vector / array
     *
     * @returns {Quaternion}
     */
    'imag': function() {

      return [this['x'], this['y'], this['z']];
    },
    /**
     * Gets the actual quaternion as a 4D vector / array
     *
     * @returns {Array}
     */
    'toVector': function() {

      return [this['w'], this['x'], this['y'], this['z']];
    },
    /**
     * Calculates the 3x3 rotation matrix for the current quat
     *
     * @param {boolean=} d2
     * @see https://en.wikipedia.org/wiki/Rotation_matrix#Quaternion
     * @returns {Array}
     */
    'toMatrix': function(d2) {

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];

      var n = w * w + x * x + y * y + z * z;
      var s = n === 0 ? 0 : 2 / n;
      var wx = s * w * x, wy = s * w * y, wz = s * w * z;
      var xx = s * x * x, xy = s * x * y, xz = s * x * z;
      var yy = s * y * y, yz = s * y * z, zz = s * z * z;

      if (d2) {
        return [
          [1 - (yy + zz), xy - wz, xz + wy],
          [xy + wz, 1 - (xx + zz), yz - wx],
          [xz - wy, yz + wx, 1 - (xx + yy)]];
      }

      return [
        1 - (yy + zz), xy - wz, xz + wy,
        xy + wz, 1 - (xx + zz), yz - wx,
        xz - wy, yz + wx, 1 - (xx + yy)];
    },
    /**
     * Calculates the homogeneous 4x4 rotation matrix for the current quat
     *
     * @param {boolean=} d2
     * @returns {Array}
     */
    'toMatrix4': function(d2) {

      var w = this['w'];
      var x = this['x'];
      var y = this['y'];
      var z = this['z'];

      var n = w * w + x * x + y * y + z * z;
      var s = n === 0 ? 0 : 2 / n;
      var wx = s * w * x, wy = s * w * y, wz = s * w * z;
      var xx = s * x * x, xy = s * x * y, xz = s * x * z;
      var yy = s * y * y, yz = s * y * z, zz = s * z * z;

      if (d2) {
        return [
          [1 - (yy + zz), xy - wz, xz + wy, 0],
          [xy + wz, 1 - (xx + zz), yz - wx, 0],
          [xz - wy, yz + wx, 1 - (xx + yy), 0],
          [0, 0, 0, 1]];
      }

      return [
        1 - (yy + zz), xy - wz, xz + wy, 0,
        xy + wz, 1 - (xx + zz), yz - wx, 0,
        xz - wy, yz + wx, 1 - (xx + yy), 0,
        0, 0, 0, 1];
    },
    /**
     * Clones the actual object
     *
     * @returns {Quaternion}
     */
    'clone': function() {

      return new Quaternion(this);
    },
    /**
     * Rotates a vector according to the current quaternion
     *
     * @param {Array} v The vector to be rotated
     * @returns {Array}
     */
    'rotateVector': function(v) {

      // [0, v'] = Q * [0, v] * Q'

      // Q
      var w1 = this['w'];
      var x1 = this['x'];
      var y1 = this['y'];
      var z1 = this['z'];

      // [0, v]
      var w2 = 0;
      var x2 = v[0];
      var y2 = v[1];
      var z2 = v[2];

      // Q * [0, v]
      var w3 = /*w1 * w2*/ -x1 * x2 - y1 * y2 - z1 * z2;
      var x3 = w1 * x2 + /*x1 * w2 +*/ y1 * z2 - z1 * y2;
      var y3 = w1 * y2 + /*y1 * w2 +*/ z1 * x2 - x1 * z2;
      var z3 = w1 * z2 + /*z1 * w2 +*/ x1 * y2 - y1 * x2;

      var w4 = w3 * w1 + x3 * x1 + y3 * y1 + z3 * z1;
      var x4 = x3 * w1 - w3 * x1 - y3 * z1 + z3 * y1;
      var y4 = y3 * w1 - w3 * y1 - z3 * x1 + x3 * z1;
      var z4 = z3 * w1 - w3 * z1 - x3 * y1 + y3 * x1;

      return [x4, y4, z4];
    }
  };

  Quaternion['ZERO'] = new Quaternion(0, 0, 0, 0); // This is the additive identity Quaternion
  Quaternion['ONE'] = new Quaternion(1, 0, 0, 0); // This is the multiplicative identity Quaternion
  Quaternion['I'] = new Quaternion(0, 1, 0, 0);
  Quaternion['J'] = new Quaternion(0, 0, 1, 0);
  Quaternion['K'] = new Quaternion(0, 0, 0, 1);
  Quaternion['EPSILON'] = 1e-16;

  /**
   * Creates quaternion by a rotation given as axis and angle
   *
   * @param {Array} axis The axis around which to rotate
   * @param {number} angle The angle in radians
   * @returns {Quaternion}
   */
  Quaternion['fromAxisAngle'] = function(axis, angle) {

    // Q = [cos(angle / 2), v * sin(angle / 2)]

    var halfAngle = angle * 0.5;

    var a = axis[0];
    var b = axis[1];
    var c = axis[2];

    var sin = Math.sin(halfAngle);
    var cos = Math.cos(halfAngle);

    var sin_norm = sin / Math.sqrt(a * a + b * b + c * c);

    return new Quaternion(cos, a * sin_norm, b * sin_norm, c * sin_norm);
  };

  /**
   * Calculates the quaternion to rotate one vector onto the other
   *
   * @param {Array} u
   * @param {Array} v
   */
  Quaternion['fromBetweenVectors'] = function(u, v) {

    var a = u[0];
    var b = u[1];
    var c = u[2];

    var x = v[0];
    var y = v[1];
    var z = v[2];

    var dot = a * x + b * y + c * z;
    var w1 = b * z - c * y;
    var w2 = c * x - a * z;
    var w3 = a * y - b * x;

    return new Quaternion(
      dot + Math.sqrt(dot * dot + w1 * w1 + w2 * w2 + w3 * w3),
      w1,
      w2,
      w3
    ).normalize();
  };

  /**
   * Creates a quaternion by a rotation given by Euler angles
   *
   * @param {number} phi
   * @param {number} theta
   * @param {number} psi
   * @param {string=} order
   * @returns {Quaternion}
   */
  Quaternion['fromEuler'] = function(phi, theta, psi, order) {

    var _x = theta * 0.5;
    var _y = psi * 0.5;
    var _z = phi * 0.5;

    var cX = Math.cos(_x);
    var cY = Math.cos(_y);
    var cZ = Math.cos(_z);

    var sX = Math.sin(_x);
    var sY = Math.sin(_y);
    var sZ = Math.sin(_z);

    if (order === undefined || order === 'ZXY') {
      return new Quaternion(
        cX * cY * cZ - sX * sY * sZ,
        sX * cY * cZ - cX * sY * sZ,
        cX * sY * cZ + sX * cY * sZ,
        cX * cY * sZ + sX * sY * cZ);
    }

    if (order === 'XYZ') {
      return new Quaternion(
        cX * cY * cZ - sX * sY * sZ,
        sX * cY * cZ + cX * sY * sZ,
        cX * sY * cZ - sX * cY * sZ,
        cX * cY * sZ + sX * sY * cZ);
    }

    if (order === 'YXZ') {
      return new Quaternion(
        cX * cY * cZ + sX * sY * sZ,
        sX * cY * cZ + cX * sY * sZ,
        cX * sY * cZ - sX * cY * sZ,
        cX * cY * sZ - sX * sY * cZ);
    }

    if (order === 'ZYX') {
      return new Quaternion(
        cX * cY * cZ + sX * sY * sZ,
        sX * cY * cZ - cX * sY * sZ,
        cX * sY * cZ + sX * cY * sZ,
        cX * cY * sZ - sX * sY * cZ);
    }

    if (order === 'YZX') {
      return new Quaternion(
        cX * cY * cZ - sX * sY * sZ,
        sX * cY * cZ + cX * sY * sZ,
        cX * sY * cZ + sX * cY * sZ,
        cX * cY * sZ - sX * sY * cZ);
    }

    if (order === 'XZY') {
      return new Quaternion(
        cX * cY * cZ + sX * sY * sZ,
        sX * cY * cZ - cX * sY * sZ,
        cX * sY * cZ - sX * cY * sZ,
        cX * cY * sZ + sX * sY * cZ);
    }
    return null;
  };

  if (typeof undefined === 'function' && undefined['amd']) {
    undefined([], function() {
      return Quaternion;
    });
  } else {
    module['exports'] = Quaternion;
  }

})(commonjsGlobal);
});

var $CelestialBody;
var CelestialBody;
var extend$1 = function(child, parent) { for (var key in parent) { if (hasProp$1.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };
var hasProp$1 = {}.hasOwnProperty;

$CelestialBody = (function() {
  function $CelestialBody(key, data, central) {
    var ref;
    this.key = key;
    this.central = central;
    ref = this.adaptData(data), this.name = ref.name, this.type = ref.type, this.radius = ref.radius, this.elements = ref.elements, this.mass = ref.mass, this.tilt = ref.tilt, this.ring = ref.ring, this.position = ref.position;
    this.mu = constants.G * this.mass;
    this.satellites = Object.create(null);
  }

  $CelestialBody.prototype.adaptData = function(data) {
    var ref;
    data.radius = units.kmToMeters(data.radius);
    if (data.mass == null) {
      data.mass = 1;
    }
    if (data.ring) {
      data.ring.innerRadius = units.kmToMeters(data.ring.innerRadius);
      data.ring.outerRadius = units.kmToMeters(data.ring.outerRadius);
    }
    if (data.elements) {
      if ((ref = data.elements.format) === 'jpl-satellites-table' || ref === 'heavens-above') {
        data.elements.base.a = units.kmToMeters(data.elements.base.a);
      } else {
        data.elements.base.a = units.AUToMeters(data.elements.base.a);
        if (data.elements.base.cy) {
          data.elements.base.cy = units.AUToMeters(data.elements.base.cy);
        }
      }
    }
    return data;
  };

  $CelestialBody.prototype.setTime = function(time1) {
    this.time = time1;
    if (this.elements) {
      this.position = this.getPositionAtTime(this.time);
    }
  };

  $CelestialBody.prototype.getPositionAtTime = function(t) {
    var E, L, M, a, e, i, lp, node, ref, ref1, ref2, tilt, w, x, y;
    ref = this.getElementsAtTime(t), a = ref.a, e = ref.e, i = ref.i, L = ref.L, lp = ref.lp, node = ref.node, w = ref.w, M = ref.M, E = ref.E;
    ref1 = [i, node, w, M, E].map(function(v) {
      return angles.degreesToRadians(v);
    }).map(function(v) {
      return angles.normalizeRadians(v);
    }), i = ref1[0], node = ref1[1], w = ref1[2], M = ref1[3], E = ref1[4];
    x = a * (Math.cos(E) - e);
    y = a * Math.sin(E) * Math.sqrt(1 - Math.pow(e, 2));
    tilt = ((ref2 = this.central) != null ? ref2.tilt : void 0) ? angles.degreesToRadians(-this.central.tilt) : 0;
    return quaternion.fromEuler(node, tilt, 0, 'XYZ').mul(quaternion.fromEuler(w, i, 0, 'XYZ')).rotateVector([x, y, 0]);
  };

  $CelestialBody.prototype.getElementsAtTime = function(t) {
    var E, L, M, a, e, el, i, lp, node, period, ref, w;
    ref = (function() {
      var j, len, ref, results;
      ref = ['a', 'e', 'i', 'L', 'lp', 'node'];
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        el = ref[j];
        results.push(this.getElementAtTime(el, t));
      }
      return results;
    }).call(this), a = ref[0], e = ref[1], i = ref[2], L = ref[3], lp = ref[4], node = ref[5];
    w = lp - node;
    M = this.getMeanAnomaly(L, lp, t);
    E = this.getEccentricAnomaly(M, e);
    if (this.central) {
      period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / this.central.mu);
    }
    return {
      a: a,
      e: e,
      i: i,
      L: L,
      lp: lp,
      node: node,
      w: w,
      M: M,
      E: E,
      period: period
    };
  };

  $CelestialBody.prototype.getOrbitPath = function() {
    var i, j, msPerPeriodsDegree, period, points, t;
    period = this.getElementsAtTime(this.time).period;
    points = [];
    msPerPeriodsDegree = (period * 1000) / 360;
    for (i = j = 0; j < 359; i = ++j) {
      t = time.addMilliseconds(this.time, msPerPeriodsDegree * i);
      points.push(this.getPositionAtTime(t));
    }
    points.push(points[0].slice());
    return points;
  };

  $CelestialBody.prototype.getElementAtTime = function(name, t) {
    var ref, value;
    value = this.elements.base[name];
    if ((ref = this.elements.cy) != null ? ref[name] : void 0) {
      value += this.elements.cy[name] * time.centuriesBetween(t, time.J2000);
    }
    return value;
  };

  $CelestialBody.prototype.getMeanAnomaly = function(L, lp, t) {
    var M, ref;
    M = L - lp;
    if ((ref = this.elements.day) != null ? ref.M : void 0) {
      M += this.elements.day.M * time.daysBetween(t, time.J2000);
    }
    return M;
  };

  $CelestialBody.prototype.getEccentricAnomaly = function(M, e) {
    var E, dE;
    E = M;
    while (true) {
      dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-6) {
        break;
      }
    }
    return E;
  };

  return $CelestialBody;

})();

var CelestialBody$1 = CelestialBody = (function(superClass) {
  extend$1(CelestialBody, superClass);

  function CelestialBody() {
    return CelestialBody.__super__.constructor.apply(this, arguments);
  }

  return CelestialBody;

})(publicize$1($CelestialBody, {
  properties: ['key', 'name', 'type', 'radius', 'elements', 'mass', 'tilt', 'ring', 'position', 'central', 'mu', 'satellites'],
  methods: ['setTime', 'getPositionAtTime', 'getElementsAtTime', 'getElementAtTime', 'getOrbitPath']
}));

var mercury = {
  name: 'Mercury',
  type: 'planet',
  radius: 2440,
  mass: 3.302e23,
  tilt: 2.11,
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 0.38709927,
      e: 0.20563593,
      i: 7.00497902,
      L: 252.25032350,
      lp: 77.45779628,
      node: 48.33076593
    },
    cy: {
      a: 0.00000037,
      e: 0.00001906,
      i: -0.00594749,
      L: 149472.67411175,
      lp: 0.16047689,
      node: -0.12534081
    }
  }
};

var venus = {
  name: 'Venus',
  type: 'planet',
  radius: 6051.8,
  mass: 48.685e23,
  tilt: 177.3,
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 0.72333566,
      e: 0.00677672,
      i: 3.39467605,
      L: 181.97909950,
      lp: 131.60246718,
      node: 76.67984255
    },
    cy: {
      a: 0.00000390,
      e: -0.00004107,
      i: -0.00078890,
      L: 58517.81538729,
      lp: 0.00268329,
      node: -0.27769418
    }
  }
};

var earth = {
  name: 'Earth',
  type: 'planet',
  radius: 6371.01,
  mass: 5.97219e24,
  tilt: 23.45,
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 1.00000261,
      e: 0.01671123,
      i: -0.00001531,
      L: 100.46457166,
      lp: 102.93768193,
      node: 0
    },
    cy: {
      a: 0.00000562,
      e: -0.00004392,
      i: -0.01294668,
      L: 35999.37244981,
      lp: 0.32327364,
      node: 0
    }
  },
  satellites: {
    moon: {
      name: 'The Moon',
      type: 'moon',
      radius: 1737.4,
      mass: 734.9e20,
      tilt: 6.67,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 384400,
          e: 0.0554,
          i: 5.16,
          L: 578.5,
          lp: 443.23,
          node: 125.08
        },
        day: {
          M: 13.176358
        }
      }
    },
    iss: {
      name: 'ISS',
      type: 'spacecraft',
      radius: (0.1085 * 0.0728) / 2,
      elements: {
        format: 'heavens-above',
        base: {
          a: 6378.1596564 + ((399 + 408) / 2),
          e: 0.0006514,
          i: 51.6424,
          L: 645.0066,
          lp: 480.9673,
          node: 284.9119
        },
        day: {
          M: 360 * 15.54381896
        }
      }
    }
  }
};

var mars = {
  name: 'Mars',
  type: 'planet',
  radius: 3389.9,
  mass: 6.4185e23,
  tilt: 25.19,
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 1.52371034,
      e: 0.09339410,
      i: 1.84969142,
      L: -4.55343205,
      lp: -23.94362959,
      node: 49.55953891
    },
    cy: {
      a: 0.00001847,
      e: 0.00007882,
      i: -0.00813131,
      L: 19140.30268499,
      lp: 0.44441088,
      node: -0.29257343
    }
  },
  satellites: {
    phobos: {
      name: 'Phobos',
      type: 'moon',
      radius: (13.1 + 11.1 + 9.3) / 3,
      mass: 1.08e16,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 9376,
          e: 0.0151,
          i: 1.075,
          L: 448.9,
          lp: 357.841,
          node: 207.784
        },
        day: {
          M: 1128.8447569
        }
      }
    },
    deimos: {
      name: 'Deimos',
      type: 'moon',
      radius: (7.8 * 6.0 * 5.1) / 3,
      mass: 1.80e15,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 23458,
          e: 0.0002,
          i: 1.788,
          L: 610.583,
          lp: 285.254,
          node: 24.525
        },
        day: {
          M: 285.1618790
        }
      }
    }
  }
};

var ceres = {
  name: 'Ceres',
  type: 'dwarfPlanet',
  radius: 476.2,
  mass: 9.393e20,
  tilt: 4,
  elements: {
    format: 'jpl-sbdb',
    base: {
      a: 2.767880825324262,
      e: 0.07568276766977486,
      i: 10.59240162556512,
      L: 420.0192342788,
      lp: 153.217647542,
      node: 80.30985818155804
    },
    day: {
      M: 0.2140341110610894
    }
  }
};

var jupiter = {
  name: 'Jupiter',
  type: 'planet',
  radius: 69911,
  mass: 1898.13e24,
  tilt: 3.12,
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 5.20288700,
      e: 0.04838624,
      i: 1.30439695,
      L: 34.39644051,
      lp: 14.72847983,
      node: 100.47390909
    },
    cy: {
      a: -0.00011607,
      e: -0.00013253,
      i: -0.00183714,
      L: 3034.74612775,
      lp: 0.21252668,
      node: 0.20469106
    }
  },
  satellites: {
    io: {
      name: 'Io',
      type: 'moon',
      radius: 1821.3,
      mass: 8933e19,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 421800,
          e: 0.0041,
          i: 0.036,
          L: 470.127,
          lp: 128.106,
          node: 43.977
        },
        day: {
          M: 203.4889583
        }
      }
    },
    europa: {
      name: 'Europa',
      type: 'moon',
      radius: 1565,
      mass: 4797e19,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 671100,
          e: 0.0094,
          i: 0.466,
          L: 479.092,
          lp: 308.076,
          node: 219.106
        },
        day: {
          M: 101.3747242
        }
      }
    },
    ganymede: {
      name: 'Ganymede',
      type: 'moon',
      radius: 2634,
      mass: 1482e20,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 1070400,
          e: 0.0013,
          i: 0.177,
          L: 573.509,
          lp: 255.969,
          node: 63.552
        },
        day: {
          M: 50.3176072
        }
      }
    },
    callisto: {
      name: 'Callisto',
      type: 'moon',
      radius: 2403,
      mass: 1076e20,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 1882700,
          e: 0.0074,
          i: 0.192,
          L: 532.899,
          lp: 351.491,
          node: 298.848
        },
        day: {
          M: 21.5710728
        }
      }
    }
  }
};

var saturn = {
  name: 'Saturn',
  type: 'planet',
  radius: 60268,
  mass: 5.68319e26,
  tilt: 26.73,
  ring: {
    innerRadius: 66900,
    outerRadius: 137774
  },
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 9.53667594,
      e: 0.05386179,
      i: 2.48599187,
      L: 49.95424423,
      lp: 92.59887831,
      node: 113.66242448
    },
    cy: {
      a: -0.00125060,
      e: -0.00050991,
      i: 0.00193609,
      L: 1222.49362201,
      lp: -0.41897216,
      node: -0.28867794
    }
  },
  satellites: {
    mimas: {
      name: 'Mimas',
      type: 'moon',
      radius: 198.8,
      mass: 375e17,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 185539,
          e: 0.0196,
          i: 1.574,
          L: 520.374,
          lp: 505.526,
          node: 173.027
        },
        day: {
          M: 381.9944948
        }
      }
    },
    enceladus: {
      name: 'Enceladus',
      type: 'moon',
      radius: 252.3,
      mass: 10805e16,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 238042,
          e: 0.0000,
          i: 0.003,
          L: 542.269,
          lp: 342.583,
          node: 342.507
        },
        day: {
          M: 262.7318978
        }
      }
    },
    tethys: {
      name: 'Tethys',
      type: 'moon',
      radius: 536.3,
      mass: 6176e17,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 294672,
          e: 0.0001,
          i: 1.091,
          L: 548.411,
          lp: 305.044,
          node: 259.842
        },
        day: {
          M: 190.6979109
        }
      }
    },
    dione: {
      name: 'Dione',
      type: 'moon',
      radius: 562.5,
      mass: 109572e16,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 377415,
          e: 0.0022,
          i: 0.028,
          L: 896.962,
          lp: 574.73,
          node: 290.415
        },
        day: {
          M: 131.5349307
        }
      }
    },
    rhea: {
      name: 'Rhea',
      type: 'moon',
      radius: 764.5,
      mass: 2309e18,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 527068,
          e: 0.0002,
          i: 0.333,
          L: 772.442,
          lp: 592.661,
          node: 351.042
        },
        day: {
          M: 79.6900459
        }
      }
    },
    titan: {
      name: 'Titan',
      type: 'moon',
      radius: 2575.5,
      mass: 13455.3e19,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 1221865,
          e: 0.0288,
          i: 0.306,
          L: 371.902,
          lp: 208.592,
          node: 28.060
        },
        day: {
          M: 22.5769756
        }
      }
    },
    hyperion: {
      name: 'Hyperion',
      type: 'moon',
      radius: 133,
      mass: 108e17,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 1500933,
          e: 0.1230061,
          i: 0.615,
          L: 653.367,
          lp: 567.025,
          node: 263.847
        },
        day: {
          M: 16.9199503
        }
      }
    },
    iapetus: {
      name: 'Iapetus',
      type: 'moon',
      radius: 734.5,
      mass: 180.59e19,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 3560854,
          e: 0.0293,
          i: 8.298,
          L: 554.5,
          lp: 352.711,
          node: 81.105
        },
        day: {
          M: 4.5379416
        }
      }
    },
    phoebe: {
      name: 'Phoebe',
      type: 'moon',
      radius: 106.6,
      mass: 8289e15,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 12947918,
          e: 0.1634,
          i: 175.243,
          L: 636.624,
          lp: 583.586,
          node: 241.086
        },
        day: {
          M: 0.6569114
        }
      }
    }
  }
};

var uranus = {
  name: 'Uranus',
  type: 'planet',
  radius: 25362,
  mass: 86.8103e24,
  tilt: 97.86,
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 19.18916464,
      e: 0.04725744,
      i: 0.77263783,
      L: 313.23810451,
      lp: 170.95427630,
      node: 74.01692503
    },
    cy: {
      a: -0.00196176,
      e: -0.00004397,
      i: -0.00242939,
      L: 428.48202785,
      lp: 0.40805281,
      node: 0.04240589
    }
  },
  satellites: {
    titania: {
      name: 'Titania',
      type: 'moon',
      radius: 788.9,
      mass: 35.27e20,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 436300,
          e: 0.0011,
          i: 0.079,
          L: 408.785,
          lp: 384.171,
          node: 99.771
        },
        day: {
          M: 41.3514246
        }
      }
    }
  }
};

var neptune = {
  name: 'Neptune',
  type: 'planet',
  radius: 24624,
  mass: 102.41e24,
  tilt: 29.56,
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 30.06992276,
      e: 0.00859048,
      i: 1.77004347,
      L: -55.12002969,
      lp: 44.96476227,
      node: 131.78422574
    },
    cy: {
      a: 0.00026291,
      e: 0.00005105,
      i: 0.00035372,
      L: 218.45945325,
      lp: -0.32241464,
      node: -0.00508664
    }
  },
  satellites: {
    triton: {
      name: 'Triton',
      type: 'moon',
      radius: 1352.6,
      mass: 214.7e20,
      tilt: 0.010,
      elements: {
        format: 'jpl-satellites-table',
        base: {
          a: 354759,
          e: 0,
          i: 156.865,
          L: 596.007,
          lp: 243.75,
          node: 177.608
        },
        day: {
          M: 61.2572638
        }
      }
    }
  }
};

var pluto = {
  name: 'Pluto',
  type: 'dwarfPlanet',
  radius: 1195,
  mass: 1.307e22,
  tilt: 122.5,
  elements: {
    format: 'jpl-1800-2050',
    base: {
      a: 39.48211675,
      e: 0.24882730,
      i: 17.14001206,
      L: 238.92903833,
      lp: 224.06891629,
      node: 110.30393684
    },
    cy: {
      a: -0.00031596,
      e: 0.00005170,
      i: 0.00004818,
      L: 145.20780515,
      lp: -0.04062942,
      node: -0.01183482
    }
  }
};

var eris = {
  name: 'Eris',
  type: 'dwarfPlanet',
  radius: 1163,
  elements: {
    format: 'jpl-sbdb',
    base: {
      a: 67.64830340711272,
      e: 0.442178729942388,
      i: 44.19798212835923,
      L: 392.0654311366,
      lp: 187.3023562449,
      node: 35.88062556130805
    },
    day: {
      M: 0.001771408442534513
    }
  }
};

var sedna = {
  name: 'Sedna',
  type: 'dwarfPlanet',
  radius: 497.5,
  elements: {
    format: 'jpl-sbdb',
    base: {
      a: 493.1571900553549,
      e: 0.8458267179852279,
      i: 11.92883369990435,
      L: 814.12651433,
      lp: 456.0846992128,
      node: 144.4983343551347
    },
    day: {
      M: 8.999658288375152e-5
    }
  }
};

var sun = {
  name: 'The Sun',
  type: 'star',
  radius: 6.955e5,
  mass: 1.988544e30,
  position: [0, 0, 0],
  satellites: {
    mercury: mercury,
    venus: venus,
    earth: earth,
    mars: mars,
    ceres: ceres,
    jupiter: jupiter,
    saturn: saturn,
    uranus: uranus,
    neptune: neptune,
    pluto: pluto,
    eris: eris,
    sedna: sedna
  }
};

var data = {
  sun: sun
};

var $SolarSystem;
var SolarSystem;
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };
var hasProp = {}.hasOwnProperty;

$SolarSystem = (function() {
  function $SolarSystem() {
    this.bodies = Object.create(null);
    this.importBodies(data);
    this.setTime(new Date);
  }

  $SolarSystem.prototype.importBodies = function(bodies, central) {
    var body, k, v;
    for (k in bodies) {
      v = bodies[k];
      body = new CelestialBody$1(k, v, central);
      this.bodies[k] = body;
      if (central) {
        central.satellites[k] = body;
      }
      if (v.satellites) {
        this.importBodies(v.satellites, body);
      }
    }
  };

  $SolarSystem.prototype.setTime = function(input) {
    var body, k, ref;
    this.time = typeof input === 'string' ? time.parse(input) : input;
    ref = this.bodies;
    for (k in ref) {
      body = ref[k];
      body.setTime(this.time);
    }
  };

  return $SolarSystem;

})();

var index = SolarSystem = (function(superClass) {
  extend(SolarSystem, superClass);

  function SolarSystem() {
    return SolarSystem.__super__.constructor.apply(this, arguments);
  }

  return SolarSystem;

})(publicize$1($SolarSystem, {
  properties: ['bodies', 'time'],
  methods: ['setTime']
}));

return index;

})));
