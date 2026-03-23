import Vue from 'vue';

import Shipyard from './Shipyard.vue';
import ShipyardRefuel from './ShipyardRefuel.vue';
import ShipyardTransfer from './ShipyardTransfer.vue';
import ShipyardRepair from './ShipyardRepair.vue';

Vue.component('shipyard', Shipyard);
Vue.component('shipyard-refuel', ShipyardRefuel);
Vue.component('shipyard-transfer', ShipyardTransfer);
Vue.component('shipyard-repair', ShipyardRepair);
