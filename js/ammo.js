/* Munição: perfis desenháveis (x,r em mm), presets e cálculo de propriedades derivadas */
(function (SB) {
  'use strict';
  const { clamp } = SB;
  const f2 = x => Math.round(x * 100) / 100;

  /* ---------- geometria de revolução ---------- */
  function polyArea(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
  function polyVolume(pts) { // Pappus (mm3)
    if (pts.length < 3) return 0;
    const A = polyArea(pts); if (Math.abs(A) < 1e-9) return 0;
    let cy = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; cy += (p[1] + q[1]) * (p[0] * q[1] - q[0] * p[1]); }
    cy /= (6 * A);
    return 2 * Math.PI * Math.abs(cy) * Math.abs(A);
  }
  function bounds(pts) {
    let x0 = 1e9, x1 = -1e9, r1 = 0;
    pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); r1 = Math.max(r1, p[1]); });
    return { x0, x1, r1 };
  }
  SB.polyVolume = polyVolume; SB.polyBounds = bounds;

  /* ---------- construtores ---------- */
  function ogive(R, Ln) { const rho = (R * R + Ln * Ln) / (2 * R); return xp => Math.sqrt(Math.max(0, rho * rho - (Ln - xp) * (Ln - xp))) + R - rho; }
  function shellEnv(L, R, Ln, bt, btR) {
    const og = ogive(R, Ln);
    return x => { if (x > L - Ln) return Math.max(0, og(L - x)); if (x < bt) return btR + (R - btR) * (x / bt); return R; };
  }
  function samp(f, x0, x1, n) { const a = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; a.push([f2(x), f2(f(x))]); } return a; }
  function region(ro, ri, x0, x1, n) {
    const top = samp(ro, x0, x1, n);
    if (!ri) return top.concat([[f2(x1), 0], [f2(x0), 0]]);
    const bot = samp(ri, x0, x1, n).reverse();
    return top.concat(bot);
  }
  function hollow(env, L, x0, x1, wall, n) {
    const top = samp(env, 0, L, n);
    const inner = x => Math.max(0, env(x) - wall);
    const inn = samp(inner, x0, x1, 8);
    const body = top.concat([[f2(x1), 0]], inn.slice().reverse(), [[f2(x0), 0], [0, 0]]);
    const fill = region(inner, null, x0, x1, 8);
    return { body, fill };
  }
  let lid = 0; const LID = () => 'l' + (++lid) + Math.random().toString(36).slice(2, 5);

  function mkShell(o) {
    const R = o.d / 2, env = shellEnv(o.L, R, o.Ln, o.bt || 12, o.btR || R * 0.9);
    const layers = [];
    const xc = o.cap ? o.L - o.cap : o.L;
    let bodyPts;
    if (o.cavity) {
      const c = o.cavity;
      bodyPts = samp(env, 0, xc, 16).concat([[f2(xc), 0], [f2(c.x1), 0], [f2(c.x1), c.r], [f2(c.x0), c.r], [f2(c.x0), 0], [0, 0]]);
      layers.push({ id: LID(), name: 'Corpo', role: 'body', mat: o.bodyMat || 'apst', pts: bodyPts });
      layers.push({ id: LID(), name: 'Explosivo', role: 'filler', mat: o.fill || 'tnt', pts: [[c.x0, 0], [c.x0, c.r], [c.x1, c.r], [c.x1, 0]] });
    } else if (o.hollow) {
      const hb = hollow(env, o.L, o.hollow.x0, o.hollow.x1, o.hollow.wall, 22);
      layers.push({ id: LID(), name: 'Corpo', role: 'body', mat: o.bodyMat || 'apst', pts: hb.body });
      layers.push({ id: LID(), name: 'Explosivo', role: 'filler', mat: o.fill || 'tnt', pts: hb.fill });
    } else {
      layers.push({ id: LID(), name: 'Corpo', role: 'body', mat: o.bodyMat || 'apst', pts: region(env, null, 0, xc, 18) });
    }
    if (o.cap) layers.push({ id: LID(), name: 'Capuz', role: 'cap', mat: o.capMat || 'mild', pts: region(env, null, xc, o.L, 8) });
    return layers;
  }
  function mkRod(o) {
    const rc = o.coreD / 2, L = o.coreL, xn = L - o.noseL;
    const core = [[0, 0], [0, f2(rc)], [f2(xn), f2(rc)], [f2(L), f2(rc * 0.18)], [f2(L), 0]];
    const layers = [{ id: LID(), name: 'Núcleo (penetrador)', role: 'core', mat: o.coreMat || 'whp', pts: core }];
    if (o.sabotD) {
      const rs = o.sabotD / 2;
      layers.push({ id: LID(), name: 'Sabô (descartado)', role: 'sabot', mat: 'nylon', pts: [[f2(L * 0.12), f2(rc)], [f2(L * 0.12), f2(rs)], [f2(L * 0.72), f2(rs)], [f2(L * 0.9), f2(rc * 1.5)], [f2(L * 0.9), f2(rc)]] });
    }
    return layers;
  }
  function mkHeat(o) {
    const R = o.d / 2, L = o.L, wall = o.wall || 4;
    const env = shellEnv(L, R, o.Ln, 8, R * 0.9);
    const al = o.alpha * SB.D2R, tan = Math.tan(al);
    const xr = L - o.Ln * 0.55, Rl = R - wall - 2, H = Rl / tan, xa = xr - H;
    const inner = x => Math.max(0, env(x) - wall);
    const lo = x => Math.max(0, (x - xa) * tan);
    const li = x => Math.max(0, lo(x) - (o.linerT || 2.2) / Math.cos(al));
    const layers = [];
    const bodyTop = samp(env, 0, L, 24);
    const xe = L - o.Ln * 0.3;
    const bodyBot = samp(x => (x < (o.base || 8) ? 0 : inner(x)), 0, xe, 24).reverse();
    layers.push({ id: LID(), name: 'Corpo', role: 'body', mat: 'apst', pts: bodyTop.concat([[f2(L), 0], [f2(xe), 0]], bodyBot) });
    layers.push({ id: LID(), name: 'Liner de cobre', role: 'liner', mat: o.linerMat || 'cu', pts: region(lo, li, xa, xr, 12) });
    layers.push({ id: LID(), name: 'Explosivo', role: 'filler', mat: o.fill || 'compb', pts: region(x => inner(x), x => (x < xa ? 0 : lo(x)), o.base || 8, xr, 18) });
    return layers;
  }

  function ammo(name, type, layers, v0, extra) {
    return Object.assign({ id: 'a' + Math.random().toString(36).slice(2, 8), name, type, layers, v0, delay: 0.5, sens: 10, builtin: true }, extra || {});
  }

  SB.AMMO_PRESETS = function () {
    const P = [];
    P.push(ammo('75 mm APCBC-HE (M61)', 'APCBC', mkShell({ d: 75, L: 255, Ln: 90, bt: 14, cap: 34, cavity: { x0: 14, x1: 62, r: 10 } }), 792, { delay: 1, sens: 12 }));
    P.push(ammo('76 mm AP maciço', 'AP', mkShell({ d: 76, L: 210, Ln: 60, bt: 10 }), 662));
    P.push(ammo('88 mm APCBC-HE (PzGr.39)', 'APCBC', mkShell({ d: 88, L: 320, Ln: 110, bt: 16, cap: 40, cavity: { x0: 16, x1: 80, r: 12 } }), 773, { delay: 1, sens: 12 }));
    P.push(ammo('122 mm APHE (BR-471)', 'APHE', mkShell({ d: 122, L: 440, Ln: 130, bt: 22, cap: 48, cavity: { x0: 22, x1: 130, r: 17 } }), 800, { delay: 1.2, sens: 15 }));
    P.push(ammo('105 mm APDS (L7)', 'APCR', mkRod({ coreD: 36, coreL: 285, noseL: 55, sabotD: 105 }), 1480));
    P.push(ammo('120 mm APFSDS (WHA)', 'APFSDS', mkRod({ coreD: 24, coreL: 560, noseL: 50, sabotD: 120 }), 1650));
    P.push(ammo('120 mm APFSDS (DU, longo)', 'APFSDS', mkRod({ coreD: 22, coreL: 680, noseL: 50, sabotD: 120, coreMat: 'du' }), 1670));
    P.push(ammo('75 mm HEAT', 'HEAT', mkHeat({ d: 75, L: 260, Ln: 100, wall: 3.5, alpha: 28, base: 60 }), 450, { quality: 0.45 }));
    P.push(ammo('105 mm HEAT-FS (M456)', 'HEAT', mkHeat({ d: 105, L: 420, Ln: 150, wall: 4, alpha: 30, base: 100 }), 1170, { quality: 1 }));
    P.push(ammo('105 mm HESH (L31)', 'HESH', (function () {
      const R = 52.5, env = shellEnv(430, R, 120, 14, R * 0.9);
      const hb = hollow(env, 430, 18, 330, 6, 22);
      return [{ id: LID(), name: 'Corpo', role: 'body', mat: 'mild', pts: hb.body }, { id: LID(), name: 'Plástico explosivo', role: 'filler', mat: 'plast', pts: hb.fill }];
    })(), 732));
    P.push(ammo('75 mm HE', 'HE', (function () {
      const R = 37.5, env = shellEnv(270, R, 90, 12, R * 0.9);
      const hb = hollow(env, 270, 14, 190, 7, 20);
      return [{ id: LID(), name: 'Corpo', role: 'body', mat: 'mild', pts: hb.body }, { id: LID(), name: 'Explosivo', role: 'filler', mat: 'tnt', pts: hb.fill }];
    })(), 550));
    return P;
  };

  /* ---------- propriedades derivadas ---------- */
  SB.deriveAmmo = function (a) {
    const T = SB.TYPE[a.type] || SB.TYPE.AP;
    const out = { type: a.type, fam: T.fam, mass: 0, tnt: 0, fillMass: 0, caseMass: 0, d: 0, L: 0, v0: a.v0, nose: 0, core: null, liner: null, warnings: [] };
    let xmin = 1e9, xmax = -1e9, rmax = 0;
    const pts = [];
    a.layers.forEach(l => {
      const m = SB.mat(l.mat), b = bounds(l.pts), vol = polyVolume(l.pts) * 1e-9, mass = vol * m.dens;
      l._mass = mass; l._b = b;
      if (l.role === 'sabot') return; // descartado no cano
      out.mass += mass; xmin = Math.min(xmin, b.x0); xmax = Math.max(xmax, b.x1); rmax = Math.max(rmax, b.r1);
      l.pts.forEach(p => pts.push(p));
      if (l.role === 'filler') { out.fillMass += mass; out.tnt += mass * (m.expl || 1); }
      else if (l.role === 'core') out.core = { L: b.x1 - b.x0, D: 2 * b.r1, dens: m.dens, yld: m.yld, mass, mat: m };
      else if (l.role === 'liner') {
        const al = Math.atan2(b.r1, b.x1 - b.x0);
        out.liner = { D: 2 * b.r1, alpha: al / SB.D2R, dens: m.dens, mass };
      } else out.caseMass += mass;
    });
    if (out.core) { out.caseMass = out.core.mass; }
    out.L = xmax - xmin; out.d = out.core ? out.core.D : 2 * rmax;
    out.dBody = 2 * rmax;
    let xs = xmin; pts.forEach(p => { if (p[1] >= 0.97 * rmax) xs = Math.max(xs, p[0]); });
    out.nose = Math.max(0, xmax - xs);
    const dd = Math.max(out.d, 1) / 1000, Aproj = Math.PI / 4 * dd * dd;
    const cd = clamp(0.5 - 0.04 * (out.nose / Math.max(out.dBody, 1)) * 2.5, 0.2, 0.5) * (out.core ? 1.5 : 1);
    out.cd = cd;
    out.k = 0.5 * 1.2 * cd * Aproj / Math.max(out.mass, 0.05);
    out.ric = T.ric; out.norm = T.norm; out.kT = T.k;
    out.stand = out.nose * 0.9; // distância nariz → liner (mm)
    if (T.fam === 'heat') {
      if (!out.liner) { out.warnings.push('HEAT precisa de uma camada com função "liner".'); out.heatP0 = 0; }
      else {
        const ang = clamp(1 - 0.012 * Math.abs(2 * out.liner.alpha - 55), 0.6, 1.1);
        out.heatP0 = 4.4 * out.liner.D * Math.sqrt(out.liner.dens / 8960) * ang * (a.quality || 1);
      }
      const lay = a.layers.find(l => l.role === 'liner');
      if (lay) out.stand = Math.max(10, xmax - lay._b.x1);
    }
    if (T.fam === 'rod' && !out.core) out.warnings.push('Este tipo precisa de uma camada com função "core" (núcleo).');
    if ((T.fam === 'he' || T.fam === 'hesh') && out.tnt <= 0) out.warnings.push('Sem explosivo: adicione uma camada "filler".');
    out.penHE = 18 * Math.pow(Math.max(out.tnt, 0.001), 0.4);
    out.heshThr = 55 * Math.pow(Math.max(out.tnt, 0.001), 0.45);
    return out;
  };
  SB.velAt = (A, dist) => A.v0 * Math.exp(-A.k * dist);

  /* Tate-Alekseevskii: devolve {u} (velocidade de penetração) ou null */
  SB.tate = function (v, rp, Yp, rt, Rt) {
    if (0.5 * rp * v * v + Yp <= Rt) return null;
    const a = 0.5 * (rp - rt), b = -rp * v, c = 0.5 * rp * v * v + Yp - Rt;
    let u;
    if (Math.abs(a) < 1e-3) u = -c / b;
    else {
      const disc = b * b - 4 * a * c; if (disc < 0) return null;
      const s = Math.sqrt(disc), u1 = (-b - s) / (2 * a), u2 = (-b + s) / (2 * a);
      const ok = x => x > 0 && x < v;
      u = ok(u1) ? u1 : (ok(u2) ? u2 : null);
      if (u == null) return null;
    }
    return u > 0 && u < v ? u : null;
  };
  SB.RHA = { dens: 7850, rt: 6e9 };
  SB.Kc = 0.34;

  /* penetração nominal em RHA a 0° (mm) a uma distância */
  SB.nominalPen = function (A, dist) {
    const v = SB.velAt(A, dist);
    if (A.fam === 'shot') return SB.Kc * A.kT * Math.sqrt(A.mass) * Math.pow(v, 1.43) / Math.pow(Math.max(A.d, 1), 1.07);
    if (A.fam === 'rod' && A.core) {
      const c = A.core, u = SB.tate(v, c.dens, c.yld * 1e9, SB.RHA.dens, SB.RHA.rt);
      if (!u) return 0;
      return c.L * u / (v - u);
    }
    if (A.fam === 'heat') return (A.heatP0 || 0) * 0.92;
    if (A.fam === 'he') return A.penHE;
    if (A.fam === 'hesh') return A.heshThr;
    return 0;
  };
  SB.ammoClone = a => JSON.parse(JSON.stringify(a));
})(window.SB);
