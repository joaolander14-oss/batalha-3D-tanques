/* Helicópteros: construtor paramétrico (casco fino de alumínio, blindagem da cabine, rotor, motores, tripulação) + 10 modelos.
   Frente = -Z, topo = +Y. O rotor e o rotor de cauda giram (grupos 'rotor', 'rotor2', 'tail'); o canhão de queixo gira (grupo 'turret') e eleva ('gun'). */
(function (SB) {
  'use strict';
  const D2R = SB.D2R, V3 = THREE.Vector3, rd = SB.round;
  /* subtipos novos */
  Object.assign(SB.SUBS, {
    rotor: { kind: 'module', n: 'Rotor principal', c: '#b0b8c8', hp: 60, t: 200, size: [0.4, 0.1, 6], mat: 'al', shape: 'box' },
    tailrot: { kind: 'module', n: 'Rotor de cauda', c: '#b0b8c8', hp: 40, t: 150, size: [0.1, 0.05, 1.2], mat: 'al', shape: 'box' },
    pilot: { kind: 'crew', n: 'Piloto', c: '#f0b890', hp: 100, t: 45, size: [0.42, 0.9, 0.42], mat: 'tissue', shape: 'capsule' },
    cpg: { kind: 'crew', n: 'Artilheiro (CPG)', c: '#f0b890', hp: 100, t: 45, size: [0.42, 0.9, 0.42], mat: 'tissue', shape: 'capsule' },
  });
  const mk = (name, shape, pos, size, rot, mat, extra) => Object.assign({ id: SB.uid(), name, kind: 'armor', sub: '', shape, pos, size, rot, mat, hp: 0, wall: 0.05, grp: 'hull' }, extra || {});
  const mod = (name, sub, pos, size, rot, mat, grp) => {
    const s = SB.SUBS[sub];
    return { id: SB.uid(), name, kind: s.kind, sub, shape: s.shape, pos, size: size || s.size.slice(), rot: rot || [0, 0, 0], mat: mat || s.mat, hp: s.hp, wall: 0.05, grp: grp || 'hull' };
  };
  function stack(name, center, rot, w, l, layers, grp) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] * D2R, rot[1] * D2R, rot[2] * D2R, 'YXZ')), n = new V3(0, 1, 0).applyQuaternion(q);
    let cum = 0;
    return layers.map(([m, mm]) => { const t = mm / 1000, off = -(cum + t / 2); cum += t; return mk(name, 'box', [rd(center[0] + n.x * off, 4), rd(center[1] + n.y * off, 4), rd(center[2] + n.z * off, 4)], [rd(w, 4), t, rd(l, 4)], rot.slice(), m, { grp: grp || 'hull' }); });
  }
  const L = (m, mm) => [[m, mm]];

  function buildHeli(c) {
    const P = [], D = [];
    const add = a => (Array.isArray(a) ? a : [a]).forEach(x => P.push(x));
    const Lf = c.Lf, Wf = c.Wf || 1.1, Hf = c.Hf || 1.3, R = c.R, F = 0.6;                // F = altura do piso
    const zn = -0.42 * Lf, zf = zn + Math.min(1.1, Lf * 0.07), zr = 0.1 * Lf, zm = -0.04 * Lf;
    const Lc = zr - zf, zc = (zf + zr) / 2, top = F + Hf, mastTop = top + 0.55;
    const skin = c.skin || L('al', 4), arm = c.armor || L('hha', 12);
    /* fuselagem (cabine) */
    add(stack('Teto da cabine', [0, top, zc], [0, 0, 0], Wf, Lc, skin));
    add(stack('Piso da cabine', [0, F, zc], [180, 0, 0], Wf, Lc, L('al', 5)));
    add(stack('Lateral E da cabine', [-Wf / 2, F + Hf / 2, zc], [0, 0, 90], Hf, Lc, skin));
    add(stack('Lateral D da cabine', [Wf / 2, F + Hf / 2, zc], [0, 0, -90], Hf, Lc, skin));
    add(stack('Antepara traseira', [0, F + Hf / 2, zr], [90, 0, 0], Wf, Hf, L('al', 5)));
    add(stack('Para-brisa / nariz', [0, F + Hf * 0.55, zf], [-62, 0, 0], Wf * 0.95, Hf * 1.05, L('nylon', 18)));
    /* blindagem da cabine da tripulação */
    const cz = zf + 0.2, cl = c.side ? 1.3 : 2.3;
    add(stack('Blindagem lateral E', [-(Wf / 2 - 0.1), F + Hf * 0.5, cz + cl / 2], [0, 0, 90], 0.8, cl, arm));
    add(stack('Blindagem lateral D', [Wf / 2 - 0.1, F + Hf * 0.5, cz + cl / 2], [0, 0, -90], 0.8, cl, arm));
    add(stack('Blindagem do piso', [0, F + 0.06, cz + cl / 2], [180, 0, 0], Wf - 0.3, cl, arm));
    /* cauda */
    const Lt = 0.48 * Lf, Dt = Math.max(0.35, Lf * 0.032), ty = top - 0.25;
    P.push(mk('Viga de cauda', 'tube', [0, ty, zr + Lt / 2], [Dt, Lt, Dt], [90, 0, 0], 'al', { wall: 0.004 }));
    add(stack('Deriva vertical', [0, ty + 0.55, zr + Lt - 0.4], [0, 0, -90], 1.2, 0.9, L('al', 3)));
    add(stack('Estabilizador', [0, ty + 0.1, zr + Lt - 0.6], [0, 0, 0], Math.min(2.6, Lf * 0.17), 0.5, L('al', 3)));
    /* asas curtas + pilones */
    const ws = c.wing != null ? c.wing : 0.95;
    if (ws > 0) { add(stack('Asa curta E', [-(Wf / 2 + ws / 2), F + Hf * 0.5, zc + 0.3], [0, 0, 0], ws, 1.0, L('al', 4))); add(stack('Asa curta D', [Wf / 2 + ws / 2, F + Hf * 0.5, zc + 0.3], [0, 0, 0], ws, 1.0, L('al', 4))); }
    /* motores, caixa de engrenagens, rotor */
    const ex = c.engX != null ? c.engX : 0.5, ez = zm + 0.9;
    P.push(mk('Carenagem do motor E', 'tube', [-ex, top + 0.28, ez], [0.62, Math.min(2.2, Lc * 0.45), 0.62], [90, 0, 0], 'al', { wall: 0.003 }));
    P.push(mk('Carenagem do motor D', 'tube', [ex, top + 0.28, ez], [0.62, Math.min(2.2, Lc * 0.45), 0.62], [90, 0, 0], 'al', { wall: 0.003 }));
    P.push(mod('Motor 1 (turboeixo)', 'engine', [-ex, top + 0.28, ez], [0.5, 0.5, 1.1]));
    P.push(mod('Motor 2 (turboeixo)', 'engine', [ex, top + 0.28, ez], [0.5, 0.5, 1.1]));
    P.push(mod('Caixa de engrenagens', 'trans', [0, top + 0.3, zm], [0.7, 0.45, 0.7]));
    P.push(mod('Cubo do rotor', 'rotor', [0, mastTop, zm], [0.45, 0.28, 0.45], null, null, 'rotor'));
    P.push(mod('Pá do rotor A', 'rotor', [0, mastTop + 0.02, zm], [2 * R, 0.035, 0.32], [0, 0, 0], null, 'rotor'));
    P.push(mod('Pá do rotor B', 'rotor', [0, mastTop + 0.02, zm], [2 * R, 0.035, 0.32], [0, 90, 0], null, 'rotor'));
    if (c.coax) {
      P.push(mod('Cubo do rotor inferior', 'rotor', [0, mastTop - 0.55, zm], [0.45, 0.28, 0.45], null, null, 'rotor2'));
      P.push(mod('Pá inferior A', 'rotor', [0, mastTop - 0.53, zm], [2 * R, 0.035, 0.32], [0, 45, 0], null, 'rotor2'));
      P.push(mod('Pá inferior B', 'rotor', [0, mastTop - 0.53, zm], [2 * R, 0.035, 0.32], [0, 135, 0], null, 'rotor2'));
    } else {
      const tr = Math.min(1.4, Lf * 0.09), tz = zr + Lt, tyy = ty + 0.45;
      P.push(mod('Rotor de cauda A', 'tailrot', [0.18, tyy, tz], [0.05, tr * 2, 0.12], [0, 0, 0], null, 'tail'));
      P.push(mod('Rotor de cauda B', 'tailrot', [0.18, tyy, tz], [0.05, tr * 2, 0.12], [90, 0, 0], null, 'tail'));
    }
    /* sistemas internos */
    P.push(mod('Tanque de combustível', 'fuel', [0, F + 0.3, zc + Lc * 0.25], [Wf * 0.7, 0.3, 1.2]));
    P.push(mod('Paiol de munição do canhão', 'ammo', [0, F + 0.35, zf + 1.5 + (c.side ? 0 : 1.0)], [0.45, 0.35, 0.5]));
    P.push(mod('Sensores do nariz (FLIR/laser)', 'optics', [0, F + 0.1, zn + 0.25], [0.35, 0.3, 0.35]));
    P.push(mod('Aviônica', 'radio', [0, F + 0.35, zr - 0.5], [0.5, 0.3, 0.4]));
    /* tripulação */
    if (c.side) { P.push(mod('Piloto', 'pilot', [-0.32, F + 0.6, zf + 0.9])); P.push(mod('Artilheiro (CPG)', 'cpg', [0.32, F + 0.6, zf + 0.9])); }
    else { P.push(mod('Artilheiro (CPG)', 'cpg', [0, F + 0.52, zf + 0.45])); P.push(mod('Piloto', 'pilot', [0, F + 0.8, zf + 1.65])); }
    /* canhão de queixo (ou fixo ao lado) */
    const gx = c.gunSide ? 0.62 : 0, gy = F - 0.05, gz = zf + 0.1, bl = Math.max(1.2, c.cal * 0.04 + 0.6), gd = 0.04 + c.cal / 1000 * 0.9;
    P.push(mk('Cano do canhão', 'tube', [gx, gy, gz - bl / 2 - 0.2], [gd, bl, gd], [90, 0, 0], 'rha', { wall: gd * 0.3, grp: 'gun' }));
    P.push(mod('Culatra do canhão', 'breech', [gx, gy, gz + 0.1], [0.25, 0.25, 0.5], null, null, 'gun'));
    P.push(mk('Carenagem do canhão', 'box', [gx, gy + 0.05, gz - 0.05], [0.4, 0.3, 0.7], [0, 0, 0], 'al', { grp: 'turret' }));

    /* ---- decoração ---- */
    const d = (shape, pos, size, rot, color, grp) => D.push({ shape, pos: pos.map(x => rd(x, 3)), size, rot: rot || [0, 0, 0], color, grp: grp || 'hull', wall: 0.03 });
    d('sphere', [0, F + Hf * 0.5, zc - 0.1], [Wf * 1.08, Hf * 1.0, Lc + 2.0], null, 'body');                      // fuselagem (elipsoide)
    d('sphere', [0, F + Hf * 0.82, zf + (c.side ? 0.7 : 1.0)], [Wf * 0.8, Hf * 0.75, c.side ? 1.6 : 2.4], null, 'glass'); // canopy
    d('sphere', [0, F + Hf * 0.3, zn + 0.7], [Wf * 0.55, Hf * 0.55, 1.5], null, 'body');                           // nariz
    d('box', [0, ty + 0.55, zr + Lt - 0.4], [0.06, 1.25, 0.95], null, 'body');                                      // deriva
    d('box', [0, ty + 0.1, zr + Lt - 0.6], [Math.min(2.6, Lf * 0.17), 0.05, 0.5], null, 'body');                    // estabilizador
    [-1, 1].forEach(sg => ws > 0 && d('box', [sg * (Wf / 2 + ws / 2), F + Hf * 0.45, zc + 0.3], [ws, 0.08, 1.0], null, 'body')); // asas
    d('cyl', [0, mastTop + 0.02, zm], [2 * R, 0.012, 2 * R], null, 'disc', 'rotor');                                // disco do rotor
    if (c.coax) d('cyl', [0, mastTop - 0.53, zm], [2 * R, 0.012, 2 * R], null, 'disc', 'rotor2');
    else d('cyl', [0.2, ty + 0.45, zr + Lt], [Math.min(1.4, Lf * 0.09) * 2, 0.02, Math.min(1.4, Lf * 0.09) * 2], [0, 0, 90], 'disc', 'tail');
    d('cyl', [0, F + 0.15, zn + 0.2], [0.34, 0.32, 0.34], [0, 0, 0], 'dark');                                      // torreta de sensores
    d('cyl', [0, top + 0.28, zm], [0.28, 0.6, 0.28], null, 'metal');                                                 // mastro
    [-1, 1].forEach(sg => {
      d('capsule', [sg * ex, top + 0.28, ez], [0.66, Math.min(2.4, Lc * 0.5), 0.66], [90, 0, 0], 'body');           // nacele
      d('cyl', [sg * ex, top + 0.28, ez + Math.min(1.2, Lc * 0.27)], [0.4, 0.3, 0.4], [90, 0, 0], 'dark');          // escapamento
      if (ws > 0) { d('cyl', [sg * (Wf / 2 + ws - 0.15), F + Hf * 0.5 - 0.22, zc + 0.3], [0.4, 1.9, 0.4], [90, 0, 0], 'dark'); d('box', [sg * (Wf / 2 + ws * 0.55), F + Hf * 0.5 - 0.1, zc + 0.3], [0.08, 0.2, 0.8], null, 'metal'); } // casulo de foguetes + pilone
    });
    if (c.skids) [-1, 1].forEach(sg => { d('box', [sg * (Wf / 2 + 0.15), 0.12, zc + 0.2], [0.07, 0.07, Lc + 0.6], null, 'metal'); d('box', [sg * (Wf / 2 + 0.07), 0.35, zc - 0.6], [0.05, 0.5, 0.05], [0, 0, sg * 20], 'metal'); d('box', [sg * (Wf / 2 + 0.07), 0.35, zc + 0.9], [0.05, 0.5, 0.05], [0, 0, sg * 20], 'metal'); });
    else { [-1, 1].forEach(sg => { d('cyl', [sg * (Wf / 2 + 0.05), 0.3, zc + 0.1], [0.5, 0.18, 0.5], [0, 0, 90], 'rubber'); }); d('cyl', [0, 0.25, zr + Lt * 0.9], [0.3, 0.1, 0.3], [0, 0, 90], 'rubber'); }
    d('cyl', [0, ty + 0.1, zr + Lt * 0.5], [Dt * 1.1, Lt, Dt * 1.1], [90, 0, 0], 'body');
    if (c.coax) { d('cyl', [0, mastTop - 0.1, zm], [0.5, 1.0, 0.5], null, 'metal'); d('box', [0, ty + 0.85, zr + Lt - 0.4], [0.05, 1.0, 0.8], null, 'body'); }
    if (c.radome !== false) d('cyl', [0, mastTop + 0.25, zm], [0.5, 0.22, 0.5], null, 'dark', 'rotor');             // radome / cubo
    d('cyl', [gx, gy, gz - bl * 0.5 - 0.2], [gd * 1.5, 0.3, gd * 1.5], [90, 0, 0], 'metal', 'gun');
    /* pontos de lançamento de foguetes e mísseis (pilones) */
    const pylons = [];
    if (ws > 0) [-1, 1].forEach(sg => [0.55, 1.0].forEach(f => pylons.push([rd(sg * (Wf / 2 + ws * f), 4), rd(F + Hf * 0.5 - 0.3, 3), rd(zc - 0.2, 3)])));
    if (!pylons.length) pylons.push([-0.7, F, zf], [0.7, F, zf]);
    const st = Object.assign({ kind: 'heli', cal: c.cal, vk: 1.0, vmax: c.vmax, rev: 40, turn: 55, trav: c.fixed ? 20 : 110, elev: c.fixed ? [-4, 4] : [-60, 14], reload: 0, rack: c.rack || 800, mass: c.mass, fixedGun: !!c.fixed, climb: c.climb || 10, rotR: R,
      rotPivot: [0, mastTop, zm], rot2Pivot: [0, mastTop - 0.55, zm], tailPivot: [0.18, ty + 0.45, zr + Lt], turPivot: [gx, gy, gz], gunPivot: [gx, gy, gz], muzzle: [gx, gy, gz - bl - 0.2], pylons, bodyLen: Lf, bodyWid: Wf + 2 * ws + 1 }, c.stats || {});
    return { name: c.name, nation: c.nation, paint: c.paint, parts: P, deco: D, stats: st };
  }

  /* id, nome, nação, cfg ------------- medidas aproximadas reais */
  const H = (id, nm, na, cfg) => ({ id, name: nm, nation: na, cfg });
  SB.HELIS = [
    H('ah64e', 'AH-64E Apache Guardian', 'EUA', { Lf: 14.9, R: 7.3, Wf: 1.1, Hf: 1.3, cal: 30, vmax: 293, mass: 8, climb: 12, rack: 800, paint: 0x4a4d45, skids: false }),
    H('ah1z', 'AH-1Z Viper', 'EUA', { Lf: 14.9, R: 7.3, Wf: 0.95, Hf: 1.2, cal: 20, vmax: 296, mass: 8.3, climb: 13, rack: 750, paint: 0x5a5f4c, skids: true, wing: 1.0 }),
    H('mi24p', 'Mi-24P Hind', 'URSS', { Lf: 17.5, R: 8.65, Wf: 1.5, Hf: 1.6, cal: 30, vmax: 335, mass: 11.5, climb: 11, rack: 900, fixed: true, gunSide: true, paint: 0x5e6840, wing: 1.6, side: false, stats: { turn: 45 } }),
    H('mi28nm', 'Mi-28NM Havoc', 'Rússia', { Lf: 17, R: 8.6, Wf: 1.15, Hf: 1.4, cal: 30, vmax: 300, mass: 11.5, climb: 13, rack: 900, paint: 0x4e5a3e, wing: 1.3 }),
    H('ka52', 'Ka-52 Alligator', 'Rússia', { Lf: 16, R: 7.2, Wf: 1.7, Hf: 1.4, cal: 30, vmax: 300, mass: 10.4, climb: 14, rack: 850, coax: true, side: true, fixed: true, gunSide: true, paint: 0x6a7050, wing: 1.5, stats: { turn: 70 } }),
    H('tiger', 'Eurocopter Tiger HAD', 'França/Alemanha', { Lf: 14.1, R: 6.5, Wf: 0.95, Hf: 1.2, cal: 30, vmax: 290, mass: 6.6, climb: 11, rack: 700, paint: 0x55583f, wing: 1.0, skids: true }),
    H('a129', 'AgustaWestland A129 Mangusta', 'Itália', { Lf: 12.3, R: 5.9, Wf: 0.9, Hf: 1.15, cal: 20, vmax: 278, mass: 4.6, climb: 10, rack: 650, paint: 0x5b6048, wing: 0.9, skids: true }),
    H('wz10', 'Changhe WZ-10', 'China', { Lf: 14.1, R: 6.0, Wf: 1.0, Hf: 1.25, cal: 23, vmax: 270, mass: 7, climb: 11, rack: 700, paint: 0x5d6446, wing: 1.1 }),
    H('t129', 'TAI T129 ATAK', 'Turquia', { Lf: 12.5, R: 5.9, Wf: 0.95, Hf: 1.2, cal: 20, vmax: 280, mass: 5.0, climb: 10, rack: 700, paint: 0x636a4a, wing: 1.0, skids: true }),
    H('rooivalk', 'Denel AH-2 Rooivalk', 'África do Sul', { Lf: 16, R: 7.0, Wf: 1.05, Hf: 1.3, cal: 20, vmax: 309, mass: 8.75, climb: 12, rack: 800, paint: 0x74704c, wing: 1.2 }),
  ];
  SB.buildHeli = function (id) { const h = SB.HELIS.find(x => x.id === id); if (!h) return null; return buildHeli(Object.assign({ name: h.name, nation: h.nation }, h.cfg)); };
  /* o editor também lista os helicópteros */
  SB.HELIS.forEach(h => { SB.TANK_PRESETS[h.id] = () => SB.buildHeli(h.id); SB.TANK_NAMES[h.id] = '🚁 ' + h.name + ' (' + h.nation + ')'; });
  SB.TANK_PRESETS.heli_vazio = () => Object.assign(SB.buildHeli('ah64e'), { name: 'Novo helicóptero' });
  SB.TANK_NAMES.heli_vazio = '🚁 Novo helicóptero (base Apache)';
})(window.SB);
