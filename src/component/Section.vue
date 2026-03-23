<template>
  <div class="section-wrapper">
    <h4 v-if="!notitle" class="section-title">
      <slot name="title-pre" />
      {{title}}
      <slot name="title-post" />
    </h4>

    <div class="section-content">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  props: ['title', 'notitle', 'back'],
};
</script>
