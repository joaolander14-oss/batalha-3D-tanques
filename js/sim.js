/* Motor: interseção raio/peça, penetração, ricochete, estilhaços, explosões e dano */
(function (SB) {
  'use strict';
  const { D2R, clamp } = SB;
  const V3 = THREE.Vector3;

  /* ============ GEOMETRIA ============ */
  function applyPlane(st, n, c, lo, ld) {
    const den = n[0] * ld.x + n[1] * ld.y + n[2] * ld.z;
    const num = c - (n[0] * lo.x + n[1] * lo.y + n[2] * lo.z);
    if (Math.abs(den) < 1e-12) { if (num < 0) st.dead = true; return; }
    const t = num / den;
    if (den < 0) { if (t > st.tin) { st.tin = t; st.nin = n; } } else { if (t < st.tout) { st.tout = t; st.nout = n; } }
  }
  const newSt = () => ({ tin: -1e9, tout: 1e9, nin: [0, 1, 0], nout: [0, 1, 0], dead: false });
  function fin(st) { if (st.dead || st.tin >= st.tout) return null; return { t0: st.tin, t1: st.tout, n0: st.nin, n1: st.nout }; }
  function boxPlanes(hx, hy, hz) { return [[[1, 0, 0], hx], [[-1, 0, 0], hx], [[0, 1, 0], hy], [[0, -1, 0], hy], [[0, 0, 1], hz], [[0, 0, -1], hz]]; }

  function cylSide(st, lo, ld, r) { // cilindro infinito em Y, raio r
    const a = ld.x * ld.x + ld.z * ld.z, b = 2 * (lo.x * ld.x + lo.z * ld.z), c = lo.x * lo.x + lo.z * lo.z - r * r;
    if (a < 1e-12) { if (c > 0) st.dead = true; return; }
    const disc = b * b - 4 * a * c; if (disc <= 0) { st.dead = true; return; }
    const s = Math.sqrt(disc), t0 = (-b - s) / (2 * a), t1 = (-b + s) / (2 * a);
    if (t0 > st.tin) { st.tin = t0; st.nin = [(lo.x + ld.x * t0) / r, 0, (lo.z + ld.z * t0) / r]; }
    if (t1 < st.tout) { st.tout = t1; st.nout = [(lo.x + ld.x * t1) / r, 0, (lo.z + ld.z * t1) / r]; }
  }
  function sphere(lo, ld, c, rx, ry, rz) { // elipsoide centrado em c; retorna {t0,t1,n0,n1} ou null
    const ox = (lo.x - c[0]) / rx, oy = (lo.y - c[1]) / ry, oz = (lo.z - c[2]) / rz, dx = ld.x / rx, dy = ld.y / ry, dz = ld.z / rz;
    const a = dx * dx + dy * dy + dz * dz, b = 2 * (ox * dx + oy * dy + oz * dz), cc = ox * ox + oy * oy + oz * oz - 1;
    if (a < 1e-12) return null;
    const disc = b * b - 4 * a * cc; if (disc <= 0) return null;
    const s = Math.sqrt(disc), t0 = (-b - s) / (2 * a), t1 = (-b + s) / (2 * a);
    const nf = t => [(lo.x + ld.x * t - c[0]) / (rx * rx), (lo.y + ld.y * t - c[1]) / (ry * ry), (lo.z + ld.z * t - c[2]) / (rz * rz)];
    return { t0, t1, n0: nf(t0), n1: nf(t1) };
  }

  function localHit(p, lo, ld) { // → lista de intervalos
    const sx = p.size[0] / 2, sy = p.size[1] / 2, sz = p.size[2] / 2;
    let st;
    switch (p.shape) {
      case 'box': case 'wedge': {
        st = newSt();
        boxPlanes(sx, sy, sz).forEach(pl => applyPlane(st, pl[0], pl[1], lo, ld));
        if (p.shape === 'wedge') { const l = Math.hypot(sz, sy); applyPlane(st, [0, sz / l, -sy / l], 0, lo, ld); }
        const r = fin(st); return r ? [r] : [];
      }
      case 'cyl': {
        st = newSt(); cylSide(st, lo, ld, sx);
        applyPlane(st, [0, 1, 0], sy, lo, ld); applyPlane(st, [0, -1, 0], sy, lo, ld);
        const r = fin(st); return r ? [r] : [];
      }
      case 'tube': {
        st = newSt(); cylSide(st, lo, ld, sx);
        applyPlane(st, [0, 1, 0], sy, lo, ld); applyPlane(st, [0, -1, 0], sy, lo, ld);
        const A = fin(st); if (!A) return [];
        const ri = sx - (p.wall || 0.05);
        if (ri <= 0.002) return [A];
        const sb = newSt(); cylSide(sb, lo, ld, ri);
        const B = fin(sb);
        if (!B) return [A];
        const inv = n => [-n[0], -n[1], -n[2]];
        const out = [];
        if (B.t0 > A.t0) out.push({ t0: A.t0, t1: Math.min(A.t1, B.t0), n0: A.n0, n1: inv(B.n0) });
        if (B.t1 < A.t1) out.push({ t0: Math.max(A.t0, B.t1), t1: A.t1, n0: inv(B.n1), n1: A.n1 });
        return out.filter(i => i.t1 > i.t0);
      }
      case 'sphere': { const r = sphere(lo, ld, [0, 0, 0], sx, sy, sz); return r ? [r] : []; }
      case 'capsule': {
        const R = sx, hh = Math.max(0, sy - R);
        const list = [];
        st = newSt(); cylSide(st, lo, ld, R); applyPlane(st, [0, 1, 0], hh, lo, ld); applyPlane(st, [0, -1, 0], hh, lo, ld);
        const c = fin(st); if (c) list.push(c);
        const s1 = sphere(lo, ld, [0, hh, 0], R, R, R), s2 = sphere(lo, ld, [0, -hh, 0], R, R, R);
        if (s1) list.push(s1); if (s2) list.push(s2);
        if (!list.length) return [];
        let a = list[0], b = list[0];
        list.forEach(i => { if (i.t0 < a.t0) a = i; if (i.t1 > b.t1) b = i; });
        return [{ t0: a.t0, t1: b.t1, n0: a.n0, n1: b.n1 }];
      }
    }
    return [];
  }

  const _lo = new V3(), _ld = new V3();
  function rayPart(w, o, d) {
    _lo.copy(o).sub(w.pos).applyQuaternion(w.qi); _ld.copy(d).applyQuaternion(w.qi);
    const arr = localHit(w.p, _lo, _ld), out = [];
    for (const iv of arr) {
      if (iv.t1 < 1e-6) continue;
      const n0 = new V3(iv.n0[0], iv.n0[1], iv.n0[2]).normalize().applyQuaternion(w.q);
      const n1 = new V3(iv.n1[0], iv.n1[1], iv.n1[2]).normalize().applyQuaternion(w.q);
      out.push({ w, t0: Math.max(iv.t0, -1e6), t1: iv.t1, n0, n1 });
    }
    return out;
  }
  SB.rayPart = rayPart;

  function prepare(tank, prior) {
    return tank.parts.map(p => {
      const q = p._q ? p._q.clone() : new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rot[0] * D2R, p.rot[1] * D2R, p.rot[2] * D2R, 'YXZ'));
      const sub = SB.SUBS[p.sub];
      return {
        p, q, qi: q.clone().invert(), pos: p._pos ? p._pos.clone() : new V3(p.pos[0], p.pos[1], p.pos[2]), mat: SB.mat(p.mat),
        acc: 0, E: 0, frag: 0, blast: 0, flags: {}, hp: Math.max(1, p.hp || (sub ? sub.hp : 100)),
        tough: (sub ? sub.t : 300), rad: 0.4 * Math.min(p.size[0], p.size[1], p.size[2]) + 0.02, shotHit: 0,
      };
    }).map(w => { const pr = prior && prior[w.p.id]; if (pr) { w.acc = pr.acc || 0; if (pr.det) w.flags.det = true; if (pr.fire) w.flags.fire = true; } return w; });
  }
  function collect(ctx, o, d) {
    const evs = [];
    for (const w of ctx.W) { const r = rayPart(w, o, d); for (const e of r) evs.push(e); }
    evs.sort((a, b) => a.t0 - b.t0);
    return evs;
  }

  /* ============ FÍSICA AUXILIAR ============ */
  function residual(v, P, cost) {
    if (cost >= P) return null;
    const k = Math.sqrt(1 - Math.pow(cost / P, 1.4));
    return { v: v * k, P: P * Math.pow(k, 1.43) };
  }
  const fragPen = (m, v) => 6 * Math.cbrt(m * 1000 / 5) * Math.pow(v / 1000, 1.3);
  const standF = sc => sc < 3 ? 0.45 + 0.55 * Math.max(sc, 0) / 3 : (sc <= 8 ? 1 : Math.max(0.2, 1 - 0.07 * (sc - 8)));

  function randCone(ctx, d, deg) {
    const maxA = deg * D2R, cm = Math.cos(maxA);
    const cosA = 1 - ctx.rnd() * (1 - cm), sinA = Math.sqrt(1 - cosA * cosA), ps = ctx.rnd() * Math.PI * 2;
    const a = Math.abs(d.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0);
    const u = new V3().crossVectors(d, a).normalize(), w = new V3().crossVectors(d, u);
    return d.clone().multiplyScalar(cosA).addScaledVector(u, sinA * Math.cos(ps)).addScaledVector(w, sinA * Math.sin(ps)).normalize();
  }
  function randSphere(ctx) {
    const z = 2 * ctx.rnd() - 1, ph = ctx.rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    return new V3(r * Math.cos(ph), z, r * Math.sin(ph));
  }

  function deposit(ctx, w, E, tag) {
    if (w.p.kind === 'armor' || E <= 0) return;
    w.E += E; w.acc += E / w.tough; w.shotHit++;
    if (tag === 'frag') w.frag++;
    if (tag === 'jet') w.flags.jet = true;
  }

  /* ---- estilhaço individual ---- */
  function traceFrag(ctx, o, d, m, v, ign) {
    if (ctx.nfrag > 1400) return;
    ctx.nfrag++;
    const E0 = 0.5 * m * v * v;
    let P = fragPen(m, v);
    const evs = collect(ctx, o, d);
    let tEnd = 0, stopped = false, hit = false, vv = v;
    for (const ev of evs) {
      if (ev.w === ign) continue;
      const tin = Math.max(ev.t0, 0), chord = ev.t1 - tin;
      if (chord <= 1e-5) continue;
      const cost = chord * 1000 * ev.w.mat.ke;
      if (cost >= P) {
        deposit(ctx, ev.w, 0.5 * m * vv * vv, 'frag');
        if (ev.w.p.kind !== 'armor') hit = true;
        tEnd = tin + chord * clamp(P / Math.max(cost, 1e-9), 0, 1); stopped = true; break;
      }
      const r = residual(vv, P, cost);
      if (!r) break;
      deposit(ctx, ev.w, 0.5 * m * (vv * vv - r.v * r.v), 'frag');
      if (ev.w.p.kind !== 'armor' && ev.w.mat.ke > 0.01) hit = true;
      vv = r.v; P = r.P; tEnd = ev.t1;
      if (P < 0.2) { stopped = true; break; }
    }
    if (!stopped) tEnd = Math.max(tEnd, 0) + 1.0;
    const e = clamp((Math.log10(Math.max(E0, 1)) - 1.5) / 3, 0.05, 1);
    ctx.frags.push({ a: o.clone(), b: o.clone().addScaledVector(d, tEnd), e, hit });
  }

  function spall(ctx, pe, d, w, TnMM, dmm, vres, coneDeg, kf, label) {
    const mat = w.mat;
    const massTot = mat.spall * kf * 0.18 * (Math.PI / 4 * Math.pow(dmm / 1000, 2) * (TnMM / 1000) * mat.dens);
    let n = Math.round(massTot * 1000 / 12);
    if (vres < 200) n = Math.round(n * vres / 200);
    n = clamp(n, 0, 80);
    if (n < 1) return 0;
    const m0 = massTot / n;
    for (let i = 0; i < n; i++) {
      const dir = randCone(ctx, d, coneDeg);
      traceFrag(ctx, pe.clone().addScaledVector(d, 0.003), dir, m0 * (0.4 + ctx.rnd() * 1.2), vres * (0.4 + ctx.rnd() * 0.5) + 80, w);
    }
    ctx.log.push({ k: 'info', t: 'Estilhaços de blindagem (' + w.p.name + '): ' + n + ' fragmentos, ~' + Math.round(massTot * 1000) + ' g' });
    return n;
  }

  /* ---- explosão: sopro + fragmentos do casco ---- */
  const VULN = { crew: 1, ammo: 0.6, fuel: 0.5, engine: 0.3, optics: 1, radio: 0.5 };
  function costAlong(ctx, a, b, skip) {
    const dv = new V3().subVectors(b, a), len = dv.length(); if (len < 1e-4) return 0;
    dv.multiplyScalar(1 / len);
    let cost = 0;
    for (const w of ctx.W) {
      if (w === skip || w.mat.ke < 0.15) continue;
      for (const ev of rayPart(w, a, dv)) {
        const t0 = Math.max(ev.t0, 0), t1 = Math.min(ev.t1, len);
        if (t1 > t0) cost += (t1 - t0) * 1000 * w.mat.ke;
      }
    }
    return cost;
  }
  function blast(ctx, pos, tnt) {
    if (tnt <= 0) return;
    const cr = Math.cbrt(tnt);
    for (const w of ctx.W) {
      if (w.p.kind === 'armor') continue;
      const r = Math.max(0.12, pos.distanceTo(w.pos) - w.rad);
      const vul = w.p.kind === 'crew' ? 1 : (VULN[w.p.sub] != null ? VULN[w.p.sub] : 0.3);
      let dmg = 140 * Math.pow(cr / r, 2) * vul;
      if (dmg < 0.5) continue;
      dmg *= Math.exp(-costAlong(ctx, pos, w.pos, w) / (35 * cr));
      if (dmg > 0.5) { w.acc += dmg; w.blast += dmg; w.E += dmg * 100; }
    }
  }
  function explode(ctx, pos, tnt, caseKg, axis, vAxis, label, noFrag) {
    ctx.blasts.push({ pos: pos.clone(), tnt });
    blast(ctx, pos, tnt);
    ctx.log.push({ k: 'bad', t: label + ': ' + (tnt * 1000).toFixed(0) + ' g TNT-eq' });
    if (!noFrag && caseKg > 0.02) {
      const ratio = tnt / caseKg, vg = Math.min(1700, 2400 * Math.sqrt(ratio / (1 + 0.5 * ratio)));
      const N = Math.min(260, Math.max(8, Math.round(caseKg * 0.6 * 1000 / 7)));
      const mf = caseKg * 0.6 / N;
      for (let i = 0; i < N; i++) {
        let dir;
        if (axis && ctx.rnd() < 0.35) dir = randCone(ctx, axis, 40); else dir = randSphere(ctx);
        const v = vg * (0.7 + 0.3 * ctx.rnd()) + (axis ? Math.max(0, dir.dot(axis)) * vAxis * 0.4 : 0);
        traceFrag(ctx, pos, dir, mf * (0.4 + 1.2 * ctx.rnd()), v, null);
      }
      ctx.log.push({ k: 'info', t: 'Fragmentação do projétil: ' + N + ' fragmentos a ~' + Math.round(vg) + ' m/s' });
    }
  }

  /* ============ VOO DO PROJÉTIL ============ */
  function ricProb(S, th, Tn, w) {
    const r = S.A.ric; let pr = clamp((th - (r[0] + w.mat.ric)) / Math.max(1, (r[1] - r[0])), 0, 1);
    const ratio = S.dmm / Math.max(Tn, 0.1);
    if (S.fam === 'shot' || S.fam === 'rod') { if (ratio >= 3) pr = 0; else if (ratio > 2) pr *= (3 - ratio); }
    return pr;
  }

  function fly(ctx, o, d, S, depth) {
    const evs = collect(ctx, o, d);
    let t = 0;
    const seg = (t0, t1, type, w) => { if (t1 - t0 > 1e-5) ctx.path.push({ a: o.clone().addScaledVector(d, t0), b: o.clone().addScaledVector(d, t1), type, w }); };
    const log = (txt, k) => ctx.log.push({ t: txt, k: k || 'info' });
    const endAt = (tt, type) => { ctx.endPos = o.clone().addScaledVector(d, tt); ctx.endType = type; };
    const detonateAt = tt => { // espoleta atrasada
      const pos = o.clone().addScaledVector(d, tt);
      explode(ctx, pos, S.A.tnt, S.A.caseMass, d, S.v, 'Espoleta acionou, detonação da carga', false);
      endAt(tt, 'boom'); S.dead = true;
    };
    // viaja de t até tt; retorna true se detonou
    const travel = (tt, type, w) => {
      if (tt <= t) return false;
      if (S.armed && S.timeLeft != null && S.v > 1) {
        const need = S.timeLeft * S.v, dist = tt - t;
        if (need <= dist) { seg(t, t + need, type, w); detonateAt(t + need); t = t + need; return true; }
        S.timeLeft -= dist / S.v;
      }
      seg(t, tt, type, w); t = tt; return false;
    };

    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i], w = ev.w, p = w.p, mat = w.mat;
      if (ev.t1 <= t + 1e-6) continue;
      const tin = Math.max(ev.t0, t);
      if (travel(tin, ctx.first ? 'in' : 'air')) return;
      const entering = ev.t0 >= t - 1e-6;
      const cos = entering ? clamp(-d.dot(ev.n0), 0, 1) : 1, th = Math.acos(cos) / D2R;
      const chord = ev.t1 - tin, isArmor = p.kind === 'armor';
      const entryPos = o.clone().addScaledVector(d, tin);
      const Tn = chord * cos * 1000;
      if (!ctx.first) ctx.first = { pos: entryPos.clone(), part: p, theta: th, tn: Tn };

      /* ----- ricochete / falha de espoleta ----- */
      if (entering && isArmor && depth < 3) {
        const pr = ricProb(S, th, Tn, w);
        if (pr > 0 && ctx.rnd() < pr) {
          const nrm = ev.n0, rd = d.clone().addScaledVector(nrm, -2 * d.dot(nrm));
          rd.x += (ctx.rnd() - 0.5) * 0.04; rd.y += (ctx.rnd() - 0.5) * 0.04; rd.normalize();
          seg(t, tin, 'in', w); ctx.ricochets++;
          log('RICOCHETE em "' + p.name + '" (ângulo ' + th.toFixed(0) + '°, chance ' + (pr * 100).toFixed(0) + '%)', 'warn');
          ctx.path.push({ a: entryPos.clone(), b: entryPos.clone().addScaledVector(rd, 2.2), type: 'rico', w });
          S.v *= 0.55; if (S.P) S.P *= Math.pow(0.55, 1.43);
          S.ricd = true;
          if (S.fam === 'heat' || S.fam === 'he' || S.fam === 'hesh') { endAt(tin, 'rico'); ctx.outcome = 'ricochet'; log('Espoleta não armou: o projétil ricocheteou sem detonar.', 'warn'); return; }
          return fly(ctx, entryPos.clone().addScaledVector(nrm, 0.004), rd, S, depth + 1);
        }
      }

      /* ===== HE / HESH: detonam ao contato ===== */
      if (S.fam === 'he' || S.fam === 'hesh') {
        seg(t, tin, 'in', w); t = tin;
        log('Impacto em "' + p.name + '" (' + th.toFixed(0) + '°). Espoleta de contato.', 'info');
        const axis = d.clone();
        if (S.fam === 'he') {
          const cost = isArmor ? Tn * mat.ke : 0;
          if (isArmor && cost < S.A.penHE) { log('HE perfurou a chapa fina (' + Tn.toFixed(0) + ' mm < ' + S.A.penHE.toFixed(0) + ' mm): explosão do lado interno.', 'good'); ctx.outcome = 'perfurou'; w.flags.pen = true;
            explode(ctx, o.clone().addScaledVector(d, ev.t1 + 0.01), S.A.tnt, S.A.caseMass, axis, S.v * 0.3, 'HE explodiu dentro do casco', false);
          } else {
            explode(ctx, entryPos.clone().addScaledVector(ev.n0, 0.01), S.A.tnt, S.A.caseMass, axis, S.v * 0.3, 'HE explodiu na superfície', false);
            ctx.outcome = ctx.outcome || 'naopen';
          }
        } else {
          explode(ctx, entryPos.clone().addScaledVector(ev.n0, 0.01), S.A.tnt, 0, axis, 0, 'HESH espalhou e detonou', true);
          const thr = S.A.heshThr;
          if (isArmor && Tn < thr) {
            const sev = 1 - Tn / thr, pe = o.clone().addScaledVector(d, ev.t1);
            const mS = 0.9 * S.A.tnt * sev, n = clamp(Math.round(mS * 1000 / 14), 4, 110);
            log('HESH: onda de choque destacou placas de aço na face interna (' + Tn.toFixed(0) + ' mm < limite ' + thr.toFixed(0) + ' mm): ' + n + ' estilhaços.', 'good');
            for (let k = 0; k < n; k++) traceFrag(ctx, pe.clone().addScaledVector(d, 0.004), randCone(ctx, d, 70), (mS / n) * (0.4 + 1.2 * ctx.rnd()), 220 + ctx.rnd() * 350 * sev, w);
            w.flags.pen = true; ctx.outcome = 'perfurou';
          } else { log('HESH: chapa grossa demais (' + Tn.toFixed(0) + ' mm ≥ ' + thr.toFixed(0) + ' mm), sem lascamento interno.', 'warn'); ctx.outcome = 'naopen'; }
        }
        endAt(tin, 'boom'); return;
      }

      /* ===== HEAT ===== */
      if (S.fam === 'heat') {
        if (!S.det) {
          S.det = true; S.tDet = tin;
          seg(t, tin, 'in', w); t = tin;
          log('HEAT detonou ao contato com "' + p.name + '" (' + th.toFixed(0) + '°), ogiva a ' + (S.A.stand).toFixed(0) + ' mm do liner.', 'info');
          ctx.blasts.push({ pos: entryPos.clone(), tnt: S.A.tnt }); blast(ctx, entryPos.clone().addScaledVector(ev.n0 || d, 0.02), S.A.tnt * 0.6);
        }
        const sc = (S.A.stand / 1000 + (tin - S.tDet)) / (S.A.liner ? S.A.liner.D / 1000 : 0.1);
        if (mat.era > 0 && !S.eraHit) { S.eraHit = true; S.eraMult *= (1 - mat.era); log('ERA "' + p.name + '" detonou e cortou o jato em ' + (mat.era * 100).toFixed(0) + '%.', 'warn'); }
        const Pnow = S.P0 * standF(sc) * S.eraMult - S.cons;
        if (Pnow <= 0.5) { log('Jato esgotado antes de "' + p.name + '".', 'warn'); endAt(tin, 'stop'); ctx.outcome = ctx.outcome || 'naopen'; return; }
        const cost = chord * 1000 * mat.heat;
        const stopHere = cost >= Pnow;
        const frac = stopHere ? clamp(Pnow / cost, 0, 1) : 1;
        seg(t, tin + chord * frac, 'jet', w);
        const EJ0 = 8e4 * Math.pow(S.A.liner.D / 100, 3);
        if (!isArmor) {
          const Aj = Math.PI / 4 * Math.pow(S.A.liner.D * 0.1 / 1000, 2);
          const Ec = 0.5 * mat.dens * chord * Aj * 6000 * 6000 * 0.5;
          deposit(ctx, w, Math.max(EJ0 * Math.min(cost, Pnow) / S.P0, Math.min(Ec, EJ0 * 0.5 * (Pnow / S.P0))), 'jet');
        }
        if (stopHere) {
          log((isArmor ? 'Jato parou dentro de "' : 'Jato parou em "') + p.name + '": ' + Pnow.toFixed(0) + ' mm disponíveis < ' + cost.toFixed(0) + ' mm de blindagem equivalente.', 'bad');
          endAt(tin + chord * frac, 'stop'); ctx.outcome = ctx.outcome || 'naopen'; return;
        }
        S.cons += cost; t = ev.t1;
        if (isArmor) {
          w.flags.pen = true; ctx.outcome = 'perfurou';
          log('Jato perfurou "' + p.name + '": ' + cost.toFixed(0) + ' mm eq. consumidos, restam ~' + (Pnow - cost).toFixed(0) + ' mm.', 'good');
          spall(ctx, o.clone().addScaledVector(d, ev.t1), d, w, Tn, S.A.liner.D * 0.25, 1500, 18, 1.0);
        }
        continue;
      }

      /* ===== PROJÉTEIS CINÉTICOS: fam shot / rod ===== */
      const rod = S.fam === 'rod';
      let eff = 0, thEff = 0;
      if (isArmor) {
        thEff = Math.max(0, th - (S.A.norm || 0)); const ratio = S.dmm / Math.max(Tn, 0.1);
        if (!rod) { if (ratio >= 3) thEff = 0; else if (ratio > 2) thEff *= (3 - ratio); }
      }
      if (mat.era > 0 && !S.eraHit) {
        S.eraHit = true;
        if (mat.eraKE > 0) { if (rod) S.L *= (1 - mat.eraKE * 0.6); else S.P *= (1 - mat.eraKE); log('ERA "' + p.name + '" detonou e degradou o penetrador em ' + (mat.eraKE * 100).toFixed(0) + '%.', 'warn'); }
      }

      if (!rod) {
        /* --- AP / APHE: De Marre com normalização e sobre-calibre --- */
        const cost = isArmor ? Tn / Math.max(0.09, Math.cos(thEff * D2R)) * mat.ke : chord * 1000 * mat.ke;
        const Pbef = S.P, vbef = S.v;
        if (S.fuse && !S.armed && cost >= S.A.sens) { S.armed = true; S.timeLeft = S.A.delay / 1000; log('Espoleta armou em "' + p.name + '" (' + cost.toFixed(0) + ' mm ≥ ' + S.A.sens + ' mm), retardo de ' + S.A.delay + ' ms.', 'info'); }
        if (cost >= S.P) {
          const frac = clamp(S.P / cost, 0, 1);
          seg(t, tin + chord * frac, isArmor ? 'armor' : 'in', w);
          if (!isArmor) deposit(ctx, w, 0.5 * S.m * S.v * S.v, 'shell');
          log('Projétil PAROU em "' + p.name + '": ' + (isArmor ? 'blindagem efetiva ' : 'resistência ') + cost.toFixed(0) + ' mm (espessura ' + Tn.toFixed(0) + ' mm a ' + th.toFixed(0) + '°) ≥ penetração ' + S.P.toFixed(0) + ' mm.', 'bad');
          const tstop = tin + chord * frac; endAt(tstop, 'stop'); ctx.outcome = ctx.outcome || 'naopen';
          if (S.armed) { const pos = o.clone().addScaledVector(d, tstop); explode(ctx, pos, S.A.tnt, S.A.caseMass, d, 0, 'Carga detonou após o impacto', false); endAt(tstop, 'boom'); }
          return;
        }
        const r = residual(S.v, S.P, cost);
        if (isArmor) {
          w.flags.pen = true; ctx.outcome = 'perfurou';
          log('Perfurou "' + p.name + '": ' + Tn.toFixed(0) + ' mm a ' + th.toFixed(0) + '°' + (S.A.norm ? ' (norm. ' + S.A.norm + '°)' : '') + ' → ' + cost.toFixed(0) + ' mm eq.; pen ' + Pbef.toFixed(0) + '→' + r.P.toFixed(0) + ' mm, vel ' + vbef.toFixed(0) + '→' + r.v.toFixed(0) + ' m/s.', 'good');
        } else deposit(ctx, w, 0.5 * S.m * (S.v * S.v - r.v * r.v), 'shell');
        seg(tin, ev.t1, isArmor ? 'armor' : 'in', w); t = ev.t1;
        const vres = r.v; S.v = r.v; S.P = r.P;
        if (isArmor) {
          spall(ctx, o.clone().addScaledVector(d, ev.t1), d, w, Tn, S.dmm, vres, 30, 1.0);
          if (cost / Pbef > 0.55) { // projétil estilhaça
            const mS = S.m * clamp((cost / Pbef - 0.4) * 0.8, 0, 0.4), n = 14;
            for (let k = 0; k < n; k++) traceFrag(ctx, o.clone().addScaledVector(d, ev.t1 + 0.003), randCone(ctx, d, 14), mS / n * (0.5 + ctx.rnd()), vres * (0.6 + 0.3 * ctx.rnd()), w);
            S.m -= mS; log('O projétil se fragmentou ao perfurar (' + (mS * 1000).toFixed(0) + ' g de lascas).', 'info');
          }
        }
        if (S.P < 1) { log('Penetração esgotada.', 'bad'); endAt(t, 'stop'); return; }
      } else {
        /* --- APDS / APFSDS: Tate-Alekseevskii --- */
        const c = S.A.core, te = isArmor ? chord * mat.ke * Math.pow(Math.max(cos, 0.05), 0.25 * (thEff > 0 ? 1 : 0) ) : chord * mat.ke; // espessura efetiva (m de RHA)
        const u = SB.tate(S.v, c.dens, c.yld * 1e9, SB.RHA.dens, SB.RHA.rt);
        if (!u) { seg(t, tin, 'in', w); log('Velocidade do dardo (' + S.v.toFixed(0) + ' m/s) abaixo do limite de penetração: parou em "' + p.name + '".', 'bad'); endAt(tin, 'stop'); ctx.outcome = ctx.outcome || 'naopen'; return; }
        const consume = te * (S.v - u) / u, Lbef = S.L, vbef = S.v;
        if (consume >= S.L) {
          const frac = clamp((S.L * u / (S.v - u)) / Math.max(te, 1e-9), 0, 1);
          seg(t, tin + chord * frac, isArmor ? 'armor' : 'in', w);
          if (!isArmor) deposit(ctx, w, 0.5 * S.m * S.v * S.v * 0.8, 'shell');
          log('Dardo CONSUMIDO em "' + p.name + '": espessura efetiva ' + (te * 1000).toFixed(0) + ' mm RHA, haste de ' + (Lbef * 1000).toFixed(0) + ' mm só penetra ' + (S.L * u / (S.v - u) * 1000).toFixed(0) + ' mm.', 'bad');
          endAt(tin + chord * frac, 'stop'); ctx.outcome = ctx.outcome || 'naopen'; return;
        }
        const time = te / u, Ar = Math.PI / 4 * c.D * c.D * 1e-6, dm = consume * Ar * c.dens;
        const dE = 0.5 * dm * S.v * S.v + (isArmor ? 0 : 0.5 * mat.dens * chord * Ar * 0.25 * S.v * S.v);
        deposit(ctx, w, Math.min(dE, 0.5 * S.m * S.v * S.v), 'shell');
        S.L -= consume; S.m *= S.L / Lbef;
        S.v = Math.max(100, S.v - c.yld * 1e9 / (c.dens * Math.max(S.L, 0.02)) * time);
        seg(tin, ev.t1, isArmor ? 'armor' : 'in', w); t = ev.t1;
        if (isArmor) {
          w.flags.pen = true; ctx.outcome = 'perfurou';
          log('Dardo perfurou "' + p.name + '": ' + Tn.toFixed(0) + ' mm a ' + th.toFixed(0) + '° → ' + (te * 1000).toFixed(0) + ' mm RHA efetivos; haste ' + (Lbef * 1000).toFixed(0) + '→' + (S.L * 1000).toFixed(0) + ' mm, vel ' + vbef.toFixed(0) + '→' + S.v.toFixed(0) + ' m/s.', 'good');
          spall(ctx, o.clone().addScaledVector(d, ev.t1), d, w, Tn, c.D * 1.8, S.v, 14, 1.5);
        }
      }
    }
    /* voo livre depois da última peça */
    if (!S.dead) {
      if (!travel(t + 6, ctx.first ? 'in' : 'air')) { if (!ctx.endPos) { endAt(t, 'exit'); } }
      if (!ctx.first) ctx.outcome = 'miss';
      else if (ctx.endType === 'exit') { log('O projétil atravessou o tanque e saiu do outro lado.', 'good'); }
    }
  }

  /* ============ VEREDITO / ESTADOS ============ */
  function stateOf(w) {
    if (w.flags.det) return 'det';
    const r = w.acc / w.hp;
    return r >= 1 ? 'destroyed' : r >= 0.6 ? 'heavy' : r >= 0.25 ? 'damaged' : r > 0.02 ? 'light' : 'intact';
  }
  SB.stateOf = stateOf;

  function finalize(ctx, opts) {
    const log = (txt, k) => ctx.log.push({ t: txt, k: k || 'info' });
    // detonação / fogo: pode encadear
    let changed = true, guard = 0;
    const done = new Set();
    while (changed && guard++ < 6) {
      changed = false;
      for (const w of ctx.W) {
        if (w.flags.det) { ctx.ammoDet = true; done.add(w); }
        if (w.flags.fire) ctx.fire = true;
        if (done.has(w)) continue;
        const sub = w.p.sub, frac = Math.min(1, w.acc / w.hp);
        if (sub === 'ammo' && frac > 0.25) {
          const pd = clamp((frac - 0.25) / 0.6, 0, 1) * 0.9 + (w.flags.jet ? 0.3 : 0);
          done.add(w);
          if (ctx.rnd() < pd) {
            w.flags.det = true; w.acc = w.hp * 2; ctx.ammoDet = true; changed = true;
            const kg = w.p.expl || 5;
            ctx.blasts.push({ pos: w.pos.clone(), tnt: kg });
            blast(ctx, w.pos.clone(), kg);
            log('💥 DETONAÇÃO DE MUNIÇÃO em "' + w.p.name + '" (dano ' + (frac * 100).toFixed(0) + '%, chance ' + (pd * 100).toFixed(0) + '%).', 'bad');
          } else log('Paiol "' + w.p.name + '" danificado (' + (frac * 100).toFixed(0) + '%), mas NÃO detonou (chance ' + (pd * 100).toFixed(0) + '%).', 'warn');
        } else if (sub === 'fuel' && frac > 0.2) {
          done.add(w);
          const pf = clamp((frac - 0.2) / 0.5, 0, 1) * 0.85 + (w.flags.jet ? 0.25 : 0);
          if (ctx.rnd() < pf) { w.flags.fire = true; ctx.fire = true; log('🔥 INCÊNDIO: combustível "' + w.p.name + '" pegou fogo (chance ' + (pf * 100).toFixed(0) + '%).', 'bad'); }
        }
      }
    }
    if (ctx.fire) { // fogo fere tripulantes e módulos próximos
      for (const fw of ctx.W) if (fw.flags.fire) for (const w of ctx.W) {
        if (w === fw || w.p.kind === 'armor') continue;
        if (w.pos.distanceTo(fw.pos) < 1.4) w.acc += w.hp * (w.p.kind === 'crew' ? 0.35 : 0.2);
      }
    }
    const crew = ctx.W.filter(w => w.p.kind === 'crew');
    const alive = crew.filter(w => w.acc < w.hp).length;
    const mods = sub => ctx.W.filter(w => w.p.sub === sub);
    const dead = ws => ws.length > 0 && ws.every(w => w.acc >= w.hp);
    const status = [];
    const minAlive = Math.min(opts.minCrew == null ? 2 : opts.minCrew, crew.length);
    let destroyed = ctx.ammoDet || (crew.length > 0 && alive < minAlive);
    const reasons = [];
    if (ctx.ammoDet) reasons.push('Detonação de munição');
    if (crew.length > 0 && alive < minAlive) reasons.push('Tripulação incapacitada (' + alive + '/' + crew.length + ' vivos)');
    if (ctx.fire) status.push('Em chamas');
    if (dead(mods('engine'))) status.push('Motor destruído');
    if (dead(mods('trans'))) status.push('Transmissão destruída');
    if (mods('track').some(w => w.acc >= w.hp)) status.push('Esteira danificada');
    if (dead(mods('breech'))) status.push('Canhão inutilizado');
    if (crew.filter(w => w.p.sub === 'gunner').some(w => w.acc >= w.hp)) status.push('Atirador morto');
    if (crew.filter(w => w.p.sub === 'driver').some(w => w.acc >= w.hp)) status.push('Motorista morto');
    if (crew.filter(w => w.p.sub === 'loader').some(w => w.acc >= w.hp)) status.push('Municiador morto');
    if (crew.filter(w => w.p.sub === 'commander').some(w => w.acc >= w.hp)) status.push('Comandante morto');
    if (dead(mods('optics'))) status.push('Mira destruída');
    const anyDmg = ctx.W.some(w => w.p.kind !== 'armor' && w.acc > 0.02 * w.hp);
    const verdict = destroyed ? 'destroyed' : (status.length || anyDmg ? 'damaged' : (ctx.outcome === 'ricochet' ? 'ricochet' : ctx.outcome === 'miss' ? 'miss' : 'nodamage'));
    ctx.verdict = { kind: verdict, destroyed, reasons, status, alive, crew: crew.length };
  }

  /* ============ API ============ */
  SB.Sim = {
    prepare,
    /* menor t de entrada no tanque (ou null) – usado pela batalha para detectar o impacto barato */
    probe(W, o, d) { let best = null; for (const w of W) for (const e of rayPart(w, o, d)) { if (best === null || Math.max(e.t0, 0) < best) best = Math.max(e.t0, 0); } return best; },
    run(tank, A, shot, opts) {
      opts = opts || {};
      const T = SB.TYPE[A.type];
      const ctx = { W: prepare(tank, opts.prior), rnd: SB.rnd(opts.seed || 1), path: [], frags: [], blasts: [], log: [], nfrag: 0, first: null, outcome: null, ricochets: 0, ammoDet: false, fire: false };
      const d = shot.dir.clone().normalize(), o = shot.origin.clone();
      const v = shot.v || SB.velAt(A, shot.dist || 0);
      const S = { fam: T.fam, A, v, m: A.mass, dmm: Math.max(A.d, 1), armed: false, timeLeft: null, dead: false };
      if (T.fam === 'shot') { S.P = SB.Kc * A.kT * Math.sqrt(A.mass) * Math.pow(v, 1.43) / Math.pow(S.dmm, 1.07); S.fuse = A.tnt > 0.005; }
      else if (T.fam === 'rod' && A.core) { S.L = A.core.L / 1000; S.m = A.core.mass; }
      else if (T.fam === 'heat') { S.P0 = A.heatP0 || 1; S.P = S.P0; S.cons = 0; S.eraMult = 1; S.det = false; }
      if (T.fam === 'rod' && !A.core) { ctx.log.push({ k: 'bad', t: 'Munição sem núcleo.' }); }
      ctx.log.push({ k: 'info', t: A.type + ': v=' + v.toFixed(0) + ' m/s a ' + (shot.dist || 0) + ' m, massa ' + (S.m).toFixed(2) + ' kg' + (S.P ? ', penetração nominal ' + S.P.toFixed(0) + ' mm RHA' : '') + (S.P0 ? ', jato ' + S.P0.toFixed(0) + ' mm RHA' : '') + (S.L ? ', haste ' + (S.L * 1000).toFixed(0) + ' mm' : '') });
      if (T.fam !== 'rod' || A.core) fly(ctx, o, d, S, 0);
      if (!ctx.outcome) ctx.outcome = ctx.first ? (ctx.ricochets ? 'ricochet' : 'naopen') : 'miss';
      if (!ctx.first) { ctx.outcome = 'miss'; ctx.log.push({ k: 'warn', t: 'O tiro não atingiu o tanque.' }); }
      if (ctx.first) ctx.log.splice(1, 0, { k: 'info', t: 'Primeiro contato: "' + ctx.first.part.name + '" a ' + ctx.first.theta.toFixed(0) + '° da normal, espessura local ' + ctx.first.tn.toFixed(0) + ' mm.' });
      finalize(ctx, opts);
      const parts = ctx.W.map(w => ({ id: w.p.id, name: w.p.name, kind: w.p.kind, sub: w.p.sub, hp: w.hp, acc: w.acc, state: w.p.kind === 'armor' ? (w.flags.pen ? 'pen' : 'intact') : stateOf(w), frag: w.frag, E: w.E, blast: w.blast, jet: !!w.flags.jet, fire: !!w.flags.fire, det: !!w.flags.det }));
      return { ctx, parts, path: ctx.path, frags: ctx.frags, blasts: ctx.blasts, log: ctx.log, outcome: ctx.outcome, first: ctx.first, verdict: ctx.verdict, endPos: ctx.endPos, endType: ctx.endType, v, S };
    },
  };
})(window.SB);
