<template>
<div class="m-0 p-3" style="overflow-y: scroll; overflow-x: hidden; height: 250px;">
<div v-for="actions in log" :key="actions.round" class="row">
  <div class="col-5">
    <transition name="fade">
      <combat-log-entry v-show="actions.player" who="You" :entry="actions.player" />
    </transition>
  </div>

  <div class="col-2 text-center p-0">{{actions.round}}</div>

  <div class="col-5">
    <transition name="fade">
      <combat-log-entry v-show="actions.opponent" who="The enemy" :entry="actions.opponent" class="text-end" />
    </transition>
  </div>
</div>
</div>
</template>

<script>
export default {
  props: ['log', 'tick'],
};
</script>
