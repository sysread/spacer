/*
 * Application entry point. Creates the Vue 3 app instance, registers all
 * global components, applies the global mixin, and mounts the root component.
 */

/* Register the service worker for offline capability. Only in production
 * builds - in dev mode, Vite's on-the-fly transforms conflict with SW caching. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch((err) => {
    console.warn('SW registration failed:', err);
  });
}

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/index.css';
import { gsap } from 'gsap';
(window as any).gsap = gsap;

import { createApp } from 'vue';
import game from './game';
import data from './data';
import system from './system';
import Physics from './physics';
import { filterMethods } from './filters';

/* DEV flag: enables debug UI elements (navbar debug link, etc.) */
(window as any).DEV = !import.meta.env.PROD;

/* Console convenience globals */
(window as any).Physics = Physics;
(window as any).System = system;

/* Import all SFC components */
import App from './component/App.vue';

import Caps from './component/Caps.vue';
import Lc from './component/Lc.vue';
import Uc from './component/Uc.vue';
import Green from './component/Green.vue';
import Gold from './component/Gold.vue';
import Red from './component/Red.vue';
import Badge from './component/Badge.vue';
import ProgressBar from './component/ProgressBar.vue';
import Btn from './component/Btn.vue';
import Ask from './component/Ask.vue';
import Ok from './component/Ok.vue';
import Confirm from './component/Confirm.vue';
import Opt from './component/Opt.vue';
import Menu from './component/Menu.vue';
import Info from './component/Info.vue';
import Section from './component/Section.vue';
import Modal from './component/Modal.vue';

import Deck from './component/Deck.vue';
import CardText from './component/CardText.vue';
import CardTitle from './component/CardTitle.vue';
import CardSubtitle from './component/CardSubtitle.vue';
import CardHeader from './component/CardHeader.vue';
import CardFooter from './component/CardFooter.vue';
import CardImg from './component/CardImg.vue';
import CardBtn from './component/CardBtn.vue';
import CardLink from './component/CardLink.vue';
import Card from './component/Card.vue';

import Row from './component/Row.vue';
import Cell from './component/Cell.vue';
import Term from './component/Term.vue';
import Defn from './component/Defn.vue';
import Def from './component/Def.vue';

import SvgPlot from './component/SvgPlot.vue';
import SvgText from './component/SvgText.vue';
import SvgImg from './component/SvgImg.vue';
import SvgCircle from './component/SvgCircle.vue';
import SvgPath from './component/SvgPath.vue';

import Slider from './component/Slider.vue';
import Exchange from './component/Exchange.vue';

import Notification from './component/Notification.vue';
import StatusBar from './component/StatusBar.vue';
import Content from './component/Content.vue';
import NavItem from './component/NavItem.vue';
import NavBar from './component/NavBar.vue';

import NewGame from './component/NewGame.vue';
import SummaryPage from './component/SummaryPage.vue';
import Flag from './component/Flag.vue';
import FlagBg from './component/FlagBg.vue';
import PlanetSummary from './component/PlanetSummary.vue';
import NewsFeeds from './component/NewsFeeds.vue';
import News from './component/News.vue';
import Conflicts from './component/Conflicts.vue';
import Work from './component/Work.vue';
import Market from './component/Market.vue';
import MarketTrade from './component/MarketTrade.vue';
import ResourceReport from './component/ResourceReport.vue';
import ResourceReportRow from './component/ResourceReportRow.vue';
import MarketReport from './component/MarketReport.vue';
import MarketReportRow from './component/MarketReportRow.vue';
import Fabrication from './component/Fabrication.vue';
import FabricatorsComponent from './component/Fabricators.vue';
import Government from './component/Government.vue';
import Shipyard from './component/Shipyard.vue';
import ShipyardRefuel from './component/ShipyardRefuel.vue';
import ShipyardTransfer from './component/ShipyardTransfer.vue';
import ShipyardRepair from './component/ShipyardRepair.vue';
import Ships from './component/Ships.vue';
import ShipDetail from './component/ShipDetail.vue';
import Addon from './component/Addon.vue';
import Addons from './component/Addons.vue';
import Options from './component/Options.vue';
import Debug from './component/Debug.vue';

import NavBtn from './component/NavBtn.vue';
import NavCompPanel from './component/NavCompPanel.vue';
import NavDestOpt from './component/NavDestOpt.vue';
import NavDestMenu from './component/NavDestMenu.vue';
import NavRoutePlanner from './component/NavRoutePlanner.vue';
import SvgOrbitPath from './component/SvgOrbitPath.vue';
import SvgTransitPath from './component/SvgTransitPath.vue';
import SvgPlotPoint from './component/SvgPlotPoint.vue';
import NavBodies from './component/NavBodies.vue';
import SvgPatrolRadius from './component/SvgPatrolRadius.vue';
import PlotLegend from './component/PlotLegend.vue';
import NavPlot from './component/NavPlot.vue';

import Transit from './component/Transit.vue';
import PatrolEncounter from './component/PatrolEncounter.vue';
import PirateEncounter from './component/PirateEncounter.vue';

