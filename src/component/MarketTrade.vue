<template>
<div>
<p v-if="contraband" class="text-warning fst-italic">
  Trade in contraband goods may result in fines and loss of standing.
</p>

<resource-report v-if="report" :item="item" @close="report=false" class="p-3" />

<table class="table table-sm table-mini table-noborder"><tbody>
  <tr>
    <th scope="col" class="w-25">Total</th>
    <td class="w-25" :class="{'text-success': count < 0, 'text-warning': count > 0}">{{$csn($R($abs(credits)))}} c</td>

    <th scope="col" class="w-25">Count</th>
    <td class="w-25" :class="{'text-success': count < 0, 'text-warning': count > 0}">{{$csn($abs(count))}} cu</td>
  </tr>

  <tr>
    <th scope="col" class="w-25">Sell</th>
    <td class="w-25">{{$csn(sell)}} c</td>

    <th scope="col" class="w-25">Ship</th>
    <td class="w-25">{{$csn(hold)}}</td>
  </tr>

  <tr>
    <th scope="col" class="w-25">Buy</th>
    <td class="w-25">{{$csn(buy)}} c</td>

    <th scope="col" class="w-25">Dock</th>
    <td class="w-25">{{$csn(dock)}}</td>
  </tr>

  <tr>
    <th scope="col" class="w-25">Mass</th>
    <td class="w-25">{{$csn(mass)}} tonnes</td>

    <th scope="col" class="w-25">Acceleration</th>
    <td class="w-25">{{ $R(deltav, 3) }} G</td>
  </tr>

  <tr>
    <td colspan=4 class="py-3">
      <stepper minmax=true v-model:value="tx_hold" min=0 :max="max" step=1 :capacity="player.ship.cargoSpace" @update:value="updateState" />
    </td>
  </tr>

  <tr>
    <td colspan=4>
      <btn block=1 @click="complete" highlight=1 :disabled="count == 0">Confirm exchange</btn>
      <btn block=1 @click="report=true" class="my-2">Market report</btn>
      <btn block=1 @click="close_trade" class="my-2">Back</btn>
    </td>
  </tr>
</tbody></table>

<ok v-if="standing" @ok="close_trade">
  You ended the local supply shortage of {{item}}!
  Your standing with the local faction has increased.
</ok>
</div>
</template>

<script>
import Physics from '../physics';

export default {
  props: ['item'],
  data: function() {
    return {
      report:     false,
      caught:     false,
      tx_dock:    null,
      tx_hold:    null,
      tx_credits: null,
      tx_cargo:   null,
      standing:   false,
    };
  },
  computed: {
    planet:     function() { return this.game.here },
    player:     function() { return this.game.player },
    faction:    function() { return this.planet.faction },
    buy:        function() { return this.planet.pricing.buyPrice(this.item, this.player) },
    sell:       function() { return this.planet.pricing.sellPrice(this.item, this.player) },
    count:      function() { return this.hold - this.player.ship.cargo.get(this.item) },
    contraband: function() { return this.data.resources[this.item].contraband },

    dock: {
      get() {
        if (this.tx_dock === null) this.tx_dock = this.game.here.economy.getStock(this.item);
        return this.tx_dock;
      },

      set(new_value) {
        this.tx_dock = new_value;
      }
    },

    hold: {
      get() {
        if (this.tx_hold === null) this.tx_hold = this.game.player.ship.cargo.get(this.item);
        return this.tx_hold;
      },

      set(new_value) {
        this.tx_hold = new_value;
      }
    },

    credits: {
      get() {
        this.tx_credits = this.tx_credits || 0;
        return this.tx_credits;
      },

      set(new_value) {
        this.tx_credits = new_value;
      }
    },

    mass() {
      return this.count * this.data.resources[this.item].mass;
    },

    deltav() {
      return this.player.ship.currentAcceleration(this.mass) / Physics.G;
    },

    cargo: {
      get() {
        if (this.tx_cargo === null) this.tx_cargo = this.game.player.ship.cargoUsed;
        return this.tx_cargo;
      },

      set(new_value) {
        this.tx_cargo = new_value;
      }
    },

    max: function() {
      const cred  = this.player.money;
      const hold  = this.player.ship.cargo.count(this.item);
      const dock  = this.planet.economy.getStock(this.item);
      const cargo = this.player.ship.cargoLeft;
      return hold + Math.min(dock, Math.floor(cred / this.buy), cargo);
    },

  },
  methods: {
    agentGender: function() {
      return util.oneOf(['man', 'woman']);
    },

    updateState: function() {
      const cred   = this.player.money;
      const hold   = this.player.ship.cargo.get(this.item);
      const dock   = this.planet.economy.getStock(this.item);
      const diff   = this.hold - hold;
      this.dock    = dock - diff;
      this.credits = 0 - (diff * (diff > 0 ? this.buy : this.sell));
      this.cargo   = this.player.ship.cargoUsed + diff;
    },

    complete: function() {
      let bought, price, standing;

      if (this.count > 0) {
        [bought, price] = this.game.here.commerce.buy(this.item, this.count, this.player);
      }
      else {
        [bought, price, standing] = this.game.here.commerce.sell(this.item, -this.count, this.player);
        this.standing = standing >= 3;
      }

      this.close_trade();
      this.game.save_game();
    },

    close_trade: function() {
      this.standing = false;
      this.$emit('update:item', null);
    },
  },
};
</script>
