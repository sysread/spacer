<template>
  <div>
    <div class="stepper-row">
      <btn v-if="minmax" class="stepper-btn" @click="setMin">Min</btn>
      <btn v-if="coarseStep" class="stepper-btn" @click="decCoarse">&minus;{{coarseStep}}</btn>
      <btn class="stepper-btn" @click="dec">&minus;{{fineStep}}</btn>

      <span class="stepper-value" @click="editValue">{{displayValue}}</span>

      <btn class="stepper-btn" @click="inc">+{{fineStep}}</btn>
      <btn v-if="coarseStep" class="stepper-btn" @click="incCoarse">+{{coarseStep}}</btn>
      <btn v-if="minmax" class="stepper-btn" @click="setMax">Max</btn>
    </div>

    <div v-if="$slots.pre || $slots.post" class="row g-3 mt-1">
      <div class="col-6"><slot name="pre" /></div>
      <div class="col-6 text-end"><slot name="post" /></div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    value:    { default: 0 },
    min:      { default: 0 },
    max:      { default: 100 },
    step:     { default: null },    // fine step (compat alias for min-step)
    minStep:  { default: null },    // fine step size
    maxStep:  { default: null },    // coarse step size (optional)
    capacity: { default: null },    // auto-compute coarse step from capacity
    minmax:   { default: false },   // show Min/Max buttons
  },

  computed: {
    minValue()   { return parseFloat(`${this.min}`) },
    maxValue()   { return parseFloat(`${this.max}`) },
    fineStep()   { return parseFloat(`${this.minStep || this.step}`) || 1 },

    // Coarse step: explicit maxStep wins, otherwise derive from capacity.
    // Capacity thresholds: ≤25 → 5, ≤100 → 10, >100 → 25.
    coarseStep() {
      if (this.maxStep) return parseFloat(`${this.maxStep}`);
      if (this.capacity == null) return null;
      const cap = parseFloat(`${this.capacity}`);
      if (cap <= 25)  return 5;
      if (cap <= 100) return 10;
      return 25;
    },

    displayValue() {
      const v = parseFloat(`${this.value}`) || 0;
      return this.fineStep % 1 !== 0 ? v.toFixed(2) : v;
    },
  },

  methods: {
    inc()        { this.setValue(Math.min(this.maxValue, (this.value || 0) + this.fineStep)) },
    dec()        { this.setValue(Math.max(this.minValue, (this.value || 0) - this.fineStep)) },
    incCoarse()  { this.setValue(Math.min(this.maxValue, (this.value || 0) + this.coarseStep)) },
    decCoarse()  { this.setValue(Math.max(this.minValue, (this.value || 0) - this.coarseStep)) },
    setMin()     { this.setValue(this.minValue) },
    setMax()     { this.setValue(this.maxValue) },

    editValue() {
      const input = prompt('Enter value:', this.value);
      if (input != null) {
        const v = parseFloat(input);
        if (!isNaN(v)) {
          this.setValue(Math.max(this.minValue, Math.min(this.maxValue, v)));
        }
      }
    },

    setValue(value) {
      value = parseFloat(`${value}`);
      this.$emit('update:value', value);
      this.$emit('change', value);
    },
  },
};
</script>

<style>
.stepper-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.stepper-row .btn {
  flex: 0 0 auto;
  padding: 0.3rem 0.6rem;
  min-width: 2.5rem;
  text-align: center;
}

.stepper-value {
  flex: 1 1 auto;
  text-align: center;
  font: bold 1rem monospace;
  color: #fff;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid #444;
  min-width: 3rem;
}

.stepper-value:hover {
  border-bottom-color: rgb(200, 140, 50);
}
</style>
