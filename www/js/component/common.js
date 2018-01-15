define(function(require, exports, module) {
  const Vue  = require('vendor/vue');
  const util = require('util');

  require('component/modal');

  Vue.filter('csn', function (value) {
    return util.csn((value || 0).toString());
  });

  Vue.filter('R', function (value, places) {
    return util.R((value || 0).toString(), places);
  });

  Vue.filter('unit', function (value, unit) {
    return (value || 0).toString() + ' ' + unit;
  });

  Vue.component('progress-bar', {
    props: ['percent', 'display'],
    template: `
<div class="progress bg-dark">
  <div class="progress-bar bg-warning" :style="{height: '35px', width: percent + '%'}">
    <span class="badge badge-pill badge-dark float-left m-1 font-weight-normal" style="font-size:14px">
      {{display}}
    </span>
  </div>
</div>
    `,
  });

  Vue.component('ask', {
    props: ['choices'],
    data: function() { return { choice: null } },
    template: `
<modal @close="$emit('pick', choice)" static=true>
  <p><slot/></p>
  <button v-for="(msg, id) in choices" :key="choice" @click="choice=id" type="button" class="btn btn-dark btn-block" data-dismiss="modal">
    {{msg}}
  </button>
</modal>
    `
  });

  Vue.component('ok', {
    template: `
<modal close="OK" @close="$emit('ok')">
  <p><slot/></p>
</modal>`,
  });
});
