import Vue from "vue";
import game from "../game";
import data from '../data';
import system from '../system';

declare var window: {
  game: any;
  DEV: boolean;
}

Vue.mixin({
  data() {
    return {
      game: game,
    };
  },

  computed: {
    inDev() { return window.DEV },
    data() { return data },
    system() { return system },
  },
});
