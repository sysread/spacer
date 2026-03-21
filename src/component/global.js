import Vue from 'vue';
import game from '../game';
import data from '../data';
import system from '../system';

Vue.mixin({
  data() {
    return {
      game: game,
    };
  },

  computed: {
    inDev()  { return window.DEV },
    data()   { return data   },
    system() { return system },
  },
});
