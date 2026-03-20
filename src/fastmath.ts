/**
 * fastmath - performance-optimized replacements for Math built-ins.
 *
 * Uses bitwise tricks to avoid the overhead of full IEEE 754 compliance in
 * Math.floor/ceil/round. Safe for the integer ranges used in game calculations
 * (resource quantities, turn counts, distances in AU). Do not use where full
 * floating-point precision is required.
 *
 * Source: https://github.com/krzaku281/fast-math
 */

/** Returns the absolute value of n. Coerces non-numbers via unary +. */
export function abs(value: number): number {
	value = +value;
	return value < 0 ? -value : value;
};

/**
 * Returns the smallest integer >= value.
 * Uses double-bitwise-NOT (~~) to truncate toward zero, then adjusts for
 * positive non-integers. Equivalent to Math.ceil for safe integer range.
 */
export function ceil(value: number): number {
	value = +value;
	return ~~value === value ? value : (value > 0) ? (~~value + 1) : ~~value;
};

/**
 * Returns the largest integer <= value.
 * Uses double-bitwise-NOT (~~) to truncate toward zero, then adjusts for
 * negative non-integers. Equivalent to Math.floor for safe integer range.
 */
export function floor(value: number): number {
	value = +value;
	return ~~value === value ? value : (value > 0) ? ~~value : (~~value - 1);
};

/**
 * Rounds value to the nearest integer using "round half away from zero":
 * 0.5 -> 1, -0.5 -> -1. This differs from Math.round, which rounds -0.5 to 0.
 * Uses right-shift >> 0 to truncate after adding the half-unit bias.
 */
export function round(value: number): number {
	value = +value;
	return value + (value < 0 ? -0.5 : 0.5) >> 0;
};

/** Returns -1 for negative, 1 for positive, 0 for zero. */
export function sign(value: number): number {
	value = +value;
	return value ? value < 0 ? -1 : 1 : 0;
};
