var physics;

define(function(require, exports, module) {
  const Physics = class {
    static get C()  { return 299792458;    } // m/s
    static get G()  { return 9.80665;      } // m/s/s
    static get AU() { return 149597870700; } // m

    /*
     * distance([m,m,m], [m,m,m]) -> m
     */
    static distance(p0, p1) {
      return Math.hypot(
        p1[0] - p0[0],
        p1[1] - p0[1],
        (p1[2] || 0) - (p0[2] || 0),
      );
    }

    /*
     * deltav(kN, kg) -> m/s/s
     */
    static deltav(kn, kg) {
      return kn / kg;
    }

    /*
     * force(kg, m/s/s) -> kN
     */
    static force(kg, dv) {
      return kg * dv;
    }

    /*
     * range(s, m/s, m/s/s) -> m
     */
    static range(t, v, a) {
      // S = (v * t) + (0.5 * a * t^2)
      return (v * t) + (0.5 * a * Math.pow(t, 2));
    }

    /*
     * requiredDeltaV(s, m) -> m/s/s
     *
     * Acceleration distance formula:
     *   d = vt + (at^2/2)
     *   2d = 2vt + at^2;
     *   2d - 2vt = at^2
     *   (2d - 2vt) / t^2 = a
     *
     * When v=0:
     *   2d / t^2 = a
     */
    static requiredDeltaV(t, d, v=0) {
      return ((2 * d) - (2 * v * t)) / Math.pow(t, 2);
    }

    /*
     * velocity(s, m/s, m/s/s) -> m/s
     */
    static velocity(t, v, a) {
      return v + (a * t);
    }

    /*
     * segment([x,y,z], [x,y,z], m)
     *
     * Finds a point [x,y,z] at distance d1 along line p1, p2.
     */
    static segment(p0, p1, d1) {
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
  };

  physics = Physics;
  return Physics;
});
