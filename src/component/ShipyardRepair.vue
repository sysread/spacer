<template>
  <modal title="Repair your ship" :close="has_repairs ? 'Nevermind' : 'OK'" xclose=true @close="$emit('close')">
    <template v-if="has_repairs">
      <p>
        The shipyard is capable of repairing most structural damage to a ship.
        There are {{$csn(avail)}} units of metal in the market available for repairs.
        You have {{$unit($csn(money), 'c')}} available for repairs.
      </p>

      <def term="Total price"  :def="$unit($csn($R(price_total, 1)), 'c')"      />
      <def term="Hull repair"  :def="$unit($csn($R(price_hull_each, 1)), 'c')"  />
      <def term="Armor repair" :def="$unit($csn($R(price_armor_each, 1)), 'c')" />

      <def term="Hull" :def="$unit($csn($R(price_hull, 1)), 'c')" />
      <slider class="my-3" v-model:value="repair_hull"  min=0 :max="$R(max_hull, 1)"  step=1 minmax=true>
        <template #pre><span class="btn btn-dark">{{$R(need_hull - repair_hull, 1)}}</span></template>
        <template #post><span class="btn btn-dark">{{$R(repair_hull, 1)}}</span></template>
      </slider>

      <def term="Armor" :def="$unit($csn($R(price_armor, 1)), 'c')" />
      <slider class="my-3" v-model:value="repair_armor" min=0 :max="$R(max_armor, 1)" step=1 minmax=true>
        <template #pre><span class="btn btn-dark">{{$R(need_armor - repair_armor, 1)}}</span></template>
        <template #post><span class="btn btn-dark">{{$R(repair_armor, 1)}}</span></template>
      </slider>

    </template>

    <div v-else class="fst-italic text-warning">
      <p>The shipyard is currently unable to effect repairs due to a shortage of refined metal.</p>

      <p>
        <template v-if="next_availability == undefined">
          The dockyard supervisor does not know when they can expect a new shipment of metal to arrive.
        </template>

        <template v-else>
          The dockyard supervisor notes that they are expecting a load of refined metal in {{next_availability}} days.
        </template>

        If there is raw ore is available in the market, you could have some refined in the fabricators.
      </p>
    </div>

    <template #footer v-if="has_repairs"><btn @click="repair" close=1>Repair ship</btn></template>
  </modal>
</template>

<script>
export default {
  data() {
    return {
      repair_hull: 0,
      repair_armor: 0,
    };
  },

  computed: {
    avail()            { return this.game.here.economy.getStock('metal') },
    money()            { return this.game.player.money },
    need_hull()        { return Math.ceil(this.game.player.ship.damage.hull) },
    need_armor()       { return Math.ceil(this.game.player.ship.damage.armor) },
    has_repairs()      { return this.game.here.repair.hasRepairs() },
    price_hull_each()  { return this.game.here.repair.hullRepairPrice(this.game.player) },
    price_armor_each() { return this.game.here.repair.armorRepairPrice(this.game.player) },
    price_hull()       { return this.price_hull_each * this.repair_hull },
    price_armor()      { return this.price_armor_each * this.repair_armor },
    price_total()      { return this.price_hull + this.price_armor },

    max_hull() {
      return Math.min(
        (this.money - this.price_armor) / this.price_hull_each,
        this.need_hull,
        this.has_repairs - this.repair_armor,
      );
    },

    max_armor() {
      return Math.min(
        (this.money - this.price_hull) / this.price_armor_each,
        this.need_armor,
        this.has_repairs - this.repair_hull,
      );
    },

    next_availability() {
      const turns = this.game.here.repair.estimateAvailability('metal');
      if (turns != undefined) {
        return Math.ceil(turns / this.data.turns_per_day);
      }
    },
  },

  methods: {
    repair() {
      if (this.price_total) {
        const count = this.repair_hull + this.repair_armor;
        this.game.here.commerce.buy('metal', count);
        this.game.player.debit(this.price_total);
        this.game.player.ship.repairDamage(this.repair_hull, this.repair_armor);
        this.game.turn();
      }
    },
  },
};
</script>
