define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');
  const Game = require('game');

  return class {
    constructor(opt) {
      opt = opt || {};
      this.last  = null;
      this.place = opt.place;
      this.queue = [];
    }

    save() {
      return {
        place : this.place,
        queue : this.queue
      };
    }

    load(obj) {
      this.place = obj.place;
      this.queue = obj.queue;
    }

    get here() {
      return Game.game.place(this.place);
    }

    is_over_supplied(item, place) {
      place = place || this.place;
      return Game.game.place(place).is_over_supplied(item);
    }

    is_under_supplied(item, place) {
      place = place || this.place;
      return Game.game.place(place).is_under_supplied(item);
    }

    /*
     * Randomly returns true or false, skewed toward true based on the specified
     * item's contraband index.
     */
    contra_rand(item) {
      const contraband = data.resources[item].contraband;
      return contraband > 0 && util.getRandomInt(0, 10) <= contraband;
    }

    has_pending() {
      return this.queue.length > 0;
    }

    enqueue(action, info) {
      this.queue.push([action, info]);
    }

    dequeue() {
      return this.queue.shift();
    }

    plan() {
      throw new Error('plan() must be overridden by the implementer');
    }

    turn() {
      if (!this.has_pending())
        this.plan();

      let [action, info] = this.dequeue();
      this[action].call(this, info);

      this.last = action;
    }

    // Do nothing for one turn
    wait() {}
  };
});
