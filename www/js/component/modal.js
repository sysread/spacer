define(function(require, exports, module) {
  const Vue = require('vendor/vue');

  Vue.component('modal', {
    props: ['title', 'close', 'xclose'],
    directives: {
      'modal': {
        inserted: function(el, binding, vnode) {
          $(el).modal('show');
          $(el).on('hidden.bs.modal', (e) => {
            vnode.context.$emit('close');
          });
        }
      }
    },
    template: `
<div v-modal class="modal" tabindex="-1" :data-backdrop="(xclose || close) ? true : 'static'">
  <div class="modal-dialog">
    <div class="modal-content">
      <div v-if="title || xclose" class="modal-header">
        <h5 v-if="title" class="modal-title">{{title}}</h5>
        <slot name="header" />
        <button v-if="xclose" type="button" class="close text-light" data-dismiss="modal">&times;</button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
      <div class="modal-footer">
        <slot name="footer" />
        <button v-if="close" type="button" class="btn btn-secondary" data-dismiss="modal">{{close}}</button>
      </div>
    </div>
  </div>
</div>
    `,
  });
});
