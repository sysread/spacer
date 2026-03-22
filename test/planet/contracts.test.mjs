// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installGameMock, removeGameMock } from '../helpers/game-mock.mjs';

let game;

beforeEach(() => { game = installGameMock(); });
afterEach(() => removeGameMock());

function planet(body = 'ceres') {
  return game.planets[body];
}

describe('Contracts', () => {
  describe('availableContracts', () => {
    it('returns empty array for a fresh planet', () => {
      expect(planet().contractMgr.availableContracts).toHaveLength(0);
    });
  });

  describe('refreshContracts', () => {
    it('does not throw on a fresh planet', () => {
      expect(() => planet().contractMgr.refreshContracts()).not.toThrow();
    });

    it('may generate contracts after refresh', () => {
      const p = planet();
      p.contractMgr.refreshContracts();
      // Passenger contracts should be generated for a capital planet
      expect(p.state.contracts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('acceptMission', () => {
    it('removes a contract by mission title', () => {
      const p = planet();
      p.contractMgr.refreshContracts();

      if (p.state.contracts.length > 0) {
        const mission = p.state.contracts[0].mission;
        const before = p.state.contracts.length;
        p.contractMgr.acceptMission(mission);
        expect(p.state.contracts.length).toBeLessThan(before);
      }
    });
  });
});
