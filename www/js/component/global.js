define(function(require, exports, module) {
  const Vue    = require('vendor/vue');
  const game   = require('game');
  const data   = require('data');
  const system = require('system');

  Vue.mixin({
    'computed': {
      game()   { return game   },
      data()   { return data   },
      system() { return system },
    },
  });
}); 
