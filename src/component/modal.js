import Vue from 'vue';
import { Modal } from 'bootstrap';

import './common';

Vue.component('modal', {
  props: ['title', 'footer', 'close', 'xclose', 'static', 'nopad', 'size'],

  directives: {
    'modal': {
      inserted: function(el, binding, vnode) {
        const modal = new Modal(el);
        // Store the instance on the element for cleanup
        el._bsModal = modal;
        modal.show();
        el.addEventListener('hidden.bs.modal', () => {
          vnode.context.$emit('close');
        });
      }
    }
  },

  methods: {
    dismiss() {
      const modal = this.$el._bsModal;
      if (modal) modal.hide();
    },
  },

  beforeDestroy() {
    // Properly dispose the BS Modal when Vue removes the component.
    // Without this, the backdrop persists if the modal is removed by
    // Vue reactivity instead of being dismissed via BS5's API.
    const el = this.$el;
    const modal = el._bsModal;
    if (modal) {
      modal.hide();
      modal.dispose();
    }
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  },

  template: `
<div v-modal class="modal" tabindex="-1" :data-bs-backdrop="(!static && (xclose || close)) ? true : 'static'">
  <div class="modal-dialog" :class="{'modal-sm': size && size === 'sm', 'modal-lg': size && size === 'lg'}">
    <div class="modal-content">
      <div v-if="title || xclose" class="modal-header">
        <h5 v-if="title" class="modal-title">{{title}}</h5>
        <slot name="header" />
        <button v-if="xclose" type="button" class="btn-close btn-close-white" @click="dismiss()"></button>
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
