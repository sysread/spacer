<template>
<card>
<div class="input-group input-group-sm my-1">
<div class="btn-group">
  <btn :disabled="show == 'items'" @click="show='items'">Resources</btn>
  <btn :disabled="show == 'bodies'" @click="show='bodies'">Markets</btn>
</div>

<select v-if="show == 'bodies'" v-model="body" class="form-control">
  <option value="">Market</option>
  <option v-for="body in bodies" :key="body" :value="body">{{$caps(body)}}</option>
</select>

<select v-if="show == 'items'" v-model="item" class="form-control">
  <option value="">Resource</option>
  <option v-for="item in resources" :key="item" :value="item">
    {{$caps(item)}}
    [ {{itemValue(item)}} c ]
  </option>
</select>

<span v-if="show == 'items'">
  Min: {{ minPrice }}
  <br />
  Max: {{ maxPrice }}
</span>
<span v-else>
  Fab health: {{ fabHealth() }}%
</span>
</div>

<div class="input-group input-group-sm my-1">
<div class="btn-group">
  <span class="input-group-text">Turns</span>
  <btn @click="gameTurns(1)">1</btn>
  <btn @click="gameTurns(3)">3</btn>
  <btn @click="gameTurns(9)">9</btn>
  <btn @click="gameTurns(30)">30</btn>
  <btn @click="gameTurns(90)">90</btn>
</div>

<div class="btn-group mx-3">
  <span class="input-group-text">Speed</span>
  <btn :disabled="slow" @click="slow=true">Slow</btn>
  <btn :disabled="!slow" @click="slow=false">Fast</btn>
</div>

<div class="btn-group">
  <span class="input-group-text">Misc</span>
  <btn @click="fixMe">Fix me</btn>
  <btn @click="show='pirate'">Pirate</btn>
</div>
</div>

<table v-if="show == 'items' && item" class="table table-sm mini">
<thead>
  <tr>
    <th>Loc</th>
    <th class="text-end">Price</th>
    <th class="text-end">Stock</th>
    <th class="text-end">Demand</th>
    <th class="text-end">Supply</th>
    <th class="text-end">Need</th>
    <th class="text-end">Net</th>
    <th class="text-end">Avg</th>
  </tr>
</thead>
<tbody>
  <template v-for="place in places">
  <tr :class="{'text-info': placeIsNetExporter(place, item)}">
    <td>{{$caps(place.name)}}</td>
    <td class="text-end">{{$csn(placePrice(place, item))}}</td>
    <td class="text-end">{{placeGetStock(place, item)}}</td>
    <td class="text-end">{{$R(placeGetDemand(place, item), 2)}}</td>
    <td class="text-end">{{$R(placeGetSupply(place, item), 2)}}</td>
    <td class="text-end" :class="{'text-success': placeHasSurplus(place, item), 'text-danger': placeHasShortage(place, item)}">{{$R(placeGetNeed(place, item), 2)}}</td>
    <td class="text-end">{{$R(placeNetProduction(place, item), 2)}}</td>
    <td class="text-end">{{$R(placeAvgProduction(place, item), 2)}}</td>
  </tr>
  </template>
</tbody>
</table>

<table v-else-if="show == 'bodies' && body" class="table table-sm mini">
<thead>
  <tr>
    <th>Item</th>
    <th class="text-end">Price</th>
    <th class="text-end">Stock</th>
    <th class="text-end">Demand</th>
    <th class="text-end">Supply</th>
    <th class="text-end">Need</th>
    <th class="text-end">Net</th>
    <th class="text-end">Avg</th>
  </tr>
</thead>
<tbody>
  <template v-for="item in resources">
  <tr :class="{'text-info': placeIsNetExporter(place, item)}">
    <td>{{$caps(item)}}</td>
    <td class="text-end">{{$csn(placePrice(place, item))}}</td>
    <td class="text-end">{{placeGetStock(place, item)}}</td>
    <td class="text-end">{{$R(placeGetDemand(place, item), 2)}}</td>
    <td class="text-end">{{$R(placeGetSupply(place, item), 2)}}</td>
    <td class="text-end" :class="{'text-success': placeHasSurplus(place, item), 'text-danger': placeHasShortage(place, item)}">{{$R(placeGetNeed(place, item), 2)}}</td>
    <td class="text-end">{{$R(placeNetProduction(place, item), 2)}}</td>
    <td class="text-end">{{$R(placeAvgProduction(place, item), 2)}}</td>
  </tr>
  </template>
</tbody>
</table>

<PirateEncounter v-if="show == 'pirate'" @complete="show='bodies'" :nearest="body ? data.bodies[body].faction : 'TRANSA'" />

</card>
</template>

<script>
import * as util from '../util';
import { resources } from '../resource';
import Physics from '../physics';
import system from '../system';

window.Physics = Physics;
window.System = system;

export default {
  data() {
    return {
      show: 'bodies',
      body: window.game.locus,
      item: 'water',
      slow: false,
    };
  },

  computed: {
    turns:     function() { return this.game.turns },
    resources: function() { return Object.keys(this.data.resources) },
    bodies:    function() { return Object.keys(this.game.planets) },
    places:    function() { return Object.values(this.game.planets) },
    resource:  function() { return resources[this.item] },

    value: function() {
      if (this.resource) return Math.floor(this.resource.value);
      return 0;
    },

    minPrice() {
      if (this.resource) return Math.floor(this.resource.minPrice);
      return 0;
    },

    maxPrice() {
      if (this.resource) return Math.floor(this.resource.maxPrice);
      return 0;
    },

    place() {
      if (this.body)
        return window.game.planets[this.body];
    },
  },

  methods: {
    itemValue(item) {
      return Math.floor(resources[item].value);
    },

    fabHealth() {
      const place = this.place;
      if (place) {
        return util.R((place.fab_health / place.max_fab_health) * 100);
      }
      else {
        return 0;
      }
    },

    gameTurns(turns) {
      let left = turns;
      let intvl;

      intvl = window.setInterval(() => {
        if (left > 0) {
          if (this.slow) {
            --left;
            this.game.turn(1, true);
          }
          else {
            const batch = Math.min(3, left);
            left -= batch;
            this.game.turn(batch, true);
          }
        }
        else {
          window.clearInterval(intvl);
          intvl = null;
          console.log(turns, 'turns complete');
          this.game.save_game();
        }

        this.$forceUpdate();
      }, this.slow ? 500 : 200);
    },

    fixMe() {
      this.game.player.ship.damage.hull = this.game.player.ship.damage.armor = 0;
      this.game.player.ship.fuel = this.game.player.ship.tank;
      this.game.save_game();
    },

    // Economy method helpers for use in templates
    placeGetStock(place, item)      { return place.economy.getStock(item) },
    placeGetDemand(place, item)     { return place.economy.getDemand(item) },
    placeGetSupply(place, item)     { return place.economy.getSupply(item) },
    placeGetNeed(place, item)       { return place.economy.getNeed(item) },
    placeNetProduction(place, item) { return place.economy.netProduction(item) },
    placeAvgProduction(place, item) { return place.economy.avgProduction(item) },
    placeIsNetExporter(place, item) { return place.economy.isNetExporter(item) },
    placeHasShortage(place, item)   { return place.economy.hasShortage(item) },
    placeHasSurplus(place, item)    { return place.economy.hasSurplus(item) },
    placePrice(place, item)         { return place.pricing.price(item) },
  },
};
</script>
