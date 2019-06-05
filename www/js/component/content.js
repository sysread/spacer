var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "vue", "../physics", "../system", "./global", "./common", "./card", "./newgame", "./summary", "./news", "./work", "./commerce", "./fabricators", "./shipyard", "./ships", "./addons", "./navcomp", "./options", "./transit", "./status", "./debug"], function (require, exports, vue_1, physics_1, system_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vue_1 = __importDefault(vue_1);
    physics_1 = __importDefault(physics_1);
    system_1 = __importDefault(system_1);
    window.Physics = physics_1.default;
    window.System = system_1.default;
    vue_1.default.component('Content', {
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
