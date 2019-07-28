define(function(require, exports, module) {
  "use strict"

  const Vue     = require('vendor/vue');
  const util    = require('util');
  const Physics = require('physics');
  const t       = require('common');

  require('component/global');
  require('component/common');

  Vue.component('restitution', {
    props: [],

    data() {
      return {
      };
    },

    computed: {
      faction() {
        return game.here.faction;
      },

      standingLabel() {
        return game.player.getStandingLabel(this.faction);
      },

      restitutionFee() {
        return game.here.faction.restitutionFee(game.player);
      },

      canAffordRestitution() {
        return this.restitutionFee <= game.player.money;
      },
    },

    methods: {
      makeRestitution() {
        this.faction.makeRestitution(game.player);
        game.save_game();
      }
    },

    template: `
<div>
  <template v-if="restitutionFee > 0">
    <p>
      As a result of your previous interactions with {{faction.properName}}, your
      standing is currently <span class="text-warning">{{standingLabel}}</span>.
    </p>

    <p>
      If you make restitution to the local party leadership in the form of a
      {{restitutionFee|csn|unit('credit')}} donation, your record will be
      annotated and your reputation cleared.
    </p>

    <btn block=1 @click="makeRestitution" v-if="canAffordRestitution">Make restitution</btn>
    <span v-else class="font-italic text-warning">You cannot afford to make restitution at this time.</span>
  </template>

  <template v-else>
    <p>
      Your standing with {{faction.properName}} is <span class="text-success">{{standingLabel}}</span>.
      No restitution need be made at this time.
    </p>
  </template>
</div>
    `,
  });

  Vue.component('government', {
    props: [],

    data() {
      return {
      };
    },

    computed: {
    },

    methods: {
    },

    template: `
<div class="row">
  <Section title="Government center" class="col-12 col-md-6">
    Future description
  </Section>

  <Section title="Restitution" class="col-12 col-md-6">
    <restitution />
  </Section>
</div>
    `,
  });
});
