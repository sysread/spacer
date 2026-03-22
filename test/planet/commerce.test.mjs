// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installGameMock, removeGameMock } from '../helpers/game-mock.mjs';
import * as t from '../../src/common';

let game;

beforeEach(() => { game = installGameMock(); });
afterEach(() => removeGameMock());

function planet(body = 'ceres') {
  return game.planets[body];
}

describe('Commerce', () => {
  describe('buy', () => {
    it('returns [0, 0] when no stock available', () => {
      const [bought, price] = planet().commerce.buy('fuel', 10);
      expect(bought).toBe(0);
      expect(price).toBe(0);
    });

    it('buys available stock', () => {
      const p = planet();
      p.state.stock.inc('fuel', 5);
      const [bought] = p.commerce.buy('fuel', 3);
      expect(bought).toBe(3);
    });

    it('is limited by available stock', () => {
      const p = planet();
      p.state.stock.inc('fuel', 2);
      const [bought] = p.commerce.buy('fuel', 10);
      expect(bought).toBe(2);
    });

    it('reduces stock after purchase', () => {
      const p = planet();
      p.state.stock.inc('fuel', 10);
      p.commerce.buy('fuel', 3);
      expect(p.economy.getStock('fuel')).toBe(7);
    });

    it('charges the player when a player is provided', () => {
      const p = planet();
      p.state.stock.inc('fuel', 5);
      const moneyBefore = game.player.money;
      p.commerce.buy('fuel', 1, game.player);
      expect(game.player.money).toBeLessThan(moneyBefore);
    });
  });

  describe('sell', () => {
    it('adds stock', () => {
      const p = planet();
      game.player.ship.loadCargo('fuel', 5);
      p.commerce.sell('fuel', 5, game.player);
      expect(p.economy.getStock('fuel')).toBe(5);
    });

    it('pays the player', () => {
      const p = planet();
      game.player.ship.loadCargo('fuel', 5);
      const moneyBefore = game.player.money;
      p.commerce.sell('fuel', 5, game.player);
      expect(game.player.money).toBeGreaterThan(moneyBefore);
    });

    it('returns [amount, price, standing]', () => {
      const p = planet();
      game.player.ship.loadCargo('fuel', 3);
      const result = p.commerce.sell('fuel', 3, game.player);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe(3);
      expect(result[1]).toBeGreaterThan(0);
    });
  });
});
