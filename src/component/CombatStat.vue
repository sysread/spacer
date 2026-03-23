<template>
<row class="p-0 m-0">
<div class="col-6 p-0 m-0 fw-bold text-end">{{k}}</div>
<div class="col-6 p-0 m-0 text-end"><slot /></div>
</row>
</template>

<script>
export default {
  props: ['k', 'v'],
};
</script>
