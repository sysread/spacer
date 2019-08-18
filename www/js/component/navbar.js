define(function(require, exports, module) {
  "use strict"

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
    props: ['page', 'disabled'],

    data: function() {
      const pages = [
        'summary',
        'news',
        'work',
        'commerce',
        'fabricators',
        'government',
        'shipyard',
        'navigation',
        'status',
      ];

      const long_names = {
        'summary':     'Summary',
        'news':        'News',
        'work':        'Work',
        'commerce':    'Commerce',
        'fabricators': 'Fabrication',
        'government':  'Government Center',
        'shipyard':    'Shipyard',
        'navigation':  'Navigation Computer',
        'status':      'Status',
      };

      const short_names = {
        'summary':     'Summary',
        'news':        'News',
        'work':        'Work',
        'commerce':    'Commerce',
        'fabricators': 'Fab',
        'government':  'Govt',
        'shipyard':    'Shipyard',
        'navigation':  'Nav',
        'status':      'Status',
      };

      if (window.DEV) {
        pages.push('debug');
        long_names.debug = 'Debug';
        short_names.debug = 'Debug';
      }

      return {
        menu: pages,
        long_names: long_names,
        short_names: short_names,
      };
    },

    mounted() {
      document.addEventListener('click', (e) => {
        if (this.is_expanded()) {
          this.collapse();
        }
      });
    },

    watch: {
      disabled() {
        if (this.disabled) {
          this.collapse();
        }
      },
    },

    methods: {
      is_expanded() {
        return $('#spacer-nav').hasClass('show');
      },

      open(page) {
        if (!this.disabled) {
          this.$emit('open', page);
        }

        this.collapse();
      },

      collapse() {
        if (this.is_expanded()) {
          $('#spacer-nav').collapse('hide');
        }
      },

      click() {
        if ($('#spacer-navbar').css('flex-flow') == 'row wrap') {
          $('#spacer-nav').collapse('toggle');
        }
      },

      is_open(page) {
        return page == (this.page || 'summary');
      },
    },

    template: `
      <nav @click="click" id="spacer-navbar" data-toggle="collapse" class="fixed-bottom navbar navbar-dark navbar-expand-sm border-danger border border-left-0 border-right-0 border-bottom-0">
        <span class="navbar-brand d-block d-sm-none">Spacer</span>

        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#spacer-nav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="spacer-nav">
          <ul class="navbar-nav mr-auto">
            <NavItem v-for="target of menu" :key="target" :active="is_open(target)" @click="open(target)">
              <div class="d-sm-none">{{ long_names[target] }}</div>
              <div class="d-none d-sm-block">{{ short_names[target] }}</div>
            </NavItem>
          </ul>
        </div>
      </nav>
    `,
  });
});
