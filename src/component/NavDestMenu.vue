<template>
  <Menu title="Select a destination">
    <NavDestOpt v-for="body in bodies" :key="body" :body="body" @answer="$emit('answer', body)">
      <span v-if="body == prev" class="m-1 text-warning fw-bold">&target;</span>
    </NavDestOpt>
  </Menu>
</template>

<script>
export default {
  props: ['prev', 'title'],

  computed: {
    bodies() { return this.system.bodies() },
  },
};
</script>
