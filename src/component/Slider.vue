<template>
  <div>
    <div class="row g-3 mb-1">
      <div class="col">
        <input class="form-control"
            @input="onRangeInput"
            :value="value || 0"
            :min="min"
            :max="max"
            :step="step || 1"
            type="range" />
      </div>
    </div>

    <Stepper
      :value="value" :min="min" :max="max"
      :step="step" :min-step="minStep" :max-step="maxStep"
      :capacity="capacity" :minmax="minmax"
      @update:value="onStepperUpdate"
      @change="v => $emit('change', v)">
      <template v-if="$slots.pre" #pre><slot name="pre" /></template>
      <template v-if="$slots.post" #post><slot name="post" /></template>
    </Stepper>
  </div>
</template>

<script>
export default {
  props: {
    value:    { default: 0 },
    min:      { default: 0 },
    max:      { default: 100 },
    step:     { default: null },
    minStep:  { default: null },
    maxStep:  { default: null },
    capacity: { default: null },
    minmax:   { default: false },
  },

  methods: {
    onRangeInput(ev) {
      const value = parseFloat(ev.target.value);
      this.$emit('update:value', value);
      this.$emit('change', value);
    },

    onStepperUpdate(value) {
      this.$emit('update:value', value);
    },
  },
};
</script>
