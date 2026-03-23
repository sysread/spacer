<template>
  <div class="d-inline px-2">
    <a href="#" class="info" @click="click">i</a>
    <ok v-if="shown" @ok="reset" :title="title"><slot /></ok>
  </div>
</template>

<script>
export default {
  props: ['title'],

  data() {
    return { shown: false };
  },

  methods: {
    click(e) {
      e.preventDefault();
      e.stopPropagation();
      this.shown = true;
      return false;
    },

    reset() {
      this.shown = false;
    },
  },
};
</script>
