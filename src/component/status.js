import Vue from 'vue';

import './global';
import './common';
import './modal';
import './row';

import PersonStatus from './PersonStatus.vue';
import ContractStatus from './ContractStatus.vue';
import FactionStatus from './FactionStatus.vue';
import ShipStatus from './ShipStatus.vue';
import PlayerStatus from './PlayerStatus.vue';

Vue.component('person-status', PersonStatus);
Vue.component('contract-status', ContractStatus);
Vue.component('faction-status', FactionStatus);
Vue.component('ship-status', ShipStatus);
Vue.component('player-status', PlayerStatus);
