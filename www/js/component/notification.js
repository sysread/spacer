var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "vue"], function (require, exports, vue_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vue_1 = __importDefault(vue_1);
    vue_1.default.component('Notification', {
        props: [
            'dismiss',
            'msg',
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
