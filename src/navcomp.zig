usingnamespace @import("allocator.zig");

const std = @import("std");
const math = std.math;
const ArrayList = std.ArrayList;

const DT = 500; // frames per segment for euler integration
const SPT = 8 * 3600; // seconds per turn
const TI = SPT / DT; // seconds per euler integration frame

pub const Course = struct {
    pub final: Segment, // final position and velocity
    pub initial: Segment, // starting position and velocity
    pub turns: f64, // total turns travel time
    pub tflip: f64, // time to flip point (seconds)
    pub accel: Vector, // constant acceleration (m/s/s)
    pub accel_set: bool,
    pub path: ArrayList(Segment),
    pub iter: ?ArrayList(Segment).Iterator,
    pub current: ?Segment,

    // a = (2s / t^2) - (2v / t)
    pub fn set_required_acceleration(self: *Course) void {
        if (!self.accel_set) {
            const t = (SPT * self.turns) / 2;
            const t2 = t * t;

            const dvxf = self.final.velocity.x * 2 / t; // portion of final velocity to match by flip point
            const dvxi = (self.initial.velocity.x - dvxf) * 2 / t; // portion of total change in velocity to apply by flip point
            self.accel.x = (self.final.position.x - self.initial.position.x) / t2 - dvxi;

            const dvyf = self.final.velocity.y * 2 / t;
            const dvyi = (self.initial.velocity.y - dvyf) * 2 / t;
            self.accel.y = (self.final.position.y - self.initial.position.y) / t2 - dvyi;

            const dvzf = self.final.velocity.z * 2 / t;
            const dvzi = (self.initial.velocity.z - dvzf) * 2 / t;
            self.accel.z = (self.final.position.z - self.initial.position.z) / t2 - dvzi;

            self.accel_set = true;
        }
    }

    pub fn max_velocity(self: *Course) f64 {
        self.set_required_acceleration();
        return self.accel.mul_scalar(self.tflip).length();
    }

    pub fn build_path(self: *Course) void {
        if (self.path.count() > 0) {
            self.iter.?.reset();
            self.current = undefined;
            return;
        }

        self.set_required_acceleration();

        var p = self.initial.position; // initial position
        var v = self.initial.velocity; // initial velocity

        var dv = self.accel.mul_scalar(TI); // delta-v: static portion of change in velocity each TI
        var ds = self.accel.mul_scalar(TI * TI).div_scalar(2); // delta-displacement: static portion of change in position each TI

        // Start with initial position
        self.path.append(Segment{ .position = p.clone(), .velocity = v.clone() }) catch unreachable;

        var t: f64 = 0;
        var turn: f64 = 0;
        while (turn < self.turns) : (turn += 1) {
            // Split turn's updates into DT increments to prevent inaccuracies
            // creeping into the final result.
            var i: f64 = 0;
            while (i < DT) : (i += 1) {
                t += TI;

                // Update velocity
                v = if (t < self.tflip)
                    v.add(dv) // accelerate before the flip
                else
                    v.sub(dv); // decelerate after the flip

                // Update position
                p = p.add(v.mul_scalar(TI).add(ds));
            }

            self.path.append(Segment{ .position = p.clone(), .velocity = v.clone() }) catch unreachable;
        }

        self.path.append(Segment{
            .position = self.final.position.clone(),
            .velocity = self.final.velocity.clone(),
        }) catch unreachable;

        self.iter = self.path.iterator();
    }

    pub fn iter_next(self: *Course) bool {
        self.current = self.iter.?.next();
        return self.current != null;
    }
};

pub const Segment = struct {
    pub position: Vector,
    pub velocity: Vector,
};

pub const Vector = struct {
    pub x: f64,
    pub y: f64,
    pub z: f64,

    pub fn new(x: f64, y: f64, z: f64) Vector {
        return Vector{ .x = x, .y = y, .z = z };
    }

    pub fn init(x: f64, y: f64, z: f64) *Vector {
        const v = A.create(Vector) catch unreachable;
        v.x = x;
        v.y = y;
        v.z = z;
        return v;
    }

    pub fn clone(self: *Vector) Vector {
        return Vector{ .x = self.x, .y = self.y, .z = self.z };
    }

    pub fn deinit(self: *Vector) void {
        A.destroy(self);
    }

    pub fn add_scalar(self: *Vector, n: f64) Vector {
        return Vector{ .x = self.x + n, .y = self.y + n, .z = self.z + n };
    }

    pub fn sub_scalar(self: *Vector, n: f64) Vector {
        return Vector{ .x = self.x - n, .y = self.y - n, .z = self.z - n };
    }

    pub fn mul_scalar(self: *Vector, n: f64) Vector {
        return Vector{ .x = self.x * n, .y = self.y * n, .z = self.z * n };
    }

    pub fn div_scalar(self: *Vector, n: f64) Vector {
        return Vector{ .x = self.x / n, .y = self.y / n, .z = self.z / n };
    }

    pub fn add(self: *Vector, other: Vector) Vector {
        return Vector{ .x = self.x + other.x, .y = self.y + other.y, .z = self.z + other.z };
    }

    pub fn sub(self: *Vector, other: Vector) Vector {
        return Vector{ .x = self.x - other.x, .y = self.y - other.y, .z = self.z - other.z };
    }

    pub fn mul(self: *Vector, other: Vector) Vector {
        return Vector{ .x = self.x * other.x, .y = self.y * other.y, .z = self.z * other.z };
    }

    pub fn div(self: *Vector, other: Vector) Vector {
        return Vector{ .x = self.x / other.x, .y = self.y / other.y, .z = self.z / other.z };
    }

    pub fn length_squared(self: *Vector) f64 {
        return self.x * self.x + self.y * self.y + self.z * self.z;
    }

    pub fn length(self: *Vector) f64 {
        return math.sqrt(self.length_squared());
    }
};

