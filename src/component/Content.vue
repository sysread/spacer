<template>
  <div id="spacer-content" class="container-fluid pt-3 pb-1 mt-5">
    <new-game           v-if="page == 'newgame'"     @open="open" />
    <SummaryPage        v-if="page == 'summary'"     @open="open" />
    <NewsFeeds     v-else-if="page == 'news'"        @open="open" />
    <work          v-else-if="page == 'work'"        @open="open" />
    <market        v-else-if="page == 'commerce'"    @open="open" />
    <fabricators   v-else-if="page == 'fabricators'" @open="open" />
    <government    v-else-if="page == 'government'"  @open="open" />
    <shipyard      v-else-if="page == 'shipyard'"    @open="open" />
    <ships         v-else-if="page == 'ships'"       @open="open" />
    <addons        v-else-if="page == 'addons'"      @open="open" />
    <NavComp       v-else-if="page == 'navigation'"  @open="open" />
    <transit       v-else-if="page == 'transit'"     @open="open" />
    <player-status v-else-if="page == 'status'"      @open="open" />
    <options       v-else-if="page == 'options'"     @open="open" />
    <Debug         v-else-if="page == 'debug'"       @open="open" />
  </div>
</template>

<script>
export default {
  props: ['page'],

  methods: {
    open(page) {
      this.$emit('open', page);
    },
  },
};
</script>