import PersonStatus from './component/PersonStatus.vue';
import ContractStatus from './component/ContractStatus.vue';
import FactionStatus from './component/FactionStatus.vue';
import ShipStatus from './component/ShipStatus.vue';
import PlayerStatus from './component/PlayerStatus.vue';

import CombatAction from './component/CombatAction.vue';
import Combatant from './component/Combatant.vue';
import CombatLog from './component/CombatLog.vue';
import CombatLogEntry from './component/CombatLogEntry.vue';
import CombatStat from './component/CombatStat.vue';
import Melee from './component/Melee.vue';
import Restitution from './component/Restitution.vue';


/*
 * Create and configure the Vue 3 application.
 */
const app = createApp(App);

/* Global mixin: injects game state, data, system, and filter methods
 * into every component instance. */
app.mixin({
  data() {
    return { game };
  },
  computed: {
    inDev()  { return (window as any).DEV },
    data()   { return data },
    system() { return system },
  },
  methods: filterMethods,
});

/* Register all components globally */
app.component('caps', Caps);
app.component('lc', Lc);
app.component('uc', Uc);
app.component('green', Green);
app.component('gold', Gold);
app.component('red', Red);
app.component('badge', Badge);
app.component('progress-bar', ProgressBar);
app.component('btn', Btn);
app.component('ask', Ask);
app.component('ok', Ok);
app.component('confirm', Confirm);
app.component('Opt', Opt);
app.component('Menu', Menu);
app.component('Info', Info);
app.component('Section', Section);
app.component('modal', Modal);

app.component('deck', Deck);
app.component('card-text', CardText);
app.component('card-title', CardTitle);
app.component('card-subtitle', CardSubtitle);
app.component('card-header', CardHeader);
app.component('card-footer', CardFooter);
app.component('card-img', CardImg);
app.component('card-btn', CardBtn);
app.component('card-link', CardLink);
app.component('card', Card);

app.component('row', Row);
app.component('cell', Cell);
app.component('term', Term);
app.component('defn', Defn);
app.component('def', Def);

app.component('SvgPlot', SvgPlot);
app.component('SvgText', SvgText);
app.component('SvgImg', SvgImg);
app.component('SvgCircle', SvgCircle);
app.component('SvgPath', SvgPath);

app.component('slider', Slider);
app.component('exchange', Exchange);

app.component('Notification', Notification);
app.component('StatusBar', StatusBar);
app.component('Content', Content);
app.component('NavItem', NavItem);
app.component('NavBar', NavBar);

app.component('new-game', NewGame);
app.component('SummaryPage', SummaryPage);
app.component('Flag', Flag);
app.component('Flag-Bg', FlagBg);
app.component('planet-summary', PlanetSummary);
app.component('NewsFeeds', NewsFeeds);
app.component('News', News);
app.component('Conflicts', Conflicts);
app.component('work', Work);
app.component('market', Market);
app.component('market-trade', MarketTrade);
app.component('resource-report', ResourceReport);
app.component('resource-report-row', ResourceReportRow);
app.component('market-report', MarketReport);
app.component('market-report-row', MarketReportRow);
app.component('fabrication', Fabrication);
app.component('fabricators', FabricatorsComponent);
app.component('government', Government);
app.component('shipyard', Shipyard);
app.component('shipyard-refuel', ShipyardRefuel);
app.component('shipyard-transfer', ShipyardTransfer);
app.component('shipyard-repair', ShipyardRepair);
app.component('ships', Ships);
app.component('ship', ShipDetail);
app.component('addon', Addon);
app.component('addons', Addons);
app.component('Options', Options);
app.component('Debug', Debug);

app.component('NavBtn', NavBtn);
app.component('NavComp', NavCompPanel);
app.component('NavDestOpt', NavDestOpt);
app.component('NavDestMenu', NavDestMenu);
app.component('NavRoutePlanner', NavRoutePlanner);
app.component('SvgOrbitPath', SvgOrbitPath);
app.component('SvgTransitPath', SvgTransitPath);
app.component('SvgPlotPoint', SvgPlotPoint);
app.component('NavBodies', NavBodies);
app.component('SvgPatrolRadius', SvgPatrolRadius);
app.component('PlotLegend', PlotLegend);
app.component('NavPlot', NavPlot);

app.component('Transit', Transit);
app.component('PatrolEncounter', PatrolEncounter);
app.component('PirateEncounter', PirateEncounter);

app.component('person-status', PersonStatus);
app.component('contract-status', ContractStatus);
app.component('faction-status', FactionStatus);
app.component('ship-status', ShipStatus);
app.component('player-status', PlayerStatus);

app.component('combat-action', CombatAction);
app.component('combatant', Combatant);
app.component('combat-log', CombatLog);
app.component('combat-log-entry', CombatLogEntry);
app.component('combat-stat', CombatStat);
app.component('melee', Melee);
app.component('restitution', Restitution);

app.mount('#content');
