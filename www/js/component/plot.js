define(function(require, exports, module) {
  const Vue  = require('vendor/vue');
  const data = require('data');
  const util = require('util');

  require('component/card');
  require('component/map');

  Vue.component('plotview', {
    data: function() {
      return {
      };
    },
    methods: {
      returnToNav: function() { game.open('nav') },
    },
    template: `
<card>
  <btn slot="header" @click="returnToNav">Return to navigation</btn>
  <plot controls=1 />
</card>
    `,
  });
});
