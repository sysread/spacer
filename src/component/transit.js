import Vue from 'vue';

import './global';
import './common';
import './combat';
import './navcomp';
import './svg';
import './summary';

import Transit from './Transit.vue';
import PatrolEncounter from './PatrolEncounter.vue';
import PirateEncounter from './PirateEncounter.vue';

Vue.component('Transit', Transit);
Vue.component('PatrolEncounter', PatrolEncounter);
Vue.component('PirateEncounter', PirateEncounter);
