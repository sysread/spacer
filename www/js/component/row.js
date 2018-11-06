define(function(require, exports, module) {
  const Vue = require('vendor/vue');
  require('component/common');

  Vue.component('row', {
    props: ['y'],
    computed: {
      yClass: function() { return this.y ? 'py-' + this.y : 'py-1' },
    },
    template: '<div class="row" :class="yClass"><slot /></div>',
  });

  Vue.component('cell', {
    props: ['brkpt', 'size', 'y'],
    computed: {
      classList: function() { return [this.colClass, this.yClass].join(' ') },
      yClass:    function() { return this.y ? 'py-' + this.y : 'py-1' },
      colClass:  function() {
        const parts = ['col'];
        if (this.brkpt) parts.push(this.brkpt);
        if (this.size)  parts.push(this.size);
        return parts.length > 1 ? parts.join('-') : '';
      },
    },
    template: '<div :class="classList"><slot /></div>',
  });

  Vue.component('term', {template: '<cell brkpt="sm" size=3><b><slot /></b></cell>'});
  Vue.component('defn', {template: '<cell brkpt="sm" size=9 class="text-muted"><slot /></cell>'});

  Vue.component('def', {
    props: ['term', 'def', 'caps', 'split', 'y', 'brkpt', 'info'],
    computed: {
      termSize: function() { return this.split || 4 },
      defnSize: function() { return 12 - this.termSize },
    },
    template: `
<row :y="y">
  <cell :brkpt="brkpt" :size="termSize" :y="y" class="font-weight-bold" :class="{'text-capitalize': caps}">
    {{term}}
    <slot name="term" />
    <info v-if="info" :title="term">{{info}}</info>
  </cell>
  <cell :brkpt="brkpt" :size="defnSize" :y="y" class="text-muted" :class="{'text-capitalize': caps}">{{def}}<slot name="def" /><slot /></cell>
</row>
    `,
  });
});
