define(function(require, exports, module) {
  "use strict"

  const Vue    = require('vendor/vue');
  const game   = require('game');
  const data   = require('data');
  const system = require('system');

  Vue.mixin({
    data() {
      return {
        game: game,
      };
    },

    computed: {
      inDev()  { return window.DEV },
      data()   { return data   },
      system() { return system },
    },
  });
}); 
