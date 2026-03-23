import Vue from 'vue';

import './card';
import './common';
import './exchange';
import './modal';
import './row';

import Melee from './Melee.vue';
import CombatLog from './CombatLog.vue';
import CombatLogEntry from './CombatLogEntry.vue';
import CombatAction from './CombatAction.vue';
import Combatant from './Combatant.vue';
import CombatStat from './CombatStat.vue';

Vue.component('melee', Melee);
Vue.component('combat-log', CombatLog);
Vue.component('combat-log-entry', CombatLogEntry);
Vue.component('combat-action', CombatAction);
Vue.component('combatant', Combatant);
Vue.component('combat-stat', CombatStat);
