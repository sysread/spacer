// From solaris-model:

// unless otherwise specified:
// radius: mean radius in km, from JPL Horizons
// mass: in kg, from JPL Horizons
// tilt: axial tilt in degress, from JPL Horizons

// a = Semi-major Axis
// e = Eccentricity
// i = Inclination
// node = Ω / Longitude of the Ascending Node
// w = peri / ω / Argument of Periapsis (lp - node)
// lp = ϖ / Longitude of Periapsis (node + w)
// M = Mean Anomaly (L - lp)
// L = Mean Longitude (M + lp) OR (M + node + w)

// cy = change per century

// Sources of orbital elements:
//   jpl-1800-2050: http://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf / https://ssd.jpl.nasa.gov/?planet_pos
//   jpl-3000-3000: https://ssd.jpl.nasa.gov/txt/p_elem_t2.txt
//   jpl-satellites-table: http://ssd.jpl.nasa.gov/?sat_elem
//   jpl-sbdb: http://ssd.jpl.nasa.gov/sbdb.cgi

export type body_type  = 'star' | 'planet' | 'dwarf' | 'moon' | 'lagrange';
export type format     = 'jpl-3000-3000' | 'jpl-1800-2050' | 'jpl-satellites-table' | 'jpl-sbdb';
export type position   = [number, number, number];
export type Satellites = { [key: string]: Body };
export type LaGranges  = { [key: string]: LaGrange };

export interface LaGrange {
  readonly name:   string;
  readonly offset: number; // radians
  readonly radius: number; // meters
}

export interface Rings {
  readonly innerRadius: number,
  readonly outerRadius: number,
}

export interface ElementsBase {
  readonly a:    number;
  readonly e:    number;
  readonly i:    number;
  readonly L:    number;
  readonly lp:   number;
  readonly node: number;
}

export interface Augmentation {
  readonly b?: number;
  readonly c?: number;
  readonly s?: number;
  readonly f?: number;
}

export interface Elements {
  readonly format: format;
  readonly day?:   { M: number };
  readonly base:   ElementsBase;
  readonly cy?:    ElementsBase;
  readonly aug?:   Augmentation;
}

export interface Body {
  readonly name:        string;
  readonly type:        body_type;
  readonly radius:      number; // km
  readonly mass?:       number; // kg
  readonly tilt?:       number; // degrees
  readonly position?:   position;
  readonly elements?:   Elements;
  readonly ring?:       Rings;
  readonly satellites?: Satellites;
  readonly lagranges?:  LaGranges;
}

export function isBody(body: Body | LaGrange): body is Body {
  return (<Body>body).type != undefined;
}

export function isLaGrange(body: Body | LaGrange): body is LaGrange {
  return (<LaGrange>body).offset != undefined;
}
