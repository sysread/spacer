import Vue from 'vue';

import './global';
import './common';
import './row';
import './news';

import Flag from './Flag.vue';
import FlagBg from './FlagBg.vue';
import SummaryPage from './SummaryPage.vue';
import PlanetSummary from './PlanetSummary.vue';

Vue.component('Flag', Flag);
Vue.component('Flag-Bg', FlagBg);
Vue.component('SummaryPage', SummaryPage);
Vue.component('planet-summary', PlanetSummary);
