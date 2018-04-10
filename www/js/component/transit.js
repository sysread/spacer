define(function(require, exports, module) {
  const Npc     = require('npc');
  const Ship    = require('ship');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');

  require('component/common');
  require('component/card');
  require('component/plot');
  require('component/combat');

  Vue.component('transit', {
    props: ['plan'],
    data: function() {
      return {
        timer: this.schedule(),
        stoppedBy: {},
        inspection: null,
        daysLeft: null,
        velocity: null,
      };
    },
    computed: {
      destination: function() { return system.name(this.plan.dest) },
    },
    methods: {
      schedule: function() {
        this.inspection = null;
        this.velocity = this.plan.velocity;
        this.daysLeft = Math.floor(this.plan.left * data.hours_per_turn / 24);
        this.distance = util.R(this.plan.auRemaining(), 2);
        return window.setTimeout(() => { this.turn() }, 75);
      },

      turn: function() {
        if (this.plan.left > 0) {
          if (this.inspectionChance()) {
            return;
          }
          else {
            game.turn(1, true);
            game.player.ship.burn(this.plan.accel);
            this.plan.turn();
            this.timer = this.schedule();
          }
        }
        else {
          window.clearTimeout(this.timer);
          this.timer = null;
          $('#spacer').data({state: null, data: null});
          game.transit(this.plan.dest);
          game.open('summary');
        }
      },

      nearby: function() {
        const ranges = system.ranges(this.plan.coords);
        const bodies = {};

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;

          if (au <= data.jurisdiction) {
            bodies[body] = ranges[body];
          }
        }

        return bodies;
      },

      inspectionChance: function() {
        if (this.plan.velocity >= 750000)
          return;

        const ranges = this.nearby();

        for (const body of Object.keys(ranges)) {
          const km = Math.floor(ranges[body] / 1000);

          if (game.planets[body].inspectionChance(km)) {
            const faction = data.bodies[body].faction;

            if (this.stoppedBy[faction]) {
              continue;
            }
            else {
              const dist = util.R(Physics.distance(this.plan.coords, system.position(body)) / Physics.AU, 3);
              this.stoppedBy[faction] = true;
              this.inspection = {
                body:     body,
                faction:  data.bodies[body].faction,
                distance: dist,
              };

              return true;
            }
          }
        }

        return false;
      },
    },
    template: `
<div class="p-0 m-0">
  <card>
    <card-header slot="header">
      Transiting from {{plan.origin|caps}} to {{plan.dest|caps}}
    </card-header>

    <table class="table table-sm my-2">
      <tr>
        <th scope="col">Time</th>
        <td>{{daysLeft|R|unit('days')}}</td>
        <th scope="col">Distance</th>
        <td>{{distance|R(1)|unit('AU')}}</td>
      </tr>
      <tr>
        <th scope="col">Status</th>
        <td>{{plan.pct_complete < 50 ? 'Accelerating' : 'Decelerating'}}</td>
        <th scope="col">Speed</th>
        <td>{{(velocity/1000)|R|csn|unit('km/s')}}</td>
      </tr>
    </table>

    <transit-plot v-show="!inspection" :plan="plan" />
    <transit-inspection v-if="inspection" @done="schedule" :body="inspection.body" :faction="inspection.faction" :distance="inspection.distance" class="my-3" />
  </card>
</div>
    `,
  });

  Vue.component('transit-plot', {
    props: ['plan'],
    data: function() {
      return {
        //midpt: Physics.segment(this.plan.start, this.plan.end, this.plan.flipDistance),
        dist: this.plan.dist,
      };
    },
    directives: {
      'square': {
        inserted: function(el, binding, vnode) {
          const len = Math.min(
            el.clientWidth,
            (window.innerHeight
              - document.getElementById('spacer-status').offsetHeight
              - document.getElementById('spacer-navbar').offsetHeight),
          );

          el.setAttribute('style', `position:relative;height:${len}px;width:${len}px`);
        },
      },
    },
    computed: {
      radius: function() { return Physics.distance(this.plan.coords, [0, 0, 0]) },
      coords: function() { return this.plan.coords },
      orig:   function() { return game.planets[this.plan.origin] },
      dest:   function() { return game.planets[this.plan.dest] },
    },
    methods: {
      extras: function() {
        // Blacklist primary bodies from appearing in this set
        const skip = {};
        skip[this.orig.body] = true; // origin
        skip[this.dest.body] = true; // destination
        if (this.orig.central !== 'sun') skip[this.orig.central] = true; // origin is the body's moon
        if (this.dest.central !== 'sun') skip[this.dest.central] = true; // destination is the body's mooon

        const extras = {};

        for (const p of Object.values(game.planets)) {
          if (skip[p.body] || skip[p.central]) {
            continue;
          }

          // For satellites, show the central planet
          if (p.central !== 'sun') {
            // ...but only one time
            if (!extras.hasOwnProperty(p.central)) {
              extras[p.central] = system.position(p.central);
            }
          }
          // Otherwise, show the planet itself
          else {
            extras[p.body] = p.position;
          }
        }

        return extras;
      },

      max: function() {
        const sun  = [0, 0, 0];
        const min  = Physics.AU * 2;
        const ship = Physics.distance(this.coords, sun);
        const to   = Physics.distance(this.plan.end, sun);

        if (ship > to) {
          return Math.max(min, to, ship * 1.8);
        }
        else {
          return Math.max(min, Math.min(to, ship * 1.8));
        }
      },

      isVisible: function(point) {
        const [x, y] = this.position(point).map(Math.abs);
        const max = this.width() * 1.2;
        if (x >= max || y >= max) return false;
        return true;
      },

      alpha: function(point) {
        const scale = Math.min(5, Math.ceil(this.max() / Physics.AU / 5));
        const au = Physics.distance(this.coords, point) / Physics.AU;
        return util.R(Math.min(1, scale / Math.max(au, scale)), 2);
      },

      width: function() {
        return this.$el ? this.$el.clientWidth : 0;
      },

      zero: function() {
        return Math.ceil(this.width() / 2);
      },

      adjust: function(n) {
        const zero = this.zero();
        const pct  = n / this.max();
        return Math.floor(zero + (zero * pct));
      },

      position: function(p) {
        return [this.adjust(p[0]), this.adjust(p[1])];
      },
    },
    template: `
<div v-square class="plot-root p-0 m-0" style="position:relative">
  <transit-point v-show="isVisible(pt)" v-for="(pt, body) in extras()" :key="body" :alpha="alpha(pt)" :coord="position(pt)" :label="body" :sm=1>&bull;</transit-point>
  <transit-point v-show="isVisible(orig.position)" class="text-info" :coord="position(orig.position)" :label="orig.body">&bull;</transit-point>
  <transit-point v-show="isVisible(dest.position)" class="text-danger" :coord="position(dest.position)" :label="dest.body">&#8982;</transit-point>
  <transit-point class="text-warning" :coord="position([0,0,0])">&bull;</transit-point>
  <transit-point class="text-success" :coord="position(coords)">&#9652</transit-point>
</div>
    `,
  });

  Vue.component('transit-point', {
    props: ['coord', 'label', 'sm', 'alpha'],
    template: `
<span class="plot-point" :class="{big: !sm}" :style="{left: coord[0] + 'px', top: coord[1] + 'px'}">
  <slot />
  <badge v-if="label" class="m-1" :style="{opacity: alpha}">{{label|caps}}</badge>
</span>
    `,
  });

  Vue.component('transit-inspection', {
    props: ['faction', 'body', 'distance'],
    data: function() {
      // TODO more (any) randomness in ship and loadout, customizations based
      // on faction and scale of origin body
      const ship = new Ship({
        type: util.oneOf(['corvette', 'frigate', 'destroyer']),
        addons: ['railgun_turret', 'light_torpedo', 'pds', 'ecm'],
      });

      return {
        npc: new Npc({
          name:    'Police Patrol',
          faction: this.faction,
          ship:    ship,
        }),
        choice: 'ready',
        fine: 0,
      };
    },
    computed: {
      planet: function() { return game.planets[this.body] },
      bribeAmount: function() { return Math.ceil(game.player.ship.price() * 0.03) },
      canAffordBribe: function() { return this.bribeAmount <= game.player.money },

      hasContraband: function() {
        for (const item of Object.keys(data.resources)) {
          if (data.resources[item].contraband) {
            if (game.player.ship.cargo.get(item) > 0) {
              return true;
            }
          }
        }

        return false;
      },
    },
    methods: {
      setChoice(choice) {
        this.choice = choice || 'ready';
      },

      submit: function() {
        let fine = 0;
        for (const item of game.player.ship.cargo.keys) {
          const amt = game.player.ship.cargo.count(item);
          if (data.resources[item].contraband) {
            fine += amt * this.planet.inspectionFine();
          }
        }

        this.fine = Math.min(fine, game.player.money);

        if (this.fine > 0) {
          game.player.debit(this.fine);

          for (const [item, amt] of game.player.ship.cargo.entries()) {
            if (amt > 0 && data.resources[item].contraband) {
              game.player.ship.cargo.dec(item, amt);
              game.player.decStanding(this.faction, data.resources[item].contraband);
            }
          }

          this.setChoice('submit-fined');
        }
        else {
          this.setChoice('submit-done');
        }
      },

      bribe: function() {
        game.player.debit(this.bribeAmount);
        this.done();
      },

      flee: function() {
        $('#spacer').data({state: null, data: null});
        window.localStorage.removeItem('game');
        game.open('newgame');
      },

      done: function() {
        this.choice = 'ready';
        this.$emit('done');
      },
   },
    template: `
<card :title="'Police inspection: ' + faction">
  <div v-if="choice=='ready'">
    <card-text>
      You have been hailed by a {{faction}} patrol ship operating {{distance}} AU
      out of {{body|caps}}. The captain orders you to cease acceleration and
      peacefully submit to an inspection.
    </card-text>

    <button type="button" class="btn btn-dark btn-block" @click="submit">Submit</button>
    <button type="button" class="btn btn-dark btn-block" @click="setChoice('bribe')">Bribe</button>
    <button type="button" class="btn btn-dark btn-block" @click="setChoice('flee')">Flee</button>
    <button type="button" class="btn btn-dark btn-block" @click="setChoice('attack-confirm')">Attack</button>
  </div>

  <ok v-if="choice=='submit-fined'" @ok="done">
    Your contraband cargo was found and confiscated.
    You have been fined {{fine|csn}} credits.
    Your reputation with {{faction}} has taken a serious hit.
  </ok>
  <ok v-if="choice=='submit-done'" @ok="done">
    No contraband was found.
    The police apologize for the inconvenience and send you on your way.
  </ok>

  <ask v-if="choice=='bribe'" @pick="setChoice" :choices="{'bribe-yes': 'Yes, it is my duty as a fellow captain', 'ready': 'No, that would be dishonest'}">
    After a bit of subtle back and forth, the patrol's captain intimates that they could use {{bribeAmount|csn}} for "repairs to their tracking systems".
    While making said repairs, they might miss a ship like yours passing by.
    Do you wish to contribute to the captain's maintenance efforts?
  </ask>
  <ok v-if="choice=='bribe-yes' && !canAffordBribe" @ok="setChoice(null)">
    You cannot do not have enough money to bribe this officer.
  </ok>
  <ok v-if="choice=='bribe-yes' && canAffordBribe" @ok="bribe">
    The, uh, "contribution" has been debited from your account. You are free to go.
  </ok>

  <ask v-if="choice=='flee'" @pick="setChoice" :choices="{'ready': 'Oh well', 'flee-run': 'Run for Proxima'}" class="text-warning">
    This isn't the an action movie.
    The captain of the patrol ship can read the navigation and tracking data as well as you and will eventually overtake your ship.
    That is, unless you are planning to make a run for Proxima...
  </ask>
  <ok v-if="choice=='flee-run'" @ok="flee" class="text-danger">
    You angle away and gun the engines.
    In just a 5 short years, your navigation computer flips the ship on automatic and begins the deceleration burn.
    Your corpse and those of your crew arrive at Proxima Centauri after perhaps 10 years, relativistic effects notwithstanding.
  </ok>

  <ask v-if="choice=='attack-confirm'" @pick="setChoice" :choices="{'attack': 'Yes', 'ready': 'No'}">
    Are you sure you wish to attack the police?
    <span v-if="!hasContraband">You are not carrying any contraband.</span>
  </ask>

  <melee v-if="choice=='attack'" :opponent="npc" @complete="done" />
</card>
    `,
  });
});
