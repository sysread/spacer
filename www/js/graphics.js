define(function(require, exports, module) {
  const PIXI    = require('vendor/pixi');
  const Physics = require('physics');
  const System  = require('system');
  const NavComp = require('navcomp');
  const data    = require('data');
  const util    = require('util');

  const UI = class {
    constructor(opt) {
      this.opt = opt;

      // Build PIXI app
      this.app = new PIXI.Application({
        width:       this.size,
        height:      this.size,
        forceCanvas: true,
        transparent: false,
      });

      this.app.renderer.autoResize = true;
      this.app.renderer.backgroundColor = 0x000000;

      this.graphics = new PIXI.Graphics;
      this.app.stage.addChild(this.graphics);
    }

    get size() { return this.opt.size }

    inject(elt) {
      elt.appendChild(this.app.view);
    }

    setScale(scale) {
console.log('setScale', scale);
      this.graphics.scale.x = scale;
      this.graphics.scale.y = scale;
    }

    center() {
console.log('center');
      this.setPosition(0, 0);
    }

    setPosition(x=0, y=0) {
console.log('setPosition', [x, y]);
      this.graphics.position.x = x;
      this.graphics.position.y = y;
    }

    incPosition(x=0, y=0) {
console.log('incPosition', [x, y]);
      this.graphics.position.x += x;
      this.graphics.position.y += y;
    }
  };


  exports.UI = UI;
}); 
