import Vue from 'vue';
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
        window.jQuery(this.$el).alert('close');
      }, this.dismiss * 1000);
    }

    this.$el.addEventListener('click', () => window.jQuery(this.$el).alert('close'));
    window.jQuery(this.$el).on('closed.bs.alert', () => this.$emit('dismiss', this.msg));
  },

  template: `
    <div class="alert alert-dark alert-dismissable fade show border-warning">
      {{msg}}
      <span class="float-right font-weight-bold text-warning">&#9432;</span>
    </div>`,
});
