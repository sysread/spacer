import Vue from 'vue';

import Deck from './Deck.vue';
import CardText from './CardText.vue';
import CardTitle from './CardTitle.vue';
import CardSubtitle from './CardSubtitle.vue';
import CardHeader from './CardHeader.vue';
import CardFooter from './CardFooter.vue';
import CardImg from './CardImg.vue';
import CardBtn from './CardBtn.vue';
import CardLink from './CardLink.vue';
import Card from './Card.vue';

Vue.component('deck', Deck);
Vue.component('card-text', CardText);
Vue.component('card-title', CardTitle);
Vue.component('card-subtitle', CardSubtitle);
Vue.component('card-header', CardHeader);
Vue.component('card-footer', CardFooter);
Vue.component('card-img', CardImg);
Vue.component('card-btn', CardBtn);
Vue.component('card-link', CardLink);
Vue.component('card', Card);
