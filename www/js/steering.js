define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const System  = require('system');
  const Physics = require('physics');
  const Vector3 = require('vendor/math-ds').Vector3;
  const SPT     = data.hours_per_turn * 3600;
  const km      = 1000;

  const Body = class {
    constructor(position, velocity) {
      this.position = position.clone();
      this.velocity = velocity.clone();
      this.distance = 0;
    }

    update(time, acceleration) {
      if (!acceleration) {
        acceleration = new Vector3;
      }

      // ∆P = vt + at^2/2
      const d = this.velocity.clone().multiplyScalar(time).add(
        acceleration.clone().multiplyScalar(time * time / 2)
      );

      this.distance += d.length();
      this.position.add(d);

      // ∆v = at
      this.velocity.add(acceleration.clone().multiplyScalar(time));
    }
  };

  const Steering = class {
    /*
     * target: kinematics data for target body
     * agent:  kinematics data for agent
     */
    constructor(target, agent, maxAccel) {
      this.target      = target;
      this.agent       = agent;
      this.maxAccel    = maxAccel;
      this.outerRadius = this.target.position.distanceTo(this.agent.position) / 2;
      this.innerRadius = this.target.velocity.length() * SPT / 2;
      this.maxVelocity = Math.sqrt(2 * this.maxAccel * this.outerRadius) * 0.7; // safety margin to prevent overshooting target
    }

    getAcceleration(timeToTarget) {
      const desiredVelocity = this.target.position.clone().sub(this.agent.position);
      const distance = desiredVelocity.length();

      if (distance <= this.innerRadius) {
        return null;
      }

      desiredVelocity.add(this.target.velocity);

      if (distance <= this.outerRadius) {
        desiredVelocity.normalize().multiplyScalar(this.maxVelocity * distance / this.outerRadius);
      } else {
        desiredVelocity.normalize().multiplyScalar(this.maxVelocity);
      }

      desiredVelocity.sub(this.agent.velocity);

      if (desiredVelocity.length() > this.maxAccel) {
        desiredVelocity.normalize().multiplyScalar(this.maxAccel);
      }

      return desiredVelocity;
    }
  };

  exports.Body = Body;
  exports.Steering = Steering;
});
