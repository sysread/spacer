define(function(require, exports, module) {
  const data  = require('data');
  const util  = require('util');
  const Game  = require('game');
  const cache = {};

  const Resource = class {
    constructor(name) {
      this.name        = name;
      this.mass        = data.resources[name].mass;
      this.isMinable   = data.resources[name].mine !== undefined;
      this.isCraftable = data.resources[name].recipe !== undefined;
      this.mineTurns   = this.isMinable ? data.resources[name].mine.tics : null;
      this.craftTurns  = this.isCraftable ? data.resources[name].recipe.tics : null;
      this.recipe      = this.isCraftable ? data.resources[name].recipe.materials : null;
      this.value       = this.calculateBaseValue();

      if (!cache.hasOwnProperty(name))
        cache[name] = this;
    }

    static get(name) {
      if (!cache.hasOwnProperty(name))
        cache[name] = new Resource(name);
      return cache[name];
    }

    calculateBaseValue() {
      let value = 0;

      if (this.isMinable) {
        value = data.base_unit_price * this.mineTurns;
      }
      else if (this.isCraftable) {
        for (const mat of Object.keys(this.recipe)) {
          value += this.recipe[mat] * Resource.get(mat).calculateBaseValue();
        }
      }

      if (this.isCraftable) {
        value += Math.ceil(Math.log(value * this.craftTurns));
      }

      return value;
    }
  }

  return Resource;
});