const A = std.heap.wasm_allocator;
var courses = std.hash_map.AutoHashMap(usize, *Course).init(A);
var cindex: usize = 1;

fn course_get(key: usize) *Course {
    return courses.getValue(key).?;
}

export fn course_new(turns: f64) usize {
    var course = A.create(Course) catch unreachable;
    course.path = ArrayList(Segment).init(A);
    course.turns = turns;
    course.tflip = (SPT * turns) / 2;
    course.accel_set = false;

    const key = cindex;

    if ((courses.put(key, course) catch unreachable) == null) {
        cindex += 1;
        return key;
    }

    return 0;
}

export fn course_del(key: usize) void {
    if (courses.contains(key)) {
        const c = courses.remove(key).?.value;
        c.path.deinit();
        A.destroy(c);
    }
}

export fn course_set_final_position(key: usize, x: f64, y: f64, z: f64) void {
    var course = course_get(key);
    course.final.position.x = x;
    course.final.position.y = y;
    course.final.position.z = z;
}

export fn course_set_final_velocity(key: usize, x: f64, y: f64, z: f64) void {
    var course = course_get(key);
    course.final.velocity.x = x;
    course.final.velocity.y = y;
    course.final.velocity.z = z;
}

export fn course_set_initial_position(key: usize, x: f64, y: f64, z: f64) void {
    var course = course_get(key);
    course.initial.position.x = x;
    course.initial.position.y = y;
    course.initial.position.z = z;
}

export fn course_set_initial_velocity(key: usize, x: f64, y: f64, z: f64) void {
    var course = course_get(key);
    course.initial.velocity.x = x;
    course.initial.velocity.y = y;
    course.initial.velocity.z = z;
}

export fn course_build_path(key: usize) void {
    course_get(key).build_path();
}

export fn course_max_velocity(key: usize) f64 {
    return course_get(key).max_velocity();
}

// Boy, this is ugly, but it sure is faster with stack variables than
// allocating heap space for parameters to be passed as an array from JS.
// Calculating linearly in this function is also significantly faster than a
// compiler-enforced @inlineCall to do the same. And storing the result in a
// global makes retrieval seriously fast compared to allocating a new array off
// the heap for each call, given that this is called in a number of very large
// loops.
var accel_retval = [5]f64{ 0, 0, 0, 0, 0 };
export fn course_accel(turns: f64, pxi: f64, pyi: f64, pzi: f64, vxi: f64, vyi: f64, vzi: f64, pxf: f64, pyf: f64, pzf: f64, vxf: f64, vyf: f64, vzf: f64, ptr: ?*[*]f64, len: ?*usize) bool {
    const t = (SPT * turns) / 2;
    const t2 = t * t;

    const dvxf = vxf * 2 / t; // portion of final velocity to match by flip point
    const dvxi = (vxi - dvxf) * 2 / t; // portion of total change in velocity to apply by flip point
    const ax = (pxf - pxi) / t2 - dvxi;

    const dvyf = vyf * 2 / t;
    const dvyi = (vyi - dvyf) * 2 / t;
    const ay = (pyf - pyi) / t2 - dvyi;

    const dvzf = vzf * 2 / t;
    const dvzi = (vzi - dvzf) * 2 / t;
    const az = (pzf - pzi) / t2 - dvzi;

    const a = math.sqrt(ax * ax + ay * ay + az * az);

    const vx = ax * t;
    const vy = ay * t;
    const vz = az * t;
    const v = math.sqrt(vx * vx + vy * vy + vz * vz);

    accel_retval = [5]f64{ v, a, ax, ay, az };

    ptr.?.* = &accel_retval;
    len.?.* = accel_retval.len;

    return true;
}

export fn course_segment(key: usize, ptr: *[*]f64, len: *usize) bool {
    const course = course_get(key);

    if (course.iter_next()) {
        const out = [4]f64{
            course.current.?.velocity.length(),
            course.current.?.position.x,
            course.current.?.position.y,
            course.current.?.position.z,
        };

        const result = A.alloc(f64, 4) catch return false;
        std.mem.copy(f64, result, out[0..4]);

        ptr.* = result.ptr;
        len.* = result.len;

        return true;
    }

    return false;
}
