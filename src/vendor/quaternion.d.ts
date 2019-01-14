declare class Quaternion {
  static fromEuler(alpha: number, beta: number, gamma: number, order: string): Quaternion;
  mul(n: Quaternion): Quaternion;
  rotateVector(v: [number, number, number]): [number, number, number];
}

export = Quaternion;
