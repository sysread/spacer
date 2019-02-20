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

        <card title="Graphics" class="my-1">
          <card-text>
            Changing these values may improve performance on slower devices.
          </card-text>

          <def term="Hide map background" info="Disables the Milky Way background in the map." split=8>
            <input type="checkbox" :checked="options.hideMapBackground" @change="update('hideMapBackground', !options.hideMapBackground)" />
          </def>

          <def term="Hide patrol radius" info="Disables the patrol radius bubbles in the map." split=8>
            <input type="checkbox" :checked="options.hidePatrolRadius" @change="update('hidePatrolRadius', !options.hidePatrolRadius)" />
          </def>

          <def term="Hide orbit paths" info="Disables the display of orbits in the map." split=8>
            <input type="checkbox" :checked="options.hideOrbitPaths" @change="update('hideOrbitPaths', !options.hideOrbitPaths)" />
          </def>
        </card>
      </card>
    `,
  });
});
