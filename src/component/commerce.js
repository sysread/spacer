import Vue from 'vue';

import './global';
import './common';
import './modal';
import './card';
import './row';
import './exchange';

import Market from './Market.vue';
import MarketTrade from './MarketTrade.vue';
import ResourceReport from './ResourceReport.vue';
import ResourceReportRow from './ResourceReportRow.vue';
import MarketReport from './MarketReport.vue';
import MarketReportRow from './MarketReportRow.vue';

Vue.component('market', Market);
Vue.component('market-trade', MarketTrade);
Vue.component('resource-report', ResourceReport);
Vue.component('resource-report-row', ResourceReportRow);
Vue.component('market-report', MarketReport);
Vue.component('market-report-row', MarketReportRow);
