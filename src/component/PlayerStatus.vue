<template>
<div class="row">
<person-status :person="person" class="my-3 col-md-6 col-12" @open="open" />
<contract-status :person="person" class="my-3 col-md-6 col-12" />
<faction-status :person="person" class="my-3 col-md-6 col-12" />
<ship-status :ship="person.ship" class="my-3 col-md-6 col-12" />
</div>
</template>

<script>
export default {
  computed: {
    person: function() {
      return this.game.player;
    }
  },

  methods: {
    open(page) {
      this.$emit('open', page);
    },
  },
};
</script>
