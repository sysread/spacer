// adapted from https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
import { R } from './util';
import { builder } from './strbuf';

type point = [number, number];

const smoothing = 0.2;
const rounding  = 2;

function round(n: number): number {
  return R(n, rounding);
}

function length(px: number, py: number, nx: number, ny: number): number {
  return Math.hypot(nx - px, ny - py) * smoothing;
}

function angle(px: number, py: number, nx: number, ny: number, reverse: boolean): number {
  const angle = Math.atan2(ny - py, nx - px);
  if (reverse) {
    return angle + Math.PI;
  } else {
    return angle;
  }
}

function ctrlpt_x(x: number, length: number, angle: number): number {
  return x + Math.cos(angle) * length;
}

function ctrlpt_y(y: number, length: number, angle: number): number {
  return y + Math.sin(angle) * length;
}

export function bezier(points: point[]): string {
  const path = builder();
  path.append('M ');
  path.append(round(points[0][0]));
  path.append(',');
  path.append(round(points[0][1]));

  for (let i = 1; i < points.length; ++i) {
    const current = points[i-1];
    const prev    = points[i-2] || current;
    const next    = points[i];
    const nnext   = points[i+1] || current;

    const l1 = length(prev[0], prev[1], next[0], next[1]);
    const a1 = angle(prev[0], prev[1], next[0], next[1], false);
    const x1 = ctrlpt_x(current[0], l1, a1);
    const y1 = ctrlpt_y(current[1], l1, a1);

    const l2 = length(current[0], current[1], nnext[0], nnext[1]);
    const a2 = angle(current[0], current[1], nnext[0], nnext[1], true);
    const x2 = ctrlpt_x(next[0], l2, a2);
    const y2 = ctrlpt_y(next[1], l2, a2);

    path.append(' C ');
    path.append(round(x1));
    path.append(' ');
    path.append(round(y1));
    path.append(',');
    path.append(round(x2));
    path.append(' ');
    path.append(round(y2));
    path.append(',');
    path.append(round(next[0]));
    path.append(' ');
    path.append(round(next[1]));
  }

  return path.getbuffer();
}
