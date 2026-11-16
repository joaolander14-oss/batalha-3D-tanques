/* Tanques 51–100: 2ª Guerra, Guerra Fria e modernos, derivados dos moldes de tanks.js com dados reais aproximados */
(function (SB) {
  'use strict';
  const { ERA, L } = SB._tk, ER = ERA;
  const cfgs = {};
  const base = id => cfgs[id] || SB.ROSTER.find(r => r.id === id).cfg;
  const V = (id, o) => Object.assign({}, base(id), o);
  const T = (id, nm, na, m, v, cal, vk, rl, cfg) => { cfgs[id] = cfg; return [id, nm, na, m, v, cal, vk, rl, cfg]; };
  const CMP = (a, b, c) => [['rha', a], ['cer', b], ['rha', c]];
  const NRA = (a, b, c) => [['rha', a], ['nera', b], ['rha', c]];
  const cm = (a, b, c) => [['cast', a], ['cer', b], ['rha', c]];
  const nm = (a, b, c) => [['cast', a], ['nera', b], ['rha', c]];
  const light = (a, rear) => ({ glacis: L('rha', a), lower: L('rha', a), side: L('rha', rear || a), rear: L('rha', rear || a), roof: L('rha', Math.max(8, a / 3)), floor: L('mild', 8) });
  const list = [
    /* ---- 2ª Guerra e entre-guerras (20) ---- */
    T('pz3j', 'Panzer III J', 'Alemanha', 22, 40, 50, 1.1, 4, V('pz4h', Object.assign(light(50, 30), { Lh: 2.8, Wh: 1.3, Ht: 1.4, glAng: 80, loAng: 80, rear: L('rha', 50), turWall: 0.03, mantlet: L('cast', 50), s: 0.93, paint: 0x7d7a62, wh: [6, 0.2, 'std'], ret: 3 }))),
    T('stug3g', 'StuG III Ausf. G', 'Alemanha', 24, 40, 75, 1.12, 5, V('jagdpanther', { Lh: 2.8, Ht: 1.2, glAng: 79, loAng: 79, glacis: L('rha', 80), lower: L('rha', 50), side: L('rha', 30), rear: L('rha', 30), roof: L('rha', 11), floor: L('rha', 16), tf: L('rha', 50), mantlet: L('cast', 50), turWall: 0.03, paint: 0x817c5a, s: 0.95, wh: [6, 0.2, 'std'], ret: 3, schurzen: true })),
    T('elefant', 'Elefant', 'Alemanha', 65, 30, 88, 1.28, 8, V('jagdpanther', { Lh: 3.5, Wh: 1.6, Ht: 1.5, glAng: 70, loAng: 70, glacis: L('rha', 100), lower: L('rha', 100), side: L('rha', 80), rear: L('rha', 80), roof: L('rha', 30), tf: L('rha', 200), mantlet: L('cast', 200), turWall: 0.08, paint: 0x7a7050, s: 1.1, wh: [6, 0.36, 'std'], ret: 3, schurzen: false })),
    T('jagdtiger', 'Jagdtiger', 'Alemanha', 75, 38, 128, 1.2, 12, V('jagdpanther', { Lh: 3.6, Wh: 1.7, Ht: 1.5, glAng: 50, loAng: 55, glacis: L('rha', 150), lower: L('rha', 100), side: L('rha', 80), rear: L('rha', 80), roof: L('rha', 40), tf: L('rha', 250), mantlet: L('cast', 250), turWall: 0.08, paint: 0x867a52, s: 1.12, wh: [9, 0.45, 'overlap'], ret: 0, stats: { rack: 38 } })),
    T('maus', 'Panzer VIII Maus', 'Alemanha', 188, 20, 128, 1.2, 12, V('tiger2', { Lh: 4.4, Wh: 1.8, Ht: 1.7, glAng: 55, loAng: 55, glacis: L('rha', 200), lower: L('rha', 200), side: L('rha', 180), rear: L('rha', 160), roof: L('rha', 60), floor: L('rha', 50), tr: 1.2, th: 0.9, tf: L('cast', 240), turWall: 0.2, mantlet: L('cast', 240), s: 1.28, paint: 0x777468, wh: [8, 0.38, 'std'], ret: 3, stats: { rack: 68 } })),
    T('hetzer', 'Jagdpanzer 38(t) Hetzer', 'Alemanha', 16, 42, 75, 1.12, 5, V('stug3g', { Lh: 2.5, Wh: 1.1, Ht: 1.1, glAng: 60, glacis: L('rha', 60), lower: L('rha', 60), side: L('rha', 20), rear: L('rha', 20), roof: L('rha', 8), tf: L('rha', 60), mantlet: L('cast', 60), s: 0.85, paint: 0x8a8460, wh: [4, 0.36, 'overlap'], ret: 0 })),
    T('bt7', 'BT-7', 'URSS', 14, 86, 45, 0.95, 4, V('t3476', Object.assign(light(15, 13), { Lh: 2.6, Wh: 1.2, Ht: 1.15, glAng: 55, loAng: 60, turWall: 0.015, turMat: 'rha', mantlet: L('cast', 15), s: 0.9, paint: 0x566a3a, wh: [4, 0.4, 'overlap'], ret: 0, drums: false }))),
    T('m3lee', 'M3 Lee', 'EUA', 27, 42, 75, 0.9, 6, V('sherman', { Lh: 2.9, Ht: 2.0, glAng: 60, glacis: L('rha', 51), side: L('rha', 38), tz: 0.0, tr: 0.75, th: 0.6, turWall: 0.05, mantlet: L('cast', 50), paint: 0x6b7240, s: 1.05, wh: [6, 0.3, 'std'], ret: 3 })),
    T('m3stuart', 'M3 Stuart', 'EUA', 14, 58, 37, 1.0, 3, V('sherman', Object.assign(light(38, 25), { Lh: 2.4, Wh: 1.1, Ht: 1.4, glAng: 58, loAng: 55, tr: 0.7, th: 0.55, tz: -0.05, turWall: 0.038, mantlet: L('cast', 38), s: 0.82, paint: 0x66723f, wh: [5, 0.26, 'std'], ret: 3, bustle: false }))),
    T('m10', 'M10 Wolverine', 'EUA', 29, 48, 76, 1.1, 5, V('hellcat', { Lh: 2.9, Ht: 1.4, glAng: 55, glacis: L('rha', 57), lower: L('rha', 38), side: L('rha', 19), rear: L('rha', 19), roof: L('rha', 0.1 * 0 + 8), s: 0.95, paint: 0x69733f, wh: [6, 0.3, 'std'], ret: 3, brake: 'brake2', stats: { turn: 32 } })),
    T('firefly', 'Sherman Firefly', 'Reino Unido', 33, 40, 76, 1.3, 6, V('sherman', { paint: 0x606b3c, brake: 'brake1', evac: false, stats: { rack: 78 } })),
    T('cromwell', 'Cromwell Mk.IV', 'Reino Unido', 28, 64, 75, 1.0, 4, V('sherman', { Lh: 2.8, Ht: 1.45, glAng: 70, glacis: L('rha', 64), lower: L('rha', 57), side: L('rha', 32), rear: L('rha', 32), tr: 0.82, th: 0.6, turWall: 0.076, mantlet: L('cast', 76), s: 0.97, paint: 0x5d633f, wh: [5, 0.38, 'overlap'], ret: 0, bustle: false })),
    T('comet', 'Comet', 'Reino Unido', 33, 47, 76, 1.25, 5, V('cromwell', { glacis: L('rha', 76), lower: L('rha', 76), side: L('rha', 40), turWall: 0.1, mantlet: L('cast', 102), tr: 0.9, ts: 'angular', turAng: 72, tf: L('cast', 102), paint: 0x5a603d, brake: 'brake1' })),
    T('matilda', 'Matilda II', 'Reino Unido', 27, 25, 40, 1.1, 3, V('churchill', { Lh: 2.9, Wh: 1.3, Ht: 1.5, glAng: 70, glacis: L('rha', 78), lower: L('rha', 78), side: L('rha', 70), rear: L('rha', 55), roof: L('rha', 20), tr: 0.7, th: 0.55, turWall: 0.075, mantlet: L('cast', 75), s: 0.92, paint: 0x5f6a40, wh: [10, 0.14, 'std'], ret: 0, bins: false })),
    T('valentine', 'Valentine Mk.III', 'Reino Unido', 16, 24, 40, 1.05, 3, V('matilda', { glacis: L('rha', 60), lower: L('rha', 60), side: L('rha', 60), rear: L('rha', 45), mantlet: L('cast', 65), turWall: 0.065, s: 0.85, paint: 0x626d3e })),
    T('su85', 'SU-85', 'URSS', 29, 55, 85, 1.05, 6, V('su100', { glacis: L('rha', 45), lower: L('rha', 45), side: L('rha', 45), rear: L('rha', 40), tf: L('rha', 45), mantlet: L('cast', 60), s: 0.96, paint: 0x4a5b36 })),
    T('isu152', 'ISU-152', 'URSS', 46, 35, 152, 0.75, 14, V('su100', { Lh: 3.2, Wh: 1.45, Ht: 1.45, glAng: 60, glacis: L('rha', 90), lower: L('rha', 90), side: L('rha', 90), rear: L('rha', 60), roof: L('rha', 30), tf: L('rha', 90), mantlet: L('cast', 100), turWall: 0.09, s: 1.08, paint: 0x4d5a35, wh: [6, 0.36, 'std'], ret: 3, brake: 'brake2', stats: { rack: 20 } })),
    T('kv2', 'KV-2', 'URSS', 52, 25, 152, 0.75, 16, V('kv1', { tr: 1.0, th: 1.0, ts: 'round', glacis: L('rha', 75), turWall: 0.1, mantlet: L('cast', 110), s: 1.1, paint: 0x435431, brake: 'none', stats: { rack: 36 } })),
    T('chiha', 'Type 97 Chi-Ha', 'Japão', 15, 38, 57, 0.75, 4, V('sherman', Object.assign(light(25, 20), { Lh: 2.6, Wh: 1.2, Ht: 1.3, glAng: 60, loAng: 60, tr: 0.7, th: 0.55, tz: 0, turWall: 0.025, mantlet: L('cast', 25), s: 0.86, paint: 0x7c7448, wh: [8, 0.18, 'std'], ret: 0, bustle: false, bins: false, antenna: true }))),
    T('chinu', 'Type 3 Chi-Nu', 'Japão', 19, 39, 75, 0.9, 5, V('chiha', { Lh: 2.7, glacis: L('rha', 50), lower: L('rha', 50), side: L('rha', 25), turWall: 0.05, mantlet: L('cast', 50), s: 0.9, paint: 0x786f46 })),
    /* ---- Guerra Fria (15) ---- */
    T('t62', 'T-62', 'URSS', 40, 50, 115, 1.28, 6, V('t54', { glacis: L('rha', 100), tr: 0.98, th: 0.62, mantlet: L('cast', 242), turWall: 0.2, brake: 'none', evac: true, paint: 0x505f3b, s: 0.96, wh: [5, 0.38, 'std'] })),
    T('t64b', 'T-64B', 'URSS', 38, 60, 125, 1.2, 6.5, V('t72a', { glacis: NRA(80, 85, 20), side: L('rha', 70), extras: ER(3.2, 1.55, 1.2), paint: 0x55623e, Lh: 3.2, wh: [6, 0.34, 'std'], ret: 0, s: 0.93 })),
    T('t10m', 'T-10M', 'URSS', 52, 42, 122, 1.1, 10, V('is2', { glacis: L('rha', 120), side: L('rha', 100), tr: 0.95, th: 0.7, turWall: 0.2, mantlet: L('cast', 250), s: 1.08, paint: 0x4c5936, wh: [7, 0.34, 'std'], ret: 4 })),
    T('pt76', 'PT-76', 'URSS', 14, 44, 76, 1.0, 5, V('hellcat', { Lh: 2.9, Wh: 1.5, Ht: 1.2, glAng: 25, glacis: L('rha', 14), lower: L('rha', 11), side: L('rha', 11), rear: L('rha', 10), ts: 'round', tr: 0.9, th: 0.55, tz: -0.1, turWall: 0.017, turMat: 'rha', mantlet: L('cast', 17), s: 0.93, paint: 0x4f6038, wh: [6, 0.3, 'std'], ret: 0, brake: 'brake1', fender: false })),
    T('amx13', 'AMX-13/75', 'França', 15, 60, 75, 1.2, 4, V('hellcat', { Lh: 2.5, Wh: 1.2, Ht: 1.2, glAng: 60, glacis: L('rha', 40), lower: L('rha', 30), side: L('rha', 20), rear: L('rha', 20), tz: 0.5, tr: 0.8, th: 0.55, ts: 'egg', turWall: 0.02, turMat: 'rha', mantlet: L('cast', 25), s: 0.88, paint: 0x7a7d52, wh: [5, 0.3, 'std'], ret: 3, brake: 'brake2' })),
    T('chieftain', 'Chieftain Mk.5', 'Reino Unido', 55, 48, 120, 1.15, 8, V('centurion', { Lh: 3.5, Ht: 1.3, glAng: 75, glacis: L('rha', 120), lower: L('rha', 80), side: L('rha', 50), rear: L('rha', 40), tr: 1.0, th: 0.6, turWall: 0.1, tf: L('cast', 240), mantlet: L('cast', 240), s: 1.1, paint: 0x4d5538, wh: [6, 0.34, 'std'], ret: 3, evac: true, brake: 'none' })),
    T('strv103', 'Strv 103C (S-tank)', 'Suécia', 42, 50, 105, 1.28, 4, V('su100', { Lh: 3.2, Wh: 1.5, Ht: 1.4, glAng: 75, glacis: L('rha', 90), lower: L('rha', 80), side: L('rha', 40), rear: L('rha', 25), roof: L('rha', 20), tf: L('rha', 90), mantlet: L('cast', 90), turWall: 0.04, auto: true, s: 1.0, paint: 0x4f5a3e, wh: [5, 0.38, 'std'], ret: 3, drums: false, brake: 'none', evac: true, stats: { rack: 50, trav: 15 } })),
    T('leo1a5', 'Leopard 1A5', 'Alemanha', 42, 65, 105, 1.15, 5.5, V('leo1', { tf: L('cast', 90), mantlet: L('cast', 90), skirt: [['rub', 15], ['rha', 12]], paint: 0x56603f, smoke: true })),
    T('type74', 'Type 74 Nana-yon', 'Japão', 38, 53, 105, 1.13, 5.5, V('m60', { Lh: 3.1, Ht: 1.35, tr: 0.98, th: 0.62, glacis: L('rha', 110), turWall: 0.12, mantlet: L('cast', 130), s: 0.98, paint: 0x5d6642, wh: [5, 0.34, 'std'], ret: 5, bustle: false, smoke: true })),
    T('cent13', 'Centurion Mk.13', 'Reino Unido', 52, 35, 105, 1.13, 5, V('centurion', { glacis: L('rha', 76), skirt: [['rub', 15], ['rha', 12]], paint: 0x66684a, bustle: true })),
    T('magach6', 'Magach 6B Gimel', 'Israel', 52, 45, 105, 1.13, 5, V('m60', { extras: ER(3.4, 1.5, 1.55), paint: 0x8f8b68, smoke: true })),
    T('olifant', 'Olifant Mk.2', 'África do Sul', 58, 58, 105, 1.15, 5, V('centurion', { Lh: 3.4, glacis: L('rha', 90), side: L('rha', 70), extras: ER(3.4, 1.5, 1.45), paint: 0x8a8460, s: 1.1 })),
    T('type59', 'Type 59', 'China', 36, 50, 100, 1.05, 7, V('t54', { paint: 0x54623f, drums: true })),
    T('type69', 'Type 69-II', 'China', 37, 50, 100, 1.08, 6.5, V('t54', { glacis: L('rha', 100), side: L('rha', 80), paint: 0x586641, smoke: true, evac: true })),
    T('of40', 'OF-40', 'Itália', 45, 60, 105, 1.12, 5.5, V('leo1', { Lh: 3.35, tf: L('cast', 70), paint: 0x6a6d48, s: 1.0 })),
    /* ---- modernos (15) ---- */
    T('t84', 'T-84 Oplot', 'Ucrânia', 51, 70, 125, 1.3, 6, V('t80u', { glacis: NRA(60, 150, 30), extras: ER(3.35, 1.6, 1.2), ts: 'angular', turAng: 52, tf: cm(220, 200, 100), mantlet: cm(220, 200, 100), paint: 0x4f5d3a, wh: [6, 0.36, 'std'], ret: 0, smoke: true, antenna: true })),
    T('t72b', 'T-72B', 'Rússia', 44, 60, 125, 1.25, 7, V('t72a', { glacis: NRA(60, 105, 20), extras: ER(3.3, 1.6, 1.2), paint: 0x59623f })),
    T('t90s', 'T-90S Bhishma', 'Índia', 46, 60, 125, 1.25, 6.5, V('t90a', { extras: ER(3.3, 1.6, 1.22), paint: 0x8f8a5f, smoke: true })),
    T('vt4', 'VT-4 (MBT-3000)', 'China', 52, 70, 125, 1.3, 5, V('ztz99a', { glacis: CMP(60, 250, 40), tf: cm(150, 280, 60), mantlet: cm(150, 280, 60), paint: 0x757650, s: 1.02 })),
    T('khalid', 'Al-Khalid', 'Paquistão', 48, 62, 125, 1.25, 6, V('t80u', { Lh: 3.3, glacis: NRA(60, 110, 30), extras: ER(3.3, 1.6, 1.2), paint: 0x6e7048, ts: 'angular', turAng: 55, tf: cm(180, 150, 90), mantlet: cm(180, 150, 90) })),
    T('zulfiqar', 'Zulfiqar-3', 'Irã', 44, 70, 125, 1.22, 6.5, V('t72a', { Lh: 3.3, glacis: NRA(60, 100, 20), extras: ER(3.3, 1.6, 1.2), paint: 0x7a7c55, ts: 'angular', turAng: 60, tf: cm(160, 100, 80), mantlet: cm(160, 100, 80) })),
    T('karrar', 'Karrar', 'Irã', 51, 70, 125, 1.25, 6, V('t90a', { extras: ER(3.3, 1.6, 1.22), paint: 0x74774f })),
    T('leo2a8', 'Leopard 2A8', 'Alemanha', 68, 68, 120, 1.42, 5, V('leo2a7', { aps: true, Lh: 3.9, extras: ER(3.9, 1.7, 1.4), smoke: true, antenna: true, paint: 0x3d4a35, s: 1.11, stats: { turn: 34 } })),
    T('abrams3', 'M1A2 SEPv3', 'EUA', 66, 67, 120, 1.36, 5, V('m1a2sep', { aps: true, glacis: CMP(40, 380, 70), tf: cm(80, 400, 60), mantlet: cm(80, 400, 60), paint: 0x8d835f, stats: { turn: 34 } })),
    T('leo2e', 'Leopard 2E', 'Espanha', 63, 68, 120, 1.38, 5, V('leo2a6', { Lh: 3.8, paint: 0x6b6d4a, extras: ER(3.8, 1.7, 1.4) })),
    T('ztq15', 'ZTQ-15 (Type 15)', 'China', 33, 70, 105, 1.2, 5, V('leo1', { Lh: 3.2, glacis: NRA(40, 100, 20), side: L('rha', 25), extras: ER(3.2, 1.5, 1.4), tf: cm(60, 100, 40), mantlet: cm(60, 100, 40), ts: 'angular', turAng: 62, paint: 0x6d7650, s: 0.96, auto: true, stats: { rack: 38, turn: 40 } })),
    T('stingray', 'Stingray II', 'Tailândia', 22, 70, 105, 1.1, 5, V('hellcat', { Lh: 2.9, Wh: 1.4, Ht: 1.3, glAng: 50, glacis: L('rha', 30), lower: L('rha', 25), side: L('rha', 20), rear: L('rha', 20), ts: 'angular', tr: 0.9, th: 0.6, tz: -0.1, turAng: 65, tf: L('rha', 30), turWall: 0.025, s: 0.95, paint: 0x6c7248, wh: [6, 0.3, 'std'], ret: 3, brake: 'none', evac: true, smoke: true })),
    T('booker', 'M10 Booker', 'EUA', 42, 60, 105, 1.15, 4.5, V('leo1', { Lh: 3.3, glacis: NRA(30, 100, 20), side: L('rha', 25), tf: cm(60, 100, 40), mantlet: cm(60, 100, 40), ts: 'angular', turAng: 60, auto: true, extras: ER(3.3, 1.5, 1.4), paint: 0x6e7048, s: 1.0, stats: { rack: 40, turn: 38 } })),
    T('cv90120', 'CV90120-T', 'Suécia', 35, 70, 120, 1.3, 4.5, V('leo1', { Lh: 3.2, Wh: 1.5, glacis: NRA(30, 80, 20), side: L('rha', 20), tf: nm(60, 80, 30), mantlet: nm(60, 80, 30), ts: 'angular', turAng: 62, auto: true, paint: 0x4e5a3f, s: 1.0, stats: { rack: 36, turn: 40 } })),
    T('shotkal', "Sho't Kal Dalet", 'Israel', 52, 55, 105, 1.14, 5.5, V('centurion', { extras: ER(3.3, 1.5, 1.45), side: L('rha', 70), paint: 0x938e6a, smoke: true, s: 1.1 })),
  ];
  SB.registerTanks(list);
  if (SB.ROSTER.length !== 100) console.warn('Elenco tem ' + SB.ROSTER.length + ' tanques (esperado 100)');
})(window.SB);
