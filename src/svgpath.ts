// adapted from https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74

declare var wasm: {
  svgpath: {
    alloc:         (size: number) => number;
    free:          (ptr: number, len: number) => void;
    ctrlpt_x:      (x: number, length: number, angle: number) => number;
    ctrlpt_y:      (y: number, length: number, angle: number) => number;
    ctrlpt_length: (px: number, py: number, nx: number, ny: number) => number;
    ctrlpt_angle:  (px: number, py: number, nx: number, ny: number, reverse: boolean) => number;
  }
}

type point = [number, number];

function control_point(current: point, prev: point, next: point, reverse: boolean): string {
  const length = wasm.svgpath.ctrlpt_length(prev[0], prev[1], next[0], next[1]);
  const angle  = wasm.svgpath.ctrlpt_angle(prev[0], prev[1], next[0], next[1], reverse);
  const x      = wasm.svgpath.ctrlpt_x(current[0], length, angle);
  const y      = wasm.svgpath.ctrlpt_y(current[1], length, angle);
  return x + ' ' + y;
}

export function bezier(points: point[]): string {
  let path = 'M ' + points[0][0] + ',' + points[0][1];

  for (let i = 1; i < points.length; ++i) {
    const current = points[i-1];
    const prev    = points[i-2] || current;
    const next    = points[i];
    const nnext   = points[i+1] || current;

    const c1 = control_point(current, prev, next, false);
    const c2 = control_point(next, current, nnext, true);

    path += ' C ' + c1 + ',' + c2 + ',' + next[0] + ' ' + next[1];
  }

  return path;
}
