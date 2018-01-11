define(function(require, exports, module) {
  const Vue = require('vendor/vue');

  Vue.component('modal', {
    props: ['title', 'close', 'xclose', 'nopad', 'size'],
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
  <div class="modal-dialog" :class="{'modal-sm': size && size === 'sm', 'modal-lg': size && size === 'lg'}">
    <div class="modal-content">
      <div v-if="title || xclose" class="modal-header">
        <h5 v-if="title" class="modal-title">{{title}}</h5>
        <slot name="header" />
        <button v-if="xclose" type="button" class="close text-light" data-dismiss="modal">&times;</button>
      </div>
      <div class="modal-body" :class="{'p-0':nopad}">
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
