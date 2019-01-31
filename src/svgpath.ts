// Adopted (read: copy pasta) from:
//   https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74

type point = [number, number];

// The smoothing ratio
const smoothing = 0.2;

function controlPoint(current: point, previous: point, next: point, reverse: boolean=false): point {
  // When 'current' is the first or last point of the array
  // 'previous' or 'next' don't exist.
  // Replace with 'current'
  const p = previous || current;
  const n = next || current;

  // Properties of the opposed-line
  const line_x      = n[0] - p[0];
  const line_y      = n[1] - p[1];
  const line_length = Math.sqrt(Math.pow(line_x, 2) + Math.pow(line_y, 2));
  const line_angle  = Math.atan2(line_y, line_x);

  // If is end-control-point, add PI to the angle to go backward
  const angle  = line_angle + (reverse ? Math.PI : 0);
  const length = line_length * smoothing;

  // The control point position is relative to the current point
  const x = current[0] + Math.cos(angle) * length;
  const y = current[1] + Math.sin(angle) * length;

  return [x, y];
}

function smooth(points: point[]): string {
  let path = '';

  for (let i = 0; i < points.length; ++i) {
    // init line
    if (i == 0) {
      path += `M ${points[i][0]},${points[i][1]}`;
    }
    // add bezier curve command
    else {
      // start control point
      const [cps_x, cps_y] = controlPoint(points[i - 1], points[i - 2], points[i])

      // end control point
      const [cpe_x, cpe_y] = controlPoint(points[i], points[i - 1], points[i + 1], true)

      path += `C ${cps_x},${cps_y} ${cpe_x},${cpe_y} ${points[i][0]},${points[i][1]}`
    }
  }

  return path;
}

export = smooth;
