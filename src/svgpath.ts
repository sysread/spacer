// adapted from https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74

type point = [number, number];

const smoothing = 0.2;

export function bezier(points: point[]): string {
  let path = 'M ' + points[0][0] + ',' + points[0][1];

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

    path += ' C '
      + x1 + ' ' + y1
      + ','
      + x2 + ' ' + y2
      + ','
      + next[0] + ' ' + next[1];
  }

  return path;
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
