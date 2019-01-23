define(function(require, exports, module) {
  "use strict"

  const util = require('util');
  const Vue  = require('vendor/vue');

  require('component/global');
  require('component/common');
  require('component/modal');
  require('component/card');
  require('component/row');
  require('component/exchange');

  Vue.component('work', {
    data: function() {
      return {
        days:        1,
        task:        null,
        result:      null,
        hitQuota:    false,
        isReady:     false,
        isFinished:  false,
        turnsWorked: 0,
        contract:    null,
      };
    },

    computed: {
      player()        { return this.game.player },
      raise()         { return this.player.getStandingPriceAdjustment(this.planet.faction.abbrev) },
      planet()        { return this.game.here },
      tasks()         { return this.planet.work_tasks.map(name => this.data.work.find(work => work.name == name)) },
      payRate()       { if (this.task) return this.getPayRate(this.task) },
      pay()           { if (this.task) return this.payRate * this.days },
      turns()         { return this.days * (24 / this.data.hours_per_turn) },
      percent()       { return Math.min(100, Math.ceil(this.turnsWorked / this.turns * 100)) },
      timeSpent()     { return Math.floor(this.turnsWorked / this.data.turns_per_day) },
      hasPicketLine() { return this.planet.hasPicketLine() },
    },

    methods: {
      getPayRate: function(task) {
        return this.planet.payRate(this.player, task);
      },

      hasTask: function(task) {
        if (this.task === null) return false;
        return task ? this.task.name === task.name : true;
      },

      clearTask: function() {
        this.days        = 1;
        this.task        = null;
        this.result      = null;
        this.hitQuota    = false;
        this.isReady     = false;
        this.isFinished  = false;
        this.turnsWorked = 0;
      },

      setTask: function(task) {
        this.clearTask();
        this.task = task;
        this.isReady = true;
      },

      performWork: function() {
        if (this.isReady && !this.isFinished) {
          this.isReady = false;
          const reward = this.planet.work(this.player, this.task, this.days);
          this.hitQuota = Math.floor(reward.items.sum()) > 0 ? true : false;

          let timer; timer = window.setInterval(() => {
            ++this.turnsWorked;

            if (this.turnsWorked == this.turns) {
              window.clearTimeout(timer);
              this.isFinished = true;
              this.player.credit(reward.pay);
              this.result = reward.items;

              // Working increases standing no higher than "Respected"
              if (!this.player.hasStanding(this.planet.faction.abbrev, 'Admired')) {
                this.player.incStanding(this.planet.faction.abbrev, 1);
              }

              this.game.turn(this.turns);
            }
          }, 350);
        }
      },

      completeTask: function() {
        this.clearTask();
        this.game.save_game();
      },

      setContract: function(contract) {
        this.contract = contract;
      },

      clearContract: function() {
        this.contract = null;
      },

      acceptContract: function() {
        if (this.contract) {
          this.contract.mission.accept();
          this.game.save_game();
        }

        this.clearContract();
      },
    },

    template: `
<div>
  <card title="Work crews">
    <card-text>
      <p>Despite ever-growing levels of automation, there are many tasks for which
      it is not possible or cost effective to employ machines. Sometimes all a
      task requires a warm body to sit in the seat, push the button, and take the
      blame.</p>

      <p>The recruiting terminal displays a number of work crews looking for day
      laborers to fill in gaps or for a short term production boost. The work is
      often strenuous, the hours typically long, and the pay is generally low,
      with the only real benefit being the opportunity to keep any materials
      harvested over the daily quota.</p>
    </card-text>

    <card-text v-if="hasPicketLine" class="font-italic text-warning">
      Preventing access to the terminal, a sizable group of local workers are
      lined up to form a physical barrier. A few security personal are in
      evidence, hanging around the edges and ensuring that the protests do not
      get out of hand. Being a union member yourself, you do not feel that you
      can cross the picket line. If you want work, you will have to find it
      elsewhere.
    </card-text>

    <card-text v-else-if="tasks.length > 0">
      <btn v-for="t in tasks" :key="t.name" @click="setTask(t)" block=1>
        {{t.name}} <badge right=1>{{getPayRate(t)}}c</badge>
      </btn>
    </card-text>

    <card-text v-else class="font-italic text-warning">
      There are no jobs currently available. A wall screen displays the face of a
      local council member assuring you that another soon-to-be-passed tax cut
      for job producers practically guarantees more jobs in the future.
    </card-text>

    <modal v-if="task" @close="completeTask()" :xclose="isReady" :title="task.name" footer=1 :static="isReady">
      <div v-if="isReady">
        <p><i>{{task.desc}}</i></p>
        <p>Working at a daily wage of <gold>{{payRate}}</gold> credits for <gold>{{days}}</gold> days will earn <gold>{{pay}}</gold> credits.</p>
        <p><slider :value.sync="days" minmax=true min=1 max=7 step=1 /></p>
      </div>

      <div v-else-if="isFinished && hitQuota">
        <p>In addition to {{pay}} credits in wages, your crew collected extra resources over the quota which you are entitled to keep:</p>
        <exchange :store="result" style="font-size: 0.9em" />
      </div>

      <div v-else-if="isFinished && !hitQuota">
        <p>We appreciate you helping out. No luck on beating the quota, but you did earn an honest paycheck to the tune of {{pay}} credits.</p>
      </div>

      <div v-else-if="!isFinished && !isReady">
        <progress-bar :percent="percent" width=100 hide_pct=1>
          {{timeSpent}} days
        </progress-bar>
      </div>

      <btn slot="footer" v-if="isReady" @click="performWork">Get to work</btn>
      <btn slot="footer" v-if="isFinished && hitQuota" close=1>Complete transfer</btn>
      <btn slot="footer" v-if="isFinished && !hitQuota" close=1>Grumble, grumble...</btn>
    </modal>
  </card>

  <card title="Contracts" class="my-3">
    <card-text v-if="planet.contracts.length == 0" class="font-italic text-warning">
      There are no contracts available at this time.
    </card-text>

    <template v-else>
      <card-text>
        There are several long term contracts are posted on the local job
        boards accessible on your personal comm.
      </card-text>

      <card-text>
        <btn v-for="c in planet.contracts" :key="c.mission.title" @click="setContract(c)" block=1>
          {{c.mission.short_title}}
          <badge right=1>{{c.mission.price|csn}}c</badge>
        </btn>
      </card-text>

      <modal v-if="contract" @close="clearContract()" footer=1 xclose=1 title="Contract Details">
        <h5>{{contract.mission.title}}</h5>
        <div>{{ contract.mission.description }}</div>

        <btn slot="footer" @click="acceptContract" close=1>Accept contract</btn>
        <btn slot="footer" @click="clearContract" close=1>No thank you</btn>
      </modal>
    </template>
  </card>
</div>
    `,
  });
});
