// faster replacements for Math routines, taken from: https://github.com/krzaku281/fast-math

export function abs(value: number): number {
	value = +value;
	return value < 0 ? -value : value;
};

export function ceil(value: number): number {
	value = +value;
	return ~~value === value ? value : (value > 0) ? (~~value + 1) : ~~value;
};

export function floor(value: number): number {
	value = +value;
	return ~~value === value ? value : (value > 0) ? ~~value : (~~value - 1);
};

export function round(value: number): number {
	value = +value;
	return value + (value < 0 ? -0.5 : 0.5) >> 0;
};

export function sign(value: number): number {
	value = +value;
	return value ? value < 0 ? -1 : 1 : 0;
};
