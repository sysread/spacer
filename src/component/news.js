import Vue from 'vue';

import './global';
import './common';

import Conflicts from './Conflicts.vue';
import NewsFeeds from './NewsFeeds.vue';
import News from './News.vue';

Vue.component('Conflicts', Conflicts);
Vue.component('NewsFeeds', NewsFeeds);
Vue.component('News', News);
