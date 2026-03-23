<template>
  <row :y="y">
    <cell :brkpt="brkpt" :size="termSize" :y="y" class="fw-bold" :class="{'text-capitalize': caps}">
      {{term}}
      <slot name="term" />
      <info v-if="info || show_info" :title="term">
        {{info}}
        <slot name="info" />
      </info>
    </cell>

    <cell :brkpt="brkpt" :size="defnSize" :y="y" class="text-muted" :class="{'text-capitalize': caps}">
      {{def}}
      <slot name="def" />
      <slot />
    </cell>
  </row>
</template>

<script>
export default {
  props: ['term', 'def', 'caps', 'split', 'y', 'brkpt', 'info', 'show_info'],
  computed: {
    termSize() { return this.split || 4 },
    defnSize() { return 12 - this.termSize },
  },
};
</script>
