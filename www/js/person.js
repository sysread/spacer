define(function(require, exports, module) {
  const data    = require('data');
  const system  = require('system');
  const Ship    = require('ship');
  const Physics = require('physics');

  return class {
    constructor(opt) {
      opt = opt || {};
      this.name     = opt.name;
      this.home     = opt.home;
      this.faction  = opt.faction;
      this.money    = opt.money || 1000;
      this.ship     = opt.ship  || new Ship({shipclass: 'shuttle'});
      this.standing = {};

      // Set default values for faction standing at neutral
      for (let faction of Object.keys(data.factions)) {
        this.standing[faction] = 0;
      }

      // Initial value player's for own faction is "Friendly" with a small amount
      // extra as a margin of forgiveness.
      this.standing[this.faction] = 15;
    }

    save() {
      return {
        name     : this.name,
        home     : this.home,
        faction  : this.faction,
        money    : this.money,
        ship     : this.ship.save(),
        standing : this.standing,
      };
    }

    load(obj) {
      this.name     = obj.name;
      this.home     = obj.home;
      this.faction  = obj.faction;
      this.money    = obj.money;
      this.standing = obj.standing || {};
      this.ship.load(obj.ship);
    }

    canCraft(item) {
      let recipe = data.resources[item].recipe.materials;
      let counts = [];

      for (let mat of Object.keys(recipe)) {
        counts.push(Math.floor(this.ship.cargo.get(mat) / recipe[mat]));
      }

      return counts.reduce((a,b) => {return Math.min(a, b)});
    }

    maxAcceleration() {
      return Physics.G * system.gravity(this.home) * data.grav_deltav_factor;
    }

    shipAcceleration() {
      return this.ship.currentAcceleration();
    }

    credit(n) {
      this.money += n;
    }

    debit(n) {
      this.money -= n;
    }

    getStanding(faction) {
      if (faction === undefined) {
        faction = this.faction;
      }

      if (!this.standing.hasOwnProperty(faction)) {
        this.standing[faction] = 0;
      }

      return this.standing[faction];
    }

    hasStanding(faction, label) {
      return this.getStanding(faction) >= this.standingCutoff(label);
    }

    standingCutoff(standing) {
      switch (standing) {
        case 'Criminal'  : return -50; break;
        case 'Untrusted' : return -20; break;
        case 'Dubious'   : return -10; break;
        case 'Neutral'   : return  -9; break;
        case 'Friendly'  : return  10; break;
        case 'Respected' : return  20; break;
        case 'Admired'   : return  50; break;
        default          : return   0;
      }
    }

    getStandingLabel(faction) {
      for (let standing of 'Admired Respected Friendly Neutral Dubious Untrusted Criminal'.split(/ /)) {
        if (this.hasStanding(faction, standing)) {
          return standing;
        }
      }
    }

    incStanding(faction, amt) {
      this.standing[faction] = Math.min(100, this.getStanding(faction) + amt);
    }

    decStanding(faction, amt) {
      this.standing[faction] = Math.max(-100, this.getStanding(faction) - amt);
    }
  };
});
