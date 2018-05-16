define(function(require, exports, module) {
  const PIXI     = require('vendor/pixi');
  const Physics  = require('physics');
  const System   = require('system');
  const NavComp  = require('navcomp');
  const data     = require('data');
  const util     = require('util');
  const graphics = require('graphics');


  const SCALE_DEFAULT_AU = 2;
  const SCALE_MIN_AU     = 0.05;
  const SCALE_MAX_AU     = 35;
  const EARTH_RADIUS     = System.body('earth').radius;


  const Body = class {
    constructor(name) {
      this.name = name;
    }

    get central() { return System.central(this.name) }
    get isMoon()  { return this.name !== 'sun' && this.central !== 'sun' }
    get radius()  { return System.body(this.name).radius }

    get color() {
      return this.name === 'sun'                   ? 0xffff00
           : data.bodies.hasOwnProperty(this.name) ? 0xcccccc
                                                   : 0x444444;
    }

    getTruePosition()           { return this.name == 'sun' ? [0,0,0] : System.position(this.name) }
    getTruePositionAt(dateTime) { return this.name == 'sun' ? [0,0,0] : System.position(this.name, dateTime) }
    getOrbitByTurns()           { return System.orbit_by_turns(this.name) }
    getOrbit()                  { return System.orbit(this.name) }
  };


  const Plot = class extends graphics.UI {
    constructor(opt) {
      super(opt);

      this.setVisibleField(SCALE_DEFAULT_AU);

      this.bodies = {};

      // Add bodies to render
      const bodies = System.bodies();
      bodies.unshift('sun');

      for (const name of bodies) {
        const body = new Body(name);
        this.bodies[name] = body;

        // Calculate relative position
        const [x, y, z] = body.getTruePosition();

        // Calculate relative size
        this.graphics.beginFill(body.color);
        this.graphics.drawCircle(x, -y, body.radius / Physics.AU * SCALE_MAX_AU);
        this.graphics.endFill();
      }
    }

    setVisibleField(au) {
      super.setScale(SCALE_MAX_AU / au);
    }
  };


  exports.Body = Body;
  exports.Plot = Plot;
});
