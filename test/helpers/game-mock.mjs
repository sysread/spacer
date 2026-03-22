/**
 * Minimal window.game mock for tests that need game state.
 *
 * Sets up window.game with enough structure for Planet delegates
 * (pricing, commerce, contracts) to function. Call installGameMock()
 * in a beforeEach and removeGameMock() in afterEach.
 *
 * Usage:
 *   import { installGameMock, removeGameMock, mockGame } from './helpers/game-mock.mjs';
 *
 *   beforeEach(() => installGameMock());
 *   afterEach(() => removeGameMock());
 *
 *   it('does something', () => {
 *     // mockGame is the same object as window.game
 *     mockGame.turns = 100;
 *   });
 */

import { Planet } from '../../src/planet';
import { Person } from '../../src/person';
import * as t from '../../src/common';

let _mockGame = null;

export function createMockPlayer() {
  return new Person({
    name: 'Test Player',
    ship: { type: 'schooner' },
    faction_name: 'CERES',
    home: 'ceres',
    money: 50000,
    standing: {},
  });
}

export function installGameMock(opts = {}) {
  const planets = {};

  for (const body of t.bodies) {
    planets[body] = new Planet(body);
  }

  _mockGame = {
    turns: opts.turns || 100,
    date: opts.date || new Date(Date.UTC(2242, 0, 1, 12, 0, 0)),
    frozen: false,
    transit_plan: null,
    locus: 'ceres',
    player: opts.player || createMockPlayer(),
    planets: planets,
    notifications: [],
    notify: (msg) => {
      _mockGame.notifications.push(msg);
    },
    strdate: (d) => d.toISOString(),
    get_conflicts: () => [],
    here: null,  // set after planets are built
  };

  _mockGame.here = planets['ceres'];
  window.game = _mockGame;
  return _mockGame;
}

export function removeGameMock() {
  delete window.game;
  _mockGame = null;
}

/** Direct reference to the current mock game object. */
export function getMockGame() {
  return _mockGame;
}
