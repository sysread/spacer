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

  const Steering = class {
    /*
     * target: kinematics data for target body
     * agent:  kinematics data for agent
     */
    constructor(target, agent, maxAccel, timeToTarget) {
      this.target       = target;
      this.agent        = agent;
      this.maxAccel     = maxAccel;
      this.timeToTarget = timeToTarget;
      this.distance     = this.target.position.distanceTo(this.agent.position);
      this.outerRadius  = this.distance / 2;
      this.innerRadius  = this.target.velocity.length() * SPT;
      this.maxVelocity  = this.calculateMaxVelocity();
    }

    calculateMaxVelocity() {
      const s = this.outerRadius;
      const a = this.maxAccel;
      const t = this.timeToTarget / 2;
      const u = Math.abs((s / t) - (a * t * 0.5));
      return u;
    }

    getPath(turns) {
      const target = this.target.clone();
      const agent  = this.agent.clone();
      const vf     = target.velocity.x;
      const a      = this.maxAccel;
      const t      = SPT;
      const t2     = SPT * SPT;
      const tflip  = turns / 2;
      const flip   = this.distance / 2;

      let p = agent.position.x;
      let v = agent.velocity.x;

      const path = [];
      path.push({p: p, v: v, s: 0});

      // x = x0 + (v0 * t) + (0.5 * a * t * t);
      for (let turn = 0; turn < tflip; ++turn) {
        const s = (v * t) + (0.5 * a * t2);
        v = Math.sqrt((v * v) + (2 * a * s));
        p += s;
        path.push({p: p, v: v, s: 0});
      }

      console.log(path);
    }

    getAcceleration(timeToTarget) {
      const velocity = this.target.position.clone().sub(this.agent.position);
      const distance = velocity.length();

      if (distance <= this.innerRadius) {
        return null;
      }

      velocity.divideScalar(timeToTarget);

      if (distance < this.outerRadius) {
        velocity.setLength(this.maxVelocity * distance / this.outerRadius);
      } else {
        velocity.setLength(this.maxVelocity);
      }

      velocity.sub(this.agent.velocity);

      if (velocity.length() > this.maxAccel) {
        velocity.setLength(this.maxAccel);
      }

      return velocity;
    }
  };

  exports.Body = Body;
  exports.Steering = Steering;
});
