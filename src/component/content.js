import Vue from 'vue';
import * as util from '../util';
import * as t from '../common';
import { resources } from '../resource';

import Physics from '../physics';
import system from '../system';
window.Physics = Physics;
window.System = system;

import './global';
import './common';
import './card';

import './newgame';
import './summary';
import './news';
import './work';
import './commerce';
import './fabricators';
import './gov';
import './shipyard';
import './ships';
import './addons';
import './navcomp';
import './options';
import './transit';
import './status';
import './debug';

import Content from './Content.vue';

Vue.component('Content', Content);
