/* Helicópteros 51–125: utilitários armados, navais, de ataque e de reconhecimento de vários países (medidas aproximadas reais).
   Linha: [id, nome, nação, comprimento m, raio do rotor m, largura, altura, calibre mm, vmax km/h, massa t, subida m/s, capacidade, extras] */
(function (SB) {
  'use strict';
  const PAINT = { 'EUA': [0x4a4d45, 0x5a5f4c, 0x3d4238], 'URSS': [0x4e5a3e, 0x5e6840], 'Rússia': [0x4e5a3e, 0x6a7050], 'Polônia': [0x56604a], 'França': [0x55583f, 0x6a6e52], 'Alemanha': [0x55583f, 0x4a4e3c], 'Reino Unido': [0x5a5e48, 0x3f4439], 'Itália': [0x5b6048], 'China': [0x5d6446, 0x5e6648], 'Índia': [0x646a49, 0x6a6f4c], 'Japão': [0x4f5444], 'Coreia do Sul': [0x575d47], 'Turquia': [0x636a4a], 'Israel': [0x6a6a50], 'Irã': [0x6e6a50], 'África do Sul': [0x74704c], 'Brasil': [0x4f5a42], 'Austrália': [0x4c5240], 'Romênia': [0x56604a], 'Egito': [0x786e50] };
  const R = (id, nm, na, Lf, rot, Wf, Hf, cal, vmax, mass, climb, rack, ex) => ({ id: 'x_' + id, name: nm, nation: na, cfg: Object.assign({ Lf, R: rot, Wf, Hf, cal, vmax, mass, climb, rack, wing: 0.6, paint: (PAINT[na] || [0x585c48])[id.length % (PAINT[na] || [0]).length] }, ex || {}) });
  const W = (wp, o) => { const out = {}, stats = { wp }; Object.keys(o || {}).forEach(k => { if (k === 'rock' || k === 'atgmName' || k === 'aamName' || k === 'turn') stats[k] = o[k]; else if (k !== 'stats') out[k] = o[k]; }); out.stats = Object.assign(stats, (o && o.stats) || {}); return out; };
  const sk = { skids: true }, sd = { side: true };
  const list = [
    /* ---- EUA ---- */
    R('uh60m', 'UH-60M Black Hawk (armado)', 'EUA', 15.3, 8.2, 1.9, 1.6, 7.62, 295, 10, 9, 600, W('grm', Object.assign({ side: true, wing: 0.8 }, { stats: { atgmName: 'AGM-114K' } }))),
    R('hh60g', 'HH-60G Pave Hawk', 'EUA', 15.3, 8.2, 1.9, 1.6, 7.62, 295, 9.9, 9, 500, W('gr', Object.assign({ side: true, wing: 0.7 }))),
    R('oh6a', 'OH-6A Cayuse', 'EUA', 7.0, 4.0, 1.0, 1.1, 7.62, 241, 1.2, 8, 280, W('g', Object.assign({ side: true, wing: 0.3 }, sk))),
    R('oh58a', 'OH-58A+ Kiowa', 'EUA', 9.8, 5.3, 1.05, 1.2, 7.62, 222, 1.4, 7, 300, W('gr', Object.assign({ side: true, wing: 0.4 }, sk))),
    R('ah56', 'AH-56 Cheyenne', 'EUA', 16.6, 7.7, 1.0, 1.2, 30, 400, 8.3, 14, 800, { wing: 1.9, skids: false, stats: { wp: 'grm' } }),
    R('uh1n', 'UH-1N Twin Huey', 'EUA', 12.9, 7.3, 1.8, 1.5, 7.62, 204, 4.8, 8, 450, W('gr', Object.assign({ side: true, wing: 0.6 }, sk))),
    R('ch53e', 'CH-53E Super Stallion (armado)', 'EUA', 22.4, 12.0, 2.7, 2.4, 12.7, 315, 33, 8, 600, W('g', Object.assign({ side: true, wing: 0 }))),
    R('ah1f', 'AH-1F Cobra Modernizado', 'EUA', 13.6, 6.7, 0.95, 1.2, 20, 227, 4.6, 9, 600, { wing: 0.9, skids: true, stats: { atgmName: 'TOW' } }),
    R('ah1t', 'AH-1T Sea Cobra', 'EUA', 14.1, 6.7, 0.95, 1.2, 20, 245, 5.6, 9, 650, { wing: 1.0, skids: true }),
    R('ah1j', 'AH-1J SeaCobra', 'EUA', 13.6, 6.7, 0.95, 1.2, 20, 240, 4.5, 8, 600, { wing: 0.9, skids: true }),
    R('mh60r', 'MH-60R Seahawk', 'EUA', 15.3, 8.2, 1.9, 1.6, 7.62, 270, 10, 9, 550, W('grm', Object.assign({ side: true, wing: 0.8 }))),
    R('ch47d', 'CH-47D Chinook (armado)', 'EUA', 15.5, 9.1, 2.3, 2.0, 7.62, 296, 22, 8, 500, W('g', Object.assign({ side: true, tandemRot: true, cabinEnd: 0.5, tail: 0.08, wing: 0 }))),
    R('uh72a', 'UH-72A Lakota (armado)', 'EUA', 10.7, 5.5, 1.7, 1.4, 7.62, 259, 2.9, 8, 320, W('gr', Object.assign({ side: true, wing: 0.5 }, sk))),
    /* ---- URSS / Rússia / Polônia ---- */
    R('mi8t', 'Mi-8T Hip-C', 'URSS', 18.2, 10.7, 2.5, 1.9, 7.62, 260, 12, 8, 700, W('gr', Object.assign({ side: true, wing: 0.8, rock: 'S-8' }))),
    R('mi8tv', 'Mi-8TV Hip-F', 'URSS', 18.2, 10.7, 2.5, 1.9, 12.7, 250, 12, 8, 700, W('grm', Object.assign({ side: true, wing: 0.9, rock: 'S-8', atgmName: '9M114' }))),
    R('mi8amtsh', 'Mi-8AMTSh Terminator', 'Rússia', 18.2, 10.7, 2.5, 1.9, 12.7, 250, 13, 8, 800, W('grma', Object.assign({ side: true, wing: 1.0, rock: 'S-8', atgmName: '9M120', aamName: 'Igla' }))),
    R('mi24pn', 'Mi-24PN Hind-F', 'Rússia', 17.5, 8.65, 1.5, 1.6, 30, 335, 12, 11, 900, { fixed: true, gunSide: true, wing: 1.6, stats: { turn: 45, rock: 'S-8', atgmName: '9M120', wp: 'grma', aamName: 'Igla' } }),
    R('mi24f', 'Mi-24P Hind-F', 'URSS', 17.5, 8.65, 1.5, 1.6, 30, 335, 11.5, 11, 900, { fixed: true, gunSide: true, wing: 1.6, stats: { turn: 45, rock: 'S-8', atgmName: '9M114' } }),
    R('mi28ub', 'Mi-28UB (duplo comando)', 'Rússia', 17, 8.6, 1.15, 1.4, 30, 300, 11.5, 13, 900, { wing: 1.3, stats: { rock: 'S-8', atgmName: '9M120', aamName: 'Igla' } }),
    R('ka50n', 'Ka-50N Black Shark', 'Rússia', 16, 7.2, 1.7, 1.4, 30, 300, 10.4, 14, 850, { coax: true, side: false, fixed: true, gunSide: true, wing: 1.5, stats: { turn: 70, rock: 'S-8', atgmName: '9M127', aamName: 'Igla' } }),
    R('ka52k', 'Ka-52K Katran', 'Rússia', 16, 7.2, 1.7, 1.4, 30, 300, 10.8, 14, 850, { coax: true, side: true, fixed: true, gunSide: true, wing: 1.5, stats: { turn: 70, rock: 'S-8', atgmName: '9M127', aamName: 'Igla' } }),
    R('ka52a', 'Ka-52A Alligator (Egito)', 'Egito', 16, 7.2, 1.7, 1.4, 30, 300, 10.4, 14, 850, { coax: true, side: true, fixed: true, gunSide: true, wing: 1.5, stats: { turn: 70, rock: 'S-8', atgmName: '9M120' } }),
    R('ka60', 'Ka-60 Kasatka (armado)', 'Rússia', 15.6, 6.5, 1.8, 1.5, 7.62, 300, 6.5, 9, 450, W('gr', Object.assign({ side: true, wing: 0.6, rock: 'S-8' }))),
    R('mi4av', 'Mi-4AV', 'URSS', 16.8, 10.5, 1.9, 1.7, 12.7, 185, 7.2, 5, 450, W('gr', Object.assign({ side: true, wing: 0.7, rock: 'S-8' }))),
    R('mi171a2', 'Mi-171A2 (armado)', 'Rússia', 18.5, 10.7, 2.5, 1.9, 12.7, 280, 13, 9, 700, W('grm', Object.assign({ side: true, wing: 0.9, rock: 'S-8', atgmName: '9M120' }))),
    R('ansat', 'Ansat-2RC (armado)', 'Rússia', 11.5, 5.8, 1.7, 1.4, 7.62, 275, 3.3, 8, 320, W('gr', Object.assign({ side: true, wing: 0.5, rock: 'S-8' }, sk))),
    R('mi2urp', 'PZL Mi-2URP', 'Polônia', 11.9, 7.3, 1.5, 1.3, 7.62, 210, 3.0, 6, 330, W('grm', Object.assign({ side: true, wing: 0.7, atgmName: '9M114' }, sk))),
    R('mi2us', 'PZL Mi-2US', 'Polônia', 11.9, 7.3, 1.5, 1.3, 7.62, 210, 3.0, 6, 330, W('gr', Object.assign({ side: true, wing: 0.7, rock: 'S-8' }, sk))),
    R('w3pl', 'PZL W-3PL Głuszec', 'Polônia', 14.0, 7.8, 1.7, 1.5, 12.7, 260, 6.4, 8, 500, W('grm', Object.assign({ side: true, wing: 0.7, rock: 'S-8', atgmName: '9M114' }))),
    /* ---- Europa ---- */
    R('ec665uht', 'Eurocopter Tiger UHT', 'Alemanha', 14.1, 6.5, 0.95, 1.2, 30, 290, 6.6, 11, 700, { wing: 1.0, skids: true, stats: { atgmName: 'Spike' } }),
    R('tigerhcp', 'Eurocopter Tiger HCP', 'França', 14.1, 6.5, 0.95, 1.2, 30, 290, 6.6, 11, 700, { wing: 1.0, skids: true, stats: { atgmName: 'HOT' } }),
    R('as332', 'AS 332 Super Puma (armado)', 'França', 16.8, 7.8, 1.9, 1.6, 20, 275, 8.6, 8, 600, W('grm', Object.assign({ side: true, wing: 0.7, atgmName: 'HOT' }))),
    R('h225m', 'H225M Caracal', 'França', 16.8, 8.0, 1.9, 1.6, 12.7, 324, 11, 9, 650, W('grm', Object.assign({ side: true, wing: 0.8 }))),
    R('ec635', 'EC635 (armado)', 'França', 10.2, 5.2, 1.7, 1.4, 12.7, 258, 2.9, 8, 320, W('gr', Object.assign({ side: true, wing: 0.5 }, sk))),
    R('h135m', 'H135M', 'Alemanha', 10.2, 5.1, 1.7, 1.4, 12.7, 260, 2.9, 8, 320, W('gr', Object.assign({ side: true, wing: 0.5 }, sk))),
    R('sa330', 'SA 330 Puma (armado)', 'França', 14.1, 7.5, 1.8, 1.5, 20, 262, 7.4, 7, 550, W('gr', Object.assign({ side: true, wing: 0.7 }))),
    R('sa341f', 'SA 341F Gazelle (canhão)', 'França', 9.5, 5.25, 1.3, 1.2, 20, 270, 1.9, 8, 300, W('gr', Object.assign({ side: true, wing: 0.4 }, sk))),
    R('sa342l', 'SA 342L Gazelle (HOT)', 'França', 9.5, 5.25, 1.3, 1.2, 7.62, 265, 2.0, 8, 320, W('grm', Object.assign({ side: true, wing: 0.5, atgmName: 'HOT' }, sk))),
    R('sa316', 'SA 316 Alouette III (armada)', 'França', 10.0, 5.5, 1.5, 1.3, 7.62, 210, 2.2, 6, 280, W('gr', Object.assign({ side: true, wing: 0.4 }, sk))),
    R('lynx88', 'Westland Lynx Mk.88A', 'Alemanha', 12.1, 6.4, 1.6, 1.4, 20, 324, 5.4, 10, 450, W('grm', Object.assign({ side: true, wing: 0.7, atgmName: 'TOW' }, sk))),
    R('lynxha3', 'Westland Lynx HAS.3', 'Reino Unido', 12.1, 6.4, 1.6, 1.4, 20, 324, 5.3, 10, 450, W('gr', Object.assign({ side: true, wing: 0.7 }, sk))),
    R('aw101', 'AW101 Merlin (armado)', 'Reino Unido', 22.8, 9.3, 2.5, 2.0, 12.7, 309, 14.6, 8, 600, W('gr', Object.assign({ side: true, wing: 0.9 }))),
    R('aw139m', 'AW139M (armado)', 'Itália', 16.7, 6.9, 1.9, 1.6, 12.7, 306, 6.4, 9, 480, W('grm', Object.assign({ side: true, wing: 0.7 }))),
    R('aw109', 'AW109 Power (armado)', 'Itália', 11.4, 5.5, 1.5, 1.3, 7.62, 311, 3.0, 9, 320, W('gr', Object.assign({ side: true, wing: 0.5 }, sk))),
    R('a129i', 'A129 International', 'Itália', 12.3, 5.9, 0.9, 1.15, 20, 278, 4.6, 10, 650, { wing: 0.9, skids: true, stats: { atgmName: 'Spike' } }),
    R('bo105cbs', 'Bo 105 CBS', 'Alemanha', 8.8, 4.9, 1.4, 1.2, 12.7, 242, 2.4, 7, 320, W('grm', Object.assign({ side: true, wing: 0.6, atgmName: 'HOT' }, sk))),
    R('bk117', 'BK 117 (armado)', 'Alemanha', 9.9, 5.5, 1.6, 1.4, 12.7, 248, 3.5, 7, 330, W('gr', Object.assign({ side: true, wing: 0.5 }, sk))),
    R('iar330', 'IAR 330 SOCAT', 'Romênia', 14.1, 7.5, 1.8, 1.5, 20, 263, 7.4, 7, 520, W('grm', Object.assign({ side: true, wing: 0.7, atgmName: '9M114' }))),
    R('nh90n', 'NH90 NFH (armado)', 'França', 16.1, 8.2, 2.0, 1.7, 7.62, 300, 10.6, 9, 520, W('gr', Object.assign({ side: true, wing: 0.7 }))),
    R('seaking', 'Sea King HC.4 (armado)', 'Reino Unido', 17.0, 9.45, 2.0, 1.8, 7.62, 226, 9.5, 6, 450, W('gr', Object.assign({ side: true, wing: 0.7 }))),
    /* ---- Ásia ---- */
    R('oh1', 'Kawasaki OH-1 Ninja', 'Japão', 12.0, 5.8, 0.95, 1.1, 12.7, 278, 2.5, 10, 380, W('grma', Object.assign({ wing: 0.5 }, sk))),
    R('ah1sj', 'AH-1S Cobra (JGSDF)', 'Japão', 13.6, 6.7, 0.95, 1.2, 20, 227, 4.5, 8, 600, { wing: 0.9, skids: true, stats: { atgmName: 'TOW' } }),
    R('uh60ja', 'UH-60JA (armado)', 'Japão', 15.3, 8.2, 1.9, 1.6, 7.62, 270, 10, 9, 500, W('gr', Object.assign({ side: true, wing: 0.7 }))),
    R('kuh1', 'KAI KUH-1 Surion (armado)', 'Coreia do Sul', 15.0, 7.5, 1.9, 1.6, 12.7, 276, 8.7, 9, 520, W('grm', Object.assign({ side: true, wing: 0.7, atgmName: 'Spike' }))),
    R('lah', 'KAI LAH (armado leve)', 'Coreia do Sul', 12.5, 5.5, 1.1, 1.2, 20, 270, 4.9, 10, 560, { wing: 0.9, skids: true, stats: { atgmName: 'Spike', wp: 'grma' } }),
    R('z9g', 'Harbin Z-9G', 'China', 11.7, 5.9, 1.7, 1.4, 12.7, 260, 4.1, 8, 400, W('grm', Object.assign({ side: true, wing: 0.7, atgmName: 'HJ-10' }, sk))),
    R('z10k', 'Changhe Z-10K', 'China', 14.1, 6.0, 1.0, 1.25, 23, 270, 7, 11, 750, { wing: 1.1, stats: { atgmName: 'HJ-10', wp: 'grma' } }),
    R('z19e', 'Harbin Z-19E', 'China', 11.4, 5.7, 0.9, 1.1, 12.7, 260, 2.25, 9, 450, { wing: 0.5, skids: true, stats: { wp: 'grma', atgmName: 'HJ-10' } }),
    R('z20', 'Changhe Z-20 (armado)', 'China', 15.3, 8.0, 1.9, 1.6, 12.7, 296, 10, 9, 600, W('grm', Object.assign({ side: true, wing: 0.8, atgmName: 'HJ-10' }))),
    R('z8l', 'Changhe Z-8L (armado)', 'China', 23.0, 9.5, 2.2, 2.0, 12.7, 315, 13, 7, 550, W('gr', Object.assign({ side: true, wing: 0.7 }))),
    R('z11w', 'Changhe Z-11W', 'China', 10.0, 5.4, 1.3, 1.2, 12.7, 220, 2.2, 7, 300, W('grm', Object.assign({ side: true, wing: 0.5, atgmName: 'HJ-10' }, sk))),
    R('cheetah', 'HAL Cheetah (armado)', 'Índia', 10.2, 5.5, 1.4, 1.2, 7.62, 220, 2.2, 7, 300, W('gr', Object.assign({ side: true, wing: 0.5 }, sk))),
    R('chetak', 'HAL Chetak (armado)', 'Índia', 10.0, 5.5, 1.4, 1.2, 7.62, 210, 2.2, 6, 280, W('gr', Object.assign({ side: true, wing: 0.4 }, sk))),
    R('dhruv', 'HAL Dhruv Mk-III (armado)', 'Índia', 15.9, 6.7, 1.8, 1.5, 20, 285, 5.5, 9, 520, W('grm', Object.assign({ side: true, wing: 0.9, atgmName: 'Spike' }))),
    /* ---- Oriente Médio, África, Américas, Oceania ---- */
    R('t625', 'TAI T625 Gökbey (armado)', 'Turquia', 15.0, 7.4, 1.9, 1.6, 12.7, 280, 6.0, 9, 520, W('grm', Object.assign({ side: true, wing: 0.8, atgmName: 'UMTAS' }))),
    R('t129b', 'TAI T129B ATAK', 'Turquia', 12.5, 5.9, 0.95, 1.2, 20, 280, 5.0, 10, 720, { wing: 1.0, skids: true, stats: { atgmName: 'UMTAS', wp: 'grma' } }),
    R('tzefa', 'AH-1E Tzefa', 'Israel', 13.6, 6.7, 0.95, 1.2, 20, 227, 4.5, 8, 600, { wing: 0.9, skids: true, stats: { atgmName: 'TOW' } }),
    R('atalef', 'AS 565SA Atalef', 'Israel', 12.1, 5.9, 1.6, 1.4, 20, 270, 4.3, 9, 480, W('grm', Object.assign({ side: true, wing: 0.7, atgmName: 'Spike' }))),
    R('shahed285', 'Shahed 285', 'Irã', 9.0, 5.1, 1.2, 1.1, 7.62, 200, 1.5, 7, 280, W('gr', Object.assign({ side: true, wing: 0.4 }, sk))),
    R('toufan', 'Toufan II', 'Irã', 13.6, 6.7, 0.95, 1.2, 20, 220, 4.5, 8, 560, { wing: 0.9, skids: true, stats: { atgmName: 'TOW' } }),
    R('panha', 'Panha 2091', 'Irã', 10.0, 5.2, 1.3, 1.2, 7.62, 230, 2.0, 8, 300, W('gr', Object.assign({ side: true, wing: 0.5 }, sk))),
    R('oryx', 'Atlas Oryx (armado)', 'África do Sul', 15.4, 8.2, 1.9, 1.6, 20, 270, 7.0, 8, 540, W('gr', Object.assign({ side: true, wing: 0.7 }))),
    R('esquilo', 'HA-1 Esquilo (armado)', 'Brasil', 10.9, 5.35, 1.5, 1.3, 7.62, 287, 2.2, 8, 300, W('gr', Object.assign({ side: true, wing: 0.5 }, sk))),
    R('pantera', 'HM-1 Pantera K2', 'Brasil', 12.1, 5.95, 1.7, 1.4, 20, 270, 4.3, 9, 480, W('grm', Object.assign({ side: true, wing: 0.7, atgmName: 'Spike' }))),
    R('mrh90', 'MRH90 Taipan (armado)', 'Austrália', 16.1, 8.2, 2.0, 1.7, 7.62, 290, 10.6, 9, 520, W('gr', Object.assign({ side: true, wing: 0.7 }))),
  ];
  list.forEach(h => { if (h.cfg.paint == null) h.cfg.paint = 0x585c48; SB.HELIS.push(h); SB.TANK_PRESETS[h.id] = () => SB.buildHeli(h.id); SB.TANK_NAMES[h.id] = '🚁 ' + h.name + ' (' + h.nation + ')'; });
  if (SB.HELIS.length !== 125) console.warn('Há ' + SB.HELIS.length + ' helicópteros (esperado 125)');
})(window.SB);
