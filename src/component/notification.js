import Vue from 'vue';
import { Alert } from 'bootstrap';
import * as util from '../util';

import './global';
import './common';


Vue.component('Notification', {
  props: [
    'dismiss', // optional auto-dismiss in seconds
    'msg',     // string message
  ],

  mounted() {
    if (this.dismiss) {
      window.setTimeout(() => {
        Alert.getOrCreateInstance(this.$el).close();
      }, this.dismiss * 1000);
    }

    this.$el.addEventListener('click', () => Alert.getOrCreateInstance(this.$el).close());
    this.$el.addEventListener('closed.bs.alert', () => this.$emit('dismiss', this.msg));
  },

  template: `
    <div class="alert alert-dark alert-dismissable fade show border-warning">
      {{msg}}
      <span class="float-end fw-bold text-warning">&#9432;</span>
    </div>`,
});
