import * as constants from '../data/constants';

export function kmToMeters(v: number): number {
  return v * 1000;
}

export function metersToKM(v: number): number {
  return v / 1000;
}

export function AUToMeters(v: number): number {
  return v * constants.metersInAU;
}

export function metersToAU(v: number): number {
  return v / constants.metersInAU;
}
