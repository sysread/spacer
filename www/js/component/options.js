define(function(require, exports, module) {
  "use strict"

  const Vue = require('vendor/vue');

  require('component/global');
  require('component/common');
  require('component/card');


  Vue.component('Options', {
    data() {
      return {
        changed: false,
      };
    },

    computed: {
      options() { return this.game.options },
    },

    methods: {
      update(key, value) {
        this.options[key] = value;
        this.changed = true;
      },

      save() {
        this.game.save_game();
        this.changed = false;
      },
    },

    template: `
      <card class="my-2">
        <card-title>
          Options
          <btn @click="save" :disabled="!changed" class="float-right">Save</btn>
        </card-title>

        <def term="Hide map background">
          <input type="checkbox" :checked="options.hideMapBackground" @change="update('hideMapBackground', !options.hideMapBackground)" />
        </def>
      </card>
    `,
  });
});
