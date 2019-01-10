"use strict"

define(function(require, exports, module) {
  const data = require('data');

  const Store = function(init) {
    if (init && init.store) {
      this.store = init.store;
    }
    else if (init) {
      this.store = init;
    }
    else {
      this.store = {};
    }

    for (const item of Object.keys(data.resources)) {
      if (!this.store.hasOwnProperty(item)) {
        this.store[item] = 0;
      }
    }
  };

  Store.prototype.keys = function() {
    return Object.keys(data.resources);
  };

  Store.prototype.clear = function() {
    for (const item of this.keys()) {
      this.store[item] = 0;
    }
  };

  Store.prototype.set = function(item, amt) {
    this.store[item] = amt;
  };

  Store.prototype.get = function(item) {
    return this.store[item];
  };

  Store.prototype.count = function(item) {
    return Math.floor(this.store[item]);
  };

  Store.prototype.sum = function() {
    return Object.values(this.store).reduce((a, b) => a + b, 0);
  };

  Store.prototype.dec = function(item, amount=0) {
    this.store[item] = Math.max(0, this.store[item] - amount);
  };

  Store.prototype.inc = function(item, amount=0) {
    this.store[item] = this.store[item] + amount;
  };

  return Store;
});
