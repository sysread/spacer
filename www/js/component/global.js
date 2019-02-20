define(function(require, exports, module) {
  "use strict"

  const game   = require('game');
  const data   = require('data');
  const system = require('system');

  const Vue = require('vendor/vue');
  const AsyncComputed = require('vendor/vue-async-computed');
  Vue.use(AsyncComputed);

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
