<template>
  <div>
    <div class="row g-3">
      <div class="col">
        <input class="form-control"
            ref="slider"
            @change="update"
            :value="value || 0"
            :min="min"
            :max="max"
            :step="stepValue || 1"
            type="range" />
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-6">
        <slot name="pre" />
        <span @click="setMin" v-if="minmax" class="float-start"><btn class="fw-bold btn">Min</btn></span>
        <span @click="dec" class="float-start mx-2"><btn class="fw-bold btn">-1</btn></span>
      </div>

      <div class="col-6">
        <slot name="post" />
        <span @click="setMax" v-if="minmax" class="float-end"><btn class="fw-bold btn">Max</btn></span>
        <span @click="inc" class="float-end mx-2"><btn class="fw-bold btn">+1</btn></span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['value', 'min', 'max', 'step', 'minmax'],

  data() {
    return {
      timer: null,
      monitor: null,
    };
  },

  /* Uses an interval timer to track the value of the input, as @changed is
   * only emitted after the user releases the slider. */
  mounted() {
    this.monitor = window.setInterval(() => {
      if (this.$refs.slider.value != this.value) {
        this.setValue(this.$refs.slider.value);
        this.$refs.slider.value = this.value;
      }
    }, 100);
  },

  beforeUnmount() {
    window.clearTimeout(this.monitor);
  },

  computed: {
    minValue()  { return parseFloat(`${this.min}`)  },
    maxValue()  { return parseFloat(`${this.max}`)  },
    stepValue() { return parseFloat(`${this.step}`) || 1 },
  },

  methods: {
    inc()      { this.setValue(Math.min(this.maxValue, this.value + this.stepValue)) },
    dec()      { this.setValue(Math.max(this.minValue, this.value - this.stepValue)) },
    setMin()   { this.setValue(this.minValue) },
    setMax()   { this.setValue(this.maxValue) },
    update(ev) { this.setValue(ev.target.value) },

    setValue(value) {
      value = parseFloat(`${value}`);
      this.$emit('update:value', value);
      this.$emit('change', value);
    },
  },
};
</script>
