/* Aviões: construtor paramétrico de aeronave de asa fixa + 10 modelos armados com os armamentos aéreos do PDF (SB.WT_CATALOG).
   Voam sempre para a frente (velocidade mínima de sustentação), sem pairar. Frente = -Z, topo = +Y.
   As velocidades estão em escala de jogo (o mapa é pequeno), não em km/h reais. */
(function (SB) {
  'use strict';
  const D2R = SB.D2R, V3 = THREE.Vector3, rd = SB.round;
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

  function buildPlane(c) {
    const P = [], D = [], add = a => (Array.isArray(a) ? a : [a]).forEach(x => P.push(x));
    const Lf = c.Lf, Ws = c.Ws, Wf = c.Wf, Hf = c.Hf, F = 0.9, yc = F + Hf / 2, top = F + Hf, zc = 0.05 * Lf, fl = Lf * 0.8;
    const wy = F + Hf * (c.wyf != null ? c.wyf : 0.45), ch = Lf * 0.2, zw = c.wz != null ? c.wz * Lf : 0.04 * Lf, sw = (Ws - Wf) / 2;
    const skin = L('al', 4), arm = L('hha', c.armT || 14), finH = Math.max(1.6, Lf * 0.17), zt = 0.4 * Lf;
    /* fuselagem */
    add(stack('Teto da fuselagem', [0, top, zc], [0, 0, 0], Wf, fl, skin));
    add(stack('Fundo da fuselagem', [0, F, zc], [180, 0, 0], Wf, fl, skin));
    add(stack('Lateral E', [-Wf / 2, yc, zc], [0, 0, 90], Hf, fl, skin));
    add(stack('Lateral D', [Wf / 2, yc, zc], [0, 0, -90], Hf, fl, skin));
    add(stack('Antepara do radar / nariz', [0, yc, zc - fl / 2], [90, 0, 0], Wf, Hf, L('nylon', 20)));
    add(stack('Antepara traseira', [0, yc, zc + fl / 2], [90, 0, 0], Wf, Hf, L('al', 5)));
    if (c.tub) { /* "banheira" blindada de titânio do piloto */
      const tz = -0.18 * Lf, tl = 2.0;
      add(stack('Blindagem lateral E', [-(Wf / 2 - 0.12), F + Hf * 0.5, tz], [0, 0, 90], Hf * 0.8, tl, arm));
      add(stack('Blindagem lateral D', [Wf / 2 - 0.12, F + Hf * 0.5, tz], [0, 0, -90], Hf * 0.8, tl, arm));
      add(stack('Blindagem do piso', [0, F + 0.14, tz], [180, 0, 0], Wf - 0.3, tl, arm));
    }
    /* asas */
    [-1, 1].forEach(sg => add(stack(sg < 0 ? 'Asa E' : 'Asa D', [sg * (Wf / 2 + sw / 2), wy, zw], [0, 0, 0], sw, ch, L('al', 8))));
    /* empenagem */
    const fx = c.twin ? [-Wf * 1.1, Wf * 1.1] : [0];
    fx.forEach((x, i) => add(stack('Deriva ' + (i + 1), [x, top + finH / 2, zt], [0, 0, -90], finH, 1.8, L('al', 3))));
    const ss = Math.max(3, Ws * 0.3);
    [-1, 1].forEach(sg => add(stack(sg < 0 ? 'Estabilizador E' : 'Estabilizador D', [sg * (Wf / 2 + ss / 2), yc + 0.1, zt + 0.5], [0, 0, 0], ss, 1.4, L('al', 4))));
    /* motores */
    const pods = c.engPod, ez = pods ? 0.2 * Lf : 0.3 * Lf, ey = pods ? top + 0.5 : yc;
    if (c.engN === 4) [-1, 1].forEach(sg => [0.22, 0.5].forEach(f => { const x = sg * (Wf / 2 + sw * f); P.push(mod('Motor', 'engine', [x, wy + 0.1, zw - 0.8], [0.9, 0.9, 2.4])); P.push(mk('Nacele do motor', 'tube', [x, wy + 0.1, zw - 0.8], [1.1, 3, 1.1], [90, 0, 0], 'al', { wall: 0.004 })); }));
    else if (c.twin2 || c.engines === 2) [-1, 1].forEach((sg, i) => P.push(mod('Motor ' + (i + 1) + ' (turbofan)', 'engine', [sg * (pods ? Wf / 2 + 1.1 : Wf * 0.28), ey, ez], [0.8, 0.8, Math.min(4.2, Lf * 0.25)])));
    else P.push(mod('Motor (turbofan)', 'engine', [0, yc, ez], [0.9, 0.9, Math.min(4.5, Lf * 0.28)]));
    if (pods) [-1, 1].forEach(sg => P.push(mk('Nacele do motor', 'tube', [sg * (Wf / 2 + 1.1), ey, ez], [1.0, Lf * 0.24, 1.0], [90, 0, 0], 'al', { wall: 0.004 })));
    /* sistemas internos */
    P.push(mod('Tanque de combustível principal', 'fuel', [0, yc - 0.1, zc], [Wf * 0.7, Hf * 0.5, 2.6]));
    [-1, 1].forEach(sg => P.push(mod('Tanque da asa', 'fuel', [sg * (Wf / 2 + sw * 0.35), wy - 0.05, zw], [0.8, 0.25, 1.4])));
    P.push(mod('Paiol de munição do canhão', 'ammo', [0, F + 0.45, -0.28 * Lf], [0.55, 0.45, 0.8]));
    P.push(mod('Sensores / radar do nariz', 'optics', [0, yc, -0.4 * Lf], [0.5, 0.45, 0.6]));
    P.push(mod('Aviônica', 'radio', [0, yc, 0.0], [0.5, 0.3, 0.5]));
    P.push(mod('Piloto', 'pilot', [0, F + Hf * 0.62, -0.17 * Lf]));
    if (c.crew2) P.push(mod('Navegador / operador de armas', 'cpg', [c.side2 ? 0.45 : 0, F + Hf * 0.62, -0.17 * Lf + (c.side2 ? 0 : 1.1)]));
    /* canhão fixo no nariz */
    const gx = 0, gy = yc - Hf * 0.2, gz = zc - fl / 2 + 0.2, bl = Math.max(1.4, c.cal * 0.05 + 0.8), gd = 0.04 + c.cal / 1000 * 0.9;
    P.push(mk('Cano do canhão', 'tube', [gx, gy, gz - bl / 2], [gd, bl, gd], [90, 0, 0], 'rha', { wall: gd * 0.3, grp: 'gun' }));
    P.push(mod('Culatra do canhão', 'breech', [gx, gy, gz + 0.1], [0.25, 0.25, 0.5], null, null, 'gun'));
    P.push(mk('Carenagem do canhão', 'box', [gx, gy, gz], [0.4, 0.3, 0.7], [0, 0, 0], 'al', { grp: 'turret' }));

    /* ---- decoração ---- */
    const d = (shape, pos, size, rot, color, grp) => D.push({ shape, pos: pos.map(x => rd(x, 3)), size, rot: rot || [0, 0, 0], color, grp: grp || 'hull', wall: 0.03 });
    d('capsule', [0, yc, zc], [Wf * 1.06, Lf * 0.92, Hf * 1.06], [90, 0, 0], 'body');                              // fuselagem
    d('sphere', [0, top + 0.02, -0.17 * Lf], [Wf * 0.78, Hf * 0.6, Lf * 0.2], null, 'glass');                       // canopy
    [-1, 1].forEach(sg => d('box', [sg * (Wf / 2 + sw / 2), wy, zw], [sw, 0.14, ch], [0, -sg * (c.sweep || 8), 0], 'body'));   // asas
    fx.forEach(x => d('box', [x, top + finH / 2, zt], [0.1, finH, 1.8], [-8, 0, 0], 'body'));                       // deriva(s)
    [-1, 1].forEach(sg => d('box', [sg * (Wf / 2 + ss / 2), yc + 0.1, zt + 0.5], [ss, 0.08, 1.4], null, 'body'));    // estabilizadores
    if (c.engN === 4) [-1, 1].forEach(sg => [0.22, 0.5].forEach(f => { const x = sg * (Wf / 2 + sw * f); d('capsule', [x, wy + 0.1, zw - 0.8], [1.1, 3.4, 1.1], [90, 0, 0], 'body'); d('cyl', [x, wy + 0.1, zw + 0.9], [0.8, 0.3, 0.8], [90, 0, 0], 'dark'); }));
    else if (pods) [-1, 1].forEach(sg => { d('capsule', [sg * (Wf / 2 + 1.1), ey, ez], [1.0, Lf * 0.26, 1.0], [90, 0, 0], 'body'); d('cyl', [sg * (Wf / 2 + 1.1), ey, ez + Lf * 0.13], [0.75, 0.3, 0.75], [90, 0, 0], 'dark'); });
    else if (c.twin2 || c.engines === 2) [-1, 1].forEach(sg => { d('cyl', [sg * Wf * 0.28, yc, zc + fl / 2 - 0.1], [0.85, 0.5, 0.85], [90, 0, 0], 'dark'); d('box', [sg * (Wf / 2 + 0.12), yc - 0.1, -0.12 * Lf], [0.5, Hf * 0.7, 1.5], null, 'dark'); });
    else { d('cyl', [0, yc, zc + fl / 2 - 0.1], [0.9, 0.5, 0.9], [90, 0, 0], 'dark'); d('box', [0, F - 0.1, -0.14 * Lf], [Wf * 0.8, 0.5, 1.4], null, 'dark'); }
    d('cyl', [0, 0.38, -0.27 * Lf], [0.5, 0.18, 0.5], [0, 0, 90], 'rubber');                                         // trem de pouso
    [-1, 1].forEach(sg => { d('cyl', [sg * Wf * 0.9, 0.38, 0.1 * Lf], [0.55, 0.2, 0.55], [0, 0, 90], 'rubber'); d('box', [sg * Wf * 0.9, 0.7, 0.1 * Lf], [0.07, 0.6, 0.07], null, 'metal'); });
    d('cyl', [gx, gy, gz - bl * 0.5], [gd * 1.5, bl, gd * 1.5], [90, 0, 0], 'metal', 'gun');
    /* pilones */
    const pylons = [[0, F - 0.15, zc]];
    [0.3, 0.5, 0.7, 0.88].forEach(f => [-1, 1].forEach(sg => pylons.push([rd(sg * (Wf / 2 + sw * f), 4), rd(wy - 0.28, 3), rd(zw, 3)])));
    pylons.forEach(p => d('box', [p[0], p[1] + 0.12, p[2]], [0.12, 0.26, 1.0], null, 'metal'));
    const st = Object.assign({ kind: 'heli', plane: true, cal: c.cal, vk: 1.0, vmax: c.vmax, rev: 0, turn: c.turn || 48, trav: 20, elev: [-4, 4], reload: 0, rack: c.rack || 2200, mass: c.mass, fixedGun: true, climb: c.climb || 20, rotR: 0,
      turPivot: [gx, gy, gz], gunPivot: [gx, gy, gz], muzzle: [gx, gy, gz - bl - 0.2], pylons, bodyLen: Lf, bodyWid: Ws, radar: c.radar ? { R: c.radar[0], pd: !!c.radar[1] } : null, stealth: !!c.stealth, rcs: c.rcs != null ? c.rcs : (c.bomber ? 4 : 1) }, c.stats || {});
    return { name: c.name, nation: c.nation, paint: c.paint, parts: P, deco: D, stats: st };
  }

  /* id, nome, nação, cfg; stats.wtl = lista [nº do armamento no PDF, unidades] */
  const A = (id, nm, na, cfg) => ({ id: 'p_' + id, name: nm, nation: na, cfg: Object.assign({ plane: true }, cfg) });
  const planes = [
    A('a10c', 'A-10C Thunderbolt II', 'EUA', { Lf: 16.3, Ws: 17.5, Wf: 1.5, Hf: 1.7, engPod: true, twin2: true, twin: true, tub: true, wyf: 0.5, sweep: 0, cal: 30, vmax: 430, mass: 14, turn: 44, climb: 16, rack: 2600, paint: 0x5b6048, stats: { wtl: [[178, 300], [195, 300], [75, 8], [4, 6], [12, 2], [152, 4], [94, 2]] } }),
    A('su25', 'Su-25SM3 Frogfoot', 'Rússia', { Lf: 15.5, Ws: 14.4, Wf: 1.4, Hf: 1.6, twin2: true, tub: true, wyf: 0.7, sweep: 6, cal: 30, vmax: 450, mass: 14, turn: 48, climb: 18, rack: 2500, paint: 0x5e6840, stats: { wtl: [[178, 250], [195, 250], [76, 10], [4, 6], [5, 2], [154, 4], [94, 2]] } }),
    A('f16c', 'F-16C Fighting Falcon', 'EUA', { Lf: 15.0, Ws: 9.96, Wf: 1.4, Hf: 1.7, wyf: 0.3, sweep: 16, cal: 20, vmax: 540, mass: 12, turn: 56, climb: 26, rack: 2400, paint: 0x6a6f74, stats: { wtl: [[176, 300], [193, 200], [13, 2], [4, 4], [131, 2], [95, 2], [115, 2]] } }),
    A('f15e', 'F-15E Strike Eagle', 'EUA', { Lf: 19.4, Ws: 13.05, Wf: 2.2, Hf: 1.9, twin2: true, twin: true, wyf: 0.8, sweep: 12, cal: 20, vmax: 560, mass: 20, turn: 50, climb: 27, rack: 3200, crew2: true, paint: 0x6a6f74, stats: { wtl: [[176, 300], [193, 200], [14, 2], [22, 4], [131, 2], [95, 2], [115, 4]] } }),
    A('fa18c', 'F/A-18C Hornet', 'EUA', { Lf: 17.1, Ws: 12.3, Wf: 1.9, Hf: 1.8, twin2: true, twin: true, wyf: 0.6, sweep: 10, cal: 20, vmax: 520, mass: 15, turn: 58, climb: 26, rack: 2800, paint: 0x7a7e84, stats: { wtl: [[176, 300], [193, 200], [12, 4], [21, 2], [143, 2], [134, 1], [95, 2], [115, 2]] } }),
    A('su34', 'Su-34 Fullback', 'Rússia', { Lf: 23.3, Ws: 14.7, Wf: 2.6, Hf: 1.9, twin2: true, twin: true, crew2: true, side2: true, wyf: 0.7, sweep: 12, cal: 30, vmax: 500, mass: 22, turn: 42, climb: 22, rack: 3400, paint: 0x5e6652, stats: { wtl: [[178, 250], [195, 150], [8, 4], [14, 2], [70, 4], [144, 2], [100, 2]] } }),
    A('tornado', 'Panavia Tornado GR4', 'Reino Unido', { Lf: 16.7, Ws: 13.9, Wf: 1.9, Hf: 1.6, twin2: true, crew2: true, wyf: 0.75, sweep: 25, cal: 30, vmax: 500, mass: 16, turn: 46, climb: 22, rack: 3000, paint: 0x62665a, stats: { wtl: [[178, 250], [195, 150], [13, 4], [5, 6], [157, 2], [148, 6], [95, 2]] } }),
    A('av8b', 'AV-8B Harrier II', 'EUA', { Lf: 14.1, Ws: 9.25, Wf: 1.4, Hf: 1.5, wyf: 0.85, sweep: 10, cal: 25, vmax: 420, mass: 7, turn: 54, climb: 22, rack: 2100, paint: 0x5a5e54, stats: { wtl: [[176, 300], [193, 200], [4, 6], [12, 2], [62, 4], [131, 2], [95, 2]] } }),
    A('il2', 'Il-2M3 Sturmovik', 'URSS', { Lf: 11.65, Ws: 14.6, Wf: 1.2, Hf: 1.4, tub: true, wyf: 0.2, sweep: 4, cal: 23, vmax: 300, mass: 6, turn: 40, climb: 12, rack: 1300, paint: 0x4e5a3e, stats: { wtl: [[177, 250], [194, 150], [188, 200], [67, 8], [43, 4], [1, 10]] } }),
    A('ju87g', 'Ju 87 G-2 Stuka (Kanonenvogel)', 'Alemanha', { Lf: 11.1, Ws: 13.8, Wf: 1.1, Hf: 1.4, wyf: 0.2, sweep: 0, cal: 37, vmax: 290, mass: 5, turn: 36, climb: 11, rack: 1500, paint: 0x6a6a52, stats: { wtl: [[180, 90], [198, 60], [188, 200], [6, 1], [2, 4]] } }),
    /* ---- furtivos (invisíveis ao radar) ---- */
    A('f22a', 'F-22A Raptor', 'EUA', { Lf: 18.9, Ws: 13.6, Wf: 2.0, Hf: 1.8, twin2: true, twin: true, wyf: 0.5, sweep: 20, cal: 20, vmax: 600, mass: 19, turn: 56, climb: 28, rack: 3000, paint: 0x5a5e66, stealth: true, radar: [4200, 1], stats: { wtl: [[176, 300], [193, 200], [115, 6], [95, 2], [22, 2]] } }),
    A('f35a', 'F-35A Lightning II', 'EUA', { Lf: 15.7, Ws: 10.7, Wf: 1.9, Hf: 1.7, wyf: 0.4, sweep: 18, cal: 20, vmax: 560, mass: 13, turn: 52, climb: 25, rack: 2800, paint: 0x6a6e74, stealth: true, radar: [3800, 1], stats: { wtl: [[176, 300], [193, 200], [22, 2], [115, 4], [95, 2]] } }),
    A('su57', 'Su-57 Felon', 'Rússia', { Lf: 20.1, Ws: 14.1, Wf: 2.2, Hf: 1.8, twin2: true, twin: true, wyf: 0.5, sweep: 20, cal: 30, vmax: 600, mass: 18.5, turn: 55, climb: 28, rack: 3000, paint: 0x6a7480, stealth: true, radar: [4000, 1], stats: { wtl: [[178, 250], [195, 150], [119, 4], [100, 2], [144, 2]] } }),
    A('j20', 'Chengdu J-20', 'China', { Lf: 20.3, Ws: 12.9, Wf: 2.1, Hf: 1.8, twin2: true, twin: true, wyf: 0.4, sweep: 24, cal: 20, vmax: 570, mass: 19, turn: 48, climb: 26, rack: 3000, paint: 0x5a606a, stealth: true, radar: [3800, 1], stats: { wtl: [[176, 200], [193, 100], [121, 4], [100, 2], [22, 2]] } }),
    A('f117', 'F-117A Nighthawk', 'EUA', { Lf: 20.1, Ws: 13.2, Wf: 2.4, Hf: 1.6, twin2: true, wyf: 0.4, sweep: 30, cal: 7.62, vmax: 420, mass: 13, turn: 30, climb: 14, rack: 2000, paint: 0x2a2c30, stealth: true, stats: { wtl: [[188, 50], [13, 2], [22, 2]] } }),
    A('b2a', 'B-2A Spirit (bombardeiro furtivo)', 'EUA', { Lf: 21, Ws: 52, Wf: 7, Hf: 1.7, twin2: true, wyf: 0.4, sweep: 0, cal: 7.62, vmax: 380, mass: 70, turn: 18, climb: 9, rack: 9000, bomber: true, paint: 0x2f3236, stealth: true, radar: [3000, 1], stats: { wtl: [[188, 50], [57, 2], [24, 4], [22, 8], [47, 4]] } }),
    /* ---- bombardeiros ---- */
    A('b52h', 'B-52H Stratofortress', 'EUA', { Lf: 48.5, Ws: 56.4, Wf: 3.0, Hf: 3.0, engN: 4, wyf: 0.8, sweep: 18, cal: 12.7, vmax: 330, mass: 83, turn: 14, climb: 7, rack: 14000, bomber: true, rcs: 6, paint: 0x6a6e66, radar: [2200, 0], stats: { wtl: [[188, 50], [10, 12], [8, 16], [4, 40], [44, 6]] } }),
    A('b1b', 'B-1B Lancer', 'EUA', { Lf: 44.8, Ws: 24, Wf: 3.0, Hf: 2.4, twin2: true, wyf: 0.5, sweep: 30, cal: 7.62, vmax: 520, mass: 87, turn: 22, climb: 12, rack: 12000, bomber: true, rcs: 3, paint: 0x62666a, radar: [2600, 1], stats: { wtl: [[188, 50], [22, 24], [23, 16], [24, 6]] } }),
    A('tu95', 'Tu-95MS Bear', 'Rússia', { Lf: 49.1, Ws: 51.1, Wf: 3.0, Hf: 3.0, engN: 4, wyf: 0.6, sweep: 14, cal: 23, vmax: 360, mass: 90, turn: 14, climb: 7, rack: 14000, bomber: true, rcs: 6, paint: 0x8a8e88, radar: [2200, 0], stats: { wtl: [[194, 100], [136, 6], [10, 8], [8, 12]] } }),
    A('tu22m3', 'Tu-22M3 Backfire', 'Rússia', { Lf: 42.5, Ws: 23, Wf: 3.0, Hf: 2.4, twin2: true, wyf: 0.6, sweep: 32, cal: 23, vmax: 500, mass: 62, turn: 18, climb: 10, rack: 12000, bomber: true, rcs: 4, paint: 0x8a8e88, radar: [2500, 0], stats: { wtl: [[194, 100], [10, 6], [8, 12], [144, 2], [133, 2]] } }),
    A('b17g', 'B-17G Flying Fortress', 'EUA', { Lf: 22.7, Ws: 31.6, Wf: 2.5, Hf: 2.8, engN: 4, wyf: 0.6, sweep: 0, cal: 12.7, vmax: 270, mass: 29, turn: 20, climb: 7, rack: 7000, bomber: true, rcs: 6, paint: 0x6e7258, stats: { wtl: [[189, 300], [4, 20], [2, 16]] } }),
    A('lanc', 'Avro Lancaster B.I', 'Reino Unido', { Lf: 21.1, Ws: 31.1, Wf: 2.2, Hf: 2.6, engN: 4, wyf: 0.6, sweep: 0, cal: 7.62, vmax: 270, mass: 29, turn: 22, climb: 7, rack: 9000, bomber: true, rcs: 6, paint: 0x4f5a42, stats: { wtl: [[188, 200], [53, 1], [10, 1], [8, 2], [4, 16]] } }),
    /* ---- caças multifunção ---- */
    A('typhoon', 'Eurofighter Typhoon', 'Reino Unido', { Lf: 15.96, Ws: 10.95, Wf: 1.8, Hf: 1.7, twin2: true, wyf: 0.4, sweep: 22, cal: 30, vmax: 590, mass: 11, turn: 56, climb: 29, rack: 2800, paint: 0x6a6e74, radar: [3800, 1], stats: { wtl: [[178, 250], [195, 150], [115, 4], [95, 2], [12, 2], [22, 2]] } }),
    A('rafale', 'Dassault Rafale C', 'França', { Lf: 15.3, Ws: 10.9, Wf: 1.8, Hf: 1.7, twin2: true, wyf: 0.5, sweep: 20, cal: 30, vmax: 560, mass: 10, turn: 58, climb: 28, rack: 2800, paint: 0x7a7e84, radar: [3600, 1], stats: { wtl: [[178, 250], [195, 150], [115, 4], [95, 2], [21, 2], [143, 1]] } }),
    A('gripen', 'Saab JAS 39C Gripen', 'Suécia', { Lf: 14.1, Ws: 8.4, Wf: 1.6, Hf: 1.6, wyf: 0.4, sweep: 18, cal: 27, vmax: 550, mass: 8.5, turn: 56, climb: 27, rack: 2400, paint: 0x6e7278, radar: [3200, 1], stats: { wtl: [[178, 200], [195, 100], [113, 2], [95, 2], [12, 2]] } }),
    A('mig29', 'MiG-29 Fulcrum', 'Rússia', { Lf: 17.4, Ws: 11.4, Wf: 2.0, Hf: 1.8, twin2: true, twin: true, wyf: 0.4, sweep: 16, cal: 30, vmax: 540, mass: 11, turn: 56, climb: 27, rack: 2600, paint: 0x7a8090, radar: [2600, 1], stats: { wtl: [[178, 150], [195, 100], [97, 4], [108, 2], [4, 2], [76, 8]] } }),
    A('su27', 'Su-27 Flanker', 'Rússia', { Lf: 21.9, Ws: 14.7, Wf: 2.3, Hf: 1.9, twin2: true, twin: true, wyf: 0.5, sweep: 18, cal: 30, vmax: 560, mass: 17, turn: 52, climb: 27, rack: 3000, paint: 0x6a7480, radar: [3200, 1], stats: { wtl: [[178, 150], [195, 100], [100, 2], [110, 2], [97, 4]] } }),
    A('mig21', 'MiG-21bis Fishbed', 'URSS', { Lf: 15.76, Ws: 7.15, Wf: 1.3, Hf: 1.5, wyf: 0.3, sweep: 28, cal: 23, vmax: 450, mass: 5.5, turn: 50, climb: 24, rack: 1800, paint: 0x8a8e80, radar: [1800, 0], stats: { wtl: [[177, 200], [194, 100], [94, 2], [2, 2], [76, 8]] } }),
    A('f4e', 'F-4E Phantom II', 'EUA', { Lf: 19.2, Ws: 11.7, Wf: 2.0, Hf: 1.9, twin2: true, crew2: true, wyf: 0.4, sweep: 24, cal: 20, vmax: 500, mass: 14, turn: 40, climb: 22, rack: 3200, paint: 0x6a6f66, radar: [2600, 0], stats: { wtl: [[176, 300], [193, 100], [95, 2], [106, 4], [4, 6], [8, 2]] } }),
    A('m2000', 'Mirage 2000C', 'França', { Lf: 14.36, Ws: 9.13, Wf: 1.5, Hf: 1.6, wyf: 0.4, sweep: 30, cal: 30, vmax: 540, mass: 8.5, turn: 54, climb: 28, rack: 2500, paint: 0x7a7e84, radar: [3200, 1], stats: { wtl: [[178, 250], [195, 100], [97, 2], [108, 2], [4, 2]] } }),
  ];
  /* radar dos 10 aviões originais (pd = radar Doppler de pulso) */
  const RD = { f16c: [3200, 1], f15e: [3600, 1], fa18c: [3200, 1], su34: [3000, 1], tornado: [2400, 0], av8b: [2000, 0] };
  planes.forEach(p => { const k = p.id.slice(2); if (RD[k] && !p.cfg.radar) p.cfg.radar = RD[k]; });
  const _end = 0;
  const oldBuild = SB.buildHeli;
  SB.buildHeli = function (id) { const h = SB.HELIS.find(x => x.id === id); if (h && h.cfg.plane) return buildPlane(Object.assign({ name: h.name, nation: h.nation }, h.cfg)); return oldBuild(id); };
  planes.forEach(p => { SB.HELIS.push(p); SB.TANK_PRESETS[p.id] = () => SB.buildHeli(p.id); SB.TANK_NAMES[p.id] = '✈ ' + p.name + ' (' + p.nation + ')'; });
  SB.PLANES = planes;
})(window.SB);
