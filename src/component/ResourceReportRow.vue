<template>
<tr :class="{'bg-dark': isHere}">
<th scope="row">
  {{$caps(body)}}
  <badge v-if="central != 'sun'" right=1 class="ms-1">{{$caps(central)}}</badge>
</th>
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
  props: ['item', 'body', 'relprices'],
  computed: {
    player:  function() { return this.game.player },
    isHere:  function() { return this.body === this.game.locus },
    remote:  function() { return this.game.planets[this.body] },
    local:   function() { return this.game.here },
    stock:   function() { return this.remote.economy.getStock(this.item) },
    rBuy:    function() { return this.remote.pricing.buyPrice(this.item, this.player) },
    rSell:   function() { return this.remote.pricing.sellPrice(this.item) },
    lBuy:    function() { return this.local.pricing.buyPrice(this.item, this.player) },
    lSell:   function() { return this.local.pricing.sellPrice(this.item) },
    relBuy:  function() { return this.rBuy - this.lSell },
    relSell: function() { return this.rSell - this.lBuy },
    central: function() { return this.system.central(this.body) },
  },
};
</script>
