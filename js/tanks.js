/* 25 tanques: construtor paramétrico (casco, estilo de torre, rodas, canhão) + garagem. Frente = -Z, topo = +Y, direita = +X. */
(function (SB) {
  'use strict';
  const D2R = SB.D2R, V3 = THREE.Vector3, rd = SB.round;
  const mk = (name, shape, pos, size, rot, mat, extra) => Object.assign({ id: SB.uid(), name, kind: 'armor', sub: '', shape, pos, size, rot, mat, hp: 0, wall: 0.05, grp: 'hull' }, extra || {});
  const mod = (name, sub, pos, size, rot, mat, grp) => {
    const s = SB.SUBS[sub];
    return { id: SB.uid(), name, kind: s.kind, sub, shape: s.shape, pos, size: size || s.size.slice(), rot: rot || [0, 0, 0], mat: mat || s.mat, hp: s.hp, wall: 0.05, grp: grp || 'hull' };
  };
  const short = m => SB.mat(m).name.split(' ')[0];
  function stack(name, center, rot, w, l, layers, grp) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] * D2R, rot[1] * D2R, rot[2] * D2R, 'YXZ'));
    const n = new V3(0, 1, 0).applyQuaternion(q);
    let cum = 0;
    return layers.map(([m, mm]) => {
      const t = mm / 1000, off = -(cum + t / 2); cum += t;
      return mk(name + (layers.length > 1 ? ' [' + short(m) + ' ' + mm + ']' : ''), 'box',
        [rd(center[0] + n.x * off, 4), rd(center[1] + n.y * off, 4), rd(center[2] + n.z * off, 4)], [rd(w, 4), t, rd(l, 4)], rot.slice(), m, { grp: grp || 'hull' });
    });
  }
  const L = (m, mm) => [[m, mm]];
  const ERA = (Lh, Wh, Ht) => ([
    { name: 'ERA glacis E', center: [-Wh * 0.5, Ht - 0.15, -Lh + 0.15], rot: [-70, 0, 0], w: Wh * 0.75, l: 0.5, layers: L('era', 40) },
    { name: 'ERA glacis D', center: [Wh * 0.5, Ht - 0.15, -Lh + 0.15], rot: [-70, 0, 0], w: Wh * 0.75, l: 0.5, layers: L('era', 40) },
    { name: 'ERA lateral E', center: [-Wh - 0.06, (0.45 + Ht) / 2, -Lh * 0.3], rot: [0, 0, 90], w: 0.55, l: Lh * 1.0, layers: L('era', 40) },
    { name: 'ERA lateral D', center: [Wh + 0.06, (0.45 + Ht) / 2, -Lh * 0.3], rot: [0, 0, -90], w: 0.55, l: Lh * 1.0, layers: L('era', 40) },
  ]);

  /* ---------------- construtor ---------------- */
  function build(c) {
    const P = [], D = [];
    const add = a => (Array.isArray(a) ? a : [a]).forEach(x => P.push(x));
    const Lh = c.Lh || 3, Wh = c.Wh || 1.3, Ht = c.Ht || 1.4, fx = Wh / 1.3, fz = Lh / 3;
    let tr = c.tr || 0.875; const ts = c.ts || 'round', th = c.th || 0.7, casemate = ts === 'casemate';
    const midY = (0.45 + Ht) / 2, sideH = Ht - 0.45;
    /* casco */
    const gY = Ht - 0.85, gRun = gY / Math.tan(c.glAng * D2R), gL = gY / Math.sin(c.glAng * D2R);
    add(stack('Glacis superior', [0, 0.85 + gY / 2, -Lh + gRun / 2], [-c.glAng, 0, 0], 2 * Wh, gL, c.glacis));
    const lY = 0.4, lRun = lY / Math.tan(c.loAng * D2R), lL = lY / Math.sin(c.loAng * D2R);
    add(stack('Placa frontal inferior', [0, 0.45 + lY / 2, -Lh + lRun / 2], [-c.loAng, 0, 0], 2 * Wh, lL, c.lower));
    add(stack('Lateral esquerda do casco', [-Wh, midY, 0.05], [0, 0, 90], sideH, 2 * Lh - 0.1, c.side));
    add(stack('Lateral direita do casco', [Wh, midY, 0.05], [0, 0, -90], sideH, 2 * Lh - 0.1, c.side));
    add(stack('Placa traseira', [0, midY, Lh], [90, 0, 0], 2 * Wh, sideH, c.rear));
    add(stack('Fundo do casco', [0, 0.45, 0.05], [180, 0, 0], 2 * Wh, 2 * Lh - 0.1, c.floor));
    add(stack('Saia/esteira esquerda', [-(Wh + 0.25), 0.55, 0.0], [0, 0, 90], 0.6, 2 * Lh - 0.3, c.skirt || L('mild', 20)));
    add(stack('Saia/esteira direita', [Wh + 0.25, 0.55, 0.0], [0, 0, -90], 0.6, 2 * Lh - 0.3, c.skirt || L('mild', 20)));
    (c.extras || []).forEach(e => add(stack(e.name, e.center, e.rot, e.w, e.l, e.layers)));

    /* torre / superestrutura */
    const zf = -Lh + gRun;                       // topo do glacis
    let tz, ty, gy, mantZ, mw;
    const tw = c.turWall || 0.06, tm = c.turMat || 'cast', tf = c.tf || c.mantlet;
    if (casemate) {
      const zr = Lh * 0.5, hs = 0.7, wd = 2 * Wh * 0.96; tz = (zf + zr) / 2; ty = Ht + hs / 2; gy = Ht + 0.38; mantZ = zf - 0.05; mw = 0.7;
      const ang = c.turAng || 62, run = hs / Math.tan(ang * D2R), fl = hs / Math.sin(ang * D2R);
      add(stack('Frente da casamata', [0, Ht + hs / 2, zf + run / 2], [-ang, 0, 0], wd, fl, tf));
      add(stack('Lateral E da casamata', [-wd / 2, Ht + hs / 2, tz + run / 2], [0, -6, 90], hs, zr - zf - run, L(tm, tw * 1000)));
      add(stack('Lateral D da casamata', [wd / 2, Ht + hs / 2, tz + run / 2], [0, 6, -90], hs, zr - zf - run, L(tm, tw * 1000)));
      add(stack('Teto da casamata', [0, Ht + hs, tz + run / 2], [0, 0, 0], wd, zr - zf - run, L('rha', c.roofT || 25)));
      add(stack('Traseira da casamata', [0, Ht + hs / 2, zr], [90, 0, 0], wd, hs, L(tm, Math.max(30, tw * 800))));
      add(stack('Teto frontal do casco', [0, Ht, (zr + Lh) / 2 - 0.1], [0, 0, 0], 2 * Wh, Lh - zr, c.roof));
      tr = Wh * 0.9;
    } else {
      tz = c.tz != null ? c.tz : -0.2; ty = Ht + th / 2 - 0.05; gy = ty + 0.05; mantZ = tz - tr - 0.08; mw = Math.min(1.1, tr * 1.05);
      const z0 = zf, z1 = tz - tr, z2 = tz + tr;
      if (z1 - z0 > 0.2) add(stack('Teto frontal do casco', [0, Ht, (z0 + z1) / 2], [0, 0, 0], 2 * Wh, z1 - z0, c.roof));
      add(stack('Deck do motor', [0, Ht - 0.1, (z2 + Lh) / 2], [0, 0, 0], 2 * Wh, Lh - z2, L('mild', 15)));
      if (ts === 'angular') {
        const wd = 2 * tr * 0.95, ang = c.turAng || 72, run = th / Math.tan(ang * D2R), fl = th / Math.sin(ang * D2R);
        add(stack('Frente da torre', [0, ty, tz - tr + run / 2 + 0.05], [-ang, 0, 0], wd, fl, tf, 'turret'));
        add(stack('Lateral E da torre', [-tr * 0.95, ty, tz + run / 2], [0, -8, 90], th, 2 * tr - run, L(tm, tw * 1000), 'turret'));
        add(stack('Lateral D da torre', [tr * 0.95, ty, tz + run / 2], [0, 8, -90], th, 2 * tr - run, L(tm, tw * 1000), 'turret'));
        add(stack('Traseira da torre', [0, ty, tz + tr], [90, 0, 0], wd, th, L(tm, Math.max(30, tw * 700)), 'turret'));
        add(stack('Teto da torre', [0, ty + th / 2, tz + run / 2], [0, 0, 0], wd, 2 * tr - run, L('rha', c.roofT || 30), 'turret'));
      } else {
        const hh = ts === 'egg' ? th * 0.78 : ts === 'low' ? th * 0.8 : th;
        P.push(mk('Parede da torre', 'tube', [0, Ht + hh / 2 - 0.05, tz], [2 * tr, hh, 2 * tr], [0, 0, 0], tm, { wall: tw, grp: 'turret' }));
        if (ts !== 'low') P.push(mk('Teto da torre', 'cyl', [0, Ht + hh - 0.035, tz], [2 * tr, 0.03, 2 * tr], [0, 0, 0], 'rha', { grp: 'turret' }));
      }
    }
    add(stack('Mantelete', [0, gy, mantZ], [-90, 0, 0], mw, 0.5, c.mantlet, 'gun'));
    const bl = c.cal * (22 + 26 * c.vk) / 1000, gd = 0.05 + c.cal / 1000 * 0.55;
    P.push(mk('Cano do canhão', 'tube', [0, gy, mantZ - bl / 2], [gd, bl, gd], [90, 0, 0], 'rha', { wall: gd * 0.32, grp: 'gun' }));
    const tg = casemate ? 'hull' : 'turret';

    /* módulos */
    P.push(mod('Culatra do canhão', 'breech', [0, gy, mantZ + 0.62], null, null, null, 'gun'));
    P.push(mod('Mira do atirador', 'optics', [-0.35 * fx, gy + 0.22, mantZ + 0.5], null, null, null, 'gun'));
    P.push(mod('Giro da torre', 'drive', [0, Ht + 0.1, tz], [0.35, 0.2, 0.35], null, null, tg));
    if (c.ammo === 'carousel') {
      P.push(mod('Carrossel de munição', 'ammo', [0, 0.72, -0.1], [1.3 * fx, 0.3, 1.3], null, null, 'hull'));
      P.push(mod('Paiol da torre (traseiro)', 'ammo', [0, ty - 0.1, tz + tr * 0.55], [0.5, 0.35, 0.35], null, null, tg));
    } else if (c.ammo === 'bustle') {
      P.push(mod('Paiol da torre (traseiro)', 'ammo', [0, ty - 0.05, tz + tr * 0.62], [0.9 * fx, 0.5, 0.5], null, null, tg));
      P.push(mod('Paiol do casco D', 'ammo', [0.9 * fx, 0.65, -Lh + 1.5], [0.4, 0.3, 0.8], null, null, 'hull'));
    } else {
      P.push(mod('Paiol da torre (traseiro)', 'ammo', [0, ty - 0.1, tz + tr * 0.55], [0.55 * fx, 0.4, 0.4], null, null, tg));
      const az = c.engF ? Lh - 1.2 : -Lh + 1.6;
      P.push(mod('Paiol do casco E', 'ammo', [-0.9 * fx, 0.65, az], [0.4, 0.3, 0.9 * fz], null, null, 'hull'));
      P.push(mod('Paiol do casco D', 'ammo', [0.9 * fx, 0.65, az], [0.4, 0.3, 0.9 * fz], null, null, 'hull'));
      P.push(mod('Paiol do casco E (2)', 'ammo', [-0.9 * fx, 0.65, c.engF ? az - 1 : az + 1], [0.4, 0.3, 0.8 * fz], null, null, 'hull'));
    }
    if (c.engF) {
      P.push(mod('Motor', 'engine', [0.55 * fx, 0.95, -Lh + 1.3], [0.9 * fx, Math.min(0.8, Ht - 0.6), 1.2 * fz], null, null, 'hull'));
      P.push(mod('Transmissão', 'trans', [0.55 * fx, 0.8, -Lh + 0.35], [0.9 * fx, 0.6, 0.3], null, null, 'hull'));
    } else {
      P.push(mod('Motor', 'engine', [0, 0.95, Lh - 1.0], [1.1 * fx, Math.min(0.8, Ht - 0.6), 1.2 * fz], null, null, 'hull'));
      P.push(mod('Transmissão', 'trans', [0, 0.8, Lh - 0.15], [1.0 * fx, 0.6, 0.3], null, null, 'hull'));
    }
    P.push(mod('Tanque de combustível E', 'fuel', [-(Wh - 0.2), 0.75, Lh - 1.3], [0.35, 0.5, 1.5 * fz], null, null, 'hull'));
    P.push(mod('Tanque de combustível D', 'fuel', [Wh - 0.2, 0.75, Lh - 1.3], [0.35, 0.5, 1.5 * fz], null, null, 'hull'));
    [['Roda guia', -1], ['Roda motriz', 1]].forEach(([n, sg]) => [['E', -1], ['D', 1]].forEach(([sd, sx]) => P.push(mod(n + ' ' + sd, 'track', [sx * (Wh + 0.2), 0.55, sg * (Lh - 0.4)], [0.35, 0.9, 0.9], null, null, 'hull'))));
    P.push(mod('Motorista', 'driver', [-0.6 * fx, 0.95, -Lh + 0.85]));
    if (!c.auto) P.push(mod('Operador de rádio', 'radioop', [0.55 * fx, 0.95, -Lh + 0.85]));
    const cy = casemate ? Ht + 0.15 : ty - 0.2, cz = tz;
    if (c.crewHull) {
      P.push(mod('Atirador', 'gunner', [-0.2 * fx, 0.95, -Lh + 1.6], null, null, null, 'hull'));
      P.push(mod('Comandante', 'commander', [0.5 * fx, 0.95, -Lh + 1.6], null, null, null, 'hull'));
    } else {
      P.push(mod('Atirador', 'gunner', [-0.45 * fx, cy, cz - 0.1], null, null, null, tg));
      if (!c.auto) P.push(mod('Municiador', 'loader', [0.5 * fx, cy, cz - 0.05], null, null, null, tg));
      P.push(mod('Comandante', 'commander', [-0.45 * fx, cy, cz + Math.min(0.55, tr * 0.6)], null, null, null, tg));
    }

    /* ---------- decoração visual (não entra na simulação) ---------- */
    const d = (shape, pos, size, rot, color, grp) => D.push({ shape, pos: pos.map(x => rd(x, 3)), size, rot: rot || [0, 0, 0], color, grp: grp || 'hull', wall: 0.03 });
    const w = c.wh || [6, 0.36, 'std'], nW = w[0], wr = w[1], wt = w[2];
    [-1, 1].forEach(sg => {
      const xo = sg * (Wh + 0.2), y0 = 0.1 + wr;
      for (let i = 0; i < nW; i++) {
        const z = -Lh + 0.95 + (2 * Lh - 1.9) * (nW > 1 ? i / (nW - 1) : 0.5), xx = wt === 'overlap' ? sg * (Wh + (i % 2 ? 0.1 : 0.3)) : xo;
        d('cyl', [xx, y0, z], [wr * 2, wt === 'overlap' ? 0.22 : 0.2, wr * 2], [0, 0, 90], 'rubber');
        d('cyl', [xx + sg * 0.1, y0, z], [wr * 0.9, 0.04, wr * 0.9], [0, 0, 90], 'metal');
      }
      d('cyl', [xo, 0.1 + 0.36, Lh - 0.35], [0.74, 0.22, 0.74], [0, 0, 90], 'metal');           // roda motriz
      d('cyl', [xo, 0.1 + 0.34, -Lh + 0.35], [0.68, 0.22, 0.68], [0, 0, 90], 'rubber');          // roda guia
      const nr = c.ret != null ? c.ret : 3;
      for (let i = 0; i < nr; i++) d('cyl', [xo, 0.1 + wr * 2 + 0.22, -Lh * 0.45 + i * (Lh * 0.5)], [0.2, 0.18, 0.2], [0, 0, 90], 'rubber');
      d('box', [xo, 0.07, 0.0], [0.42, 0.07, 2 * Lh - 0.6], null, 'track');                    // lagarta (baixo)
      d('box', [xo, 0.1 + wr * 2 + 0.07, 0.0], [0.42, 0.06, 2 * Lh - 0.5], null, 'track');     // lagarta (alto)
      if (c.fender !== false) d('box', [sg * (Wh + 0.25), 0.1 + wr * 2 + 0.34, 0.0], [0.62, 0.035, 2 * Lh - 0.1], null, 'body');
      if (c.schurzen) d('box', [sg * (Wh + 0.52), 0.95, 0.2], [0.02, 0.6, 2 * Lh * 0.72], null, 'body');
    });
    if (c.bins) [-1, 1].forEach(sg => [0, 1, 2].forEach(i => d('box', [sg * (Wh + 0.28), 0.1 + wr * 2 + 0.5, Lh * 0.3 - i * 0.7], [0.3, 0.26, 0.5], null, 'dark')));
    if (c.drums) [-1, 1].forEach(sg => d('cyl', [sg * 0.45, Ht + 0.3, Lh - 0.45], [0.45, 0.8, 0.45], [90, 0, 0], 'dark'));
    d('box', [0, Ht - 0.07, c.engF ? -Lh + 1.5 : Lh - 0.9], [Wh * 1.3, 0.03, 0.9], null, 'dark');                       // grade do motor
    if (c.exhaust) [-1, 1].forEach(sg => d('cyl', [sg * Wh * 0.6, Ht + 0.15, Lh - 0.1], [0.2, 0.5, 0.2], [90, 0, 0], 'metal'));
    d('box', [-0.55 * fx, Ht + 0.05, -Lh + 0.9], [0.4, 0.07, 0.4], null, 'body');                  // escotilha motorista
    if (!casemate) {
      d('cyl', [-0.45 * tr / 0.875, ty + th / 2 + 0.06, tz + tr * 0.35], [0.5, 0.18, 0.5], null, 'body', 'turret');   // cúpula do comandante
      d('box', [-0.45 * tr / 0.875 - 0.2, ty + th / 2 + 0.2, tz + tr * 0.35 - 0.25], [0.04, 0.04, 0.4], null, 'metal', 'turret');
      d('cyl', [0.45 * tr / 0.875, ty + th / 2 + 0.03, tz + tr * 0.3], [0.45, 0.07, 0.45], null, 'body', 'turret');   // escotilha do municiador
      if (c.bustle) d('box', [0, ty - 0.05, tz + tr + 0.35], [tr * 1.5, th * 0.85, 0.7], null, 'body', 'turret');
    }
    if (c.antenna) d('cyl', [0.55 * tr, ty + 1.2, tz + tr * 0.8], [0.04, 2.6, 0.04], null, 'metal', casemate ? 'hull' : 'turret');
    if (c.smoke) [-1, 1].forEach(sg => [0, 1, 2].forEach(i => d('box', [sg * tr * 0.92, ty + 0.12, tz - tr * 0.55 + i * 0.16], [0.1, 0.12, 0.12], null, 'dark', tg)));
    d('box', [0.3 * fx, gy + 0.3, mantZ + 0.4], [0.3, 0.25, 0.3], null, 'metal', 'gun');           // visor do atirador
    const by = c.brake;
    if (by === 'brake2') d('cyl', [0, gy, mantZ - bl + 0.2], [gd * 2.0, 0.4, gd * 2.0], [90, 0, 0], 'metal', 'gun');
    if (by === 'brake1') d('cyl', [0, gy, mantZ - bl + 0.18], [gd * 1.7, 0.3, gd * 1.7], [90, 0, 0], 'metal', 'gun');
    if (by === 'sleeve') d('cyl', [0, gy, mantZ - bl * 0.42], [gd * 1.4, bl * 0.5, gd * 1.4], [90, 0, 0], 'body', 'gun');
    if (c.evac) d('cyl', [0, gy, mantZ - bl * 0.66], [gd * 1.55, 0.28, gd * 1.55], [90, 0, 0], 'metal', 'gun');
    d('cyl', [0, gy, mantZ - 0.15], [gd * 1.5, 0.3, gd * 1.5], [90, 0, 0], 'metal', 'gun');          // base do cano

    if (c.aa) {
      const tgp = casemate ? 'hull' : 'turret', nbMap = { twin: 2, quad: 4, six: 6, wirbel: 4, tung: 2, gepard: 2, single: 1, sam: 0 }, nb = nbMap[c.aa] != null ? nbMap[c.aa] : 2;
      d('box', [0, ty + 0.02, tz + 0.05], [tr * 2.1, th * 1.1 + 0.15, tr * 2.0], null, 'dark', tgp);
      for (let k = 1; k < nb; k++) { const ox = (k % 2 ? 1 : -1) * (0.2 + 0.18 * Math.floor((k + 1) / 2)), oy = k >= 3 ? 0.18 : 0; d('cyl', [ox, gy + oy, mantZ - bl / 2], [gd, bl, gd], [90, 0, 0], 'metal', 'gun'); }
      if (c.radar || c.aa === 'gepard' || c.aa === 'tung') { d('cyl', [0, ty + th / 2 + 0.72, tz + tr * 0.55], [0.95, 0.06, 0.95], [55, 0, 0], 'metal', tgp); d('cyl', [0, ty + th / 2 + 0.35, tz + tr * 0.55], [0.08, 0.7, 0.08], null, 'metal', tgp); }
      if (c.aa === 'gepard') d('sphere', [0, ty + th / 2 + 0.42, tz - tr * 0.45], [0.7, 0.5, 0.7], null, 'dark', tgp);
      if (c.sam) { const nt = c.sam >= 8 ? 4 : c.sam >= 6 ? 3 : 2; [-1, 1].forEach(sg => { for (let k = 0; k < nt; k++) d('cyl', [sg * (tr * 0.95 + 0.05), ty + 0.2 + k * 0.22, tz - 0.3], [0.2, 1.6, 0.2], [-55, 0, 0], 'metal', tgp); }); }
    }
    /* escala uniforme (espessuras preservadas) */
    const s = c.s || 1;
    const scl = p => {
      p.pos = p.pos.map(x => rd(x * s, 4));
      if (p.kind === 'armor') {
        if (p.shape === 'tube' || p.shape === 'cyl') { if (p.grp !== 'gun') p.size = p.size.map(x => rd(x * s, 4)); }
        else p.size = [rd(p.size[0] * s, 4), p.size[1], rd(p.size[2] * s, 4)];
      } else if (p.kind === 'module') p.size = p.size.map(x => rd(x * s, 4));
    };
    if (s !== 1) { P.forEach(scl); D.forEach(q => { q.pos = q.pos.map(x => rd(x * s, 4)); q.size = q.size.map(x => rd(x * s, 4)); }); }
    const st = Object.assign({ cal: c.cal, vk: c.vk, vmax: c.vmax, rev: Math.max(8, c.vmax * 0.3), turn: 30, trav: 22, elev: [-8, 18], reload: c.reload, rack: c.rack || 50, mass: c.mass, fixedGun: casemate, hp: 1,
      turPivot: [0, ty * s, tz * s], gunPivot: [0, gy * s, (mantZ + 0.2) * s], muzzle: [0, gy * s, (mantZ - bl) * s], bodyLen: 2 * Lh * s + 0.2, bodyWid: 2 * (Wh + 0.3) * s }, c.stats || {});
    return { name: c.name, nation: c.nation, paint: c.paint, cat: c.cat || 'tank', parts: P, deco: D, stats: st };
  }

  /* ---------------- elenco ----------------
     [id, nome, nação, massa t, vmax km/h, calibre mm, vk, recarga s, cfg] */
  const T = (id, nm, na, m, v, cal, vk, rl, cfg) => [id, nm, na, m, v, cal, vk, rl, cfg];
  const ROSTER = [
    T('sherman', 'M4 Sherman', 'EUA', 30, 38, 75, 0.9, 6, { Lh: 3.0, Wh: 1.3, Ht: 1.7, glAng: 47, loAng: 55, glacis: L('rha', 51), lower: L('rha', 51), side: L('rha', 38), rear: L('rha', 38), roof: L('rha', 19), floor: L('rha', 13), ts: 'round', tr: 0.85, th: 0.62, tz: -0.25, turWall: 0.076, mantlet: L('cast', 76), s: 1.0, paint: 0x5d6b3b, wh: [6, 0.3, 'std'], ret: 3, bins: true, brake: 'none', bustle: true, antenna: true }),
    T('t3476', 'T-34-76', 'URSS', 29, 55, 76, 0.95, 6, { Lh: 3.0, Wh: 1.35, Ht: 1.3, glAng: 29, loAng: 78, glacis: L('rha', 45), lower: L('rha', 45), side: L('rha', 45), rear: L('rha', 40), roof: L('rha', 20), floor: L('mild', 20), ts: 'angular', tr: 0.8, th: 0.6, tz: -0.35, turAng: 60, tf: L('cast', 52), turWall: 0.045, mantlet: L('cast', 60), s: 0.97, paint: 0x4b5c36, wh: [4, 0.4, 'overlap'], ret: 0, fender: true, drums: true, brake: 'none' }),
    T('pz4h', 'Panzer IV H', 'Alemanha', 25, 38, 75, 1.12, 6, { Lh: 3.0, Wh: 1.3, Ht: 1.45, glAng: 80, loAng: 80, glacis: L('rha', 80), lower: L('rha', 80), side: L('rha', 30), rear: L('rha', 20), roof: L('rha', 18), floor: L('rha', 11), ts: 'angular', tr: 0.8, th: 0.65, tz: -0.1, turAng: 80, tf: L('rha', 50), turWall: 0.03, mantlet: L('cast', 50), s: 0.98, paint: 0x80795f, wh: [8, 0.2, 'std'], ret: 4, schurzen: true, brake: 'brake1', cupola: true }),
    T('panther', 'Panther G', 'Alemanha', 45, 46, 75, 1.3, 6.5, { Lh: 3.45, Wh: 1.45, Ht: 1.4, glAng: 35, loAng: 65, glacis: L('rha', 80), lower: L('rha', 60), side: L('rha', 50), rear: L('rha', 40), roof: L('rha', 16), floor: L('rha', 16), ts: 'angular', tr: 0.9, th: 0.62, tz: -0.2, turAng: 78, tf: L('cast', 110), turWall: 0.045, mantlet: L('cast', 100), s: 1.03, paint: 0x8d7f50, wh: [8, 0.42, 'overlap'], ret: 0, schurzen: true, brake: 'brake2', antenna: true }),
    T('tiger1', 'Tiger I', 'Alemanha', 57, 38, 88, 1.12, 7, { Lh: 3.1, Wh: 1.6, Ht: 1.5, glAng: 80, loAng: 80, glacis: L('rha', 100), lower: L('rha', 100), side: L('rha', 80), rear: L('rha', 82), roof: L('rha', 26), floor: L('rha', 26), ts: 'angular', tr: 0.95, th: 0.75, tz: -0.1, turAng: 84, tf: L('rha', 100), turWall: 0.08, mantlet: L('cast', 120), s: 1.05, paint: 0x6f6e66, wh: [8, 0.45, 'overlap'], ret: 0, fender: true, brake: 'brake2', bins: true }),
    T('kv1', 'KV-1', 'URSS', 45, 35, 76, 0.95, 7, { Lh: 3.2, Wh: 1.4, Ht: 1.55, glAng: 70, loAng: 70, glacis: L('rha', 75), lower: L('rha', 75), side: L('rha', 75), rear: L('rha', 60), roof: L('rha', 30), floor: L('rha', 30), ts: 'round', tr: 0.9, th: 0.75, tz: -0.15, turWall: 0.075, mantlet: L('cast', 90), s: 1.08, paint: 0x435431, wh: [6, 0.32, 'std'], ret: 3, fender: true, drums: true, brake: 'none' }),
    T('is2', 'IS-2', 'URSS', 46, 37, 122, 0.85, 12, { Lh: 3.3, Wh: 1.45, Ht: 1.45, glAng: 60, loAng: 55, glacis: L('rha', 100), lower: L('rha', 100), side: L('rha', 90), rear: L('rha', 60), roof: L('rha', 30), floor: L('rha', 20), ts: 'round', tr: 0.9, th: 0.7, tz: -0.1, turWall: 0.1, mantlet: L('cast', 100), s: 1.05, paint: 0x4d5a35, wh: [6, 0.36, 'std'], ret: 3, fender: true, drums: true, brake: 'brake2' }),
    T('tiger2', 'Tiger II', 'Alemanha', 68, 34, 88, 1.28, 7.5, { Lh: 3.5, Wh: 1.65, Ht: 1.55, glAng: 50, loAng: 55, glacis: L('rha', 150), lower: L('rha', 100), side: L('rha', 80), rear: L('rha', 80), roof: L('rha', 40), floor: L('rha', 25), ts: 'angular', tr: 1.0, th: 0.8, tz: -0.15, turAng: 80, tf: L('rha', 180), turWall: 0.08, mantlet: L('cast', 180), s: 1.1, paint: 0x867a52, wh: [9, 0.45, 'overlap'], ret: 0, fender: true, brake: 'brake2', bins: true }),
    T('pershing', 'M26 Pershing', 'EUA', 41, 48, 90, 1.1, 6.5, { Lh: 3.2, Wh: 1.4, Ht: 1.5, glAng: 45, loAng: 50, glacis: L('rha', 102), lower: L('rha', 76), side: L('rha', 76), rear: L('rha', 51), roof: L('rha', 25), floor: L('rha', 25), ts: 'round', tr: 0.9, th: 0.7, tz: -0.15, turWall: 0.076, mantlet: L('cast', 114), s: 1.05, paint: 0x5c6a3e, wh: [6, 0.34, 'std'], ret: 3, fender: true, brake: 'brake2', evac: true, bustle: true }),
    T('t3485', 'T-34-85', 'URSS', 32, 55, 85, 1.05, 6, { Lh: 3.0, Wh: 1.38, Ht: 1.3, glAng: 29, loAng: 78, glacis: L('rha', 45), lower: L('rha', 45), side: L('rha', 45), rear: L('rha', 40), roof: L('rha', 20), floor: L('mild', 20), ts: 'round', tr: 0.9, th: 0.65, tz: -0.2, turWall: 0.09, mantlet: L('cast', 90), s: 0.98, paint: 0x4e5d38, wh: [5, 0.4, 'overlap'], ret: 0, fender: true, drums: true, brake: 'none', antenna: true }),
    T('churchill', 'Churchill VII', 'Reino Unido', 40, 20, 75, 0.9, 6, { Lh: 3.3, Wh: 1.4, Ht: 1.8, glAng: 75, loAng: 75, glacis: L('rha', 152), lower: L('rha', 152), side: L('rha', 95), rear: L('rha', 50), roof: L('rha', 32), floor: L('rha', 20), ts: 'round', tr: 0.9, th: 0.7, tz: -0.2, turWall: 0.152, mantlet: L('cast', 152), s: 1.08, paint: 0x5b5a40, wh: [11, 0.2, 'std'], ret: 0, fender: true, bins: true, brake: 'none' }),
    T('jagdpanther', 'Jagdpanther', 'Alemanha', 46, 46, 88, 1.28, 6.5, { Lh: 3.4, Wh: 1.5, Ht: 1.35, glAng: 35, loAng: 65, glacis: L('rha', 80), lower: L('rha', 60), side: L('rha', 50), rear: L('rha', 40), roof: L('rha', 25), floor: L('rha', 20), ts: 'casemate', turAng: 62, tf: L('rha', 80), turWall: 0.05, mantlet: L('cast', 100), s: 1.03, paint: 0x867c54, wh: [8, 0.42, 'overlap'], ret: 0, schurzen: true, brake: 'brake2', antenna: true }),
    T('hellcat', 'M18 Hellcat', 'EUA', 18, 80, 76, 1.1, 5, { Lh: 2.7, Wh: 1.2, Ht: 1.15, glAng: 55, loAng: 55, glacis: L('rha', 13), lower: L('rha', 13), side: L('rha', 13), rear: L('rha', 13), roof: L('rha', 6), floor: L('mild', 6), ts: 'low', tr: 0.95, th: 0.6, tz: 0.2, turWall: 0.019, turMat: 'rha', mantlet: L('cast', 19), s: 0.88, paint: 0x65703f, wh: [5, 0.34, 'std'], ret: 2, brake: 'brake2', fender: true, stats: { turn: 45, trav: 30 } }),
    T('su100', 'SU-100', 'URSS', 31, 50, 100, 1.0, 8, { Lh: 3.0, Wh: 1.45, Ht: 1.25, glAng: 50, loAng: 55, glacis: L('rha', 75), lower: L('rha', 75), side: L('rha', 45), rear: L('rha', 45), roof: L('rha', 20), floor: L('mild', 20), ts: 'casemate', turAng: 50, tf: L('rha', 75), turWall: 0.045, mantlet: L('cast', 110), s: 1.0, paint: 0x4b5a36, wh: [5, 0.4, 'overlap'], ret: 0, fender: true, drums: true, brake: 'none' }),
    T('centurion', 'Centurion Mk.3', 'Reino Unido', 51, 35, 84, 1.25, 5, { Lh: 3.3, Wh: 1.5, Ht: 1.45, glAng: 60, loAng: 65, glacis: L('rha', 76), lower: L('rha', 51), side: L('rha', 51), rear: L('rha', 38), roof: L('rha', 14), floor: L('rha', 14), ts: 'angular', tr: 0.95, th: 0.68, tz: -0.1, turAng: 68, tf: L('cast', 152), turWall: 0.1, mantlet: L('cast', 152), s: 1.08, paint: 0x626a45, wh: [6, 0.3, 'std'], ret: 3, fender: true, bins: true, brake: 'none', evac: true, bustle: true }),
    T('t54', 'T-54', 'URSS', 36, 50, 100, 1.1, 7, { Lh: 3.0, Wh: 1.45, Ht: 1.2, glAng: 30, loAng: 60, glacis: L('rha', 100), lower: L('rha', 80), side: L('rha', 80), rear: L('rha', 45), roof: L('rha', 30), floor: L('rha', 20), ts: 'egg', tr: 0.95, th: 0.62, tz: -0.1, turWall: 0.15, mantlet: L('cast', 170), s: 0.95, paint: 0x4a5a38, wh: [5, 0.38, 'std'], ret: 0, fender: true, drums: true, brake: 'none', evac: true }),
    T('m48', 'M48 Patton', 'EUA', 45, 48, 90, 1.1, 6.5, { Lh: 3.2, Wh: 1.45, Ht: 1.5, glAng: 35, loAng: 50, glacis: L('rha', 110), lower: L('rha', 76), side: L('rha', 76), rear: L('rha', 51), roof: L('rha', 25), floor: L('rha', 25), ts: 'egg', tr: 1.0, th: 0.7, tz: -0.1, turWall: 0.11, mantlet: L('cast', 110), s: 1.1, paint: 0x5d6a3d, wh: [6, 0.34, 'std'], ret: 5, fender: true, brake: 'brake1', evac: true, bustle: true }),
    T('t55am', 'T-55AM', 'URSS', 36, 50, 100, 1.12, 6.5, { Lh: 3.0, Wh: 1.45, Ht: 1.2, glAng: 30, loAng: 60, glacis: L('rha', 100), lower: L('rha', 80), side: L('rha', 80), rear: L('rha', 45), roof: L('rha', 30), floor: L('rha', 20), ts: 'egg', tr: 0.95, th: 0.62, tz: -0.1, turWall: 0.15, mantlet: L('cast', 170), s: 0.95, paint: 0x505c3d, wh: [5, 0.38, 'std'], ret: 0, fender: true, drums: true, brake: 'none', evac: true, smoke: true, extras: 'era' }),
    T('m60', 'M60A1', 'EUA', 50, 48, 105, 1.13, 6, { Lh: 3.4, Wh: 1.5, Ht: 1.55, glAng: 35, loAng: 50, glacis: L('rha', 110), lower: L('rha', 76), side: L('rha', 76), rear: L('rha', 51), roof: L('rha', 25), floor: L('rha', 25), ts: 'egg', tr: 1.05, th: 0.72, tz: -0.1, turWall: 0.13, mantlet: L('cast', 150), s: 1.1, paint: 0x626b44, wh: [6, 0.34, 'std'], ret: 5, fender: true, brake: 'none', evac: true, bustle: true, smoke: true }),
    T('leo1', 'Leopard 1', 'Alemanha', 40, 65, 105, 1.13, 5.5, { Lh: 3.3, Wh: 1.5, Ht: 1.4, glAng: 60, loAng: 60, glacis: L('rha', 70), lower: L('rha', 70), side: L('rha', 25), rear: L('rha', 25), roof: L('rha', 20), floor: L('rha', 15), ts: 'angular', tr: 0.95, th: 0.6, tz: -0.1, turAng: 64, tf: L('cast', 60), turWall: 0.052, mantlet: L('cast', 60), s: 0.98, paint: 0x4d5a40, wh: [7, 0.3, 'std'], ret: 4, fender: true, brake: 'none', evac: true, smoke: true, stats: { turn: 45 } }),
    T('t72a', 'T-72A', 'URSS', 41, 60, 125, 1.2, 7, { Lh: 3.3, Wh: 1.6, Ht: 1.2, glAng: 68, loAng: 70, glacis: [['rha', 80], ['nera', 105], ['rha', 20]], lower: L('rha', 80), side: L('rha', 70), rear: L('rha', 40), roof: L('rha', 40), floor: L('rha', 20), ts: 'egg', tr: 0.92, th: 0.6, tz: -0.05, turWall: 0.06, mantlet: [['cast', 200], ['sand', 100], ['cast', 100]], s: 0.94, paint: 0x5a6240, wh: [6, 0.34, 'std'], ret: 3, fender: false, drums: true, auto: true, ammo: 'carousel', brake: 'none', evac: true, smoke: true, stats: { rack: 40 } }),
    T('abrams', 'M1 Abrams', 'EUA', 55, 67, 105, 1.14, 5, { Lh: 3.85, Wh: 1.75, Ht: 1.4, glAng: 30, loAng: 65, glacis: [['rha', 40], ['cer', 250], ['rha', 50]], lower: L('rha', 60), side: L('rha', 60), rear: L('rha', 25), roof: L('rha', 30), floor: L('rha', 25), ts: 'angular', tr: 1.15, th: 0.75, tz: -0.2, turAng: 68, tf: [['cast', 80], ['cer', 300], ['rha', 50]], turWall: 0.08, mantlet: [['cast', 80], ['cer', 300], ['rha', 50]], skirt: [['rub', 15], ['rha', 12]], s: 1.08, paint: 0x9a8e68, wh: [7, 0.32, 'std'], ret: 4, fender: true, brake: 'none', evac: true, bustle: true, ammo: 'bustle', smoke: true, antenna: true, stats: { turn: 36 } }),
    T('leo2a5', 'Leopard 2A5', 'Alemanha', 60, 68, 120, 1.3, 5, { Lh: 3.8, Wh: 1.7, Ht: 1.4, glAng: 68, loAng: 70, glacis: [['rha', 40], ['nera', 300], ['rha', 60]], lower: L('rha', 60), side: L('rha', 60), rear: L('rha', 30), roof: L('rha', 30), floor: L('rha', 25), ts: 'angular', tr: 1.1, th: 0.78, tz: -0.2, turAng: 60, tf: [['cast', 100], ['nera', 350], ['rha', 50]], turWall: 0.07, mantlet: [['cast', 100], ['nera', 350], ['rha', 50]], skirt: [['rub', 15], ['rha', 12]], s: 1.08, paint: 0x3f4c34, wh: [7, 0.34, 'std'], ret: 4, fender: true, brake: 'none', evac: true, bustle: true, ammo: 'bustle', smoke: true, stats: { turn: 36 } }),
    T('t90a', 'T-90A', 'Rússia', 46, 60, 125, 1.25, 6.5, { Lh: 3.3, Wh: 1.6, Ht: 1.22, glAng: 68, loAng: 70, glacis: [['rha', 60], ['nera', 105], ['rha', 20]], lower: L('rha', 80), side: L('rha', 70), rear: L('rha', 40), roof: L('rha', 40), floor: L('rha', 20), ts: 'angular', tr: 0.95, th: 0.58, tz: -0.05, turAng: 55, tf: [['cast', 150], ['cer', 250], ['cast', 100]], turWall: 0.07, mantlet: [['cast', 150], ['cer', 250], ['cast', 100]], s: 0.98, paint: 0x424f36, wh: [6, 0.34, 'std'], ret: 3, fender: false, drums: true, auto: true, ammo: 'carousel', brake: 'none', evac: true, smoke: true, antenna: true, extras: 'era', stats: { rack: 40 } }),
    T('challenger2', 'Challenger 2', 'Reino Unido', 62, 56, 120, 1.2, 6, { Lh: 3.7, Wh: 1.75, Ht: 1.45, glAng: 60, loAng: 65, glacis: [['rha', 40], ['cer', 350], ['rha', 70]], lower: L('rha', 70), side: L('rha', 70), rear: L('rha', 30), roof: L('rha', 30), floor: L('rha', 25), ts: 'angular', tr: 1.15, th: 0.78, tz: -0.2, turAng: 66, tf: [['cast', 100], ['cer', 380], ['rha', 60]], turWall: 0.08, mantlet: [['cast', 100], ['cer', 380], ['rha', 60]], skirt: [['rub', 15], ['rha', 12]], s: 1.12, paint: 0x9d9163, wh: [7, 0.34, 'std'], ret: 4, fender: true, brake: 'none', evac: true, sleeve: true, bustle: true, smoke: true, stats: { turn: 30 } }),
  ];
  /* ---- 25 modelos modernos (derivados dos moldes acima, com ajustes reais) ---- */
  const base = id => ROSTER.find(r => r[0] === id)[8];
  const V = (id, o) => Object.assign({}, base(id), o);
  const CMP = (a, b, c) => [['rha', a], ['cer', b], ['rha', c]];
  const NRA = (a, b, c) => [['rha', a], ['nera', b], ['rha', c]];
  const ER = (Lh, Wh, Ht) => ERA(Lh, Wh, Ht);
  const cm = (a, b, c) => [['cast', a], ['cer', b], ['rha', c]];
  const nm = (a, b, c) => [['cast', a], ['nera', b], ['rha', c]];
  ROSTER.push(
    T('m1a1', 'M1A1 Abrams', 'EUA', 57, 67, 120, 1.3, 5, V('abrams', { glacis: CMP(40, 280, 60), mantlet: cm(80, 320, 50), tf: cm(80, 320, 50), paint: 0x9b8f69 })),
    T('m1a2sep', 'M1A2 SEPv2', 'EUA', 63, 67, 120, 1.34, 5, V('abrams', { Lh: 3.9, glacis: CMP(40, 350, 70), mantlet: cm(80, 380, 60), tf: cm(80, 380, 60), side: L('rha', 70), extras: ER(3.9, 1.75, 1.4), paint: 0x8f8460, stats: { turn: 34 } })),
    T('leo2a6', 'Leopard 2A6', 'Alemanha', 62, 68, 120, 1.38, 5, V('leo2a5', { glacis: NRA(40, 330, 60), tf: nm(100, 380, 50), mantlet: nm(100, 380, 50), paint: 0x3b4833 })),
    T('leo2a7', 'Leopard 2A7', 'Alemanha', 67, 68, 120, 1.4, 5, V('leo2a5', { Lh: 3.85, glacis: NRA(40, 380, 60), tf: nm(100, 420, 60), mantlet: nm(100, 420, 60), extras: ER(3.85, 1.7, 1.4), paint: 0x4a5a40, s: 1.1 })),
    T('leclerc', 'Leclerc', 'França', 56, 71, 120, 1.34, 4.5, V('leo2a5', { Lh: 3.45, Wh: 1.7, Ht: 1.3, auto: true, ammo: 'bustle', tr: 1.0, th: 0.7, tf: nm(100, 330, 50), mantlet: nm(100, 330, 50), glacis: NRA(40, 300, 60), wh: [6, 0.38, 'std'], ret: 3, paint: 0xa7966a, s: 1.06, stats: { rack: 40, turn: 38 } })),
    T('ariete', 'C1 Ariete', 'Itália', 54, 65, 120, 1.3, 5, V('leo2a5', { Lh: 3.5, glacis: NRA(40, 280, 60), tf: nm(100, 300, 50), mantlet: nm(100, 300, 50), paint: 0x6f6a48, s: 1.05 })),
    T('type90', 'Type 90 Kyū-maru', 'Japão', 50, 70, 120, 1.3, 4.5, V('leo2a5', { Lh: 3.4, Wh: 1.6, Ht: 1.3, auto: true, tr: 0.98, th: 0.66, wh: [6, 0.34, 'std'], tf: nm(90, 300, 50), mantlet: nm(90, 300, 50), paint: 0x58603f, s: 1.03, stats: { rack: 40, turn: 36 } })),
    T('type10', 'Type 10', 'Japão', 44, 70, 120, 1.3, 4.5, V('leo2a5', { Lh: 3.2, Wh: 1.6, Ht: 1.28, auto: true, tr: 0.98, th: 0.64, wh: [6, 0.34, 'std'], tf: nm(80, 300, 50), mantlet: nm(80, 300, 50), paint: 0x5d6642, s: 1.0, stats: { rack: 40, turn: 38 } })),
    T('k1a1', 'K1A1', 'Coreia do Sul', 53, 65, 120, 1.28, 5, V('leo2a5', { Lh: 3.45, Wh: 1.65, glacis: NRA(40, 250, 60), tf: nm(100, 300, 40), mantlet: nm(100, 300, 40), paint: 0x56603e, s: 1.04 })),
    T('k2', 'K2 Black Panther', 'Coreia do Sul', 55, 70, 120, 1.42, 4.5, V('leo2a5', { Lh: 3.5, Wh: 1.7, Ht: 1.35, auto: true, glacis: NRA(40, 350, 60), tf: nm(100, 400, 50), mantlet: nm(100, 400, 50), extras: ER(3.5, 1.7, 1.35), paint: 0x4f5a3a, s: 1.06, stats: { rack: 40, turn: 38 } })),
    T('merkava4', 'Merkava Mk.4M', 'Israel', 65, 64, 120, 1.32, 5, V('abrams', { Lh: 3.6, Wh: 1.8, Ht: 1.5, engF: true, tz: 0.85, tr: 1.05, th: 0.75, glacis: CMP(50, 320, 70), side: L('rha', 90), tf: cm(80, 350, 60), mantlet: cm(80, 350, 60), skirt: [['rub', 20], ['rha', 20]], paint: 0x9b946e, s: 1.1, stats: { turn: 32 } })),
    T('t80u', 'T-80U', 'URSS', 46, 70, 125, 1.25, 6.5, V('t72a', { Lh: 3.35, Ht: 1.2, glacis: NRA(50, 140, 30), mantlet: [['cast', 220], ['sand', 100], ['cast', 120]], extras: ER(3.35, 1.6, 1.2), paint: 0x52603e, wh: [6, 0.38, 'std'], ret: 0 })),
    T('t80bvm', 'T-80BVM', 'Rússia', 46, 70, 125, 1.28, 6.5, V('t72a', { Lh: 3.35, glacis: NRA(50, 140, 30), tf: cm(240, 160, 100), mantlet: cm(240, 160, 100), ts: 'angular', turAng: 55, extras: ER(3.35, 1.6, 1.2), paint: 0x46563a, wh: [6, 0.38, 'std'], ret: 0 })),
    T('t72b3', 'T-72B3', 'Rússia', 46, 60, 125, 1.26, 6.5, V('t72a', { glacis: NRA(60, 130, 30), mantlet: [['cast', 220], ['sand', 100], ['cast', 120]], extras: ER(3.3, 1.6, 1.2), smoke: true, paint: 0x5a6340 })),
    T('t90m', 'T-90M Proryv-3', 'Rússia', 48, 60, 125, 1.3, 6.5, V('t90a', { glacis: [['rha', 80], ['nera', 120], ['rha', 40]], tf: cm(160, 280, 100), mantlet: cm(160, 280, 100), extras: ER(3.3, 1.6, 1.22), s: 0.99, paint: 0x3c4a33 })),
    T('t14', 'T-14 Armata', 'Rússia', 55, 70, 125, 1.42, 4.5, V('t90a', { Lh: 3.5, Wh: 1.7, Ht: 1.3, crewHull: true, ts: 'angular', th: 0.42, tr: 1.0, turAng: 50, tz: 0.1, glacis: CMP(80, 300, 60), tf: cm(120, 300, 60), mantlet: cm(120, 300, 60), extras: ER(3.5, 1.7, 1.3), wh: [7, 0.36, 'std'], ret: 3, antenna: false, smoke: true, paint: 0x4a5640, s: 1.04, stats: { turn: 36, rack: 45 } })),
    T('ztz99a', 'ZTZ-99A', 'China', 58, 80, 125, 1.3, 5, V('t90a', { Lh: 3.5, Wh: 1.7, Ht: 1.25, ts: 'angular', tr: 1.0, th: 0.62, turAng: 58, glacis: CMP(70, 250, 40), tf: cm(160, 300, 60), mantlet: cm(160, 300, 60), extras: ER(3.5, 1.7, 1.25), wh: [6, 0.36, 'std'], ret: 3, paint: 0x6a6f4c, s: 1.03 })),
    T('type96', 'ZTZ-96A', 'China', 42, 65, 125, 1.22, 6.5, V('t72a', { glacis: NRA(60, 130, 30), extras: ER(3.3, 1.6, 1.2), paint: 0x5e6a47, ret: 3 })),
    T('altay', 'Altay', 'Turquia', 65, 65, 120, 1.38, 5, V('leo2a5', { Lh: 3.9, glacis: CMP(50, 340, 70), tf: cm(100, 380, 60), mantlet: cm(100, 380, 60), extras: ER(3.9, 1.7, 1.4), paint: 0x7e7752, s: 1.1 })),
    T('strv122', 'Strv 122', 'Suécia', 62, 68, 120, 1.38, 5, V('leo2a5', { Lh: 3.8, glacis: NRA(40, 330, 60), skirt: [['rub', 20], ['rha', 20]], paint: 0x3f4d38, s: 1.08 })),
    T('pt91', 'PT-91 Twardy', 'Polônia', 45, 60, 125, 1.2, 7, V('t72a', { glacis: NRA(60, 105, 20), extras: ER(3.3, 1.6, 1.2), paint: 0x586340 })),
    T('arjun', 'Arjun Mk.1A', 'Índia', 58, 67, 120, 1.22, 5.5, V('leo2a5', { Lh: 3.7, glacis: CMP(50, 280, 60), tf: cm(100, 300, 50), mantlet: cm(100, 300, 50), paint: 0x70724d, s: 1.08 })),
    T('amx30', 'AMX-30B2', 'França', 37, 65, 105, 1.1, 5.5, V('m48', { Lh: 3.1, Ht: 1.3, glAng: 45, glacis: L('rha', 80), lower: L('rha', 60), side: L('rha', 40), turWall: 0.05, mantlet: L('cast', 80), roof: L('rha', 20), floor: L('rha', 15), ts: 'egg', tr: 0.95, th: 0.55, paint: 0x6f7048, s: 0.97, wh: [5, 0.34, 'std'], ret: 5, bustle: false, smoke: true })),
    T('ch3', 'Challenger 3', 'Reino Unido', 66, 59, 120, 1.46, 5, V('challenger2', { glacis: [['rha', 50], ['cer', 380], ['rha', 80]], tf: cm(100, 420, 70), mantlet: cm(100, 420, 70), extras: ER(3.7, 1.75, 1.45), sleeve: true, paint: 0x6c6a48, s: 1.13, stats: { turn: 32 } })),
    T('m60a3', 'M60A3 TTS', 'EUA', 52, 48, 105, 1.14, 6, V('m60', { smoke: true, paint: 0x6c7448 }))
  );
  SB.ROSTER = ROSTER.map(r => ({ id: r[0], name: r[1], nation: r[2], mass: r[3], vmax: r[4], cal: r[5], vk: r[6], reload: r[7], cfg: r[8] }));
  SB.buildTank = function (id) {
    const r = SB.ROSTER.find(x => x.id === id); if (!r) return null;
    const c = Object.assign({ name: r.name, nation: r.nation, mass: r.mass, vmax: r.vmax, cal: r.cal, vk: r.vk, reload: r.reload }, r.cfg);
    if (c.extras === 'era') c.extras = ERA(c.Lh || 3, c.Wh || 1.3, c.Ht || 1.4);
    if (c.sleeve) c.brake = 'sleeve';
    return build(c);
  };
  SB.TANK_PRESETS = { vazio: () => ({ name: 'Novo tanque', parts: [], deco: [], stats: SB.defaultStats() }) };
  SB.TANK_NAMES = { vazio: 'Em branco' };
  SB.ROSTER.forEach(r => { SB.TANK_PRESETS[r.id] = () => SB.buildTank(r.id); SB.TANK_NAMES[r.id] = r.name + ' (' + r.nation + ')'; });
  SB._tk = { ERA, L, V };
  SB.registerTanks = function (list) {
    list.forEach(r => {
      const o = { id: r[0], name: r[1], nation: r[2], mass: r[3], vmax: r[4], cal: r[5], vk: r[6], reload: r[7], cfg: r[8] };
      SB.ROSTER.push(o); SB.TANK_PRESETS[o.id] = () => SB.buildTank(o.id); SB.TANK_NAMES[o.id] = o.name + ' (' + o.nation + ')';
    });
  };
  SB.defaultStats = () => ({ cal: 90, vk: 1.1, vmax: 50, rev: 15, turn: 30, trav: 22, elev: [-8, 18], reload: 6, rack: 50, mass: 40, fixedGun: false, turPivot: [0, 1.75, -0.2], gunPivot: [0, 1.8, -0.9], muzzle: [0, 1.8, -3.4], bodyLen: 6.2, bodyWid: 3.3 });
  SB.fillStats = function (t) { t.stats = Object.assign(SB.defaultStats(), t.stats || {}); t.parts.forEach(p => { if (!p.grp) p.grp = 'hull'; }); if (!t.deco) t.deco = []; return t; };

  /* ---- garagem (tanques do usuário) ---- */
  SB.garage = [];
  try { SB.garage = JSON.parse(localStorage.getItem('sb.garage') || '[]'); } catch (e) {}
  SB.saveGarage = () => { try { localStorage.setItem('sb.garage', JSON.stringify(SB.garage)); } catch (e) {} };
  SB.allTanks = () => SB.ROSTER.map(r => ({ id: r.id, name: r.name, nation: r.nation, custom: false, kind: 'tank', cat: (r.cfg && r.cfg.cat) || 'tank', mass: r.mass, cal: r.cal, vmax: r.vmax, get: () => SB.buildTank(r.id) }))
    .concat((SB.HELIS || []).map(h => ({ id: h.id, name: h.name, nation: h.nation, custom: false, kind: 'heli', cat: 'heli', mass: h.cfg.mass, cal: h.cfg.cal, vmax: h.cfg.vmax, get: () => SB.buildHeli(h.id) })))
    .concat(SB.garage.map(g => ({ id: g.id, name: g.name, nation: 'Customizado', custom: true, kind: g.stats && g.stats.kind === 'heli' ? 'heli' : 'tank', mass: g.stats ? g.stats.mass : 40, cal: g.stats ? g.stats.cal : 90, vmax: g.stats ? g.stats.vmax : 50, get: () => SB.fillStats(JSON.parse(JSON.stringify(g))) })));
  SB.getTankById = id => { const t = SB.allTanks().find(x => x.id === id); return t ? t.get() : SB.buildTank('t3485'); };

  SB.ammoForGun = function (a, stats) {
    if (a.fixedCal) { const F = SB.deriveAmmo(a); F.name = a.name; F.id = a.id; F.shortName = a.name.replace(/^[A-Z0-9-]+ · /, '').replace(/^\d+ mm /, ''); return F; }
    const cal = Math.max(...a.layers.flatMap(l => l.pts.map(p => p[1]))) * 2;
    const k = stats.cal / Math.max(cal, 1);
    const a2 = SB.ammoClone(a); a2.layers.forEach(l => { l.pts = l.pts.map(p => [p[0] * k, p[1] * k]); });
    a2.v0 = a.v0 * stats.vk / 1.1; if (a.tntKg != null) a2.tntKg = a.tntKg * Math.pow(k, 3);
    const D = SB.deriveAmmo(a2); D.name = a.name; D.id = a.id; D.shortName = a.name.replace(/^[A-Z0-9-]+ · /, '').replace(/^\d+ mm /, '');
    return D;
  };
})(window.SB);
