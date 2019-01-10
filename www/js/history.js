"use strict"

define(function(require, exports, module) {
  const data  = require('data');
  const Store = require('store');

  const History = function({length, init}) {
    init = init || {};
    this.length  = length;
    this.history = init.history;
    this.sum     = new Store(init.sum);
    this.daily   = new Store(init.daily);

    if (!this.history) {
      this.history = {};
      for (const item of Object.keys(data.resources)) {
        this.history[item] = [];
      }
    }
  };

  History.prototype.keys = function() {
    return Object.keys(data.resources);
  };

  History.prototype.inc = function(item, n) {
    this.daily.inc(item, n);
  };

  History.prototype.dec = function(item, n) {
    this.daily.inc(item, -n);
  };

  History.prototype.nth = function(item, n) {
    this.history[item][n];
  };

  History.prototype.get = function(item) {
    return this.sum.get(item);
  };

  History.prototype.count = function(item) {
    return this.sum.count(item);
  };

  History.prototype.avg = function(item) {
    if (this.history[item].length == 0) {
      return 0;
    }

    return this.sum.get(item) / this.history[item].length;
  };

  History.prototype.add = function(item, amount) {
    this.history[item].unshift(amount);
    this.sum.inc(item, amount);

    while (this.history[item].length > this.length) {
      this.sum.dec(item, this.history[item].pop());
    }
  };

  History.prototype.rollup = function() {
    for (const item of this.keys()) {
      this.add(item, this.daily.get(item));
    }

    this.daily.clear();
  };

  return History;
});
