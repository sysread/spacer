<template>
  <div>
    <def brkpt="sm" term="Cargo"><template #def><span>{{cargoUsed}} / {{cargoSpace}}</span></template></def>
    <template v-for="item in items" :key="item"><div v-if="count(item) > 0" class="my-3">
      <h4 class="text-capitalize">{{item}}</h4>
      <slider @update:value="amt => update(item, amt)" minmax=true :value="cargo.count(item)" min=0 :max="count(item)" step=1>
        <template #pre><span class="float-start mx-2"><btn class="fw-bold btn">{{store.count(item)}}</btn></span></template>
        <template #post><span class="float-end mx-2"><btn class="fw-bold btn">{{cargo.count(item)}}</btn></span></template>
      </slider>
    </div></template>
  </div>
</template>

<script>
import * as t from '../common';

export default {
  props: ['store'],

  data() {
    const cargo = window.game.player.ship.cargo;

    // build pre-populated object because Vue cannot see new keys added
    const obj = {};
    for (const res of t.resources)
      obj[res] = 0;

    for (const item of cargo.keys()) {
      obj[item] += cargo.count(item);
    }

    for (const item of this.store.keys()) {
      obj[item] += this.store.count(item);
    }

    return {
      cargo: cargo,
      resources: obj,
    };
  },

  computed: {
    cargoSpace() { return this.game.player.ship.cargoSpace },
    cargoUsed()  { return this.game.player.ship.cargoUsed  },
    cargoLeft()  { return this.game.player.ship.cargoLeft  },
    items()      { return Object.keys(this.resources)      },
  },

  methods: {
    update(item, amt) {
      const change = amt - this.cargo.count(item);

      if (change > this.cargoLeft) {
        amt = this.cargo.count(item) + this.cargoLeft;
      }

      this.store.set(item, this.resources[item] - amt);
      this.cargo.set(item, amt);
    },

    count(item) {
      return Math.floor(this.resources[item]);
    },
  },
};
</script>
