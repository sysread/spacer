import Vue from "vue";
import * as util from "../util";
import * as t from "../common";
import { resources } from "../resource";

import Physics from "../physics";
import System from "../system";

declare var window: {
  game:    any;
  Physics: Physics;
  System:  any;
}

window.Physics = Physics;
window.System  = System;

import "./global";
import "./common";
import "./card";

import "./newgame";
import "./summary";
import "./news";
import "./work";
import "./commerce";
import "./fabricators";
import "./shipyard";
import "./ships";
import "./addons";
import "./navcomp";
import "./options";
import "./transit";
import "./status";
import "./debug";


Vue.component('Content', {
  props: ['page'],

  methods: {
    open(page:string) {
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
