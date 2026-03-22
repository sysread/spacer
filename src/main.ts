/*
 * Application entry point. Replaces the RequireJS loader and inline bootstrap
 * script from index.html. Imports all components (for side-effect registration)
 * and creates the root Vue instance.
 */

/* Register the service worker for offline capability. Only in production
 * builds - in dev mode, Vite's on-the-fly transforms conflict with SW caching. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch((err) => {
    console.warn('SW registration failed:', err);
  });
}

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../www/public/css/index.css';
import { gsap } from 'gsap';
(window as any).gsap = gsap;

import Vue from 'vue';
import game from './game';

/* DEV flag: enables debug UI elements (navbar debug link, etc.) */
(window as any).DEV = !import.meta.env.PROD;

/* Component imports: order matters. Global mixin and shared primitives first,
 * then page components. Each file self-registers via Vue.component(). */
import './component/global';
import './component/common';
import './component/card';
import './component/modal';
import './component/row';
import './component/exchange';
import './component/svg';

import './component/newgame';
import './component/summary';
import './component/news';
import './component/work';
import './component/commerce';
import './component/fabricators';
import './component/gov';
import './component/shipyard';
import './component/ships';
import './component/addons';
import './component/navcomp';
import './component/options';
import './component/transit';
import './component/status';
import './component/debug';

import './component/navbar';
import './component/statusbar';
import './component/notification';
import './component/content';

/*
 * Bootstrap the Vue application. The global mixin (component/global.js)
 * injects `game`, `data`, and `system` into all component instances.
 */
function boot() {
  const initial_page
    = game.turns == 0              ? 'newgame'
    : game.player.ship.isDestroyed ? 'newgame'
                                   : 'summary';

  new Vue({
    el: '#content',

    data: {
      page: initial_page,
    },

    mounted() {
      (this as any).override_page();
    },

    watch: {
      page() {
        (this as any).override_page();
      },
    },

    computed: {
      nav_disabled() { return (this as any).game.is_frozen },
    },

    methods: {
      override_page() {
        if ((this as any).game.turns == 0) {
          (this as any).page = 'newgame';
        }
        else if ((this as any).game.player.ship.isDestroyed) {
          (this as any).page = 'newgame';
        }
      },

      open(page: string) {
        if ((this as any).game.is_frozen && page != 'newgame') {
          return;
        }

        (this as any).page = null;
        this.$nextTick(() => (this as any).page = page);
      },

      dismissNotification(msg: string) {
        (this as any).game.dismiss(msg);
      },
    },

    template: `
      <div>
        <StatusBar />
        <Content @open="open" :page="page" />
        <NavBar  @open="open" :page="page" :disabled="nav_disabled" />

        <div v-if="game.notifications.length > 0" class="fixed-top m-3">
          <Notification v-for="[msg, dismiss] in game.notifications" :key="msg" :msg="msg" @dismiss="dismissNotification(msg)" :dismiss="dismiss" />
        </div>
      </div>
    `,
  });
}

boot();
