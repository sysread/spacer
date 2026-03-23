<template>
  <li class="nav-item">
    <a href="#" :class="{'nav-link': true, 'active': active}" @click="$emit('click')">
      <slot />
    </a>
  </li>
</template>

<script>
export default {
  props: ['active'],
  emits: ['click'],
};
</script>
