define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const util    = require('util');
  const Physics = require('physics');

  require('component/modal');
  require('vendor/sprintf.min');
  require('vendor/TweenMax.min');

  Vue.filter('sprintf', (value, format, ...args) => sprintf(format, value, ...args));

  Vue.filter('csn',   function(value) { return util.csn((value || 0).toString()) });
  Vue.filter('R',     function(value, places) { return util.R((value || 0).toString(), places) });
  Vue.filter('pct',   function(value, places) { return util.pct((value || 0).toString(), places) });
  Vue.filter('unit',  function(value, unit) { return (value || 0).toString() + ' ' + unit });
  Vue.filter('name',  function(value) { return value.toString().replace(/_/g, ' ') }),
  Vue.filter('caps',  function(value) { return value.toString().replace(/\b([a-z])/g, function(str) { return str.toUpperCase() }) });
  Vue.filter('lower', function(value) { return value.toString().replace(/\b([A-Z])/g, function(str) { return str.toLowerCase() }) });
  Vue.filter('AU',    function(value) { return value / Physics.AU });
  Vue.filter('yn',    function(value) { return value ? 'yes' : 'no' });
  Vue.filter('abs',   function(value) { return Math.abs(value || 0) });

  Vue.component('caps', { template: '<span class="text-capitalize"><slot /></span>' });
  Vue.component('lc',   { template: '<span class="text-lowercase"><slot /></span>'  });
  Vue.component('uc',   { template: '<span class="text-uppercase"><slot /></span>'  });

  Vue.component('green', { template: '<span class="text-success"><slot /></span>' });
  Vue.component('gold',  { template: '<span class="text-warning"><slot /></span>' });
  Vue.component('red',   { template: '<span class="text-danger"><slot /></span>'  });


  Vue.component('badge', {
    props: ['right'],
    template: '<span class="badge badge-pill" :class="{\'float-right\': right}"><slot /></span>',
  });


  Vue.component('progress-bar', {
    props: ['percent', 'width', 'frame_rate', 'hide_pct'],

    watch: {
      percent() {
        TweenLite.to(this.$el, this.rate, {
          value:      this.percent,
          ease:       Sine.easeInOut,
          onComplete: () => { this.$emit('ready') },
        }).play();
      },
    },

    computed: {
      rate() { return this.frame_rate === undefined ? 0.5 : this.frame_rate }
    },

    template: `
      <div class="progress bg-dark">
        <div class="progress-bar bg-warning text-dark" :style="{'width': percent + '%'}">
          <template v-if="!hide_pct">{{(percent||0)|R}}%</template>
          <slot />
        </div>
      </div>
    `,
  });


  Vue.component('btn', {
    props: ['disabled', 'muted', 'highlight', 'block', 'close'],

    methods: {
      activate: function() {
        if (!this.disabled) {
          this.$emit('click');
        }
      }
    },

    computed: {
      classes() {
        return {
          'btn':           true,
          'btn-dark':      true,
          'btn-highlight': !this.disabled && this.highlight,
          'btn-secondary': this.muted,
          'disabled':      this.disabled,
          'btn-block':     this.block,
          'text-muted':    this.muted,
        };
      },
    },

    template: `
      <button type="button" :class="classes" :data-dismiss="close ? 'modal' : ''" :disabled="disabled" @click="activate()" >
        <slot />
      </button>
    `,
  });


  Vue.component('ask', {
    props: ['choices'],
    data: function() { return { choice: null } },
    template: `
<modal @close="$emit('pick', choice)" static=true>
  <p><slot/></p>
  <btn v-for="(msg, id) in choices" :key="choice" @click="choice=id" block=1 close=1>
    {{msg}}
  </btn>
</modal>
    `
  });

  Vue.component('ok', {
    props: ['title'],
    template: `
<modal :title="title" close="OK" :xclose="!!title" @close="$emit('ok')">
  <p><slot/></p>
</modal>
    `,
  });

  Vue.component('confirm', {
    props: ['yes', 'no'],
    methods: { trigger(choice) { this.$emit('confirm', choice === 'Y') } },
    template: `<ask :choices="{Y: yes, N: no}" @pick="trigger"><slot /></ask>`,
  });


  Vue.component('Opt', {
    props: ['val', 'final', 'disabled'],

    methods: {
      onClick() {
        this.$emit('click', this.val);
        this.$parent.$emit('answer', this.val);
      }
    },

    template: `
<btn block=1 :close="final" :disabled="disabled" @click="onClick" class="text-left">
  <slot />
</btn>
    `,
  });

  Vue.component('Menu', {
    props: ['title', 'close'],

    methods: {
      onAnswer(val) {
        this.$emit('answer', val);
      },
    },

    template: `
<div @answer="onAnswer" class="py-3">
  <slot />
</div>
    `,
  });


  Vue.component('Info', {
    props: ['title'],

    data() {
      return { shown: false };
    },

    methods: {
      click(e) {
        e.preventDefault();
        e.stopPropagation();
        this.shown = true;
        return false;
      },

      reset() {
        this.shown = false;
      }
    },

    template: `
<div class="d-inline px-2">
  <a href="#" class="info" @click="click">i</a>
  <ok v-if="shown" @ok="reset" :title="title"><slot /></ok>
</div>
    `,
  });
});
