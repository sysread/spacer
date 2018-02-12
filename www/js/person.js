define(function(require, exports, module) {
  const data    = require('data');
  const system  = require('system');
  const Ship    = require('ship');
  const Physics = require('physics');
  const model   = require('model');

  return class {
    constructor(init) {
      init = init || {};
      this.name     = init.name;
      this.ship     = new Ship(init.ship || data.initial_ship);
      this.faction  = new model.Faction(init.faction || 'MC');
      this.home     = init.home     || this.faction.capital;
      this.money    = init.money    || data.initial_money;
      this.standing = init.standing || {};

      // Set default values for faction standing at neutral
      for (const faction of Object.keys(data.factions)) {
        if (init.standing && init.standing[faction]) {
          this.standing[faction] = init.standing[faction];
        }
        else if (faction === this.faction.abbrev) {
          // Initial value player's for own faction is "Friendly" with a small
          // amount extra as a margin of forgiveness.
          this.standing[faction] = 15;
        }
        else {
          this.standing[faction] = 0;
        }
      }
    }

    get localStanding() {
      return this.getStanding(game.here.faction);
    }

    get localStandingLabel() {
      return this.getStandingLabel(game.here.faction);
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

      // model.Faction instance
      if (faction.hasOwnProperty('abbrev')) {
        faction = faction.abbrev;
      }

      if (!this.standing.hasOwnProperty(faction)) {
        if (faction === this.faction.abbrev) {
          this.standing[faction] = 15;
        }
        else {
          this.standing[faction] = 0;
        }
      }

      return this.standing[faction];
    }

    hasStanding(faction, label) {
      return this.getStanding(faction) >= this.standingCutoff(label);
    }

    standingCutoff(standing) {
      switch (standing) {
        case 'Criminal'   : return -50; break;
        case 'Untrusted'  : return -30; break;
        case 'Suspicious' : return -20; break;
        case 'Dubious'    : return -10; break;
        case 'Neutral'    : return  -9; break;
        case 'Friendly'   : return  10; break;
        case 'Respected'  : return  20; break;
        case 'Trusted'    : return  30; break;
        case 'Admired'    : return  50; break;
        default           : return   0;
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
      this.standing[faction] = Math.min(data.max_abs_standing, this.getStanding(faction) + amt);
    }

    decStanding(faction, amt) {
      this.standing[faction] = Math.max(-data.max_abs_standing, this.getStanding(faction) - amt);
    }

    getStandingPriceAdjustment(faction) {
      return this.getStanding(faction) / 1000;
    }
  };
});
