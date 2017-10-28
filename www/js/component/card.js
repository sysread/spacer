define(function(require, exports, module) {
  const Vue = require('vendor/vue');

  Vue.component('card-text',   {template: '<p class="card-text"><slot /></p>'});
  Vue.component('card-header', {template: '<div class="card-header"><slot /></div>'});
  Vue.component('card-footer', {template: '<div class="card-footer"><slot /></div>'});

  Vue.component('card-img', {
    props: ['src', 'alt'],
    template: '<img class="card-img-top" src="{{src}}" alt="{{alt}}">',
  });

  Vue.component('card', {
    name: 'card',
    props: ['title', 'subtitle'],
    template: `

<div class="card">
  <slot name="header" />
  <div class="card-body">
    <h4 v-if="title" class="card-title">{{title}}</h4>
    <h6 v-if="subtitle" class="card-subtitle mb-2 text-muted">{{subtitle}}</h6>
    <slot />
  </div>
  <slot name="footer" />
</div>
    `,
  });
});
