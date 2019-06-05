var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "vue"], function (require, exports, vue_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vue_1 = __importDefault(vue_1);
    vue_1.default.component('deck', { template: '<div class="card-deck"><slot /></div>' });
    vue_1.default.component('card-text', { template: '<p class="card-text"><slot /></p>' });
    vue_1.default.component('card-title', { template: '<h4 class="card-title"><slot /></h4>' });
    vue_1.default.component('card-subtitle', { template: '<h6 class="card-subtitle mb-2 text-muted"><slot /></h6>' });
    vue_1.default.component('card-header', { template: '<div class="card-header"><slot /></div>' });
    vue_1.default.component('card-footer', { template: '<div class="card-footer"><slot /></div>' });
    vue_1.default.component('card-btn', {
        props: ['disabled', 'muted', 'block', 'close', 'href'],
        template: `
<a :href="href || '#'"
    class="btn btn-dark"
    :class="{'btn-secondary': muted, 'disabled': disabled, 'btn-block': block}"
    :data-dismiss="close ? 'modal' : ''"
    @click="$emit('click')" >
  <slot />
</a>
    `,
    });
    vue_1.default.component('card-link', {
        props: ['to'],
        computed: {
            href: function () { return this.to || '#'; },
        },
        template: `<a @click="$emit('click')" class="card-link" :href="href"><slot /></a>`
    });
    vue_1.default.component('card-img', {
        props: ['src', 'alt'],
        template: '<img class="card-img-top" :src="src" :alt="alt">',
    });
    vue_1.default.component('card', {
        name: 'card',
        props: ['title', 'subtitle', 'nopad'],
        template: `
<div class="card">
  <slot name="header" />
  <div class="card-body" :class="{'p-0':nopad}">
    <card-title v-if="title">{{title}}</card-title>
    <card-subtitle v-if="subtitle">{{subtitle}}</card-subtitle>
    <slot />
  </div>
  <slot name="footer" />
</div>
  `,
    });
    vue_1.default.component('modal', {
        props: ['title', 'footer', 'close', 'xclose', 'static', 'nopad', 'size'],
        directives: {
            'modal': {
                inserted: function (el, binding, vnode) {
                    $(el).modal('show');
                    $(el).on('hidden.bs.modal', (e) => {
                        if (vnode.context) {
                            vnode.context.$emit('close');
                        }
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
