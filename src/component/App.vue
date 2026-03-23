<template>
  <div>
    <StatusBar />
    <Content @open="open" :page="page" />
    <NavBar  @open="open" :page="page" :disabled="nav_disabled" />

    <div v-if="game.notifications.length > 0" class="fixed-top m-3">
      <Notification v-for="[msg, dismiss] in game.notifications" :key="msg" :msg="msg" @dismiss="dismissNotification(msg)" :dismiss="dismiss" />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    const initial_page
      = this.game.turns == 0              ? 'newgame'
      : this.game.player.ship.isDestroyed ? 'newgame'
                                          : 'summary';
    return { page: initial_page };
  },

  mounted() {
    this.override_page();
  },

  watch: {
    page() {
      this.override_page();
    },
  },

  computed: {
    nav_disabled() { return this.game.is_frozen },
  },

  methods: {
    override_page() {
      if (this.game.turns == 0) {
        this.page = 'newgame';
      }
      else if (this.game.player.ship.isDestroyed) {
        this.page = 'newgame';
      }
    },

    open(page) {
      if (this.game.is_frozen && page != 'newgame') {
        return;
      }

      this.page = null;
      this.$nextTick(() => this.page = page);
    },

    dismissNotification(msg) {
      this.game.dismiss(msg);
    },
  },
};
</script>
