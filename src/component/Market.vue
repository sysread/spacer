<template>
<Section :title="title">
<template #title-pre><span v-if="trade" class="d-none d-sm-inline">Exchange of</span></template>

<p v-show="!trade">
  There are endless warehouses along the docks. As you approach the resource
  exchange, you are approached by several warehouse managers and sales people
  eager to do business with you. Moving here and there among the throng you
  notice the occasional security agent or inspector watching for evidence of
  contraband.
</p>

<market-trade v-if="trade" v-model:item="trade" />

<div class="container-fluid" v-else>
  <row v-for="item of resources" :key="item" class="p-1 rounded" :style="{'background-color': hold(item) > 0 ? '#400A0A' : '#000000'}">
    <cell size=4 brkpt="sm" y=0 class="px-0 my-1">
      <btn @click="trade=item" block=1 :class="{'btn-secondary': dock(item) == 0 && hold(item) == 0, 'text-warning': is_contraband(item)}">
        {{$caps(item)}}
      </btn>
    </cell>
    <cell size=8 brkpt="sm" y=0>
      <table class="table table-sm table-mini table-noborder"><tbody>
        <tr>
          <th scope="col" class="w-25">Buy</th><td class="w-25">{{$csn(buy(item))}} c</td>
          <th scope="col" class="w-25">Sell</th><td class="w-25">{{$csn(sell(item))}} c</td>
        </tr>
        <tr>
          <th scope="col" class="w-25">Dock</th><td class="w-25" :class="{'text-warning': dock(item) > 0}">{{dock(item)}}</td>
          <th scope="col" class="w-25">Ship</th><td class="w-25" :class="{'text-warning': hold(item) > 0}">{{hold(item)}}</td>
        </tr>
      </tbody></table>
    </cell>
  </row>
</div>
</Section>
</template>

<script>
import * as util from '../util';

export default {
  data: function() {
    return {
      trade: null,
    };
  },
  computed: {
    planet()    { return this.game.here },
    player()    { return this.game.player },
    resources() { return Object.keys(this.data.resources) },
    title()     { return util.ucfirst(this.trade || 'Commerce') },
  },
  methods: {
    dock(item)          { return this.planet.economy.getStock(item) },
    hold(item)          { return this.player.ship.cargo.count(item) },
    buy(item)           { return this.planet.pricing.buyPrice(item, this.player) },
    sell(item)          { return this.planet.pricing.sellPrice(item) },
    is_contraband(item) { return this.data.resources[item].contraband },
  },
};
</script>
