define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const util    = require('util');
  const Physics = require('physics');

  require('component/modal');

  Vue.filter('csn',  function(value) { return util.csn((value || 0).toString()) });
  Vue.filter('R',    function(value, places) { return util.R((value || 0).toString(), places) });
  Vue.filter('pct',  function(value, places) { return util.pct((value || 0).toString(), places) });
  Vue.filter('unit', function(value, unit) { return (value || 0).toString() + ' ' + unit });
  Vue.filter('caps', function(value) { return value.toString().replace(/\b([a-z])/g, function(str) { return str.toUpperCase() }) });
  Vue.filter('AU',   function(value) { return value / Physics.AU });
  Vue.filter('yn',   function(value) { return value ? 'yes' : 'no' }),

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
    props: ['percent'],
    template: `
<div class="progress bg-dark">
  <div class="progress-bar bg-warning" :style="{height: '35px', width: (percent || 0) + '%'}">
    <span class="badge badge-pill badge-dark float-left m-1 font-weight-normal" style="font-size:14px">
      <slot />
    </span>
  </div>
</div>
    `,
  });

  Vue.component('btn', {
    props: ['disabled', 'muted', 'block', 'close'],
    methods: {
      activate: function() {
        if (!this.disabled) {
          this.$emit('click');
        }
      }
    },
    template: `
<button
    type="button"
    class="btn btn-dark"
    :class="{'btn-secondary': muted, 'disabled': disabled, 'btn-block': block}"
    :data-dismiss="close ? 'modal' : ''"
    :disabled="disabled"
    @click="activate()" >
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
    template: `<modal close="OK" @close="$emit('ok')"><p><slot/></p></modal>`,
  });

  Vue.component('confirm', {
    props: ['yes', 'no'],
    methods: { trigger: function(choice) { this.$emit('confirm', choice === 'Y') } },
    template: `<ask :choices="{Y: yes, N: no}" @pick="trigger"><slot /></ask>`,
  });
});
