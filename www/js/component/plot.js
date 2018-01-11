define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const util    = require('util');
  const system  = require('system');
  const Physics = require('physics');
  const Game    = require('game');
  const NavComp = require('navcomp');

  require('component/card');
  require('component/modal');
  require('component/exchange');
  require('component/summary');
  require('component/navigation');

  function adjustPoint(n) {
    if (n === 0) return 1;

    const inc = 0.25;
    const abs = Math.abs(n);
    let adj = 1;

    for (let i = 100; (i > abs) && (((adj + inc) * abs) < 100); i -= 10) {
      adj += inc;
    }

    return adj;
  }

  Vue.component('plot', {
    data: function() {
      const points  = system.plot().points;
      const plot    = {};
      const visible = [];
      let selected  = null;

      for (const body of Object.keys(points)) {
        const [x, y] = points[body];
        const key = `p-${Math.ceil(x)}-${Math.ceil(y)}`;

        if (!plot.hasOwnProperty(key)) {
          plot[key] = [];
          visible.push(body);
        }

        plot[key].push(body);

        if (body === Game.game.locus) {
          selected = key;
        }
      }

      return {
        plot:     plot,
        points:   points,
        visible:  visible,
        selected: selected,
        modal:    null,
        plotted:  null,
        navComp:  new NavComp,
      };
    },
    directives: {
      'plot': {
        inserted: function(el, binding, vnode) {
          el.setAttribute('style', `height:${el.clientWidth}px`);

          const zero   = Math.ceil(el.clientWidth / 2);
          const points = document.getElementsByClassName('plot-point');

          for (const point of points) {
            const key  = point.getAttribute('data-key');
            const x    = parseInt(point.getAttribute('data-x'), 10);
            const y    = parseInt(point.getAttribute('data-y'), 10);
            const left = Math.ceil(zero + (zero * x * adjustPoint(x) / 100));
            const top  = Math.ceil(zero + (zero * y * adjustPoint(y) / 100));
            point.setAttribute('style', `left:${left}px;top:${top}px`);
          }
        }
      }
    },
    methods: {
      isSun:  function(body){ return body === 'sun' },
      isHere: function(body){ return body === Game.game.locus },
      place:  function(body){ return Game.game.place(body) },

      label: function(body) {
        const central = system.central(body);
        let name = system.name(body);

        if (central && central !== 'sun')
          name += ` (${system.name(central)})`;

        return name;
      },

      key: function(body) {
        const [x, y] = this.points[body];
        return `p-${Math.ceil(x)}-${Math.ceil(y)}`;
      },

      beginTransit: function(body, selected) {
        $('#spacer').data('info', this.navComp.transits[body][selected].transit);
        this.modal = null;
        this.plotted = null;
        $('.modal-backdrop').remove(); // TODO make this less hacky
        Game.open('transit');
        $('#spacer').data('state', 'transit');
      },
    },
    template: `
<card v-plot class="plot-root p-0 m-0" nopad=true>
  <div @click.self="selected=null" style="position:absolute; width:100%; height:100%; left: 0; top 0;">
    <span v-for="body of visible">
      <a href="#"
         class="plot-point"
         @click.prevent="selected=key(body)"
         :data-key="key(body)"
         :data-x="points[body][0]" 
         :data-y="points[body][1]"
         :class="{'text-warning':isSun(body),'text-success':isHere(body),'font-weight-bold':isSun(body)||isHere(body)}">
        &bull;

        <ul v-if="key(body) === selected" class="plot plot-selected badge badge-dark">
          <li v-for="body of plot[key(body)]">
            <button type="button" class="btn btn-dark btn-block" @click="modal=isSun(body) ? null : body">{{label(body)}}</button>
          </li>
        </ul>
      </a>
    </span>

    <modal v-if="modal" :title="label(modal)" nopad=true xclose=true close="Close" @close="modal=null">
      <place-summary mini=true :place="place(modal)" class="m-0" />
      <button slot="footer" type="button" class="btn btn-dark" @click="plotted=modal">
        Plot course
      </button>
    </modal>

    <nav-plan v-if="plotted" @engage="beginTransit" @close="plotted=null" :body="plotted" :navcomp="navComp" />
  </div>
</card>
    `,
  });
});
