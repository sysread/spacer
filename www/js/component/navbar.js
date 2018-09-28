define(function(require, exports, module) {
  const Vue = require('vendor/vue');

  require('component/global');


  Vue.component('NavItem', {
    'props': ['active'],

    'template': `
      <li class="nav-item">
        <a href="#" :class="{'nav-link': true, 'active': active}" @click="$emit('click')">
          <slot />
        </a>
      </li>
    `,
  });


  Vue.component('NavBar', {
    'props': [],

    'data': function() {
      return {
        menu: {
          'Summary':     'summary',
          'Work':        'work',
          'Commerce':    'commerce',
          'Fabricators': 'fabricators',
          'Shipyard':    'shipyard',
          'Navigation':  'navigation',
          'Status':      'status',
          'Testing':     'test',
        },
      };
    },

    'computed': {
      active() {
        return this.game.page;
      },

      enabled() {
        return !this.game.freeze;
      },
    },

    'methods': {
      collapse() {
        if ($('#spacer-nav').hasClass('show')) {
          $('#spacer-nav').collapse('hide');
        }
      },

      open(page) {
        if (page && this.enabled) {
          this.game.open(page);
        }

        this.collapse();
      },

      click() {
        if ($('#spacer-navbar').css('flex-flow') == 'row wrap') {
          $('#spacer-nav').collapse('toggle');
        }
      },
    },

    'template': `
      <nav @click="click" id="spacer-navbar" data-toggle="collapse" class="fixed-bottom navbar navbar-dark navbar-expand-md border-danger border border-left-0 border-right-0 border-bottom-0">
        <span class="navbar-brand">Spacer</span>

        <button class="navbar-toggler" type="button" :data-toggle="enabled ? 'collapse' : ''" data-target="#spacer-nav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="spacer-nav">
          <ul class="navbar-nav mr-auto">
            <NavItem v-for="(target, label) of menu" :key="target" :active="active == target" @click="open(target)">
              {{label}}
            </NavItem>
          </ul>
        </div>
      </nav>
    `,
  });
});
