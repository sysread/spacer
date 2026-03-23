<template>
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
</template>

<script>
import { Modal } from 'bootstrap';

export default {
  props: ['title', 'footer', 'close', 'xclose', 'static', 'nopad', 'size'],

  directives: {
    'modal': {
      mounted(el, binding) {
        const modal = new Modal(el);
        el._bsModal = modal;
        modal.show();
        el.addEventListener('hidden.bs.modal', () => {
          binding.instance.$emit('close');
        });
      },
    },
  },

  methods: {
    dismiss() {
      const modal = this.$el._bsModal;
      if (modal) modal.hide();
    },
  },

  beforeUnmount() {
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
};
</script>
