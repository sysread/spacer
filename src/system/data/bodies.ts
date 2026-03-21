import sun from './bodies/sun';

/* Only export the sun. SolarSystem.importBodies() walks the satellite tree
 * recursively, so all planets and moons are discovered from sun.satellites.
 * Individual planet re-exports were removed because ESM namespace key order
 * is not guaranteed to match source order - if a planet was iterated before
 * the sun, it would be created without an orbital central body. */
export { sun };
