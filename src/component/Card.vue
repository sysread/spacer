<template>
  <div class="card">
    <slot name="header" />
    <div class="card-body" :class="{'p-0':nopad}">
      <card-title v-if="title">{{title}}</card-title>
      <card-subtitle v-if="subtitle">{{subtitle}}</card-subtitle>
      <slot />
    </div>
    <slot name="footer" />
  </div>
</template>

<script>
export default {
  props: ['title', 'subtitle', 'nopad'],
};
</script>
