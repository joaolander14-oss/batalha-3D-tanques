/* Biblioteca de armamentos AÉREOS = exatamente os 200 itens do PDF "armamentos_war_thunder.pdf":
   60 bombas · 33 foguetes/casulos · 28 mísseis ar-ar · 40 ar-solo/anti-navio · 12 torpedos · 27 canhões e metralhadoras.
   Cada item vira uma munição desenhável (domain 'air') com ogiva, guiamento e peso do PDF. */
(function (SB) {
  'use strict';
  const clamp = SB.clamp, CAT = SB.WT_CATALOG || [];
  SB.TYPE['ATGM-PEN'] = Object.assign({}, SB.TYPE['ATGM-HE'], { n: 'ATGM-PEN (penetrante anti-bunker)', blast: 2.2 });
  const num = s => parseFloat(String(s).replace(',', '.'));
  const LB = 0.4536;
  const LABEL = { bomba: 'Bomba', foguete: 'Foguete', aar: 'Míssil ar-ar', asm: 'Míssil ar-solo', torpedo: 'Torpedo', canhao: 'Canhão/MG' };
  const pad = n => String(n).padStart(3, '0');
  const parseSize = s => {
    s = String(s).replace(/\s+/g, ' ').trim(); let m;
    if ((m = s.match(/^([\d.,]+) lb$/))) return { lb: num(m[1]), kg: num(m[1]) * LB };
    if ((m = s.match(/^(\d+) × ([\d.,]+) mm$/))) return { tubes: +m[1], d: num(m[2]) };
    if ((m = s.match(/^([\d.,]+) mm( rotat\.)?$/))) return { d: num(m[1]), rot: !!m[2] };
    return { d: 20 };
  };
  const GUID = { Livre: null, IR: 'ir', IIR: 'ir', SARH: 'ir', ARH: 'ir', Laser: 'lock', TV: 'lock', 'GPS/INS': 'lock', Fio: 'sacls', 'Rádio': 'sacls', ARM: 'lock', 'Acústico': 'lock', Esteira: 'lock' };

  /* tipo de trava (lock) de cada guiagem do PDF: wire=fio, radio=rádio/SACLOS, laser=designador, tv=foto, ir=calor, gps=coordenada, radar, arm=antirradiação, auto=acústico/esteira */
  const LKMAP = { IR: 'ir', IIR: 'ir', SARH: 'radar', ARH: 'radar', Laser: 'laser', TV: 'tv', 'GPS/INS': 'gps', Fio: 'wire', 'Rádio': 'radio', ARM: 'arm', 'Acústico': 'auto', Esteira: 'auto' };
  SB.LK = { wire: 'Fio (segue a mira, alcance do fio)', radio: 'Rádio / SACLOS (segue a mira)', laser: 'Laser (câmera/designador no alvo)', tv: 'TV (tira foto do alvo, tecla L)', ir: 'Infravermelho (precisa de calor)', gps: 'GPS (coordenada do mapa, tecla L)', radar: 'Radar', arm: 'Antirradiação', auto: 'Automático' };
  SB.LK_GROUND = ['wire', 'radio', 'laser', 'tv', 'ir', 'gps'];
  /* ATGM de veículo terrestre: precisa escolher o tipo de lock */
  SB.isGAtgm = a => !!a && (a.domain || 'ground') === 'ground' && !(a.info && a.info.sam) && !!((a.info && a.info.gATGM) || (SB.TYPE[a.type] || {}).cls === 'MS');
  SB.defaultLk = a => {
    if (!SB.isGAtgm(a)) return a && a.lk || null;
    const n = a.name || '';
    return /Kornet|Refleks|Svir|Ataka|Vikhr|LAHAT|Hellfire/i.test(n) ? 'laser' : /Spike|Javelin|Brimstone|TOP-ATK/i.test(n + a.type) ? 'ir' : 'wire';
  };

  function bomb(it, z, b2, bb) {
    const kg = z.kg, d = Math.round(46 * Math.cbrt(kg)), w = it.warhead.replace(' retard.', ''), g = it.guid, gd = GUID[g];
    const L = Math.round(5.4 * d), wall = Math.max(5, Math.round(d * 0.05));
    const ex = { fixedCal: true, bomb: true, slots: Math.max(2, Math.round(kg / 14)), rof: 1.2 };
    if (gd) { ex.guid = gd; ex.turn = g === 'GPS/INS' ? 16 : 22; ex.cone = 42; }
    let sym, layers;
    if (w === 'HE') { sym = 'BOMB-HE'; layers = b2.wrap(b2.cyl(d, L, wall), 'tnt'); ex.tntKg = +(0.45 * kg).toFixed(1); }
    else if (w === 'FRAG') { sym = 'BOMB-FRAG'; layers = b2.wrap(b2.cyl(d, L, wall * 1.2), 'tnt'); ex.tntKg = +(0.3 * kg).toFixed(1); }
    else if (w === 'INC') { sym = 'BOMB-INC'; layers = b2.wrap(b2.cyl(d, L, wall * 0.6), 'inc'); ex.tntKg = +(0.12 * kg).toFixed(1); }
    else if (w === 'CLU') { sym = 'BOMB-CLU'; layers = b2.wrap(b2.cyl(d, L, wall), 'tnt'); ex.tntKg = +(0.12 * kg).toFixed(1); ex.subs = clamp(Math.round(kg / 8), 14, 56); }
    else if (w === 'WP') { sym = 'BOMB-WP'; layers = b2.wrap(b2.cyl(d, L, wall * 0.7), 'wp'); ex.tntKg = +(0.06 * kg).toFixed(2); }
    else if (w === 'PEN') { sym = 'BOMB-PEN'; layers = b2.wrap(b2.cyl(d, Math.round(L * 0.8), wall * 2.6), 'tnt'); ex.tntKg = +(0.22 * kg).toFixed(1); }
    else if (w === 'AP') { sym = 'BOMB-AP'; layers = bb.mkShell({ d, L: Math.round(3.4 * d), Ln: Math.round(1.3 * d), bt: Math.round(d * 0.15) }); ex.target = Math.round(d * 0.9); ex.tntKg = +(0.06 * kg).toFixed(1); }
    else { sym = 'BOMB-HEAT'; layers = bb.mkHeat({ d, L, Ln: Math.round(1.2 * d), wall, alpha: 30, base: Math.round(d * 0.12) }); ex.target = Math.round(clamp(d * 3.2, 200, 1100)); }
    return { sym, layers, v0: 120, ex };
  }
  function torpedo(it, z, b2) {
    const kg = z.kg, d = Math.round(48 * Math.cbrt(kg)), L = 8 * d, gd = GUID[it.guid];
    const ex = { fixedCal: true, bomb: true, torp: true, slots: Math.max(4, Math.round(kg / 10)), rof: 0.5, tntKg: +(0.3 * kg).toFixed(1) };
    if (gd) { ex.guid = gd; ex.turn = 14; ex.cone = 50; }
    return { sym: 'TORP', layers: b2.wrap(b2.cyl(d, L, Math.round(d * 0.04)), 'tnt'), v0: 80, ex };
  }
  function rocket(it, z, b2, bb) {
    const d = z.d, w = it.warhead, gd = GUID[it.guid], tubes = z.tubes || 1, L = Math.round(Math.min(20 * d, 2900)), Ln = Math.round(Math.min(2 * d, 400));
    const mk = (wh, fill, wall) => b2.mkWar({ d, L, Ln, motor: Math.round(L * 0.55), wh, fill, wall: wall || Math.max(1.8, d / 40), alpha: 30 });
    const salvo = tubes > 1 ? Math.min(tubes, 8) : (d <= 80 ? 2 : 1), per = Math.max(1, Math.round(d / 9));
    const ex = { fixedCal: true, rocket: true, salvo, slots: salvo * per, rof: tubes > 1 ? 1.5 : 3 };
    if (gd) { ex.guid = gd; ex.turn = 30; ex.cone = 16; ex.burn = 2.2; }
    const v0 = d <= 70 ? 700 : d <= 80 ? 620 : d <= 127 ? 520 : 450, tnt = 2.6e-6 * d * d * d;
    let sym, layers;
    if (w === 'HE') { sym = 'RKT-HE'; layers = mk('he'); ex.tntKg = +tnt.toFixed(2); }
    else if (w === 'FRAG') { sym = 'RKT-FRAG'; layers = mk('he'); ex.tntKg = +(tnt * 0.9).toFixed(2); }
    else if (w === 'HEAT') { sym = 'RKT-HEAT'; layers = mk('heat'); ex.target = Math.round(d * 3); }
    else if (w === 'HESH') { sym = 'RKT-HESH'; layers = b2.wrap(b2.cyl(d, Math.round(8 * d), Math.max(2, d * 0.05)), 'compb'); ex.tntKg = +(tnt * 1.3).toFixed(2); }
    else if (w === 'AP') { sym = 'RKT-AP'; layers = bb.mkShell({ d, L: Math.round(5 * d), Ln: Math.round(1.3 * d), bt: Math.round(d * 0.15) }); ex.target = Math.round(d * 2.2); }
    else if (w === 'FLE') { sym = 'APERS-T'; layers = b2.wrap(b2.cyl(d, Math.round(12 * d), 2), 'tnt'); ex.tntKg = 0.1; ex.pellets = d < 80 ? 1100 : 2400; ex.rocket = false; }
    else if (w === 'INC') { sym = 'RKT-INC'; layers = mk('he', 'inc'); ex.tntKg = +(tnt * 0.5).toFixed(2); }
    else { sym = 'RKT-SMK'; layers = mk('he', 'wp'); ex.tntKg = +(tnt * 0.3).toFixed(2); }
    return { sym, layers, v0, ex };
  }
  function aam(it, z, b2) {
    const kg = z.kg, d = Math.round(29 * Math.cbrt(kg)), L = Math.round(Math.min(22 * d, 5500)), g = it.guid;
    const ex = { fixedCal: true, slots: Math.max(20, Math.round(kg / 2.2)), rof: 0.5, tntKg: +clamp(0.1 * kg, 1, 40).toFixed(1), guid: 'ir',
      radar: g === 'SARH' || g === 'ARH', sarh: g === 'SARH', turn: { IR: 75, IIR: 85, SARH: 60, ARH: 70 }[g] || 70, cone: { IR: 22, IIR: 28, SARH: 26, ARH: 32 }[g] || 22, burn: Math.min(9, 3 + kg / 40) };
    return { sym: 'AAM', layers: b2.mkWar({ d, L, Ln: Math.round(2.2 * d), motor: Math.round(L * 0.5), wh: 'he', wall: 3 }), v0: (g === 'SARH' || g === 'ARH') ? 1100 : 900, ex };
  }
  function asm(it, z, b2) {
    const kg = z.kg, d = Math.round(50 * Math.cbrt(kg)), L = 9 * d, w = it.warhead, gd = GUID[it.guid] || 'sacls';
    const ex = { fixedCal: true, slots: Math.max(10, Math.round(kg * 0.9)), rof: 0.4, guid: gd, turn: kg > 300 ? 22 : 36, arm: it.guid === 'ARM', cone: it.guid === 'ARM' ? 40 : it.guid === 'GPS/INS' ? 24 : 14, burn: Math.min(8, 2.5 + kg / 60) };
    const v0 = kg < 100 ? 450 : kg < 400 ? 380 : 300, mw = o => b2.mkWar(Object.assign({ d, L, Ln: Math.round(1.7 * d), motor: Math.round(L * 0.4), wall: Math.max(3, d * 0.03), alpha: 30 }, o));
    if (w === 'HEAT') return { sym: 'ATGM-TDM', layers: mw({ wh: 'heat' }), v0, ex: Object.assign(ex, { target: Math.round(clamp(d * 5.5, 450, 1100)) }) };
    if (w === 'PEN') return { sym: 'ATGM-PEN', layers: mw({ wh: 'he', wall: Math.max(8, d * 0.08) }), v0, ex: Object.assign(ex, { tntKg: +(0.25 * kg).toFixed(1) }) };
    return { sym: 'ATGM-HE', layers: mw({ wh: 'he' }), v0, ex: Object.assign(ex, { tntKg: +(0.3 * kg).toFixed(1) }) };
  }
  function gun(it, z, b2, bb) {
    const d = z.d, w = it.warhead, rof = z.rot ? 28 : d <= 8 ? 16 : d <= 13 ? 14 : d <= 24 ? 11 : d <= 31 ? 10 : d <= 40 ? 4 : d <= 60 ? 2.5 : 0.8;
    const v0 = d <= 8 ? 850 : d <= 13 ? 890 : d <= 24 ? 1030 : d <= 31 ? 970 : d <= 41 ? 900 : d <= 60 ? 1000 : 700, L = Math.round(Math.max(28, 4.3 * d)), t = 1.25e-6 * d * d * d;
    const ex = { fixedCal: true, slots: 1, rof };
    if (w === 'HEI') return { sym: 'HEI', layers: b2.wrap(b2.cyl(d, Math.round(4.2 * d), Math.max(1.2, d * 0.1)), 'tnt'), v0, ex: Object.assign(ex, { tntKg: +t.toFixed(4) }) };
    if (w === 'HE') return { sym: 'HE', layers: b2.wrap(b2.cyl(d, Math.round(4.4 * d), Math.max(1.5, d * 0.1)), 'tnt'), v0, ex: Object.assign(ex, { tntKg: +(t * 1.1).toFixed(4) }) };
    if (w === 'AP') return { sym: 'AP', layers: bb.mkShell({ d, L, Ln: Math.round(1.2 * d), bt: Math.max(1.5, Math.round(d * 0.2)) }), v0, ex: Object.assign(ex, { target: +(d * 1.1).toFixed(0) }) };
    if (w === 'API') return { sym: 'AP-I', layers: bb.mkShell({ d, L, Ln: Math.round(1.2 * d), bt: Math.max(1.5, Math.round(d * 0.2)), cavity: { x0: Math.round(0.12 * d), x1: Math.round(0.9 * d), r: Math.max(1.2, 0.14 * d) }, fill: 'inc' }), v0, ex: Object.assign(ex, { target: +(d * 0.9).toFixed(0), tntKg: +(t * 0.15).toFixed(4) }) };
    if (w === 'APHE') return { sym: 'APHE', layers: bb.mkShell({ d, L, Ln: Math.round(1.1 * d), bt: Math.max(1.5, Math.round(d * 0.2)), cavity: { x0: Math.round(0.14 * d), x1: Math.round(1.05 * d), r: Math.max(1.5, 0.15 * d) } }), v0, ex: Object.assign(ex, { target: +(d * 1.0).toFixed(0), tntKg: +(t * 0.3).toFixed(4), delay: 1, sens: 8 }) };
    if (w === 'HEAT') return { sym: 'HEAT', layers: bb.mkHeat({ d, L: Math.round(4 * d), Ln: Math.round(0.9 * d), wall: 3, alpha: 30, base: Math.round(0.3 * d) }), v0: 600, ex: Object.assign(ex, { target: 180 }) };
    return { sym: 'HESH', layers: b2.wrap(b2.cyl(d, Math.round(4 * d), 5), 'compb'), v0: 600, ex: Object.assign(ex, { tntKg: 0.5 }) };
  }
  const MAKER = { bomba: bomb, torpedo: torpedo, foguete: rocket, aar: aam, asm, canhao: gun };

  /* chamado por AMMO_PRESETS: constrói os 200 itens */
  SB.wtAmmo = function (make) {
    const b2 = SB._b2, bb = SB._b, out = [];
    CAT.forEach(it => {
      const z = parseSize(it.size), r = MAKER[it.cat](it, z, b2, bb);
      if (LKMAP[it.guid]) r.ex.lk = LKMAP[it.guid];                                   // tipo de trava do PDF (laser, TV, GPS, fio, IR…)
      if (it.cat !== 'aar' && r.ex.guid === 'ir') r.ex.guid = 'lock';                  // ar-solo/bomba IR mira em qualquer alvo (só o AAM é restrito a aeronaves)
      const sg = it.cat === 'canhao' ? '' : ' · ' + it.guid, sz = String(it.size).replace(/\s+/g, ' ');
      const nm = '#' + pad(it.n) + ' ' + LABEL[it.cat] + (z.tubes ? ' (casulo)' : '') + (z.rot ? ' rotativo' : '') + ' ' + sz.replace(' rotat.', '') + ' ' + it.warhead + sg;
      const a = make(r.sym, nm, r.layers, r.v0, r.ex, { s: r.sym, wt: it.n, wtcat: it.cat, warhead: it.warhead, guidance: it.guid });
      a.domain = 'air'; out.push(a);
    });
    return out;
  };

  /* ---------- seleção de carga padrão (helicópteros e aviões) ---------- */
  const GUNS = { 'g40': [181, 199], 'g30': [178, 195], 'g23': [177, 194], 'g20': [175, 191], 'g12': [174, 190], 'g7': [188, 187] };
  const rockN = nm => /S-8|80 mm/.test(nm || '') ? 76 : /S-13|122/.test(nm || '') ? 77 : /S-24|240/.test(nm || '') ? 70 : 75;
  const asmN = nm => /114L|JAGM|Brimstone|Longbow/.test(nm || '') ? 149 : /Ataka|Vikhr|Shturm|9M1|HOT|Fio/.test(nm || '') ? 154 : /Spike|HJ-10/.test(nm || '') ? 145 : /UMTAS|Mokopa/.test(nm || '') ? 150 : 148;
  SB.airLoadout = function (stats, P) {
    const byN = {}; P.forEach(a => { if (a.info && a.info.wt) byN[a.info.wt] = a; });
    const out = []; let used = 0, rack = stats.rack || 800;
    const add = (n, cnt) => { const a = byN[n]; if (!a || cnt <= 0) return; const sl = a.slots || 1, k = Math.min(cnt, Math.floor(Math.max(0, rack - used) / sl)); if (k > 0) { out.push({ ammo: a, n: k }); used += k * sl; } };
    if (stats.wtl) { stats.wtl.forEach(r => add(r[0], r[1])); return out; }
    const allow = stats.wp || 'grma', c = stats.cal || 20;
    if (allow.indexOf('g') >= 0) { const g = GUNS[c >= 38 ? 'g40' : c >= 28 ? 'g30' : c >= 21 ? 'g23' : c >= 16 ? 'g20' : c >= 10 ? 'g12' : 'g7']; add(g[0], Math.round(Math.min(500, rack * 0.3) * 0.65)); add(g[1], Math.round(Math.min(500, rack * 0.3) * 0.35)); }
    if (allow.indexOf('r') >= 0) add(rockN(stats.rock), Math.max(2, Math.floor(rack * 0.22 / ((byN[rockN(stats.rock)] || {}).slots || 16))));
    if (allow.indexOf('m') >= 0) add(asmN(stats.atgmName), Math.max(1, Math.min(8, Math.floor(rack * 0.25 / ((byN[asmN(stats.atgmName)] || {}).slots || 40)))));
    if (allow.indexOf('a') >= 0) add(94, 2);
    return out;
  };
})(window.SB);
