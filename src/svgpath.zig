const std = @import("std");
const math = std.math;
const smoothing = 0.2;

export fn ctrlpt_x(x: f64, length: f64, angle: f64) f64 {
    return x + math.cos(angle) * length;
}

export fn ctrlpt_y(y: f64, length: f64, angle: f64) f64 {
    return y + math.sin(angle) * length;
}

export fn ctrlpt_length(px: f64, py: f64, nx: f64, ny: f64) f64 {
    return math.hypot(f64, nx - px, ny - py) * smoothing;
}

export fn ctrlpt_angle(px: f64, py: f64, nx: f64, ny: f64, reverse: bool) f64 {
    const angle = math.atan2(f64, ny - py, nx - px);
    return if (reverse) angle + math.pi else angle;
}
