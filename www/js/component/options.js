define(function(require, exports, module) {
  "use strict"

  const Vue = require('vue');

  require('component/global');
  require('component/common');


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
        this.back();
      },

      back() {
        this.$emit('open', 'status');
      },
    },

    template: `
      <Section title="Options">
        <div class="my-2">
          <btn @click="back">Back</btn>
          <btn @click="save" :disabled="!changed" class="mx-2">Save</btn>
        </div>

        <div>
          <def term="Hide map background" info="Disables the Milky Way background in the map." split=8>
            <input type="checkbox" :checked="options.hideMapBackground" @change="update('hideMapBackground', !options.hideMapBackground)" />
          </def>

          <def term="Hide patrol radius" info="Disables the patrol radius bubbles in the map." split=8>
            <input type="checkbox" :checked="options.hidePatrolRadius" @change="update('hidePatrolRadius', !options.hidePatrolRadius)" />
          </def>

          <def term="Hide orbit paths" info="Disables the display of orbits in the map." split=8>
            <input type="checkbox" :checked="options.hideOrbitPaths" @change="update('hideOrbitPaths', !options.hideOrbitPaths)" />
          </def>
        </div>
      </Section>
    `,
  });
});
