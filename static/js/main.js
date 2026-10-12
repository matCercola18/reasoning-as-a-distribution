// Page behaviour: lazy video playback, clip switchers, chapters, data charts, plan playground.
(() => {
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- videos
  // Autoplay loops only while on screen; posters stand in until then.
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !still) v.play().catch(() => {});
    else v.pause();
  }), { threshold: 0.25 });
  $$('video[data-auto]').forEach(v => { v.muted = true; io.observe(v); });
  $$('video[data-rate]').forEach(v => {
    v.playbackRate = +v.dataset.rate;
    v.addEventListener('loadeddata', () => { v.playbackRate = +v.dataset.rate; });
  });

  // Button groups that swap the clip (and caption) of one player, or of two (data-switch2 / data-alt).
  const load = (v, src) => { v.poster = src.replace('.mp4', '.jpg'); v.src = src; v.play().catch(() => {}); };
  $$('[data-switch]').forEach(group => {
    const v = $(group.dataset.switch), v2 = $(group.dataset.switch2 || '#none'), cap = $(group.dataset.caption || '#none');
    $$('button', group).forEach(b => b.addEventListener('click', () => {
      $$('button', group).forEach(x => x.setAttribute('aria-pressed', x === b));
      load(v, b.dataset.src);
      if (v2 && b.dataset.alt) load(v2, b.dataset.alt);
      if (b.dataset.chips) b.dataset.chips.split('|').forEach((c, k) => { $('.chip', [v, v2][k].parentElement).textContent = 'plan: ' + c; });
      if (cap && b.dataset.cap) cap.innerHTML = b.dataset.cap;
    }));
  });

  // Chapter buttons seek their video; the active chapter and its description follow playback.
  $$('[data-chapters]').forEach(nav => {
    const v = $(nav.dataset.chapters), bs = $$('button', nav), now = $(nav.dataset.now), desc = $(nav.dataset.desc);
    bs.forEach(b => b.addEventListener('click', () => { v.currentTime = +b.dataset.t; v.play().catch(() => {}); }));
    let last;
    v.addEventListener('timeupdate', () => {
      let cur = bs[0];
      bs.forEach(b => { if (v.currentTime >= +b.dataset.t - 0.05) cur = b; });
      if (cur === last) return;
      last = cur;
      bs.forEach(b => b.setAttribute('aria-current', b === cur));
      now.textContent = cur.lastChild.textContent;
      desc.textContent = cur.dataset.desc;
    });
  });

  // Tabs: a row of buttons showing one [data-pane] at a time.
  $$('[data-tabs]').forEach(tabs => {
    const panes = $$(`[data-pane-of="${tabs.dataset.tabs}"]`);
    $$('button', tabs).forEach(b => b.addEventListener('click', () => {
      $$('button', tabs).forEach(x => x.setAttribute('aria-selected', x === b));
      panes.forEach(p => { p.hidden = p.dataset.pane !== b.dataset.pane; });
      panes.filter(p => !p.hidden).forEach(p => $$('video', p).forEach(v => v.play().catch(() => {})));
    }));
  });

  // Scroll reveal and figure lightbox.
  const rv = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); }
  }), { threshold: 0.15 });
  $$('.reveal').forEach(n => rv.observe(n));
  const box = $('#lightbox');
  $$('figure.fig img').forEach(img => img.addEventListener('click', () => {
    $('img', box).src = img.src; $('img', box).alt = img.alt; box.showModal();
  }));
  box?.addEventListener('click', () => box.close());

  $('#copy-bib')?.addEventListener('click', e => {
    navigator.clipboard.writeText($('#bibtex').textContent.trim());
    e.target.textContent = 'Copied';
    setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
  });

  // ---------------------------------------------------------------- charts
  // <div class="chart" data-chart> holding a JSON spec; a slider steps through the x values.
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, at, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in at) n.setAttribute(k, at[k]);
    parent && parent.appendChild(n);
    return n;
  };
  const fmt = (x, signed) => (signed && x > 0 ? '+' : '') + x.toFixed(2);

  $$('[data-chart]').forEach(box => {
    const spec = JSON.parse($('script', box).textContent);
    const W = 560, H = 300, m = { l: 52, r: 16, t: 14, b: 44 };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': spec.aria });
    box.insertBefore(svg, $('input', box));
    const [x0, x1] = [Math.min(...spec.x), Math.max(...spec.x)];
    const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
    const Y = y => H - m.b - (y - spec.ylim[0]) / (spec.ylim[1] - spec.ylim[0]) * (H - m.t - m.b);
    spec.yticks.forEach(t => {
      el('line', { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid' }, svg);
      el('text', { x: m.l - 8, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg).textContent = t;
    });
    spec.x.forEach(x => {
      el('text', { x: X(x), y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, svg).textContent = x;
    });
    el('text', { x: (m.l + W - m.r) / 2, y: H - 6, class: 'axis', 'text-anchor': 'middle' }, svg).textContent = spec.xlab;
    el('text', { x: 14, y: (m.t + H - m.b) / 2, class: 'axis', 'text-anchor': 'middle',
      transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})` }, svg).textContent = spec.ylab;
    if (spec.ref != null) {
      el('line', { x1: m.l, x2: W - m.r, y1: Y(spec.ref), y2: Y(spec.ref), class: 'ref' }, svg);
      if (spec.refLabel) el('text', { x: W - m.r - 4, y: Y(spec.ref) - 6, class: 'tick', 'text-anchor': 'end' }, svg).textContent = spec.refLabel;
    }
    const cursor = el('line', { y1: m.t, y2: H - m.b, class: 'cursor' }, svg);
    const dots = spec.series.map(s => {
      const c = css(s.color) || s.color;
      const band = spec.x.map((x, i) => `${X(x)},${Y(s.hi[i])}`).concat(
        spec.x.map((x, i) => `${X(x)},${Y(s.lo[i])}`).reverse()).join(' ');
      el('polygon', { points: band, fill: c, opacity: 0.14 }, svg);
      el('polyline', { points: spec.x.map((x, i) => `${X(x)},${Y(s.y[i])}`).join(' '), fill: 'none',
        stroke: c, 'stroke-width': 2.5, 'stroke-dasharray': s.dash ? '7 5' : 'none' }, svg);
      spec.x.forEach((x, i) => el('circle', { cx: X(x), cy: Y(s.y[i]), r: 3.5, fill: c }, svg));
      return el('circle', { r: 7, fill: c, stroke: css('--bg'), 'stroke-width': 2.5 }, svg);
    });
    const slider = $('input[type=range]', box), out = $('output', box);
    slider.max = spec.x.length - 1;
    const show = i => {
      cursor.setAttribute('x1', X(spec.x[i])); cursor.setAttribute('x2', X(spec.x[i]));
      spec.series.forEach((s, k) => { dots[k].setAttribute('cx', X(spec.x[i])); dots[k].setAttribute('cy', Y(s.y[i])); });
      out.innerHTML = `<b>${spec.xname} = ${spec.x[i]}</b>` + spec.series.map(s =>
        `<span><i style="background:${css(s.color) || s.color}"></i>${s.name}: <b>${fmt(s.y[i], spec.signed)}</b>` +
        ` <small>[${fmt(s.lo[i], spec.signed)}, ${fmt(s.hi[i], spec.signed)}]</small>` +
        (s.extra ? ` <small>${s.extra[i]}</small>` : '') + '</span>').join('');
    };
    slider.addEventListener('input', () => show(+slider.value));
    svg.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
      let best = 0;
      spec.x.forEach((x, i) => { if (Math.abs(X(x) - px) < Math.abs(X(spec.x[best]) - px)) best = i; });
      slider.value = best; show(best);
    });
    slider.value = spec.start ?? spec.x.length - 1;
    show(+slider.value);
  });

  // ---------------------------------------------------------------- plan flows
  // x = plan coordinate z (left cube at -1, right cube at +1), y = flow time t (noise at the bottom).
  const F = window.GPLFlow;
  // noise draws for the toy panels, truncated at |z| < 2.3 so no path starts off-canvas
  const noise = (r, n) => { const a = []; while (a.length < n) { const z = r.normal(); if (Math.abs(z) < 2.3) a.push(z); } return a; };
  const fit = cv => {
    const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    return [g, r.width, r.height];
  };

  function drawPanel(cv, { paths, single, weights, request, progress }) {
    const [g, w, h] = fit(cv);
    const top = 46, bot = h - 30, X = z => w / 2 + z * w * 0.2, Y = t => bot - t * (bot - top);
    const green = css('--gpl'), red = css('--bad'), ink = css('--ink-3'), line = css('--line');
    g.clearRect(0, 0, w, h);
    // noise density at the bottom
    g.beginPath();
    for (let z = -2.4; z <= 2.4; z += 0.05) g.lineTo(X(z), bot + 14 - 22 * Math.exp(-z * z / 2));
    g.strokeStyle = line; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = ink; g.font = '12px Inter, system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(single !== undefined ? 'observation' : 'noise  z₀ ~ N(0, I)', w / 2, h - 4);
    // the two cubes = the two valid plans
    [-1, 1].forEach((z, k) => {
      const s = 20, on = request === k;
      g.fillStyle = css('--cube'); g.strokeStyle = on ? green : 'transparent'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(X(z) - s / 2, top - s - 10, s, s, 4); g.fill(); g.stroke();
    });
    const valid = z => Math.abs(Math.abs(z) - 1) < 0.45;
    if (single !== undefined) {           // a deterministic readout: one committed plan
      const t = progress;
      g.strokeStyle = valid(single) ? css('--det') : red; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(single * t), Y(t)); g.stroke();
      if (t >= 1) {
        if (valid(single)) { g.fillStyle = css('--det'); g.beginPath(); g.arc(X(single), Y(1), 6, 0, 7); g.fill(); }
        else {
          g.strokeStyle = red; g.lineWidth = 3.5; const c = X(single), y = Y(1), r = 7;
          g.beginPath(); g.moveTo(c - r, y - r); g.lineTo(c + r, y + r); g.moveTo(c + r, y - r); g.lineTo(c - r, y + r); g.stroke();
        }
      }
      return;
    }
    const n = paths[0].length - 1, upto = Math.max(1, Math.round(progress * n));
    g.globalCompositeOperation = 'lighter';
    paths.forEach((p, i) => {
      const end = p[n], a = weights ? 0.15 + 0.85 * Math.min(1, weights[i] * paths.length / 2) : 0.55;
      g.strokeStyle = valid(end) ? green : red; g.globalAlpha = a * 0.6; g.lineWidth = 1.2;
      g.beginPath();
      for (let j = 0; j <= upto; j++) g.lineTo(X(p[j]), Y(j / n));
      g.stroke();
      if (upto === n) {
        g.globalAlpha = a; g.fillStyle = valid(end) ? green : red;
        const r = weights ? 2 + 7 * Math.sqrt(weights[i] * paths.length / 4) : 3;
        g.beginPath(); g.arc(X(end), Y(1), Math.min(r, 9), 0, 7); g.fill();
      }
    });
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  function animate(cv, state, ms = 1400) {
    if (still) { state.progress = 1; drawPanel(cv, state); return; }
    const t0 = performance.now();
    const step = now => {
      state.progress = Math.min(1, (now - t0) / ms);
      drawPanel(cv, state);
      if (state.progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Coverage triptych: regression mean, winner-take-all, GPL samples.
  const trip = $$('canvas[data-flow]');
  let seed = 11;
  const drawTrip = () => {
    const z0 = noise(F.rng(seed++), 40);
    trip.forEach(cv => {
      const kind = cv.dataset.flow;
      const st = kind === 'gpl' ? { paths: z0.map(z => F.flowPath(z, [0.5, 0.5])) }
        : { single: kind === 'mse' ? 0 : 1 };
      cv._state = st; animate(cv, st);
    });
  };
  if (trip.length) {
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { drawTrip(); o.disconnect(); } },
      { threshold: 0.4 }).observe(trip[0]);
    $('#resample')?.addEventListener('click', drawTrip);
  }

  // Playground: steer with a dose w, or adapt from deployment outcomes.
  const pg = $('#pg-canvas');
  if (pg) {
    const z0 = noise(F.rng(5), 48);
    const P = { request: 0, w: 0, mode: 'steer' };
    const A = { pool: [], table: [{ n: 0, s: 0 }, { n: 0, s: 0 }], log: [], beta: 8, p: [0.2, 0.9], resets: 0 };
    const steerState = () => {
      const pi = F.guidedPi([0.5, 0.5], P.request, P.w);
      return { paths: z0.map(z => F.flowPath(z, pi)), request: P.request, progress: 1 };
    };
    const showSteer = () => {
      const st = steerState(); drawPanel(pg, st);
      const k = st.paths.filter(p => (p.at(-1) < 0) === (P.request === 0)).length;
      $('#pg-share').textContent = `${k} / ${st.paths.length}`;
      $('#pg-w').textContent = P.w.toFixed(1);
    };
    // Adaptation: K frozen draws, a per-mode reward table, Boltzmann reweighting.
    const resetAdapt = () => {
      const rr = F.rng(2);                     // a pool with 8 draws on each cube
      A.paths = noise(rr, 16).map(z => F.flowPath(z, [0.5, 0.5]));
      A.pool = A.paths.map(p => p.at(-1));
      A.table = [{ n: 0, s: 0 }, { n: 0, s: 0 }]; A.log = []; A.rand = F.rng(A.resets++ ? Date.now() % 1e9 : 8);
      showAdapt();
    };
    const showAdapt = () => {
      const wts = F.rerankWeights(A.pool, A.table, A.beta);
      drawPanel(pg, { paths: A.paths, weights: wts, progress: 1 });
      const pLeft = wts.reduce((s, x, i) => s + (A.pool[i] < 0 ? x : 0), 0);
      const exp = pLeft * A.p[0] + (1 - pLeft) * A.p[1];
      $('#pg-exp').textContent = exp.toFixed(2);
      $('#pg-left').textContent = `${Math.round(pLeft * 100)}%`;
      A.table.forEach((t, k) => { $(`#pg-t${k}`).textContent = t.n ? `${t.s} / ${t.n}` : '–'; });
      $('#pg-log').innerHTML = A.log.map(([k, ok]) =>
        `<span class="run ${ok ? 'ok' : 'no'}" title="${k ? 'right' : 'left'} cube">${ok ? '✓' : '✗'}</span>`).join('');
    };
    const deploy = n => {
      for (let j = 0; j < n; j++) {
        const wts = F.rerankWeights(A.pool, A.table, A.beta);
        let u = A.rand(), i = 0;
        while (i < wts.length - 1 && (u -= wts[i]) > 0) i++;
        const k = A.pool[i] < 0 ? 0 : 1, ok = A.rand() < A.p[k];
        A.table[k].n++; A.table[k].s += ok; A.log.push([k, ok]);
      }
      if (A.log.length > 40) A.log = A.log.slice(-40);
      showAdapt();
    };
    $$('[data-request]').forEach(b => b.addEventListener('click', () => {
      P.request = +b.dataset.request;
      $$('[data-request]').forEach(x => x.setAttribute('aria-pressed', x === b));
      showSteer();
    }));
    $('#pg-dose').addEventListener('input', e => { P.w = +e.target.value; showSteer(); });
    $('#pg-beta').addEventListener('input', e => { A.beta = +e.target.value; $('#pg-b').textContent = A.beta; showAdapt(); });
    $('#pg-run1').addEventListener('click', () => deploy(1));
    $('#pg-run10').addEventListener('click', () => deploy(10));
    $('#pg-reset').addEventListener('click', resetAdapt);
    $$('[data-pgmode]').forEach(b => b.addEventListener('click', () => {
      P.mode = b.dataset.pgmode;
      $$('[data-pgmode]').forEach(x => x.setAttribute('aria-selected', x === b));
      $$('[data-pgpane]').forEach(p => { p.hidden = p.dataset.pgpane !== P.mode; });
      P.mode === 'steer' ? showSteer() : showAdapt();
    }));
    resetAdapt(); showSteer();
    addEventListener('resize', () => (P.mode === 'steer' ? showSteer() : showAdapt()));
  }
  addEventListener('resize', () => trip.forEach(cv => cv._state && drawPanel(cv, cv._state)));

  // ---------------------------------------------------------------- hero
  // Particles ride the same rectified flow from noise (left) into the two plan modes, which end on
  // the two robot videos: pick above, push below. Faint at the noise end, bright at the plan end.
  const hf = $('#hero-flow');
  if (hf) {
    const hero = hf.parentElement, r = F.rng(4), PI = [0.5, 0.5];
    let g, w, h, X, Y, live = false;
    const geom = () => {
      [g, w, h] = fit(hf);
      const hb = hero.getBoundingClientRect(), [a, b] = $$('.mode', hero).map(m => m.getBoundingClientRect());
      const side = getComputedStyle($('.modes', hero)).position === 'absolute';
      const yA = side ? a.top + a.height / 2 - hb.top : h * 0.3, yB = side ? b.top + b.height / 2 - hb.top : h * 0.7;
      const xEnd = side ? a.left - hb.left + 6 : w;
      X = t => t * xEnd;
      Y = z => (yA + yB) / 2 + z * (yB - yA) / 2;
    };
    const born = p => { p.z = r.normal(); p.t = 0; p.v = 0.0016 + r() * 0.0018; return p; };
    const advance = (p, dt) => { p.z += F.velocity(p.z, p.t, PI) * dt; p.t += dt; };
    const parts = Array.from({ length: 700 }, () => {
      const p = born({}), stop = r();
      while (p.t < stop) advance(p, 0.02);
      return p;
    });
    const stroke = (p, x0, y0) => {
      const t = p.t;
      g.strokeStyle = `rgba(${120 - 59 * t | 0},${140 + 80 * t | 0},${175 - 24 * t | 0},${0.08 + 0.55 * t * t})`;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(X(p.t), Y(p.z)); g.stroke();
    };
    const tick = () => {
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,0.085)'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter'; g.lineWidth = 1.2;
      for (const p of parts) {
        const x0 = X(p.t), y0 = Y(p.z);
        advance(p, p.v);
        if (p.t >= 1) born(p); else stroke(p, x0, y0);
      }
    };
    const frame = () => { tick(); if (live) requestAnimationFrame(frame); };
    const warm = () => { for (let i = 0; i < 90; i++) tick(); };   // start with trails already drawn
    const drawStill = () => {                // reduced motion: static streamlines
      g.globalCompositeOperation = 'lighter'; g.lineWidth = 1;
      for (let i = 0; i < 160; i++) {
        const p = born({});
        while (p.t < 1) { const x0 = X(p.t), y0 = Y(p.z); advance(p, 0.02); stroke(p, x0, y0); }
      }
    };
    geom();
    if (still) drawStill();
    else {
      warm();
      new IntersectionObserver(es => {
        const on = es[0].isIntersecting;
        if (on && !live) { live = true; requestAnimationFrame(frame); }
        live = on;
      }).observe(hero);
    }
    addEventListener('resize', () => { geom(); still ? drawStill() : warm(); });
  }
})();
