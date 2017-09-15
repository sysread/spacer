class Physics {
  /*
   * C(m) -> distance in light seconds
   * C()  -> C
   */
  static C(distance) {
    if (distance === undefined)
      return 299792458;
    return distance / 299792458;
  }

  /*
   * G(m/s/s) -> acceleration in gravities,
   * G()      -> G
   */
  static G(deltav) {
    if (deltav === undefined)
      return 9.80665;

    return deltav / 9.80665;
  }

  /*
   * AU(m) -> distance in AU
   * AU()  -> AU
   */
  static AU(distance) {
    if (distance === undefined)
      return 149597870700;
    return distance / 149597870700;
  }

  /*
   * distance([x,y.z], [x,y,z]) -> m
   */
  static distance(p1, p2) {
    return Math.hypot(
      p1[0] - p2[0],
      p1[1] - p2[1],
      p1[2] - p2[2]
    );
  }

  /*
   * Physics.deltav(kN, kg) -> m/s/s
   */
  static deltav(force, mass) {
    return force / mass;
  }

  /*
   * Physics.force(kg, m/s/s) -> kN
   *
   * Calculates the force required to accelerate a given mass at a constant
   * acceleration.
   */
  static force(mass, deltav) {
    return mass * deltav;
  }

  /*
   * Physics.range(s, m/s, m/s/s) -> m
   */
  static range(time, velocity=0, deltav=Physics.G()) {
    // S = (v * t) + (0.5 * a * t^2)
    return (velocity * time) + (0.5 * deltav * Math.pow(time, 2));
  }

  /*
   * Physics.deltav_for_distance(s, m) -> m/s/s
   */
  static deltav_for_distance(time, distance) {
    return distance / Math.pow(time, 2) * 0.5;
  }
}
