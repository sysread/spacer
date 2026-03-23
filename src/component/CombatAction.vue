<template>
<card-btn @click="$emit('click')" :disabled="disabled || !action.isReady" class="btn-sm text-start" block=1>
{{$caps(action.name)}}

<template v-if="action.count">
  [{{action.count}}]
</template>

<badge v-if="action.magazine != null" right=1 class="mx-2">
  {{action.magazineRemaining}}/{{action.magazine}}
</badge>

<badge right=1 v-if="action.isReloading">
  Reloading: {{action.roundsUntilReload}}
</badge>
</card-btn>
</template>

<script>
export default {
  props: ['action', 'disabled'],
  emits: ['click'],
};
</script>
