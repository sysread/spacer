define(function(require, exports, module) {
  "use strict"

  const Vue  = require('vendor/vue');
  const util = require('util');

  require('component/global');
  require('component/common');


  Vue.component('Notification', {
    props: [
      'dismiss', // optional auto-dismiss in seconds
      'msg',     // string message
    ],

    mounted() {
      if (this.dismiss) {
        window.setTimeout(() => {
          $(this.$el).alert('close');
        }, this.dismiss * 1000);
      }

      $(this.$el).on('click', () => $(this.$el).alert('close'));
      $(this.$el).on('closed.bs.alert', () => this.$emit('dismiss', this.msg));
    },

    template: `
      <div class="alert alert-dark alert-dismissable fade show border-warning">
        {{msg}}
        <span class="float-right font-weight-bold text-warning">&#9432;</span>
      </div>`,
  });
});
