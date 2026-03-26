/**
 * navcomp-controller - extracted navigation display logic.
 *
 * Pure TypeScript functions for FOV calculation, transit display formatting,
 * distance display, faction color mapping, and sub-system transit detection.
 */

import Physics from '../physics';
import * as util from '../util';
import * as t from '../common';


/** Format transit distance as AU or km depending on magnitude. */
export function transitDisplayDistance(transit: any): string | undefined {
  if (!transit) return;

  const au = util.R(transit.au, 2);

  if (au > 0)
    return au + ' AU';
  else
    return util.csn(util.R(transit.km, 0)) + ' km';
}

/** Format distance between two points as AU or km. */
export function formatDistance(d: number): string {
  if (d < Physics.AU * 0.01) {
    return util.csn(util.R(d / 1000)) + ' km';
  } else {
    return util.R(d / Physics.AU, 2) + ' AU';
  }
}

/** Returns true if transit is within a sub-system (moon-to-moon, planet-to-moon). */
export function isSubSystemTransit(
  dest: t.body,
  locus: t.body,
  centralFn: (body: string) => string,
): boolean {
  if (!dest) return false;

  const dest_central = centralFn(dest);
  const orig_central = centralFn(locus);

  return (dest_central === orig_central && dest_central !== 'sun')
      || locus === dest_central
      || dest === orig_central;
}

/** Map faction abbreviation to Bootstrap text color class. */
export function factionColorClass(faction: string): string {
  switch (faction) {
    case 'UN':     return 'text-success';
    case 'MC':     return 'text-danger';
    case 'JFT':    return 'text-warning';
    case 'TRANSA': return 'text-secondary';
    case 'CERES':  return 'text-info';
    default:       return '';
  }
}

/**
 * Compute the center point for the nav map.
 * Without a destination: center on the current body's central (or sun).
 * With a destination: centroid of relevant bodies and transit path points.
 */
export function computeMapCenter(
  dest: t.body | null,
  locus: t.body,
  transit: any,
  isSubSystem: boolean,
  positionFn: (body: string) => number[],
  centralFn: (body: string) => string,
): number[] {
  if (!dest) {
    // Center on the local system. For moons, center on the parent
    // planet so all sibling moons are visible. For planets, center
    // on the planet itself (zoomed in close).
    const central = centralFn(locus);
    return central !== 'sun' ? positionFn(central) : positionFn(locus);
  }

  const bodies: number[][] = [];
  const dest_central = centralFn(dest);
  const orig_central = centralFn(locus);

  if (isSubSystem) {
    const central = dest_central === 'sun' ? orig_central : dest_central;
    bodies.push(positionFn(central));
  } else {
    bodies.push(positionFn(dest));
    bodies.push(positionFn(locus));
  }

  if (transit) {
    bodies.push(transit.flip_point);
    bodies.push(transit.start);
    bodies.push(transit.end);
  }

  return Physics.centroid(...bodies);
}

/**
 * Compute the FOV (field of view) in AU for the nav map.
 * Without a destination: 1.5x distance from locus to sun.
 * With a destination: 1.1x max distance from center to relevant bodies.
 */
export function computeMapFovAU(
  dest: t.body | null,
  locus: t.body,
  transit: any,
  isSubSystem: boolean,
  center: number[],
  positionFn: (body: string) => number[],
  centralFn: (body: string) => string,
  distanceFn: (a: string, b: string) => number,
  allBodiesFn: () => string[],
): number {
  if (!dest) {
    // Start zoomed in on the local area. For moons, show the moon
    // system (3x orbital radius to parent). For planets, use a
    // tight initial view centered on the body's position.
    const central = centralFn(locus);
    if (central !== 'sun') {
      // Moon: FOV from orbital distance to parent, with margin
      const locusPos = positionFn(locus);
      const centralPos = positionFn(central);
      const orbitDist = Physics.distance(locusPos, centralPos) / Physics.AU;
      return Math.max(orbitDist * 3, 0.01);
    }
    return 0.01;
  }

  const points: number[][] = [];
  const dest_central = centralFn(dest);
  const orig_central = centralFn(locus);

  if (isSubSystem) {
    const central = dest_central === 'sun' ? orig_central : dest_central;
    points.push(positionFn(central));

    for (const body of allBodiesFn()) {
      if (centralFn(body) === central) {
        points.push(positionFn(body));
      }
    }
  } else {
    points.push(positionFn(locus));
    points.push(positionFn(dest));
  }

  if (transit) {
    points.push(transit.end);
  }

  const center_2d = [center[0], center[1], 0];
  const points_2d = points.map(p => [p[0], p[1], 0]);
  const distances = points_2d.map(p => Physics.distance(p, center_2d));
  const max = Math.max(...distances);
  return 1.1 * (max / Physics.AU);
}
