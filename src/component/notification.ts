import Vue from "vue";

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
