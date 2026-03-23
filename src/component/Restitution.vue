<template>
<div>
<template v-if="restitutionFee > 0">
  <p>
    As a result of your previous interactions with {{faction.properName}}, your
    standing is currently <span class="text-warning">{{standingLabel}}</span>.
  </p>

  <p>
    If you make restitution to the local party leadership in the form of a
    {{$unit($csn(restitutionFee), 'credit')}} donation, your record will be
    annotated and your reputation cleared.
  </p>

  <btn block=1 @click="getConfirmation" v-if="canAffordRestitution">
    Make restitution
  </btn>

  <span v-else class="fst-italic text-warning">
    You cannot afford to make restitution at this time.
  </span>
</template>

<template v-else>
  <p>
    Your standing with {{faction.properName}} is <span class="text-success">{{standingLabel}}</span>.
    No restitution need be made at this time.
  </p>
</template>

<confirm v-if="state=='confirm'" @confirm="confirmTransaction">
  You are about to "donate" {{$unit($csn(restitutionFee), 'credit')}} to {{faction.properName}}
  to "make ammends". This transaction cannot be undone. Are you sure you wish to continue?
</confirm>
</div>
</template>

<script>
export default {
  data() {
    return {
      state: 'ready',
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
    getConfirmation() {
      this.state = 'confirm';
    },

    confirmTransaction(confirmed) {
      if (confirmed) {
        this.makeRestitution();
      }

      this.state = 'ready';
    },

    makeRestitution() {
      this.faction.makeRestitution(game.player);
      game.save_game();
    }
  },
};
</script>
