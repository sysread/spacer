/*
 * Special case: must use window.game to avoid circular reference with game.js
 */
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
      this.ship     = new Ship(init.ship || {type: data.initial_ship});
      this.faction  = new model.Faction(init.faction || 'MC');
      this.home     = init.home || this.faction.capital;
      this.money    = Math.floor(init.money) || data.initial_money;
      this.standing = {};

      // Set default values for faction standing at neutral
      for (const faction of Object.keys(data.factions)) {
        if (init.standing && init.standing[faction]) {
          this.standing[faction] = init.standing[faction];
        }
        else {
          this.standing[faction] = data.factions[this.faction.abbrev].standing[faction];
        }
      }
    }

    get localStanding() {
      return this.getStanding(window.game.here.faction);
    }

    get localStandingLabel() {
      return this.getStandingLabel(window.game.here.faction);
    }

    get homeGravity() {
      return system.gravity(this.home);
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
      return Physics.G * this.homeGravity * data.grav_deltav_factor;
    }

    shipAcceleration() {
      return this.ship.currentAcceleration();
    }

    bestAcceleration() {
      return Math.min(this.maxAcceleration(), this.shipAcceleration());
    }

    credit(n) {
      this.money += n;
    }

    debit(n) {
      this.money -= n;
    }

    getStanding(faction) {
      faction = faction || this.faction;

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

      return Math.floor(this.standing[faction]);
    }

    hasStanding(faction, label) {
      const [min, max] = this.standingRange(label);
      return this.getStanding(faction) >= min;
    }

    hasStandingOrLower(faction, label) {
      const [min, max] = this.standingRange(label);
      return this.getStanding(faction) <= max;
    }

    standingRange(standing) {
      switch (standing) {
        case 'Criminal'   : return [-100, -50]; break;
        case 'Untrusted'  : return [-49,  -30]; break;
        case 'Suspicious' : return [-29,  -20]; break;
        case 'Dubious'    : return [-19,  -10]; break;
        case 'Neutral'    : return [ -9,    9]; break;
        case 'Friendly'   : return [ 10,   19]; break;
        case 'Respected'  : return [ 20,   29]; break;
        case 'Trusted'    : return [ 30,   49]; break;
        case 'Admired'    : return [ 50,  100]; break;
        default           : throw new Error(`invalid standing label: ${standing}`);
      }
    }

    getStandingLabel(faction) {
      const value = this.getStanding(faction);

      for (const standing of 'Admired Trusted Respected Friendly Neutral Dubious Suspicious Untrusted Criminal'.split(/ /)) {
        const [min, max] = this.standingRange(standing);

        if (value >= min && value <= max) {
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

    setStanding(faction, amt) {
      this.standing[faction] = Math.min(data.max_abs_standing, Math.max(-data.max_abs_standing, amt));
    }

    getStandingPriceAdjustment(faction) {
      return this.getStanding(faction) / 1000;
    }
  };
});
