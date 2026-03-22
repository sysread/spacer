import Vue from 'vue';
import { Modal } from 'bootstrap';

import './common';

Vue.component('modal', {
  props: ['title', 'footer', 'close', 'xclose', 'static', 'nopad', 'size'],
  directives: {
    'modal': {
      inserted: function(el, binding, vnode) {
        const modal = new Modal(el);
        modal.show();
        el.addEventListener('hidden.bs.modal', () => {
          vnode.context.$emit('close');
        });
      },
      unbind: function(el) {
        // When Vue removes the modal from the DOM, dispose the BS instance
        // so the backdrop is cleaned up. Without this, the backdrop persists
        // if the modal is removed by Vue reactivity instead of BS dismiss.
        const modal = Modal.getInstance(el);
        if (modal) {
          modal.hide();
          modal.dispose();
        }
        // Clean up any orphaned backdrops
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      }
    }
  },
  template: `
<div v-modal class="modal" tabindex="-1" :data-bs-backdrop="(!static && (xclose || close)) ? true : 'static'">
  <div class="modal-dialog" :class="{'modal-sm': size && size === 'sm', 'modal-lg': size && size === 'lg'}">
    <div class="modal-content">
      <div v-if="title || xclose" class="modal-header">
        <h5 v-if="title" class="modal-title">{{title}}</h5>
        <slot name="header" />
        <button v-if="xclose" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
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
