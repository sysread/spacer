define(function(require, exports, module) {
  const Vue = require('vendor/vue');

  Vue.component('row', {
    props: ['y'],
    computed: {
      yClass: function() {
        if (this.y) return 'py-' + this.y;
        else return 'py-2';
      },
    },
    template: '<div class="row" :class="yClass"><slot /></div>',
  });

  Vue.component('cell', {
    props: ['brkpt', 'size', 'y'],
    computed: {
      colClass: function() {
        const parts = ['col'];
        if (this.brkpt) parts.push(this.brkpt);
        if (this.size)  parts.push(this.size);
        return parts.length > 1 ? parts.join('-') : '';
      },
      yClass: function() {
        if (this.y) {
          return 'py-' + this.y;
        } else {
          return 'py-1';
        }
      },
      classList: function() {
        return [this.colClass, this.yClass].join(' ');
      },
    },
    template: '<div :class="classList"><slot /></div>',
  });

  Vue.component('term', {template: '<cell brkpt="sm" size=3><b><slot /></b></cell>'});
  Vue.component('defn', {template: '<cell brkpt="sm" size=9 class="text-muted"><slot /></cell>'});

  Vue.component('def', {
    props: ['term', 'def', 'caps'],
    template: `
<row>
  <term :class="{'text-capitalize': caps}">{{term}}<slot name="term" /></term>
  <defn :class="{'text-capitalize': caps}">{{def}}<slot name="def" /></defn>
</row>
    `,
  });
});
