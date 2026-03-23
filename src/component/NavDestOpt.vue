<template>
  <Opt :val="body" final=1 :disabled="is_here" :class="color">
    <Flag :width="35" :faction="faction" class="m-1 d-none d-sm-inline" />

    <span class="d-inline d-sm-none">{{$caps(body)}}</span>
    <span class="d-none d-sm-inline">{{name}}</span>

    <slot />

    <badge right=1 class="ms-1">{{dist}}</badge>
    <badge right=1 v-if="is_moon" class="ms-1">{{kind}}</badge>
  </Opt>
</template>

<script>
import Physics from '../physics';
import * as nc from './navcomp-controller';

export default {
  props: ['body'],

  computed: {
    name()    { return this.system.name(this.body)           },
    faction() { return this.system.faction(this.body)        },
    central() { return this.system.central(this.body)        },
    kind()    { return this.system.kind(this.body)           },
    is_moon() { return this.system.type(this.body) == 'moon' },
    is_here() { return this.game.locus == this.body          },

    dist() {
      const d = Physics.distance(
        this.system.position(this.game.locus),
        this.system.position(this.body),
      );
      return nc.formatDistance(d);
    },

    color() {
      return nc.factionColorClass(this.faction);
    },
  },
};
</script>
