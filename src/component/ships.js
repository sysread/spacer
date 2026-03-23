import Vue from 'vue';

import './global';
import './common';
import './exchange';
import './modal';
import './row';

import Ships from './Ships.vue';
import ShipDetail from './ShipDetail.vue';

Vue.component('ships', Ships);
Vue.component('ship', ShipDetail);
