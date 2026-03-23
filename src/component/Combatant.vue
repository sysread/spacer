<template>
<div class="col-5">
<combat-stat k="Armor" :class="{'text-success': armor > 75, 'text-warning': armor <= 50 && armor > 35, 'text-danger': armor <= 35}">{{armor}}%</combat-stat>
<combat-stat k="Hull" :class="{'text-success': hull > 75, 'text-warning': hull <= 50 && hull > 35, 'text-danger': hull <= 35}">{{hull}}%</combat-stat>
</div>
</template>

<script>
import * as util from '../util';

export default {
  props: ['combatant'],

  computed: {
    hull()  {return util.R(this.combatant.pctHull  * 100, 1)},
    armor() {return util.R(this.combatant.pctArmor * 100, 1)},
  },
};
</script>
