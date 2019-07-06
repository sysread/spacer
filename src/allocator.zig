const std = @import("std");

export fn alloc(len: usize) u32 {
    var buf = std.heap.wasm_allocator.alloc(u8, len) catch |err| return 0;
    return @ptrToInt(buf.ptr);
}

export fn free(ptr: [*]const u8, len: usize) void {
    std.heap.wasm_allocator.free(ptr[0..len]);
}
