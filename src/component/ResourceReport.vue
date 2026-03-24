<template>
<modal xclose=true :title="$caps(item)" @close="$emit('close')">
<div class="button-group row justify-content-end mb-3">
  <btn class="col" @click="show_routes=false;relprices=false" :highlight="!show_routes && !relprices">Absolute Prices</btn>
  <btn class="col" @click="show_routes=false;relprices=true" :highlight="!show_routes && relprices">Relative Prices</btn>
  <btn class="col" @click="show_routes=true" :highlight="show_routes">Pending</btn>
</div>

<table class="table table-sm" v-if="!show_routes">
  <thead>
    <tr>
      <th>Market</th>
      <th class="text-end">Buy</th>
      <th class="text-end">Sell</th>
      <th class="text-end d-none d-sm-table-cell">Stock</th>
    </tr>
  </thead>
  <tbody>
    <resource-report-row v-for="body in bodies" :key="body" :item="item" :body="body" :relprices="relprices" />
  </tbody>
</table>

<table class="table table-sm" v-else>
  <thead>
    <tr>
      <th>To</th>
      <th class="text-end">Amt.</th>
      <th>In</th>
      <th class="d-none d-sm-table-cell">From</th>
      <th class="d-none d-sm-table-cell">AU</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="[from, to, shipment] of routes"
        :class="{'text-warning': shipment.warning}">
      <th scope="row">{{$caps(to)}}</th>
      <td class="text-end">{{$csn(shipment.amount)}}</td>
      <td>{{shipment.arrives}}</td>
      <td class="d-none d-sm-table-cell">{{$caps(from)}}</td>
      <td class="d-none d-sm-table-cell">{{shipment.distance}}</td>
    </tr>
  </tbody>
</table>
</modal>
</template>

<script>
import * as util from '../util';
import Physics from '../physics';

export default {
  props: ['item'],
  data() { return { relprices: true, show_routes: false } },
  computed: {
    here()   { return this.game.locus },
    bodies() { return Object.keys(this.data.bodies) },

    routes() {
      const info = this.game.trade_routes()[this.item];
      const routes = [];

      if (info) {
        for (const to of Object.keys(info).sort()) {
          for (const from of Object.keys(info[to]).sort()) {
            const distance = util.R(this.system.distance(from, to) / Physics.AU, 2);

            for (const shipment of info[to][from]) {
              const days  = util.csn(Math.floor(shipment.hours / 24));
              const hours = util.csn(Math.floor(shipment.hours % 24));

              let arrives = [];
              if (days  > 0) arrives.push(days  + 'd');
              if (hours > 0) arrives.push(hours + 'h');

              shipment.arrives  = arrives.join(', ');
              shipment.distance = distance;
              shipment.warning  = (shipment.hours / 24) < distance;

              routes.push([ from, to, shipment ]);
            }
          }
        }
      }

      return routes;
    },
  },
};
</script>
