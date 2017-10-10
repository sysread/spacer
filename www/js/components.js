Moon.extend('btn', {
  props    : ['disabled', 'addclass', 'toggle', 'target', 'dismiss'],
  template : '<button type="button" class="{{classes()}}" m-on:click="activate" data-toggle="{{toggle()}}" data-target="{{target()}}" data-dismiss="{{dismiss()}}"><m-insert></m-insert></button>',
  methods  : {
    classes() {
      let classes = ['btn', 'btn-dark', 'mx-1'];
      if (this.get('disabled')) classes.push('disabled');
      if (this.get('addclass')) classes.push(this.get('addclass'));
      return classes.join(' ');
    },
    activate() {this.emit('activate')},
    toggle()   {return this.get('toggle')  || ''},
    target()   {return this.get('target')  || ''},
    dismiss()  {return this.get('dismiss') || ''},
  }
});

Moon.extend('muted',  {template: '<span class="text-muted"><m-insert></m-insert></span>'});
Moon.extend('caps',   {template: '<span class="text-capitalize"><m-insert></m-insert></span>'});
Moon.extend('proper', {template: '<span class="font-weight-bold text-capitalize"><m-insert></m-insert></span>'});

Moon.extend('card',     {template: '<div class="card m-3"><m-insert></m-insert></div>'});
Moon.extend('cardhead', {template: '<div class="card-header"><m-insert></m-insert></div>'});
Moon.extend('cardbody', {template: '<div class="card-body bg-black"><m-insert></m-insert></div>'});
Moon.extend('cardtext', {template: '<p class="card-text"><m-insert></m-insert></p>'});

Moon.extend('modal', {
  props    : ['id', 'static', 'size'],
  template : '<div id="{{id}}" class="modal" data-backdrop="{{backdrop()}}"><div class="modal-dialog{{size()}}"><div class="modal-content"><m-insert></m-insert></div></div></div>',
  methods  : {
    backdrop() {
      if (this.get('static')) return 'static';
      return 'true';
    },

    size() {
      const sz = this.get('size');
      if (sz) return ' modal-' + sz;
      return '';
    },
  }
});

Moon.extend('modalhead',   {template: '<div class="modal-header"><m-insert></m-insert></div>'});
Moon.extend('modaltitle',  {template: '<h5 class="modal-title"><m-insert></m-insert></h5>'});
Moon.extend('modalbody',   {template: '<div class="modal-body"><m-insert></m-insert></div>'});
Moon.extend('modalfooter', {template: '<div class="modal-footer"><m-insert></m-insert></div>'});
Moon.extend('modalclose',  {template: '<button type="button" class="btn btn-dark" data-dismiss="modal"><m-insert></m-insert></button>'});

Moon.extend('term', {template: '<div class="col-sm-5 py-1"><strong><m-insert></m-insert></strong></div>'});
Moon.extend('def',  {template: '<div class="col-sm-7 py-1"><muted><m-insert></m-insert></muted></div>'});

Moon.extend('shipinfo', {
  props: ['sc'],

  template: `
<div>
  <p m-show="hasDescription">
    {{description}}
  </p>
  <div class="row">
    <term>Price</term>          <def>{{csn(price)}} cr</def> 
    <term>Max range</term>      <def>{{csn(maxRange)   }} AU ({{csn(maxBurn)   }} hours at {{toGs(maxDeltaV)}} Gs)</def>
    <term>Cruising range</term> <def>{{csn(cruiseRange)}} AU ({{csn(cruiseBurn)}} hours at {{toGs(cruiseDeltaV)}} Gs)</def>
    <term>Drive</term>          <def><caps>{{ship.shipclass.drive}}</caps> ({{ship.shipclass.drives}})</def>
    <term>Thrust</term>         <def>{{csn(ship.thrust)}} N</def>
    <term>Fuel</term>           <def>{{ship.shipclass.tank}}</def>
    <term>Hull mass</term>      <def>{{csn(ship.shipclass.mass)}} tonnes</def>
    <term>Drive mass</term>     <def>{{csn(ship.driveMass)}} tonnes</def>
    <term>Total mass</term>     <def>{{csn(ship.currentMass())}} tonnes (fueled)</def>
    <term>Cargo</term>          <def>{{ship.shipclass.cargo}}</def>
    <term>Hull</term>           <def>{{ship.shipclass.hull}}</def>
    <term>Armor</term>          <def>{{ship.shipclass.armor}}</def>
    <term>Hardpoints</term>     <def>{{ship.shipclass.hardpoints}}</def>
  </div>
</div>
`,

  computed: {
    price: {
      get: function() {
        let price = this.get('ship').price();
        price += price * game.place().sales_tax;
        return Math.ceil(price);
      }
    },
    ship: {
      get: function() {
        return new Ship({shipclass: this.get('sc')});
      }
    },
    hasDescription: {
      get: function() {
        return data.shipclass[this.get('sc')].hasOwnProperty('desc');
      }
    },
    description: {
      get: function() {
        return data.shipclass[this.get('sc')].desc || '';
      }
    },
    maxDeltaV: {
      get: function() {
        return this.get('ship').currentAcceleration();
      }
    },
    maxBurn: {
      get: function() {
        const dv = this.get('maxDeltaV');
        return this.get('ship').maxBurnTime(dv, true) * data.hours_per_turn;
      }
    },
    maxRange: {
      get: function() {
        const dv = this.get('maxDeltaV');
        const bn = this.get('maxBurn');
        return R(Physics.AU(Physics.range(bn * 3600, 0, dv)));
      }
    },
    cruiseDeltaV: {
      get: function() {
        return Math.min((0.5 * Physics.G()), (this.get('maxDeltaV') * 0.6))
      }
    },
    cruiseBurn: {
      get: function() {
        const dv = this.get('cruiseDeltaV');
        return this.get('ship').maxBurnTime(dv, true) * data.hours_per_turn;
      }
    },
    cruiseRange: {
      get: function() {
        const dv = this.get('cruiseDeltaV');
        const bn = this.get('cruiseBurn');
        return R(Physics.AU(Physics.range(bn * 3600, 0, dv)));
      }
    },
  },

  methods: {
    toGs(n) { return R(Physics.G(n), 2) },
    csn(n)  { return csn(n) },
  },
});
