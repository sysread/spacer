<template>
    <div class="p-3">
      <div v-if="choice=='ready'">
        <p>
          The lights go dim as an emergency klaxxon warns you that your ship has been
          targeted by an incoming pirate <b class="text-warning">{{$caps(npc.ship.type)}}</b>.
          Its transponder is off, but its make and markings suggest that may be aligned
          with {{npc.faction.abbrev}}, indicating that it might be a privateer. Of course,
          the ship could just as easily have been stolen.

          Before long, the radio begins to chirp, notifying you of the pirate's ultimatum.
        </p>

        <button type="button" class="btn btn-dark w-100" @click="setChoice('flee')">Flee</button>
        <button type="button" class="btn btn-dark w-100" @click="setChoice('submit')">Surrender ship</button>
        <button type="button" class="btn btn-dark w-100" @click="setChoice('attack')">Defend yourself</button>
      </div>

      <melee v-if="choice=='attack'" :opponent="npc" :init_flee="init_flee" @complete="done" />

      <ask v-if="choice=='submit'" @pick="setChoice" :choices="{'submit-yes': 'I am certain', 'ready': 'Nevermind'}">
        If you surrender to the pirates, they will help themselves to your
        cargo, but probably spare your life. Are you certain you wish to
        do this?
      </ask>

      <ok v-if="choice=='submit-yes'" @ok="done">
        <p>
          Armed pirates board your ship, roughing you and your crew up while
          they take anything of value they can fit aboard their ship. Forcing
          you to help with the loading, the pirates plunder your ship's hold.
        </p>

        <template v-if="took.count > 0">
          <p>
            The pirates plundered the following resources from your ship:
          </p>
          <ul>
            <template v-for="(count, item) of took.items" :key="item"><li v-if="count > 0">
              {{count}} {{item}}
            </li></template>
          </ul>

          <template v-if="gave.count > 0">
            <p>
              To make room for what was taken, the following lower value items
              were put into your hold:
            </p>
            <ul>
              <template v-for="(count, item) of gave.items" :key="item"><li v-if="count > 0">
                {{count}} {{item}}
              </li></template>
            </ul>
          </template>
        </template>

        <p v-else>
          Disgusted at the lack of valuable goods in your hold, the pirates
          merely raid the galley, taking the little fresh produce you were
          able to acquire at your last stop as well as any booze they found
          in the crew cabins.
        </p>
      </ok>

      <ok v-if="choice=='bounty'" @ok="done">
        According to the last data dump before your departure, there is a
        bounty for the elimination of this pirate. Your account has been
        credited {{$csn(bounty)}} credits, effective as soon as light from
        the event reaches the nearest patrol. As a result, your standing
        with {{nearest_faction}} has increased.
      </ok>
    </div>
</template>

<script>
import NPC from '../npc';
import * as util from '../util';
import * as tc from './transit-controller';

export default {
  props: ['nearest', 'faction'],

  data() {
    const faction = this.faction || util.oneOf(['UN', 'MC', 'CERES', 'JFT', 'TRANSA']);

    const npc = new NPC({
      name:          'Pirate',
      faction:       faction,
      ship:          ['shuttle', 'schooner', 'cutter', 'guardian', 'corvette'],
      always_addons: ['pds'],
      addons:        ['railgun_turret', 'light_torpedo', 'ecm', 'armor'],
      min_addons:    2,
    });

    const ship_value = npc.ship.shipValue(window.game.here.pricing) + npc.ship.addOnValue();
    const bounty = Math.ceil(ship_value / 20);

    return {
      choice:    'ready',
      took:      null,
      gave:      null,
      init_flee: false,
      bounty:    bounty,
      npc:       npc,
    };
  },

  computed: {
    nearest_faction() { return this.data.bodies[this.nearest].faction }
  },

  methods: {
    setChoice(choice) {
      if (choice == 'flee') {
        this.init_flee = true;
        choice = 'attack';
      }

      if (choice == 'submit-yes') {
        const plunder = this.plunder();
        this.took = plunder.took;
        this.gave = plunder.gave;
      }

      this.choice = choice || 'ready';
    },

    plunder() {
      return tc.executePlunder(this.game.player.ship, this.npc.ship);
    },

    done(result, rounds) {
      if (result == 'destroyed') {
        this.$emit('dead');
      }
      else if (result == 'player-surrendered') {
        this.setChoice('submit-yes');
      }
      else if (result == 'won' || result == 'opponent-surrendered') {
        this.setChoice('bounty');
        this.game.player.credit(this.bounty);
        this.game.player.incStanding(this.nearest_faction, util.getRandomInt(1, 10));
        this.game.player.decStanding(this.data.bodies[this.npc.faction.abbrev], util.getRandomInt(1, 5));
      }
      else {
        this.choice = 'ready';
        this.$emit('done', Math.max(rounds || 0, 0));
      }
    },
  },
};
</script>
