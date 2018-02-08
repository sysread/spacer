define(function(require, exports, module) {
  const Npc     = require('npc');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');

  require('component/common');
  require('component/card');
  require('component/plot');

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
        return window.setTimeout(() => { this.turn() }, 30);
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

      nearbyBodies: function() {
        const ranges   = system.ranges([0, 0, 0]);
        const min_dist = Math.max(ranges[this.plan.origin], ranges[this.plan.dest]);
        const bodies   = {};

        for (const body of Object.keys(ranges)) {
          if (body == this.plan.origin) continue;
          if (body == this.plan.dest) continue;
          if (system.central(body) !== 'sun')  continue;
          if (ranges[body] <= min_dist) {
            bodies[body] = system.position(body);
          }
        }

        return bodies;
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

          if (game.planets[body].faction.inspectionChance(km)) {
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
        flip:  this.plan.flipDistance,
        max:   1.2 * this.plan.flipDistance,
        midpt: Physics.segment(
          game.planets[this.plan.origin].position,
          game.planets[this.plan.dest].position,
          this.plan.flipDistance,
        ),
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
      coords: function() { return this.plan.coords },
      orig:   function() { return game.planets[this.plan.origin] },
      dest:   function() { return game.planets[this.plan.dest] },
    },
    methods: {
      zero:   function()  { return this.$el ? Math.floor(this.$el.clientWidth / 2) : 0 },
      center: function(p) { return [p[0] - this.midpt[0], p[1] - this.midpt[1]] },

      extras: function() {
        const extras = {};
        const max = this.max;

        for (const p of Object.values(game.planets)) {
          if (p.central !== 'sun'          // moon
           || this.orig.central === p.body // origin is planet's moon
           || this.dest.central === p.body // destination is planet's moon
           || p.body === this.orig.body    // planet is origin
           || p.body === this.dest.body    // planet is destination
           || Physics.distance(p.position, this.midpt) > max) // planet is outside view
          {
            continue;
          }

          extras[p.body] = p.position;
        }

        return extras;
      },

      adjust: function(n) {
        const zero = this.zero();
        const pct  = n / this.max;
        return zero + (zero * pct);
      },

      position: function(p) {
        const [x, y] = this.center(p);
        return {
          'left': this.adjust(x) + 'px',
          'top':  this.adjust(y) + 'px',
        };
      },
    },
    template: `
<div v-square class="plot-root p-0 m-0" style="position:relative">
  <span v-for="(pt, body) in extras()" class="plot-point text-center align-middle" :style="position(pt)">&bull; <badge class="m-1">{{body|caps}}</badge></span>
  <span class="plot-point text-center text-info    align-middle big" :style="position(orig.position)">&bull; <badge class="m-1">{{orig.body|caps}}</badge></span>
  <span class="plot-point text-center text-danger  align-middle big" :style="position(dest.position)">&#8982; <badge class="m-1">{{dest.body|caps}}</badge></span>
  <span class="plot-point text-center text-warning align-middle big" :style="position([0,0,0])">&bull;</span>
  <span class="plot-point text-center text-success align-middle big" :style="position(coords)">&#9652;</span>
</div>
    `,
  });

  Vue.component('transit-inspection', {
    props: ['faction', 'body', 'distance'],
    data: function() {
      return {
        npc: new Npc({
          label:     'Police Patrol',
          faction:   this.faction,
          shipClass: util.oneOf(['corvette', 'frigate', 'destroyer'])
        }),
        choice: 'ready',
        fine: 0,
      };
    },
    computed: {
      planet: function() { return game.planets[this.body] },
      bribeAmount: function() { return Math.ceil(game.player.ship.price() * 0.03) },
      canAffordBribe: function() { return this.bribeAmount <= game.player.money },
    },
    methods: {
      setChoice(choice) {
        this.choice = choice || 'ready';
      },

      submit: function() {
        let fine = 0;
        for (const [item, amt] of game.player.ship.cargo.entries()) {
          if (data.resources[item].contraband) {
            fine += amt * this.planet.faction.inspectionFine();
          }
        }

        this.fine = Math.min(fine, game.player.money);

        if (this.fine > 0) {
          game.player.debit(this.fine);

          for (const [item, amt] of game.player.ship.cargo.entries()) {
            if (amt > 0 && data.resources[item].contraband) {
              game.player.ship.cargo.set(item, 0);
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
<card title="Police inspection" :subtitle="faction">
  <card-text>
    You have been hailed by a {{faction}} patrol ship operating {{distance}} AU
    out of {{body|caps}}. The captain orders you to cease acceleration and
    peacefully submit to an inspection.
  </card-text>

  <button type="button" class="btn btn-dark btn-block" @click="submit">Submit</button>
  <button type="button" class="btn btn-dark btn-block" @click="setChoice('bribe')">Bribe</button>
  <button type="button" class="btn btn-dark btn-block" @click="setChoice('flee')">Flee</button>

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
</card>
    `,
  });
});
