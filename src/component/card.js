import Vue from 'vue';

import Deck from './Deck.vue';
import CardText from './CardText.vue';
import CardTitle from './CardTitle.vue';
import CardSubtitle from './CardSubtitle.vue';
import CardHeader from './CardHeader.vue';
import CardFooter from './CardFooter.vue';
import CardImg from './CardImg.vue';

Vue.component('deck', Deck);
Vue.component('card-text', CardText);
Vue.component('card-title', CardTitle);
Vue.component('card-subtitle', CardSubtitle);
Vue.component('card-header', CardHeader);
Vue.component('card-footer', CardFooter);
Vue.component('card-img', CardImg);

Vue.component('card-btn', {
  props: ['disabled', 'muted', 'block', 'close', 'href'],
  methods: {
    activate() {
      this.$emit('click');
      if (this.close) {
        const modalEl = this.$el.closest('.modal');
        if (modalEl && modalEl._bsModal) {
          modalEl._bsModal.hide();
        }
      }
    },
  },
  template: `
<a :href="href || '#'"
    class="btn btn-dark"
    :class="{'btn-secondary': muted, 'disabled': disabled, 'w-100': block}"
    @click="activate()" >
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
