// Deterministic RNG (mulberry32). State lives IN the game state → replays are exact.
export function rngNext(s) {
  let t = (s + 0x6D2B79F5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return { state: t, value: ((r ^ (r >>> 14)) >>> 0) / 4294967296 };
}
// Fisher-Yates with threaded rng state. Returns [shuffledArray, newRngState].
export function shuffle(arr, rngState) {
  const a = arr.slice();
  let s = rngState;
  for (let i = a.length - 1; i > 0; i--) {
    const r = rngNext(s); s = r.state;
    const j = Math.floor(r.value * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return [a, s];
}
