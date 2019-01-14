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
// jpl-1800-2050: http://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf / https://ssd.jpl.nasa.gov/?planet_pos
// jpl-satellites-table: http://ssd.jpl.nasa.gov/?sat_elem
// jpl-sbdb: http://ssd.jpl.nasa.gov/sbdb.cgi
// heavens-above: http://heavens-above.com/orbit.aspx?satid=25544

export type body_type  = 'star' | 'planet' | 'dwarfPlanet' | 'moon' | 'spacecraft';
export type format     = 'jpl-1800-2050' | 'jpl-satellites-table' | 'heavens-above';
export type position   = [number, number, number];
export type Satellites = { [key: string]: Body };

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

export interface Elements {
  readonly format: string;
  readonly day?:   { M: number };
  readonly base:   ElementsBase;
  readonly cy?:    ElementsBase;
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
}
