import Vue from 'vue';

import './global';
import './common';
import './exchange';
import './modal';
import './row';

import Fabrication from './Fabrication.vue';
import FabricatorsComponent from './Fabricators.vue';

Vue.component('fabrication', Fabrication);
Vue.component('fabricators', FabricatorsComponent);
