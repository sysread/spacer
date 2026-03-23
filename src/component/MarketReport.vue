<template>
<div>
<table class="table table-sm table-noborder">
  <thead>
    <tr>
      <th>Resource</th>
      <th class="text-end">Buy</th>
      <th class="text-end">Sell</th>
      <th class="text-end d-none d-sm-table-cell">Stock</th>
    </tr>
  </thead>
  <tbody>
    <market-report-row v-for="resource in resources" :key="resource.name" :resource="resource" :planet="planet" :relprices="relprices" />
  </tbody>
</table>
</div>
</template>

<script>
import * as t from '../common';

export default {
  props: ['body', 'relprices'],
  computed: {
    planet:    function() { return this.game.planets[this.body] },
    resources: function() { return t.resources },
  },
};
</script>
