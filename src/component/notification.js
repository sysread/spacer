import Vue from 'vue';

import './global';
import './common';


Vue.component('Notification', {
  props: [
    'dismiss', // optional auto-dismiss in seconds
    'msg',     // string message
  ],

  mounted() {
    if (this.dismiss) {
      window.setTimeout(() => this.close(), this.dismiss * 1000);
    }
  },

  methods: {
    close() {
      this.$emit('dismiss', this.msg);
    },
  },

  template: `
    <div class="alert alert-dark alert-dismissable fade show border-warning" @click="close">
      {{msg}}
      <span class="float-end fw-bold text-warning">&#9432;</span>
    </div>`,
});
