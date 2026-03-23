<template>
<div class="fst-italic small py-2 px-1 border-danger" style="border-top: 1px solid">
<div v-if="entry" :class="{'text-warning': isHit && !isHaymaker, 'text-danger': isHaymaker || isDestroyed}">
  <div v-if="entry.effect === 'flee'" class="text-success">
    {{who}} fled the battle!
  </div>
  <div v-else-if="entry.effect === 'chase'">
    {{who}} attempted to flee battle unsuccesfully.
  </div>
  <div v-else-if="entry.effect === 'surrender'">
    {{who}} surrendered.
  </div>
  <div v-else>
    {{who}} attacked with <b>{{entry.type}}</b>
    <span      v-if="entry.effect === 'miss'">but <b>missed</b>.</span>
    <span v-else-if="entry.effect === 'intercepted'">but point defenses <b>intercepted</b> the attack.</span>
    <span v-else-if="entry.effect === 'dodged'">but the target <b>manuevered</b> to avoid the attack.</span>
    <span v-else-if="entry.effect === 'destroyed'">and <b>destroyed</b> the target!</span>
    <span v-else-if="entry.effect === 'hit'">
      <span v-if="isHaymaker">and <b>struck directly amidships</b>, visibly staggering the vessel.</span>
      <span v-else-if="isStrongHit">and scored a <b>direct hit</b>, causing significant damage.</span>
      <span v-else-if="isGlancingBlow">and struck a <b>glancing blow</b>; damage was negligible.</span>
      <span v-else>and <b>hit</b> the target.</span>
    </span>
  </div>
</div>
</div>
</template>

<script>
export default {
  props: ['who', 'entry'],

  computed: {
    isHit()          { return this.entry.effect === 'hit'        },
    isDestroyed()    { return this.entry.effect === 'destroyed'  },
    isGlancingBlow() { return this.isHit && this.entry.pct < 1   },
    isStrongHit()    { return this.isHit && this.entry.pct >= 10 },
    isHaymaker()     { return this.isHit && this.entry.pct >= 20 },
  },
};
</script>
