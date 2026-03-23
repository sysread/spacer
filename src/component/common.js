import Vue from 'vue';

import './modal';

Vue.component('caps', { template: '<span class="text-capitalize"><slot /></span>' });
Vue.component('lc',   { template: '<span class="text-lowercase"><slot /></span>'  });
Vue.component('uc',   { template: '<span class="text-uppercase"><slot /></span>'  });

Vue.component('green', { template: '<span class="text-success"><slot /></span>' });
Vue.component('gold',  { template: '<span class="text-warning"><slot /></span>' });
Vue.component('red',   { template: '<span class="text-danger"><slot /></span>'  });


Vue.component('badge', {
  props: ['right'],
  template: '<span class="badge rounded-pill" :class="{\'float-end\': right}"><slot /></span>',
});


Vue.component('progress-bar', {
  props: ['percent', 'width', 'hide_pct'],

  watch: {
    percent() {
      this.$nextTick(() => this.$emit('ready'));
    },
  },

  template: `
    <div class="progress bg-dark">
      <div class="progress-bar bg-warning text-dark" :style="{'width': percent + '%'}">
        <template v-if="!hide_pct">{{$R(percent||0)}}%</template>
        <slot />
      </div>
    </div>
  `,
});


Vue.component('btn', {
  props: ['disabled', 'muted', 'highlight', 'block', 'close'],

  methods: {
    activate: function() {
      if (this.disabled) return;

      this.$emit('click');

      // Dismiss the parent modal programmatically instead of using
      // data-bs-dismiss. BS5's native dismiss races with Vue's click
      // handler, causing events to be lost.
      if (this.close) {
        const modalEl = this.$el.closest('.modal');
        if (modalEl && modalEl._bsModal) {
          modalEl._bsModal.hide();
        }
      }
    }
  },

  computed: {
    classes() {
      return {
        'btn':           true,
        'btn-dark':      true,
        'btn-highlight': !this.disabled && this.highlight,
        'btn-secondary': this.muted,
        'disabled':      this.disabled,
        'w-100':         this.block,
        'd-block':       this.block,
        'text-muted':    this.muted,
      };
    },
  },

  template: `
    <button type="button" :class="classes" :disabled="disabled" @click="activate()" >
      <slot />
    </button>
  `,
});


Vue.component('ask', {
  props: ['choices'],
  data: function() { return { choice: null } },
  methods: {
    pick(id) {
      this.choice = id;
      // Emit immediately rather than waiting for modal hidden event.
      // BS5's native dismiss can race with Vue's click handler.
      this.$emit('pick', id);
    }
  },
  template: `
<modal @close="$emit('pick', choice)" static=true>
  <p><slot/></p>
  <btn v-for="(msg, id) in choices" :key="id" @click="pick(id)" block=1 close=1>
    {{msg}}
  </btn>
</modal>
  `
});

Vue.component('ok', {
  props: ['title'],
  template: `
<modal :title="title" close="OK" :xclose="!!title" @close="$emit('ok')">
  <p><slot/></p>
</modal>
  `,
});

Vue.component('confirm', {
  props: ['yes', 'no'],

  methods: {
    trigger(choice) { this.$emit('confirm', choice === 'Y') },
  },

  computed: {
    choices() { return {'Y': this.yes || 'Yes', 'N': this.no || 'No' } }
  },

  template: `<ask :choices="choices" @pick="trigger"><slot /></ask>`,
});


Vue.component('Opt', {
  props: ['val', 'final', 'disabled'],

  methods: {
    onClick() {
      this.$emit('click', this.val);
      this.$parent.$emit('answer', this.val);
    }
  },

  template: `
<btn block=1 :close="final" :disabled="disabled" @click="onClick" class="text-start">
  <slot />
</btn>
  `,
});

Vue.component('Menu', {
  props: ['title', 'close'],

  methods: {
    onAnswer(val) {
      this.$emit('answer', val);
    },
  },

  template: `
<div @answer="onAnswer" class="py-3">
  <slot />
</div>
  `,
});


Vue.component('Info', {
  props: ['title'],

  data() {
    return { shown: false };
  },

  methods: {
    click(e) {
      e.preventDefault();
      e.stopPropagation();
      this.shown = true;
      return false;
    },

    reset() {
      this.shown = false;
    }
  },

  template: `
<div class="d-inline px-2">
  <a href="#" class="info" @click="click">i</a>
  <ok v-if="shown" @ok="reset" :title="title"><slot /></ok>
</div>
  `,
});


Vue.component('Section', {
  props: ['title', 'notitle', 'back'],

  template: `
<div class="section-wrapper">
  <h4 v-if="!notitle" class="section-title">
    <slot name="title-pre" />
    {{title}}
    <slot name="title-post" />
  </h4>

  <div class="section-content">
    <slot />
  </div>
</div>
  `,
});
