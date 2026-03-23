<template>
<tr>
<th scope="row">{{$caps(resource)}}</th>

<td class="text-end" :class="{'text-success': stock && relBuy < 0, 'text-muted': !stock}">
  <span v-if="relprices"><span v-if="relBuy > 0">+</span>{{$csn(relBuy)}}</span>
  <span v-else>{{$csn(rBuy)}}</span>
</td>

<td class="text-end" :class="{'text-success': relSell > 0}">
  <span v-if="relprices"><span v-if="relSell > 0">+</span>{{$csn(relSell)}}</span>
  <span v-else>{{$csn(rSell)}}</span>
</td>
<td class="text-end d-none d-sm-table-cell">{{stock}}</td>
</tr>
</template>

<script>
export default {
  props: ['resource', 'planet', 'relprices'],
  computed: {
    player:  function() { return this.game.player },
    local:   function() { return this.game.here },
    stock:   function() { return this.planet.economy.getStock(this.resource) },
    rBuy:    function() { return this.planet.pricing.buyPrice(this.resource, this.player) },
    rSell:   function() { return this.planet.pricing.sellPrice(this.resource) },
    lBuy:    function() { return this.local.pricing.buyPrice(this.resource, this.player) },
    lSell:   function() { return this.local.pricing.sellPrice(this.resource) },
    relBuy:  function() { return this.rBuy - this.lSell },
    relSell: function() { return this.rSell - this.lBuy },
  },
};
</script>
