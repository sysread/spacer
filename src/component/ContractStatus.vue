<template>
<Section title="Contracts">
<template v-if="person.contracts.length > 0">
  <Section v-for="(contract, idx) of person.contracts" :key="idx" :title="contract.short_title">
    <p>{{contract.description}}</p>
    <p>{{contract.description_remaining}}</p>

    <btn @click="cancel(contract)" block=1 class="my-3">Cancel contract</btn>

    <confirm v-if="show_confirm" yes="Yes" no="No" @confirm="cancel(contract, $event)">
      <h5>{{contract.short_title}}</h5>
      Breaking a contract may result in loss of standing or monetary penalties.
      Are you sure you wish to cancel this contract?
    </confirm>
  </Section>
</template>
<template v-else>
  No active contracts.
</template>
</Section>
</template>

<script>
export default {
  props: ['person'],

  data() {
    return {
      show_confirm: false,
    };
  },

  methods: {
    cancel(contract, confirmed) {
      if (this.show_confirm) {
        if (confirmed) {
          this.$nextTick(() => contract.cancel());
        }

        this.show_confirm = false;
      }
      else {
        this.show_confirm = true;
      }
    }
  },
};
</script>
