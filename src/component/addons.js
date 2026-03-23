import Vue from 'vue';

import './global';
import './common';
import './card';
import './exchange';
import './modal';
import './row';

import Addons from './Addons.vue';
import Addon from './Addon.vue';

Vue.component('addons', Addons);
Vue.component('addon', Addon);
