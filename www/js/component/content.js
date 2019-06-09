define(function(require, exports, module) {
  "use strict"

  const Vue       = require('vendor/vue');
  const util      = require('util');
  const t         = require('common');
  const resources = require('resource').resources;

  window.Physics = require('physics');
  window.System  = require('system');

  require('component/global');
  require('component/common');
  require('component/card');

  require('component/newgame');
  require('component/summary');
  require('component/news');
  require('component/work');
  require('component/commerce');
  require('component/fabricators');
  require('component/shipyard');
  require('component/ships');
  require('component/addons');
  require('component/navcomp');
  require('component/options');
  require('component/transit');
  require('component/status');
  require('component/debug');


  Vue.component('Content', {
    props: ['page'],

    methods: {
      open(page) {
        this.$emit('open', page);
      },
    },

    template: `
      <div id="spacer-content" class="container-fluid pt-3 pb-1 mt-5">
        <new-game           v-if="page == 'newgame'"     @open="open" />
        <SummaryPage        v-if="page == 'summary'"     @open="open" />
        <NewsFeeds     v-else-if="page == 'news'"        @open="open" />
        <work          v-else-if="page == 'work'"        @open="open" />
        <market        v-else-if="page == 'commerce'"    @open="open" />
        <fabricators   v-else-if="page == 'fabricators'" @open="open" />
        <shipyard      v-else-if="page == 'shipyard'"    @open="open" />
        <ships         v-else-if="page == 'ships'"       @open="open" />
        <addons        v-else-if="page == 'addons'"      @open="open" />
        <NavComp       v-else-if="page == 'navigation'"  @open="open" />
        <transit       v-else-if="page == 'transit'"     @open="open" />
        <player-status v-else-if="page == 'status'"      @open="open" />
        <options       v-else-if="page == 'options'"     @open="open" />
        <Debug         v-else-if="page == 'debug'"       @open="open" />
      </div>
    `,
  });
});
