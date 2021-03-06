"use strict"

define(function(require, exports, module) {
  const Vue = require('vendor/vue');

  require('component/common');

  Vue.component('modal', {
    props: ['title', 'footer', 'close', 'xclose', 'static', 'nopad', 'size'],
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
<div v-modal class="modal" tabindex="-1" :data-backdrop="(!static && (xclose || close)) ? true : 'static'">
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
      <div v-if="close||footer" class="modal-footer">
        <slot name="footer" />
        <btn v-if="close" muted=1 close=1>{{close}}</btn>
      </div>
    </div>
  </div>
</div>
    `,
  });
});
