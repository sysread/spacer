const circleInRadians = 2 * Math.PI

export function degreesToRadians(v: number): number {
  return v * (Math.PI / 180);
}

export function radiansToDegrees(v: number): number {
  return v * (180 / Math.PI);
}

export function normalizeRadians(v: number): number {
  return v % circleInRadians;
}
