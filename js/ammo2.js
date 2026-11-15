/* Biblioteca completa de munições: as 61 siglas do PDF + munições de helicóptero.
   Cada uma é um perfil desenhável (camadas x,r em mm) calibrado para a penetração "média" do PDF. */
(function (SB) {
  'use strict';
  const { samp, region, hollow, shellEnv, mkShell, mkRod, mkHeat, LID, f2 } = SB._b;
  const D2R = SB.D2R, clamp = SB.clamp;

  /* ---- corpo de míssil/foguete: motor + ogiva (explosiva, carga oca ou EFP) ---- */
  function mkWar(o) {
    const R = o.d / 2, L = o.L, wall = o.wall || 3, env = shellEnv(L, R, o.Ln, 0.01, R);
    const inner = x => Math.max(0, env(x) - wall), mot = o.motor != null ? o.motor : 0.3 * L, x0 = 8, xe = L - o.Ln * 0.3, xm = x0 + mot;
    const hb = hollow(env, L, x0, xe, wall, 26), layers = [{ id: LID(), name: 'Corpo', role: 'body', mat: 'apst', pts: hb.body }];
    if (mot > 0) layers.push({ id: LID(), name: 'Motor-foguete', role: 'filler', mat: 'prop', pts: region(inner, null, x0, xm, 8) });
    if (o.wh === 'he') layers.push({ id: LID(), name: 'Ogiva explosiva', role: 'filler', mat: o.fill || 'compb', pts: region(inner, null, xm, xe, 10) });
    else if (o.wh === 'heat' || o.wh === 'efp') {
      const al = (o.alpha || 30) * D2R, xr = L - o.Ln * 0.55, Rl = R - wall - 2;
      const xa = Math.max(xm + 12, xr - Rl / Math.tan(al)), tn = Rl / Math.max(1, xr - xa);
      const lo = x => Math.max(0, (x - xa) * tn), li = x => Math.max(0, lo(x) - (o.linerT || 2.2) / Math.cos(Math.atan(tn)));
      layers.push({ id: LID(), name: 'Ogiva explosiva', role: 'filler', mat: o.fill || 'compb', pts: region(inner, x => (x < xa ? 0 : lo(x)), xm, xr, 14) });
      layers.push({ id: LID(), name: o.wh === 'efp' ? 'Placa EFP (cobre)' : 'Liner de cobre', role: 'liner', mat: 'cu', pts: region(lo, li, xa, xr, 12) });
    }
    return layers;
  }
  /* míssil cinético: haste + motor */
  function mkKEMissile(o) {
    const R = o.d / 2, L = o.L, rc = o.coreD / 2, mx = L * 0.45;
    return [
      { id: LID(), name: 'Tubo do motor', role: 'body', mat: 'apst', pts: region(() => R, () => Math.max(0, R - 3), 0, mx, 6) },
      { id: LID(), name: 'Motor-foguete', role: 'filler', mat: 'prop', pts: region(() => R - 3, null, 0, mx, 6) },
      { id: LID(), name: 'Núcleo cinético', role: 'core', mat: 'whp', pts: [[mx, 0], [mx, f2(rc)], [f2(L - 60), f2(rc)], [f2(L), f2(rc * 0.18)], [f2(L), 0]] },
    ];
  }
  const solid = (o) => mkShell(o);
  const cyl = (d, L, wall, fill, nose) => { const R = d / 2, env = shellEnv(L, R, nose || d * 0.9, 10, R * 0.92); return hollow(env, L, 12, L - (nose || d * 0.9) * 0.45, wall, 22); };
  const wrap = (hb, fill) => [{ id: LID(), name: 'Corpo', role: 'body', mat: 'apst', pts: hb.body }, { id: LID(), name: 'Enchimento', role: 'filler', mat: fill, pts: hb.fill }];

  /* ---------- especificações: sigla → [camadas, v0 m/s, extras] ---------- */
  const SPEC = {
    'AP': () => [solid({ d: 76, L: 230, Ln: 65, bt: 10 }), 640, { target: 70 }],
    'AP-T': () => [mkShell({ d: 76, L: 240, Ln: 65, bt: 10, cavity: { x0: 4, x1: 42, r: 9 }, fill: 'trc' }), 680, { target: 70, tntKg: 0.003 }],
    'APC': () => [mkShell({ d: 76, L: 240, Ln: 80, bt: 10, cap: 22 }), 700, { target: 90 }],
    'APBC': () => [mkShell({ d: 76, L: 245, Ln: 90, bt: 10, bcap: 35 }), 720, { target: 90 }],
    'APCBC': () => [mkShell({ d: 88, L: 300, Ln: 110, bt: 14, cap: 34, bcap: 50 }), 780, { target: 110 }],
    'APHE': () => [mkShell({ d: 85, L: 330, Ln: 70, bt: 12, cavity: { x0: 12, x1: 90, r: 12 } }), 800, { target: 80, tntKg: 0.05, delay: 1.2, sens: 12 }],
    'APHEBC': () => [mkShell({ d: 85, L: 335, Ln: 100, bt: 12, bcap: 40, cavity: { x0: 12, x1: 90, r: 12 } }), 800, { target: 100, tntKg: 0.06, delay: 1.2, sens: 12 }],
    'APCBC-HE': () => [mkShell({ d: 88, L: 320, Ln: 110, bt: 14, cap: 34, bcap: 50, cavity: { x0: 14, x1: 75, r: 11 } }), 790, { target: 110, tntKg: 0.04, delay: 1, sens: 12 }],
    'SAP-HE': () => [mkShell({ d: 105, L: 380, Ln: 100, bt: 14, hollow: { x0: 14, x1: 260, wall: 12 } }), 600, { target: 40, tntKg: 0.3, delay: 1.5, sens: 8 }],
    'AP-I': () => [mkShell({ d: 30, L: 130, Ln: 35, bt: 5, cavity: { x0: 5, x1: 30, r: 4 }, fill: 'inc' }), 1000, { target: 25, tntKg: 0.005, sens: 4, delay: 0.5 }],
    'APCR': () => [mkRod({ coreD: 30, coreL: 150, noseL: 35, sabotD: 76 }), 1000, { target: 130 }],
    'APCNR': () => [mkRod({ coreD: 25, coreL: 200, noseL: 40, sabotD: 76 }), 1200, { target: 120 }],
    'APDS': () => [mkRod({ coreD: 36, coreL: 285, noseL: 55, sabotD: 105 }), 1480, { target: 220 }],
    'APFSDS-S': () => [mkRod({ coreD: 28, coreL: 500, noseL: 50, sabotD: 105, coreMat: 'apst' }), 1400, { target: 300 }],
    'APFSDS': () => [mkRod({ coreD: 24, coreL: 560, noseL: 50, sabotD: 120 }), 1650, { target: 550 }],
    'APFSDS-DU': () => [mkRod({ coreD: 22, coreL: 680, noseL: 50, sabotD: 120, coreMat: 'du' }), 1670, { target: 650 }],
    'APFSDS-AC': () => [mkRod({ coreD: 8, coreL: 150, noseL: 20, sabotD: 30 }), 1400, { target: 90 }],
    'HE': () => [wrap(cyl(105, 420, 10), 'tnt'), 700, { tntKg: 1.0 }],
    'HE-FRAG': () => [wrap(cyl(105, 420, 14), 'tnt'), 700, { tntKg: 1.5 }],
    'HE-FRAG-FS': () => [wrap(cyl(125, 620, 14), 'compb'), 900, { tntKg: 3 }],
    'HE-TF': () => [wrap(cyl(105, 400, 10), 'tnt'), 650, { tntKg: 0.8 }],
    'HE-VT': () => [wrap(cyl(105, 420, 12), 'tnt'), 700, { tntKg: 1.5 }],
    'HE-ABM': () => [wrap(cyl(120, 560, 12), 'compb'), 900, { tntKg: 1.5 }],
    'HE-OR': () => [wrap(cyl(120, 520, 7), 'compb'), 650, { tntKg: 2 }],
    'HESH': () => [wrap(cyl(105, 430, 6), 'plast'), 730, { tntKg: 3 }],
    'HEI': () => [wrap(cyl(30, 120, 3), 'tnt'), 1000, { tntKg: 0.02 }],
    'HEAT': () => [mkHeat({ d: 90, L: 350, Ln: 120, wall: 3.5, alpha: 28, base: 70 }), 450, { target: 150 }],
    'HEAT-FS': () => [mkHeat({ d: 105, L: 420, Ln: 150, wall: 4, alpha: 30, base: 100 }), 1170, { target: 400 }],
    'HEAT-G': () => [mkHeat({ d: 105, L: 430, Ln: 160, wall: 4, alpha: 30, base: 100 }), 1100, { target: 400 }],
    'HEAT-TDM': () => [mkHeat({ d: 125, L: 700, Ln: 220, wall: 4, alpha: 30, base: 140 }), 900, { target: 650 }],
    'HEAT-MP': () => [mkHeat({ d: 105, L: 450, Ln: 150, wall: 4, alpha: 32, base: 90 }), 1100, { target: 480, tntKg: 0.9 }],
    'ATGM': () => [mkWar({ d: 125, L: 850, Ln: 200, motor: 300, wh: 'heat', alpha: 30 }), 350, { target: 500, fixedCal: true }],
    'ATGM-TDM': () => [mkWar({ d: 125, L: 900, Ln: 220, motor: 300, wh: 'heat', alpha: 30 }), 350, { target: 900, fixedCal: true }],
    'ATGM-TOP': () => [mkWar({ d: 127, L: 900, Ln: 220, motor: 300, wh: 'heat', alpha: 30 }), 330, { target: 750, fixedCal: true }],
    'ATGM-EFP': () => [mkWar({ d: 120, L: 800, Ln: 200, motor: 280, wh: 'efp', alpha: 70 }), 300, { target: 100, fixedCal: true }],
    'ATGM-MP': () => [mkWar({ d: 125, L: 850, Ln: 200, motor: 300, wh: 'heat', alpha: 32 }), 350, { target: 600, tntKg: 3, fixedCal: true }],
    'ATGM-HE': () => [mkWar({ d: 125, L: 850, Ln: 200, motor: 300, wh: 'he' }), 350, { tntKg: 5, fixedCal: true }],
    'ATGM-TB': () => [mkWar({ d: 125, L: 850, Ln: 200, motor: 300, wh: 'he' }), 330, { tntKg: 8, fixedCal: true }],
    'ATGM-PRX': () => [mkWar({ d: 125, L: 850, Ln: 200, motor: 300, wh: 'he' }), 350, { tntKg: 3, fixedCal: true }],
    'ATGM-KE': () => [mkKEMissile({ d: 130, L: 2600, coreD: 36 }), 1500, { target: 900, fixedCal: true, turn: 14 }],
    'TOP-ATK': () => [mkWar({ d: 100, L: 600, Ln: 160, motor: 200, wh: 'efp', alpha: 70 }), 250, { target: 100, fixedCal: true }],
    'MRM': () => [mkWar({ d: 120, L: 800, Ln: 200, motor: 100, wh: 'heat', alpha: 30 }), 900, { target: 650, fixedCal: true, turn: 12 }],
    'RKT-HE': () => [mkWar({ d: 380, L: 1400, Ln: 350, motor: 400, wh: 'he', wall: 14 }), 250, { tntKg: 125, fixedCal: true, slots: 15 }],
    'RKT-FRAG': () => [mkWar({ d: 114, L: 840, Ln: 200, motor: 300, wh: 'he', wall: 2.5 }), 320, { tntKg: 2, fixedCal: true, slots: 1 }],
    'RKT-DEM': () => [mkWar({ d: 183, L: 1000, Ln: 220, motor: 300, wh: 'he', wall: 6 }), 280, { tntKg: 14.5, fixedCal: true, slots: 4 }],
    'RKT-HEAT': () => [mkWar({ d: 66, L: 900, Ln: 130, motor: 300, wh: 'heat', alpha: 30, wall: 1.5 }), 300, { target: 300, fixedCal: true }],
    'RKT-TB': () => [mkWar({ d: 220, L: 1500, Ln: 280, motor: 400, wh: 'he', wall: 5 }), 300, { tntKg: 35, fixedCal: true, slots: 6 }],
    'RKT-INC': () => [mkWar({ d: 114, L: 840, Ln: 200, motor: 300, wh: 'he', fill: 'inc', wall: 2.5 }), 320, { tntKg: 1, fixedCal: true }],
    'RKT-SMK': () => [mkWar({ d: 150, L: 1000, Ln: 220, motor: 300, wh: 'he', fill: 'smk', wall: 3 }), 300, { tntKg: 0.1, fixedCal: true }],
    'RKT-CL': () => [mkWar({ d: 227, L: 2000, Ln: 350, motor: 600, wh: 'he', fill: 'tnt', wall: 6 }), 300, { tntKg: 0.5, fixedCal: true, slots: 4, subs: 18 }],
    'RKT-MC': () => [mkWar({ d: 127, L: 2000, Ln: 300, motor: 600, wh: 'he', wall: 4 }), 200, { tntKg: 800, fixedCal: true, slots: 10 }],
    'CANISTER': () => [wrap(cyl(105, 300, 4), 'apst'), 700, { tntKg: 0.15, pellets: 1000 }],
    'APERS-T': () => [wrap(cyl(105, 300, 4), 'apst'), 700, { tntKg: 0.15, pellets: 5000 }],
    'SHRAPNEL': () => [wrap(cyl(76, 300, 4), 'apst'), 600, { tntKg: 0.1, pellets: 250 }],
    'SMOKE': () => [wrap(cyl(105, 420, 6), 'smk'), 700, { tntKg: 0.05 }],
    'WP': () => [wrap(cyl(105, 420, 6), 'wp'), 700, { tntKg: 0.1 }],
    'ILLUM': () => [wrap(cyl(105, 420, 6), 'smk'), 600, { tntKg: 0.03 }],
    'FLAME': () => [wrap(cyl(105, 420, 6), 'inc'), 400, { tntKg: 0.05 }],
    'TP-T': () => [mkShell({ d: 105, L: 400, Ln: 90, bt: 14, cavity: { x0: 4, x1: 50, r: 9 }, fill: 'trc', bodyMat: 'mild' }), 1000, { tntKg: 0 }],
    'TPCSDS-T': () => [mkRod({ coreD: 28, coreL: 400, noseL: 40, sabotD: 105, coreMat: 'al' }), 1400, {}],
    'DUMMY': () => [mkShell({ d: 105, L: 400, Ln: 90, bt: 14, bodyMat: 'al' }), 300, {}],
  };

  /* ---------- helicópteros: canhão (calibre de referência, será ajustado ao canhão), foguetes, mísseis, AAM ---------- */
  const HELI = [
    ['30×113 mm M789 HEDP', 'HEAT-MP', () => mkHeat({ d: 30, L: 113, Ln: 35, wall: 1.2, alpha: 30, base: 18 }), 805, { target: 50, tntKg: 0.02, slots: 1, rof: 10 }],
    ['30×165 mm 2A42 HE-FRAG-T', 'HE-FRAG', () => wrap(cyl(30, 165, 2.5), 'tnt'), 970, { tntKg: 0.045, slots: 1, rof: 10 }],
    ['30×165 mm 2A42 AP-T', 'AP-T', () => mkShell({ d: 30, L: 140, Ln: 36, bt: 5, cavity: { x0: 3, x1: 20, r: 4 }, fill: 'trc' }), 970, { target: 45, tntKg: 0.002, slots: 1, rof: 10 }],
    ['20×102 mm M56A3 HEI', 'HEI', () => wrap(cyl(20, 85, 2), 'tnt'), 1030, { tntKg: 0.01, slots: 1, rof: 12 }],
    ['20 mm M53 API', 'AP-I', () => mkShell({ d: 20, L: 85, Ln: 22, bt: 4, cavity: { x0: 3, x1: 16, r: 3 }, fill: 'inc' }), 1030, { target: 18, tntKg: 0.002, slots: 1, rof: 12 }],
    ['23×115 mm BZT/HEI', 'HEI', () => wrap(cyl(23, 100, 2.2), 'tnt'), 980, { tntKg: 0.012, slots: 1, rof: 10 }],
    ['12,7×99 mm AP-I (M8)', 'AP-I', () => mkShell({ d: 12.7, L: 58, Ln: 18, bt: 3, cavity: { x0: 2, x1: 10, r: 2 }, fill: 'inc' }), 890, { target: 20, tntKg: 0.0008, slots: 1, rof: 14 }],
    ['Hydra 70 M151 HE', 'RKT-FRAG', () => mkWar({ d: 70, L: 1400, Ln: 150, motor: 800, wh: 'he', wall: 2 }), 700, { tntKg: 0.9, fixedCal: true, slots: 8, rof: 4 }],
    ['Hydra 70 M247 HEDP', 'RKT-HEAT', () => mkWar({ d: 70, L: 1400, Ln: 150, motor: 800, wh: 'heat', alpha: 30, wall: 1.8 }), 700, { target: 120, fixedCal: true, slots: 8, rof: 4 }],
    ['Hydra 70 M255 flechetes', 'APERS-T', () => wrap(cyl(70, 1200, 2), 'apst'), 650, { tntKg: 0.1, pellets: 1180, fixedCal: true, slots: 8, rof: 4, burstOver: true }],
    ['Hydra 70 M257 iluminativa', 'ILLUM', () => wrap(cyl(70, 1200, 2), 'smk'), 600, { tntKg: 0.02, fixedCal: true, slots: 8, rof: 4 }],
    ['Hydra 70 M156 fumígena WP', 'RKT-SMK', () => wrap(cyl(70, 1200, 2), 'wp'), 600, { tntKg: 0.05, fixedCal: true, slots: 8, rof: 4 }],
    ['S-8KOM HEAT (80 mm)', 'RKT-HEAT', () => mkWar({ d: 80, L: 1500, Ln: 160, motor: 850, wh: 'heat', alpha: 30, wall: 1.8 }), 600, { target: 400, fixedCal: true, slots: 8, rof: 5 }],
    ['S-8 termobárico (80 mm)', 'RKT-TB', () => mkWar({ d: 80, L: 1500, Ln: 160, motor: 850, wh: 'he', wall: 2 }), 600, { tntKg: 4, fixedCal: true, slots: 8, rof: 4 }],
    ['S-13OF anti-bunker (122 mm)', 'RKT-DEM', () => mkWar({ d: 122, L: 2900, Ln: 300, motor: 1400, wh: 'he', wall: 5 }), 500, { tntKg: 8, fixedCal: true, slots: 14, rof: 2 }],
    ['S-24B (240 mm)', 'RKT-HE', () => mkWar({ d: 240, L: 2330, Ln: 400, motor: 800, wh: 'he', wall: 8 }), 500, { tntKg: 23, fixedCal: true, slots: 30, rof: 1 }],
    ['AGM-114K Hellfire II', 'ATGM-TDM', () => mkWar({ d: 178, L: 1630, Ln: 300, motor: 700, wh: 'heat', alpha: 30 }), 450, { target: 1000, fixedCal: true, slots: 40, rof: 0.4, guid: 'sacls' }],
    ['AGM-114L Longbow Hellfire', 'ATGM-TDM', () => mkWar({ d: 178, L: 1800, Ln: 320, motor: 700, wh: 'heat', alpha: 30 }), 450, { target: 1000, fixedCal: true, slots: 40, rof: 0.4, guid: 'lock' }],
    ['AGM-114N Hellfire termobárico', 'ATGM-TB', () => mkWar({ d: 178, L: 1630, Ln: 300, motor: 700, wh: 'he' }), 450, { tntKg: 6, fixedCal: true, slots: 40, rof: 0.4, guid: 'sacls' }],
    ['AGM-179 JAGM', 'ATGM-MP', () => mkWar({ d: 178, L: 1760, Ln: 320, motor: 700, wh: 'heat', alpha: 32 }), 450, { target: 1000, tntKg: 3, fixedCal: true, slots: 40, rof: 0.4, guid: 'lock' }],
    ['9M120 Ataka-V', 'ATGM-TDM', () => mkWar({ d: 130, L: 1830, Ln: 300, motor: 800, wh: 'heat', alpha: 30 }), 400, { target: 900, fixedCal: true, slots: 40, rof: 0.4, guid: 'sacls' }],
    ['9M114 Shturm-V', 'ATGM', () => mkWar({ d: 130, L: 1700, Ln: 280, motor: 800, wh: 'heat', alpha: 30 }), 400, { target: 650, fixedCal: true, slots: 36, rof: 0.4, guid: 'sacls' }],
    ['9M127 Vikhr', 'ATGM-TDM', () => mkWar({ d: 130, L: 2750, Ln: 330, motor: 1500, wh: 'heat', alpha: 30 }), 600, { target: 900, fixedCal: true, slots: 44, rof: 0.4, guid: 'sacls' }],
    ['Spike-ER (mergulho)', 'ATGM-TOP', () => mkWar({ d: 170, L: 1670, Ln: 300, motor: 700, wh: 'heat', alpha: 30 }), 260, { target: 800, fixedCal: true, slots: 40, rof: 0.35, guid: 'top' }],
    ['Brimstone', 'ATGM-TDM', () => mkWar({ d: 178, L: 1800, Ln: 320, motor: 700, wh: 'heat', alpha: 30 }), 450, { target: 1000, fixedCal: true, slots: 40, rof: 0.4, guid: 'lock' }],
    ['HJ-10', 'ATGM-TOP', () => mkWar({ d: 180, L: 1800, Ln: 320, motor: 700, wh: 'heat', alpha: 30 }), 380, { target: 800, fixedCal: true, slots: 40, rof: 0.35, guid: 'lock' }],
    ['UMTAS', 'ATGM-TDM', () => mkWar({ d: 160, L: 1800, Ln: 300, motor: 800, wh: 'heat', alpha: 30 }), 380, { target: 800, fixedCal: true, slots: 40, rof: 0.4, guid: 'sacls' }],
    ['Mokopa (longo alcance)', 'ATGM-TDM', () => mkWar({ d: 178, L: 2000, Ln: 340, motor: 900, wh: 'heat', alpha: 30 }), 450, { target: 1000, fixedCal: true, slots: 44, rof: 0.35, guid: 'lock' }],
    ['FIM-92 Stinger (ar-ar)', 'AAM', () => mkWar({ d: 70, L: 1500, Ln: 200, motor: 800, wh: 'he', wall: 2 }), 700, { tntKg: 0.4, fixedCal: true, slots: 40, rof: 0.5 }],
    ['9K38 Igla-V (ar-ar)', 'AAM', () => mkWar({ d: 72, L: 1700, Ln: 220, motor: 900, wh: 'he', wall: 2 }), 600, { tntKg: 0.5, fixedCal: true, slots: 40, rof: 0.5 }],
    ['Mistral (ar-ar)', 'AAM', () => mkWar({ d: 90, L: 1800, Ln: 240, motor: 900, wh: 'he', wall: 2 }), 800, { tntKg: 1.0, fixedCal: true, slots: 44, rof: 0.5 }],
  ];

  /* ---------- mísseis antiaéreos (SAM): só atingem aeronaves; guiagem infravermelho/radar ---------- */
  const SAM = [
    ['MIM-72 Chaparral (SAM)', () => mkWar({ d: 127, L: 2900, Ln: 300, motor: 1300, wh: 'he', wall: 3 }), 800, { tntKg: 4.5, slots: 60, rof: 0.4, turn: 85, burn: 3 }],
    ['9M38 Buk (SA-11, SAM)', () => mkWar({ d: 400, L: 5550, Ln: 800, motor: 2500, wh: 'he', wall: 6 }), 1100, { tntKg: 70, slots: 160, rof: 0.25, turn: 70, burn: 6 }],
    ['3M9 Kub (SA-6, SAM)', () => mkWar({ d: 340, L: 5800, Ln: 700, motor: 2600, wh: 'he', wall: 6 }), 800, { tntKg: 59, slots: 150, rof: 0.25, turn: 60, burn: 6 }],
    ['9M82 S-300V (SA-12, SAM)', () => mkWar({ d: 500, L: 9900, Ln: 1200, motor: 5000, wh: 'he', wall: 8 }), 1300, { tntKg: 150, slots: 350, rof: 0.2, turn: 55, burn: 9 }],
    ['9M330 Tor (SA-15, SAM)', () => mkWar({ d: 235, L: 2900, Ln: 400, motor: 1300, wh: 'he', wall: 4 }), 850, { tntKg: 15, slots: 90, rof: 0.5, turn: 90, burn: 3.5 }],
    ['9M311 Tunguska (SA-19, SAM)', () => mkWar({ d: 152, L: 2562, Ln: 350, motor: 1200, wh: 'he', wall: 3 }), 900, { tntKg: 9, slots: 60, rof: 0.5, turn: 85, burn: 3 }],
    ['9M37 Strela-10 (SA-13, SAM)', () => mkWar({ d: 120, L: 2200, Ln: 300, motor: 1000, wh: 'he', wall: 2.5 }), 600, { tntKg: 3, slots: 45, rof: 0.5, turn: 80, burn: 2.5 }],
    ['MIM-23 Hawk (SAM)', () => mkWar({ d: 360, L: 5030, Ln: 700, motor: 2300, wh: 'he', wall: 6 }), 800, { tntKg: 54, slots: 140, rof: 0.25, turn: 55, burn: 6 }],
    ['Roland 3 (SAM)', () => mkWar({ d: 160, L: 2600, Ln: 350, motor: 1200, wh: 'he', wall: 3 }), 500, { tntKg: 6.5, slots: 60, rof: 0.5, turn: 80, burn: 3 }],
    ['Rapier (SAM)', () => mkWar({ d: 133, L: 2240, Ln: 300, motor: 1000, wh: 'he', wall: 3 }), 650, { tntKg: 1.4, slots: 45, rof: 0.5, turn: 85, burn: 3 }],
    ['Starstreak HVM (SAM)', () => mkWar({ d: 127, L: 1397, Ln: 200, motor: 700, wh: 'he', wall: 3 }), 1200, { tntKg: 0.5, slots: 40, rof: 0.7, turn: 95, burn: 1.8 }],
    ['RBS 70 (SAM)', () => mkWar({ d: 106, L: 1320, Ln: 200, motor: 600, wh: 'he', wall: 2 }), 550, { tntKg: 0.5, slots: 40, rof: 0.6, turn: 80, burn: 2 }],
    ['HQ-17 (SAM)', () => mkWar({ d: 235, L: 2900, Ln: 400, motor: 1300, wh: 'he', wall: 4 }), 850, { tntKg: 15, slots: 90, rof: 0.5, turn: 90, burn: 3.5 }],
    ['QW-2 (SAM)', () => mkWar({ d: 71, L: 1550, Ln: 200, motor: 700, wh: 'he', wall: 2 }), 650, { tntKg: 1, slots: 40, rof: 0.6, turn: 80, burn: 2 }],
    ['ADATS (SAM)', () => mkWar({ d: 152, L: 2050, Ln: 300, motor: 900, wh: 'he', wall: 3 }), 1100, { tntKg: 12, slots: 70, rof: 0.5, turn: 85, burn: 2.5 }],
  ];
  const slug = s => 'p-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  function make(sym, name, layers, v0, ex, info) {
    const a = SB._b.ammo(name, sym, layers, v0, { builtin: true });
    Object.assign(a, ex || {}); delete a.target; a.id = slug(name); if (info) a.info = info;
    if (!(ex && ex.slots)) a.slots = 1;
    if (ex && ex.target && ex.tntKg == null && (SB.TYPE[sym].fam === 'heat')) { const dd = SB.deriveAmmo(a).liner; if (dd) a.tntKg = +(1.4 * Math.pow(Math.max(dd.D, 20) / 95, 3)).toFixed(2); }
    if (ex && ex.target) {
      const A = SB.deriveAmmo(a), p = SB.nominalPen(A, 0);
      if (p > 0) a.pk = clamp(ex.target / p, 0.15, 8);
    }
    return a;
  }
  SB.AMMO_PRESETS = function () {
    const out = [];
    (SB.CATALOG || []).forEach(c => {
      const f = SPEC[c.s]; if (!f) return;
      const r = f(); const nm = c.s + ' · ' + c.n;
      out.push(make(c.s, nm, r[0], r[1], r[2], { s: c.s, y: c.y, m: c.m, fx: c.fx }));
    });
    HELI.forEach(h => { const r = h[2](); out.push(make(h[1], h[0], r, h[3], h[4], { s: h[1], heli: true })); });
    SAM.forEach(h => { const r = h[1](); out.push(make('AAM', h[0], r, h[2], Object.assign({ fixedCal: true }, h[3]), { s: 'AAM', sam: true })); });
    return out;
  };
})(window.SB);
