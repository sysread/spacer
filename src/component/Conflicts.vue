<template>
  <div>
    <ul v-if="conflicts.length > 0">
      <template v-for="conflict in conflicts">
        <li>
          {{conflict.proponent}} has declared a {{conflict.name}} against {{conflict.target}}
        </li>
      </template>
    </ul>
    <p v-else>
      Nothing to report.
    </p>
  </div>
</template>

<script>
export default {
  computed: {
    conflicts() {
      return this.game.get_conflicts();
    },
  },
};
</script>
