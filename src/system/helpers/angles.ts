const circleInRadians = 2 * Math.PI
const ratioDegToRad   = Math.PI / 180;
const ratioRadToDeg   = 180 / Math.PI;

export const degreesToRadians = (v: number): number => v * ratioDegToRad;
export const radiansToDegrees = (v: number): number => v * ratioRadToDeg;
export const normalizeRadians = (v: number): number => v % circleInRadians;
