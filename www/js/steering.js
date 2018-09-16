define(function(require, exports, module) {
  const Vector3 = require('vendor/math-ds').Vector3;
  const SPT     = require('data').hours_per_turn * 3600; // seconds per turn
  const DT      = 100;                                   // frames per turn for euler integration
  const TI      = SPT / DT;                              // seconds per frame

  const Body = class {
    constructor(position, velocity) {
      this.position = position.clone();
      this.velocity = velocity.clone();
    }

    get pos() { return this.position.clone() }
    get vel() { return this.velocity.clone() }
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

    get acc() { return this.accel.clone() }

    calculateAcceleration() {
      const tflip = SPT * this.turns / 2;

      const dvf = this.target.vel
        .multiplyScalar(2 / tflip);

      const dvi = this.agent.vel
        .sub(dvf)
        .multiplyScalar( 2 / tflip );

      return this.target.pos
        .sub(this.agent.pos)
        .divideScalar(tflip * tflip)
        .sub(dvi);
    }

    *path() {
      const flip = Math.ceil(this.turns / 2);            // flip and decel turn
      const p    = this.agent.pos;                       // initial position
      const v    = this.agent.vel;                       // initial velocity
      const vax  = this.acc.multiplyScalar(TI);          // change in velocity each TI
      const dax  = this.acc.multiplyScalar(TI * TI / 2); // change in position each TI

      for (let turn = 0; turn < this.turns; ++turn) {
        // Split turn's updates into DT increments to prevent inaccuracies
        // creeping into the final result.
        for (let i = 0; i < DT; ++i) {
          if (turn >= flip) {
            v.sub(vax); // decelerate after flip
          } else {
            v.add(vax); // accelerate before flip
          }

          // Update position
          p.add( v.clone().multiplyScalar(TI).add(dax) );
        }

        yield {
          position: p.clone(),
          velocity: v.clone(),
        };
      }
    }
  };

  exports.Body   = Body;
  exports.Course = Course;
});
