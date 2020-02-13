// adapted from https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
import { R } from './util';
import { builder } from './strbuf';

type point = [number, number];

const smoothing = 0.2;
const rounding  = 2;

function round(n: number): number {
  return R(n, rounding);
}

export function bezier(points: point[]): string {
  //let path = 'M ' + round(points[0][0]) + ',' + round(points[0][1]);

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

    const l1 = util.length(prev[0], prev[1], next[0], next[1], smoothing);
    const a1 = util.angle(prev[0], prev[1], next[0], next[1], 0);
    const x1 = util.ctrlpt_x(current[0], l1, a1);
    const y1 = util.ctrlpt_y(current[1], l1, a1);

    const l2 = util.length(current[0], current[1], nnext[0], nnext[1], smoothing);
    const a2 = util.angle(current[0], current[1], nnext[0], nnext[1], 1);
    const x2 = util.ctrlpt_x(next[0], l2, a2);
    const y2 = util.ctrlpt_y(next[1], l2, a2);

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

    /*let buff = ' C ';
    buff += round(x1) + ' ';
    buff += round(y1) + ',';
    buff += round(x2) + ' ';
    buff += round(y2) + ',';
    buff += round(next[0]) + ' ';
    buff += round(next[1]);
    path += buff;*/
  }

  return path.getbuffer();
  //return path;
}

function Util(stdlib: any, foreign: any = null, heap: any = null) {
  var PI    = stdlib.Math.PI;
  var hypot = stdlib.Math.hypot;
  var atan2 = stdlib.Math.atan2;
  var cos   = stdlib.Math.cos;
  var sin   = stdlib.Math.sin;

  function length(px: number, py: number, nx: number, ny: number, smoothing: number): number {
    px = +px;
    py = +py;
    nx = +nx;
    ny = +ny;
    smoothing = +smoothing;
    return hypot(nx - px, ny - py) * smoothing;
  }

  function angle(px: number, py: number, nx: number, ny: number, reverse: number): number {
    px = +px;
    py = +py;
    nx = +nx;
    ny = +ny;
    reverse = reverse|0;

    var angle = +0.0;

    angle = atan2(ny - py, nx - px);

    if (reverse == 0) {
      return +angle;
    } else {
      return +(angle + PI);
    }
  }

  function ctrlpt_x(x: number, length: number, angle: number): number {
    x      = +x;
    length = +length;
    angle  = +angle;
    return +(x + cos(angle) * length);
  }

  function ctrlpt_y(y: number, length: number, angle: number): number {
    y      = +y;
    length = +length;
    angle  = +angle;
    return +(y + sin(angle) * length);
  }

  return {
    length:   length,
    angle:    angle,
    ctrlpt_x: ctrlpt_x,
    ctrlpt_y: ctrlpt_y,
  };
}

export const util = Util({Math: Math});
