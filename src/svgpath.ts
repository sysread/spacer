/**
 * svgpath - smooth SVG path generation for the navigation and transit displays.
 *
 * Converts an array of 2D screen-space points into an SVG path string using
 * cubic Bezier curves. The SvgPath Vue component uses this to draw orbital
 * tracks and transit trajectories as smooth curves rather than polylines.
 *
 * The input points are projected 2D coordinates (pixels in the SVG viewport),
 * not raw orbital positions. The caller is responsible for projecting and
 * scaling from 3D space before passing points here.
 *
 * Adapted from:
 * https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
 */

import { R } from './util';
import { builder } from './strbuf';

type point = [number, number];

// Controls how far the Bezier control points are pulled from the data points.
// Lower values produce tighter curves; higher values produce more bowing.
// 0.2 was tuned empirically for the nav display viewport scale.
const smoothing = 0.2;

// Decimal places for SVG coordinate output. 1 place is sufficient precision
// for pixel-scale rendering and keeps the path string compact.
const rounding = 1;

function round(n: number): number {
  return R(n, rounding);
}

// Returns the length of the control point arm between two adjacent points,
// scaled by the smoothing factor.
function length(px: number, py: number, nx: number, ny: number): number {
  return Math.hypot(nx - px, ny - py) * smoothing;
}

// Returns the angle of the line between two points. When reverse=true,
// returns the angle pointing backward along the line (for the trailing
// control point of a segment).
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

/**
 * Converts a sequence of 2D points into an SVG cubic Bezier path string.
 *
 * Each segment uses the neighboring points to compute control points that
 * make the curve flow smoothly through every data point. The first and last
 * points use themselves as their own "missing" neighbor, producing a natural
 * taper at the endpoints.
 *
 * @param points - array of [x, y] screen-space coordinates
 * @returns SVG path data string (M ... C ... C ...)
 */
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

    // Leading control point: tangent from prev toward next, placed at current.
    const l1 = length(prev[0], prev[1], next[0], next[1]);
    const a1 = angle(prev[0], prev[1], next[0], next[1], false);
    const x1 = ctrlpt_x(current[0], l1, a1);
    const y1 = ctrlpt_y(current[1], l1, a1);

    // Trailing control point: tangent from current toward nnext, placed at next.
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
