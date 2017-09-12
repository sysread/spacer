let hypot = function(p1, p2) {
  return Math.hypot(
    p1[0] - p2[0],
    p1[1] - p2[1],
    p1[2] - p2[2]
  );
}

onmessage = function(e) {
  postMessage([e.data, hypot(e.data[0], e.data[1]]);
};
