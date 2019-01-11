type point = [number, number, number];

declare interface CelestialBody {
  key:        string;
  central:    CelestialBody;
  name:       string;
  type:       string;
  radius:     number;
  mass:       number;
  satellites: { [key: string]: CelestialBody };

  getPositionAtTime(date: Date): point;
}

declare class SolarSystem {
  time: Date;
  bodies: { [key: string]: CelestialBody };

  setTime(input: Date): void;
}

export = SolarSystem;
