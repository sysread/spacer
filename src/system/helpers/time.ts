// TODO: is the correct date January 1, 2000, 11:58:55.816 UTC?
// https://en.wikipedia.org/wiki/Equinox_(celestial_coordinates)//J2000.0
export const J2000             = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
export const dayInSeconds      = 86400;
export const averageYearInDays = 365.24;

export function parse(str: string): Date {
  return new Date(str + 'T12:00:00Z');
}

export function addMilliseconds(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

export function addDays(date: string|number, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 1000 / dayInSeconds;
}

export function centuriesBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 1000 / dayInSeconds / averageYearInDays / 100;
}

// used to display periods in user-friendly format
export function secondsToDays(secs: number): number {
  return secs / dayInSeconds;
}
