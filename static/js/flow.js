// Toy model behind the plan playground: a 1-D plan z (which cube) with two valid modes.
// The velocity is the exact rectified-flow field for a two-Gaussian plan distribution, so the
// animation shows real flow dynamics. Guidance toward mode k with dose w flows to the plan
// distribution tilted by a soft classifier, p(z) q(k | z)^w with q's odds RHO per unit w; its
// field is v + ((1 - t) / t) grad log E[q^w | z_t], i.e. noise-conditioned classifier guidance.
// Self-check: node static/js/flow.js
(function (root) {
  const MU = [-1, 1], S = 0.14, RHO = 1.6;

  // p(mode | z_t) under prior pi, for a plan spread s2; returns [p0, p1, marginal variance]
  function posterior(z, t, pi, s2) {
    const v = (1 - t) ** 2 + t * t * s2;
    const l0 = Math.log(pi[0]) - (z - t * MU[0]) ** 2 / (2 * v);
    const l1 = Math.log(pi[1]) - (z - t * MU[1]) ** 2 / (2 * v);
    const p1 = 1 / (1 + Math.exp(l0 - l1));
    return [1 - p1, p1, v];
  }

  // dz/dt = E[z1 - z0 | z_t] for z0 ~ N(0, 1) and z1 ~ sum_k pi_k N(MU_k, S^2)
  function velocity(z, t, pi) {
    const [p0, p1, v] = posterior(z, t, pi, S * S);
    const c = (t * S * S - (1 - t)) / v;
    return p0 * (MU[0] + c * (z - t * MU[0])) + p1 * (MU[1] + c * (z - t * MU[1]));
  }

  // mode weights after guidance toward mode k with dose w (w = 0 leaves pi unchanged)
  function guidedPi(pi, k, w) {
    const a = pi.map((p, j) => p * (j === k ? RHO ** w : 1));
    return a.map(x => x / (a[0] + a[1]));
  }

  // Euler path from a noise draw z0 to a plan; returns every step for drawing
  function flowPath(z0, pi, steps = 48) {
    const path = [z0];
    let z = z0;
    for (let i = 0; i < steps; i++) { z += velocity(z, i / steps, pi) / steps; path.push(z); }
    return path;
  }

  // Boltzmann rerank of frozen draws by a smoothed per-mode reward table [{n, s}, {n, s}]
  function rerankWeights(pool, table, beta) {
    const r = table.map(({ n, s }) => (s + 0.5) / (n + 1));
    const lw = pool.map(z => beta * r[z < 0 ? 0 : 1]);
    const m = Math.max(...lw);
    const w = lw.map(x => Math.exp(x - m));
    const Z = w.reduce((a, b) => a + b, 0);
    return w.map(x => x / Z);
  }

  function rng(seed) {                       // mulberry32 + Box-Muller, seeded for stable visuals
    let a = seed >>> 0;
    const u = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    u.normal = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
    return u;
  }

  const api = { MU, S, velocity, guidedPi, flowPath, rerankWeights, rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GPLFlow = api;

  if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    const assert = require('assert');
    const r = rng(7), z0s = Array.from({ length: 4000 }, r.normal);
    const share = w => z0s.filter(z0 => flowPath(z0, guidedPi([0.5, 0.5], 0, w)).pop() < 0).length / z0s.length;
    const ends = z0s.map(z0 => flowPath(z0, [0.5, 0.5]).pop());
    assert(Math.abs(share(0) - 0.5) < 0.04, 'unguided flow splits ~50/50');
    assert(ends.every(z => Math.abs(Math.abs(z) - 1) < 0.6), 'unguided plans land on a mode');
    const rates = [0, 1, 2, 4, 8].map(share);
    rates.slice(1).forEach((x, i) => assert(x >= rates[i] - 0.01, 'guidance is monotone in w'));
    assert(rates[4] > 0.9, 'strong guidance selects the requested mode');
    const pool = [-1, -1, 1, 1], w = rerankWeights(pool, [{ n: 5, s: 0 }, { n: 5, s: 5 }], 5);
    assert(w[2] + w[3] > 0.9, 'rerank moves mass to the mode that succeeded');
    console.log('flow self-check ok; requested-mode share at w=0,1,2,4,8:', rates.map(x => x.toFixed(2)).join(' '));
  }
})(typeof window !== 'undefined' ? window : globalThis);
