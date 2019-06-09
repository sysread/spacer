"use strict"

define(function(require, exports, module) {
  const Vue = require('vendor/vue');

  Vue.component('deck',          { template: '<div class="card-deck"><slot /></div>'});
  Vue.component('card-text',     { template: '<p class="card-text"><slot /></p>'});
  Vue.component('card-title',    { template: '<h4 class="card-title"><slot /></h4>'});
  Vue.component('card-subtitle', { template: '<h6 class="card-subtitle mb-2 text-muted"><slot /></h6>'});
  Vue.component('card-header',   { template: '<div class="card-header"><slot /></div>'});
  Vue.component('card-footer',   { template: '<div class="card-footer"><slot /></div>'});

  Vue.component('card-btn', {
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

  Vue.component('card-link', {
    props: ['to'],
    computed: {
      href: function() { return this.to || '#' },
    },
    template: `<a @click="$emit('click')" class="card-link" :href="href"><slot /></a>`
  });

  Vue.component('card-img', {
    props: ['src', 'alt'],
    template: '<img class="card-img-top" :src="src" :alt="alt">',
  });

  Vue.component('card', {
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
});
