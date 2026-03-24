<template>
  <nav @click="click" id="spacer-navbar" data-bs-toggle="collapse" class="fixed-bottom navbar navbar-dark navbar-expand-sm border-danger border border-start-0 border-end-0 border-bottom-0">
    <span class="navbar-brand d-block d-sm-none">Spacer</span>

    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#spacer-nav">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="spacer-nav">
      <ul class="navbar-nav me-auto">
        <NavItem v-for="target of menu" :key="target" :active="is_open(target)" @click="open(target)">
          <div class="d-sm-none">{{ long_names[target] }}</div>
          <div class="d-none d-sm-block">{{ short_names[target] }}</div>
        </NavItem>
      </ul>
    </div>
  </nav>
</template>

<script>
import { Collapse } from 'bootstrap';

export default {
  props: ['page', 'disabled'],

  data() {
    const pages = [
      'summary', 'news', 'work', 'commerce', 'fabricators',
      'government', 'shipyard', 'navigation', 'status',
    ];

    const long_names = {
      'summary': 'Summary', 'news': 'News', 'work': 'Work',
      'commerce': 'Commerce', 'fabricators': 'Fabrication',
      'government': 'Government Center', 'shipyard': 'Shipyard',
      'navigation': 'Navigation Computer', 'status': 'Status',
    };

    const short_names = {
      'summary': 'Summary', 'news': 'News', 'work': 'Work',
      'commerce': 'Commerce', 'fabricators': 'Fab',
      'government': 'Govt', 'shipyard': 'Shipyard',
      'navigation': 'Nav', 'status': 'Status',
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
    document.addEventListener('click', () => {
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
      const nav = document.getElementById('spacer-nav');
      return nav && nav.classList.contains('show');
    },

    open(page) {
      if (!this.disabled) {
        this.$emit('open', page);
      }
      this.collapse();
    },

    collapse() {
      if (this.is_expanded()) {
        const el = document.getElementById('spacer-nav');
        if (el) {
          const instance = Collapse.getOrCreateInstance(el);
          instance.hide();
        }
      }
    },

    click() {
      const navbar = document.getElementById('spacer-navbar');
      if (navbar && getComputedStyle(navbar).flexFlow == 'row wrap') {
        const el = document.getElementById('spacer-nav');
        if (el) Collapse.getOrCreateInstance(el).toggle();
      }
    },

    is_open(page) {
      return page == (this.page || 'summary');
    },
  },
};
</script>
