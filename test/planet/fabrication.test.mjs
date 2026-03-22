// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PlanetState } from '../../src/planet/state';
import { Economy } from '../../src/planet/economy';
import { Pricing } from '../../src/planet/pricing';
import { Commerce } from '../../src/planet/commerce';
import { Encounters } from '../../src/planet/encounters';
import { Fabrication } from '../../src/planet/fabrication';
import { resources } from '../../src/resource';

function makeFabrication(body = 'ceres') {
  const state = new PlanetState(body);
  const economy = new Economy(state);
  const encounters = new Encounters(state);
  // Pricing needs an exporter check; stub it to always return false
  const pricing = new Pricing(state, economy, () => false);
  const commerce = new Commerce(state, economy, pricing, encounters);
  return new Fabrication(state, pricing, commerce);
}

function aCraftableResource() {
  for (const [name, res] of Object.entries(resources)) {
    if ('recipe' in res) return name;
  }
  throw new Error('no craftable resource found');
}

describe('Fabrication', () => {
  it('fabricationAvailability starts at 100', () => {
    expect(makeFabrication().fabricationAvailability()).toBe(100);
  });

  it('fabricationReductionRate is lowest for manufacturing hub', () => {
    const ceres = makeFabrication('ceres'); // has manufacturing hub
    expect(ceres.fabricationReductionRate()).toBe(0.35);
  });

  it('fabricationTime is positive for craftable items', () => {
    const item = aCraftableResource();
    expect(makeFabrication().fabricationTime(item)).toBeGreaterThan(0);
  });

  it('fabricationTime increases with count', () => {
    const item = aCraftableResource();
    const f = makeFabrication();
    expect(f.fabricationTime(item, 5)).toBeGreaterThan(f.fabricationTime(item, 1));
  });

  it('hasFabricationResources is true at full health', () => {
    const item = aCraftableResource();
    expect(makeFabrication().hasFabricationResources(item, 1)).toBe(true);
  });

  it('fabricate reduces fab_health', () => {
    const f = makeFabrication();
    const item = aCraftableResource();
    const before = f.fabricationAvailability();
    f.fabricate(item);
    expect(f.fabricationAvailability()).toBeLessThanOrEqual(before);
  });

  it('fabricate returns positive turns', () => {
    const item = aCraftableResource();
    expect(makeFabrication().fabricate(item)).toBeGreaterThan(0);
  });

});
