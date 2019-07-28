define(function(require, exports, module) {
  "use strict"

  const Vue     = require('vendor/vue');
  const util    = require('util');
  const Physics = require('physics');
  const t       = require('common');

  require('component/global');
  require('component/common');

  Vue.component('restitution', {
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
    computed: {
      isCapitol() {
        return game.here.isCapitol();
      },

      isSmallMarket() {
        if (this.isCapitol) return false;
        return game.here.size == 'tiny'
            || game.here.size == 'small'
      },

      isLargeMarket() {
        if (this.isCapitol) return true;
        return game.here.size == 'large'
            || game.here.size == 'huge';
      },
    },

    methods: {
      oneOf(args) {
        return util.oneOf(args);
      }
    },

    template: `

<div class="row">
  <Section title="Government center" class="col-12 col-md-6">
    <p v-if="isSmallMarket">
      The spartan offices of the local faction government are found in a small
      compound in the lower levels of the facility. The cinder block walls are
      painted a horrible shade of green. The clerk staffing the front desk has a
      put-upon look as {{ oneOf(['he', 'she']) }} eyes you.
    </p>

    <p v-else-if="isLargeMarket">
      The sprawling offices of the local government easily fill an entire block
      in the upper levels of the facility. There are dozens of self-serve kiosks
      for common tasks. Beyond them, an interminably long line of people wait for
      the attention of a small number of clerks behind armored glass.
      Occasionally, a door is opened as a clerk waves a party into the byzantine
      labrynth of cubicles beyond.
    </p>

    <p v-else>
      The local faction government maintains a moderately sized compound in a
      low traffic area of the facility. There are a half dozen self-service
      kiosks for common requests and a couple of clerks behind desks to assist
      with anything else.
    </p>
  </Section>

  <Section title="Restitution" class="col-12 col-md-6">
    <restitution />
  </Section>
</div>

    `,
  });
});
