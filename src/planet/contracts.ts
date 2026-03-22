/**
 * planet/contracts - mission offerings and lifecycle.
 *
 * Manages passenger and smuggler contracts offered at a planet. Contracts
 * are refreshed on arrival and periodically during the day.
 */

import data from '../data';
import { Mission, Passengers, Smuggler } from '../mission';
import { PlanetState } from './state';
import * as t from '../common';
import * as util from '../util';
import * as FastMath from '../fastmath';


declare var window: {
  game: any;
}

interface Contract {
  valid_until: number;
  mission:     Mission;
}

/** Returns prioritized resource needs for smuggler contract generation. */
export type NeededResourcesFn = () => { prioritized: t.resource[], amounts: { [key: string]: number } };


export class Contracts {
  constructor(
    private state: PlanetState,
    private neededResources: NeededResourcesFn,
  ) {}

  get availableContracts() {
    return this.state.contracts.filter((c: Contract) => !c.mission.is_accepted);
  }

  get availableOffPlanetContracts() {
    return this.availableContracts.filter((c: Contract) => c.mission instanceof Smuggler);
  }

  /**
   * Removes expired contracts and refreshes passenger and smuggler offerings.
   */
  refreshContracts() {
    if (this.state.contracts.length > 0 && window.game) {
      this.state.contracts = this.state.contracts.filter(
        (c: Contract) => c.valid_until >= window.game.turns
      );
    }

    this.refreshPassengerContracts();
    this.refreshSmugglerContracts();
  }

  refreshSmugglerContracts() {
    const hasTradeBan = this.state.hasTradeBan;

    if (this.state.contracts.length > 0 && window.game) {
      this.state.contracts = this.state.contracts.filter((c: Contract) => {
        if (c.mission instanceof Smuggler) {
          if (hasTradeBan || data.resources[c.mission.item].contraband) {
            return true;
          }

          return false;
        }

        return true;
      });
    }

    const max_count = FastMath.ceil(this.state.scale(data.smuggler_mission_count));
    const missions: Contract[]  = this.state.contracts.filter(
      (c: Contract) => c.mission instanceof Smuggler
    ).slice(0, max_count);

    this.state.contracts = this.state.contracts.filter(
      (c: Contract) => !(c.mission instanceof Smuggler)
    );

    const threshold = FastMath.ceil(this.state.scale(6));

    if (missions.length < max_count) {
      const needed = this.neededResources();

      for (const item of needed.prioritized) {
        if (missions.length >= max_count)
          break;

        if (needed.amounts[item] < threshold)
          continue;

        if (hasTradeBan || data.resources[item].contraband) {
          const batch  = util.clamp(needed.amounts[item], 1, window.game.player.ship.cargoSpace);
          const amount = util.clamp(util.fuzz(batch, 1.00), 1);

          const mission = new Smuggler({
            issuer: this.state.body,
            item:   item,
            amt:    util.R(amount),
          });

          missions.push({
            valid_until: util.getRandomInt(30, 60) * data.turns_per_day,
            mission: mission,
          });
        }
      }
    }

    this.state.contracts = this.state.contracts.concat(missions);
  }

  refreshPassengerContracts() {
    const have = this.state.contracts.filter(
      (c: Contract) => c.mission instanceof Passengers
    ).length;
    const max  = Math.max(1, util.getRandomInt(0, this.state.scale(data.passenger_mission_count)));
    const want = Math.max(0, max - have);

    if (this.state.contracts.length >= want) {
      return;
    }

    const skip:  {[key: string]: boolean} = { [this.state.body]: true };
    const dests: t.body[] = [];

    for (const c of this.state.contracts) {
      skip[(c.mission as Passengers).dest] = true;
    }

    for (const body of t.bodies) {
      if (skip[body]) {
        continue;
      }

      dests.push(body);

      if (data.bodies[body].faction == this.state.faction.abbrev) {
        dests.push(body);
      }

      if (data.factions[data.bodies[body].faction].capital == body) {
        dests.push(body);
      }
    }

    for (let i = 0; i < want; ++i) {
      const dest = util.oneOf(dests.filter(d => !skip[d]));

      if (!dest) {
        break;
      }

      const mission = new Passengers({ orig: this.state.body, dest: dest });

      this.state.contracts.push({
        valid_until: util.getRandomInt(10, 30) * data.turns_per_day,
        mission:     mission,
      });

      skip[dest] = true;
    }
  }

  acceptMission(mission: Mission) {
    this.state.contracts = this.state.contracts.filter(
      (c: Contract) => c.mission.title != mission.title
    );
  }
}
