<template>
  <teleport to="body">
    <div class="spacer-modal-wrapper">
    <div class="spacer-modal-backdrop" @click="onBackdropClick"></div>
    <div class="spacer-modal" ref="modal" @click.self="onBackdropClick">
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
            <btn v-if="close" muted=1 @click="dismiss()">{{close}}</btn>
          </div>
        </div>
      </div>
    </div>
    </div>
  </teleport>
</template>

<script>
export default {
  props: ['title', 'footer', 'close', 'xclose', 'static', 'nopad', 'size'],
  emits: ['close'],
  inheritAttrs: false,

  provide() {
    return {
      modalDismiss: () => this.dismiss(),
    };
  },

  mounted() {
    document.body.classList.add('modal-open');

    // Trap focus within the modal and handle Escape key
    this._onKeydown = (e) => {
      if (e.key === 'Escape') {
        if (!this.static && (this.xclose || this.close)) {
          this.dismiss();
        }
        return;
      }

      if (e.key === 'Tab') {
        const modal = this.$refs.modal;
        if (!modal) return;

        const focusable = modal.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!modal.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', this._onKeydown);
  },

  methods: {
    dismiss() {
      this.$emit('close');
    },

    onBackdropClick() {
      if (this.static) return;
      if (this.xclose || this.close) {
        this.dismiss();
      }
    },
  },

  beforeUnmount() {
    if (this._onKeydown) {
      document.removeEventListener('keydown', this._onKeydown);
    }

    this.$nextTick(() => {
      if (!document.querySelector('.spacer-modal-backdrop')) {
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
      }
    });
  },
};
</script>

<style>
.spacer-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1040;
}

.spacer-modal .modal-dialog {
  width: 80% !important;
  max-width: 80% !important;
}

.spacer-modal .modal-content {
  padding: 0.5rem;
}

.spacer-modal .modal-header {
  padding: 0.75rem 1rem;
}

.spacer-modal .modal-body {
  padding: 0.75rem 1rem;
}

.spacer-modal .modal-footer {
  padding: 0.75rem 1rem;
}

.spacer-modal .table thead th {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.spacer-modal .table tbody td,
.spacer-modal .table tbody th {
  border-color: #444 !important;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  vertical-align: middle;
}

.spacer-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}
</style>
