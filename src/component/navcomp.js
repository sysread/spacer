import Vue from 'vue';

import './global';
import './common';
import './modal';
import './commerce';
import './summary';
import './svg';

import NavBtn from './NavBtn.vue';
import NavCompPanel from './NavCompPanel.vue';
import NavDestOpt from './NavDestOpt.vue';
import NavDestMenu from './NavDestMenu.vue';
import NavRoutePlanner from './NavRoutePlanner.vue';
import SvgOrbitPath from './SvgOrbitPath.vue';
import SvgTransitPath from './SvgTransitPath.vue';
import SvgPlotPoint from './SvgPlotPoint.vue';
import NavBodies from './NavBodies.vue';
import SvgPatrolRadius from './SvgPatrolRadius.vue';
import PlotLegend from './PlotLegend.vue';
import NavPlot from './NavPlot.vue';

Vue.component('NavBtn', NavBtn);
Vue.component('NavComp', NavCompPanel);
Vue.component('NavDestOpt', NavDestOpt);
Vue.component('NavDestMenu', NavDestMenu);
Vue.component('NavRoutePlanner', NavRoutePlanner);
Vue.component('SvgOrbitPath', SvgOrbitPath);
Vue.component('SvgTransitPath', SvgTransitPath);
Vue.component('SvgPlotPoint', SvgPlotPoint);
Vue.component('NavBodies', NavBodies);
Vue.component('SvgPatrolRadius', SvgPatrolRadius);
Vue.component('PlotLegend', PlotLegend);
Vue.component('NavPlot', NavPlot);
