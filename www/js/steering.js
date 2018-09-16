define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const System  = require('system');
  const Physics = require('physics');
  const Vector3 = require('vendor/math-ds').Vector3;
  const SPT     = data.hours_per_turn * 3600;
  const km      = 1000;

  const steering = require('steering');

  const Body = class {
    constructor(position, velocity) {
      this.position = position.clone();
      this.velocity = velocity.clone();
      this.distance = 0;
    }

    update(t, acc) {
      if (!acc) {
        acc = new Vector3; // no change in motion
      }

      // ∆P = vt + at^2/2
      const a = acc.clone();
      const v = this.velocity.clone();
      const d = v.multiplyScalar(t).add( a.multiplyScalar(t * t * 0.5) );

      this.velocity.add(acc.clone().multiplyScalar(t)); // ∆v = at
      this.position.add(d);

      this.distance += d.length();
    }
  };

  const Course = class {
    /*
     * target: kinematics data for target body
     * agent:  kinematics data for agent
     */
    constructor(target, agent, maxAccel, turns) {
      this.target   = target;
      this.agent    = agent;
      this.maxAccel = maxAccel;
      this.turns    = turns;
      this.accel    = this.calculateAcceleration();
    }

    calculateAcceleration() {
      const tflip = SPT * this.turns / 2;

      const dv = this.agent.velocity.clone()
        .sub(this.target.velocity.clone().multiplyScalar(2).divideScalar(tflip))
        .multiplyScalar(2)
        .divideScalar(tflip);

      return this.target.position.clone()
        .sub(this.agent.position).clone()
        .divideScalar(tflip * tflip)
        .sub(dv);
    }

    *path() {
      const flip = Math.ceil(this.turns / 2);
      const p    = this.agent.position.clone();
      const v    = this.agent.velocity.clone();
      const dt   = 100;
      const ti   = SPT / dt;
      const vax  = this.accel.clone().multiplyScalar(ti);
      const dax  = this.accel.clone().multiplyScalar(ti * ti * 0.5);

      for (let turn = 0; turn < this.turns; ++turn) {
        for (let i = 0; i < dt; ++i) {
          if (turn >= flip) {
            v.sub(vax);
          } else {
            v.add(vax);
          }

          p.add( v.clone().multiplyScalar(ti).add(dax) );
        }

        yield { p: p.clone(), v: v.clone() };
      }
    }
  };

  exports.Body   = Body;
  exports.Course = Course;
});
