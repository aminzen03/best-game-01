// NOVA EMBER — tiny pure helpers shared by the simulation modules.
// One file, one job: math with no game knowledge.
export const TAU = Math.PI * 2;

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
