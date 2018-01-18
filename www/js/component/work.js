define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');
  const Game = require('game');
  const Vue  = require('vendor/vue');

  require('component/common');
  require('component/modal');
  require('component/card');
  require('component/row');
  require('component/exchange');

  Vue.component('work', {
    data: function() {
      return {
        payRate:    Game.game.place().payRate,
        days:       1,
        modal:      null,
        inProgress: false,
        result:     null,
        quota:      false,
      };
    },
    computed: {
      pay:   function() {return this.payRate * this.days},
      turns: function() {return Math.ceil(this.days * 24 / data.hours_per_turn)},
    },
    methods: {
      harvest: function() {
        this.inProgress = true;
        this.result     = Game.game.place().harvest(this.turns);
        this.quota      = this.result.sum() > 0;
        Game.game.turn(this.turns);
        Game.game.player.credit(this.pay);
        Game.game.refresh();
        Game.game.save_game();
        this.modal = 'collect';
      },
      complete: function() {
        this.modal      = '';
        this.result     = null;
        this.quota      = false;
        this.days       = 1;
        this.inProgress = false;
        Game.game.refresh();
        Game.game.save_game();
      },
    },
    template: `
<div>
  <card title="Work crews">
    <card-text>
      Sometimes you may find yourself stuck somewhere for a while or you just
      need to make a few extra bucks to put you ahead. In those situations, you
      can find work on one of the numerous work crews hiring short term laborers
      to help mine water ice, minerals, ore, or even to hep with the work. The
      pay isn't great, but if you work hard and end up over quota, you are often
      allowed to keep your take.
    </card-text>
    <card-footer slot="footer">
      <btn @click="modal = 'recruiter'" block=1>Get a job</btn>
    </card-footer>
  </card>

  <modal v-if="modal === 'recruiter'" @close="modal = null" title="Recruiter" close="Close" xclose=true>
    <p>The pay is {{payRate}} c/day. You get to keep anything you collect over the quota. How long are you available for?</p>
    <def term="Days" :def="days" />
    <def term="Pay"  :def="pay" />
    <slider :value.sync="days" minmax=true min=1 max=7 step=1 />
    <btn slot="footer" @click="harvest" :class="{disabled:inProgress}" :disabled="inProgress" block=1>Get to work</btn>
  </modal>

  <modal v-if="modal === 'collect'" title="Rewards" footer=true>
    <div v-if="quota">
      <p>In addition to {{pay}} c in wages, your crew collected extra resources over the quota which you are entitled to keep:</p>
      <exchange :store="result" style="font-size: 0.9em" />
    </div>
    <div v-else>
      <p>We appreciate you helping out. No luck on beating the quota, but you did earn an honest paycheck to the tune of {{pay}} c.</p>
    </div>

    <button v-if="quota" @click="complete" slot="footer" type="button" class="btn btn-dark" data-dismiss="modal">Complete transfer</button>
    <button v-else       @click="complete" slot="footer" type="button" class="btn btn-dark" data-dismiss="modal">Grumble, grumble...</button>
  </modal>
</div>
    `,
  });
});
