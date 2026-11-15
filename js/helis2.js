/* Helicópteros 11–50: ataque, armados leves, utilitários armados e de reconhecimento (medidas aproximadas reais) */
(function (SB) {
  'use strict';
  const H = (id, nm, na, cfg) => ({ id, name: nm, nation: na, cfg });
  const RU = { rock: 'S-8KOM', atgmName: '9M114', aamName: 'Igla' };
  const list = [
    /* ---- Estados Unidos (14) ---- */
    H('ah64a', 'AH-64A Apache', 'EUA', { Lf: 14.7, R: 7.3, Wf: 1.1, Hf: 1.3, cal: 30, vmax: 293, mass: 6.7, climb: 12, rack: 800, paint: 0x4a4d45, wing: 0.95 }),
    H('ah64d', 'AH-64D Longbow Apache', 'EUA', { Lf: 14.9, R: 7.3, Wf: 1.1, Hf: 1.3, cal: 30, vmax: 279, mass: 7.5, climb: 12, rack: 800, paint: 0x474a43, wing: 0.95, stats: { atgmName: 'AGM-114L' } }),
    H('ah1w', 'AH-1W Super Cobra', 'EUA', { Lf: 14.1, R: 7.3, Wf: 0.95, Hf: 1.2, cal: 20, vmax: 282, mass: 6.7, climb: 11, rack: 700, paint: 0x5a5f4c, wing: 1.0, skids: true }),
    H('ah1s', 'AH-1S Cobra', 'EUA', { Lf: 13.6, R: 6.7, Wf: 0.95, Hf: 1.2, cal: 20, vmax: 227, mass: 4.5, climb: 9, rack: 600, paint: 0x5d624e, wing: 0.9, skids: true }),
    H('ah1g', 'AH-1G HueyCobra', 'EUA', { Lf: 13.6, R: 6.7, Wf: 0.9, Hf: 1.15, cal: 40, vmax: 277, mass: 2.9, climb: 8, rack: 500, paint: 0x5f654f, wing: 0.8, skids: true, stats: { wp: 'gr' } }),
    H('oh58d', 'OH-58D Kiowa Warrior', 'EUA', { Lf: 10.5, R: 5.2, Wf: 1.05, Hf: 1.2, cal: 12.7, vmax: 237, mass: 2.5, climb: 8, rack: 380, side: true, skids: true, wing: 0.5, paint: 0x555a47, stats: { wp: 'grma' } }),
    H('ah6m', 'AH-6M Little Bird', 'EUA', { Lf: 9.3, R: 4.2, Wf: 1.0, Hf: 1.1, cal: 7.62, vmax: 282, mass: 1.4, climb: 9, rack: 300, side: true, skids: true, wing: 0.4, paint: 0x3f4439, stats: { wp: 'gr' } }),
    H('uh1y', 'UH-1Y Venom', 'EUA', { Lf: 14.5, R: 7.3, Wf: 1.8, Hf: 1.5, cal: 7.62, vmax: 280, mass: 8.4, climb: 10, rack: 450, side: true, skids: true, wing: 0.6, paint: 0x5b6048, stats: { wp: 'gr' } }),
    H('mh60l', 'MH-60L DAP Black Hawk', 'EUA', { Lf: 15.3, R: 8.2, Wf: 1.9, Hf: 1.6, cal: 30, vmax: 295, mass: 10, climb: 11, rack: 800, side: true, wing: 1.0, paint: 0x3d4238, stats: { wp: 'grm' } }),
    H('ch47', 'MH-47G Chinook (armado)', 'EUA', { Lf: 15.5, R: 9.1, Wf: 2.3, Hf: 2.0, cal: 7.62, vmax: 315, mass: 22, climb: 8, rack: 500, side: true, tandemRot: true, cabinEnd: 0.5, tail: 0.08, wing: 0, paint: 0x4a4f40, stats: { wp: 'gr' } }),
    H('md500', 'MD 500 Defender', 'EUA', { Lf: 7.5, R: 4.0, Wf: 1.1, Hf: 1.1, cal: 7.62, vmax: 241, mass: 1.4, climb: 8, rack: 280, side: true, skids: true, wing: 0.3, paint: 0x5c614c, stats: { wp: 'gr' } }),
    H('md530f', 'MD 530F Cayuse Warrior', 'EUA', { Lf: 7.6, R: 4.1, Wf: 1.1, Hf: 1.1, cal: 12.7, vmax: 241, mass: 1.6, climb: 8, rack: 300, side: true, skids: true, wing: 0.35, paint: 0x5a5f4a, stats: { wp: 'gr' } }),
    H('rah66', 'RAH-66 Comanche', 'EUA', { Lf: 14.3, R: 5.5, Wf: 0.9, Hf: 1.1, cal: 20, vmax: 324, mass: 4.2, climb: 13, rack: 600, wing: 0.8, paint: 0x4c5148 }),
    H('uh1h', 'UH-1H Huey (armada)', 'EUA', { Lf: 12.8, R: 7.2, Wf: 1.8, Hf: 1.5, cal: 7.62, vmax: 204, mass: 2.6, climb: 7, rack: 400, side: true, skids: true, wing: 0.4, paint: 0x636a4e, stats: { wp: 'gr' } }),
    /* ---- Rússia / URSS (12) ---- */
    H('mi8mtv', 'Mi-8MTV-5 (armado)', 'Rússia', { Lf: 18.2, R: 10.7, Wf: 2.2, Hf: 1.9, cal: 12.7, vmax: 250, mass: 13, climb: 8, rack: 600, side: true, wing: 1.3, paint: 0x4f5c3d, stats: Object.assign({ wp: 'grm' }, RU) }),
    H('mi17', 'Mi-17V-5', 'Rússia', { Lf: 18.4, R: 10.7, Wf: 2.2, Hf: 1.9, cal: 7.62, vmax: 250, mass: 13, climb: 8, rack: 500, side: true, wing: 1.2, paint: 0x566340, stats: Object.assign({ wp: 'gr' }, RU) }),
    H('mi24v', 'Mi-24V Hind-E', 'URSS', { Lf: 17.5, R: 8.65, Wf: 1.5, Hf: 1.6, cal: 12.7, vmax: 335, mass: 11.5, climb: 11, rack: 900, wing: 1.6, paint: 0x5e6840, stats: Object.assign({ turn: 45 }, RU) }),
    H('mi24d', 'Mi-24D Hind-D', 'URSS', { Lf: 17.5, R: 8.65, Wf: 1.5, Hf: 1.6, cal: 12.7, vmax: 320, mass: 11.2, climb: 10, rack: 850, wing: 1.6, paint: 0x5a6440, stats: Object.assign({ turn: 45 }, RU) }),
    H('mi24vp', 'Mi-24VP', 'Rússia', { Lf: 17.5, R: 8.65, Wf: 1.5, Hf: 1.6, cal: 23, vmax: 335, mass: 11.5, climb: 11, rack: 900, wing: 1.6, paint: 0x536140, stats: Object.assign({ turn: 45 }, RU, { atgmName: '9M120' }) }),
    H('mi35m', 'Mi-35M', 'Rússia', { Lf: 17.5, R: 8.65, Wf: 1.5, Hf: 1.6, cal: 23, vmax: 300, mass: 11.5, climb: 11, rack: 900, wing: 1.6, paint: 0x4a5a3c, stats: Object.assign({ turn: 45 }, RU, { atgmName: '9M120' }) }),
    H('mi35p', 'Mi-35P', 'Rússia', { Lf: 17.5, R: 8.65, Wf: 1.5, Hf: 1.6, cal: 30, vmax: 300, mass: 11.5, climb: 11, rack: 900, fixed: true, gunSide: true, wing: 1.6, paint: 0x4d5c3e, stats: Object.assign({ turn: 45 }, RU, { atgmName: '9M120' }) }),
    H('mi28n', 'Mi-28N Night Hunter', 'Rússia', { Lf: 17, R: 8.6, Wf: 1.15, Hf: 1.4, cal: 30, vmax: 300, mass: 11.5, climb: 13, rack: 900, wing: 1.3, paint: 0x4b583b, stats: Object.assign({}, RU, { atgmName: '9M120' }) }),
    H('ka50', 'Ka-50 Black Shark', 'Rússia', { Lf: 16, R: 7.3, Wf: 1.2, Hf: 1.4, cal: 30, vmax: 300, mass: 9.8, climb: 14, rack: 800, coax: true, side: true, fixed: true, gunSide: true, wing: 1.4, paint: 0x676d4d, stats: Object.assign({ turn: 70 }, RU, { atgmName: '9M120' }) }),
    H('ka52m', 'Ka-52M Alligator', 'Rússia', { Lf: 16, R: 7.2, Wf: 1.7, Hf: 1.4, cal: 30, vmax: 300, mass: 10.4, climb: 14, rack: 850, coax: true, side: true, fixed: true, gunSide: true, wing: 1.5, paint: 0x5f6648, stats: Object.assign({ turn: 70 }, RU, { atgmName: '9M120' }) }),
    H('ka29', 'Ka-29 Helix-B', 'URSS', { Lf: 11.3, R: 7.9, Wf: 1.8, Hf: 1.6, cal: 7.62, vmax: 250, mass: 11.6, climb: 9, rack: 500, coax: true, side: true, wing: 0.8, paint: 0x566a48, stats: Object.assign({ wp: 'grm', turn: 60 }, RU) }),
    H('mi171sh', 'Mi-171Sh Storm', 'Rússia', { Lf: 18.4, R: 10.7, Wf: 2.2, Hf: 1.9, cal: 12.7, vmax: 250, mass: 13, climb: 8, rack: 650, side: true, wing: 1.4, paint: 0x4f5c3e, stats: Object.assign({ wp: 'grm' }, RU) }),
    /* ---- Europa e outros ocidentais (9) ---- */
    H('tigerhap', 'Eurocopter Tiger HAP', 'França', { Lf: 14.1, R: 6.5, Wf: 0.95, Hf: 1.2, cal: 30, vmax: 290, mass: 6.1, climb: 11, rack: 650, wing: 1.0, skids: true, paint: 0x5d5f46, stats: { wp: 'grma', atgmName: 'Brimstone' } }),
    H('tigerarh', 'Tiger ARH', 'Austrália', { Lf: 14.1, R: 6.5, Wf: 0.95, Hf: 1.2, cal: 30, vmax: 290, mass: 6.6, climb: 11, rack: 700, wing: 1.0, skids: true, paint: 0x5c5d48, stats: { atgmName: 'Spike-ER' } }),
    H('nh90', 'NH90 TTH (armado)', 'Europa', { Lf: 16, R: 8.2, Wf: 2.0, Hf: 1.7, cal: 7.62, vmax: 300, mass: 10.6, climb: 9, rack: 450, side: true, wing: 0.6, paint: 0x4b5143, stats: { wp: 'gr' } }),
    H('h145m', 'H145M HForce', 'Alemanha', { Lf: 11.3, R: 5.4, Wf: 1.7, Hf: 1.5, cal: 12.7, vmax: 268, mass: 3.7, climb: 9, rack: 350, side: true, skids: true, wing: 0.5, paint: 0x50563f, stats: { wp: 'gr' } }),
    H('aw159', 'AW159 Wildcat', 'Reino Unido', { Lf: 13, R: 6.4, Wf: 1.8, Hf: 1.5, cal: 12.7, vmax: 291, mass: 6, climb: 10, rack: 500, side: true, wing: 0.5, paint: 0x4a5047, stats: { wp: 'grm', atgmName: 'Brimstone' } }),
    H('lynxah7', 'Westland Lynx AH.7', 'Reino Unido', { Lf: 13.4, R: 6.4, Wf: 1.7, Hf: 1.4, cal: 12.7, vmax: 259, mass: 4.5, climb: 10, rack: 450, side: true, wing: 0.5, paint: 0x5a5f47, stats: { wp: 'grm', atgmName: 'Spike-ER' } }),
    H('gazelle', 'SA 342M Gazelle (HOT)', 'França', { Lf: 11.9, R: 5.25, Wf: 1.2, Hf: 1.2, cal: 7.62, vmax: 270, mass: 1.9, climb: 9, rack: 320, side: true, skids: true, wing: 0.4, paint: 0x636a4d, stats: { wp: 'grm', atgmName: '9M114' } }),
    H('bo105', 'Bo 105 PAH-1', 'Alemanha', { Lf: 8.8, R: 4.9, Wf: 1.3, Hf: 1.2, cal: 7.62, vmax: 242, mass: 2.5, climb: 8, rack: 300, side: true, skids: true, wing: 0.5, paint: 0x565c46, stats: { wp: 'grm', atgmName: '9M114' } }),
    H('as565', 'Eurocopter AS 565 Panther', 'França', { Lf: 12.1, R: 5.9, Wf: 1.7, Hf: 1.4, cal: 20, vmax: 296, mass: 4.3, climb: 9, rack: 450, side: true, wing: 0.5, paint: 0x4e5445, stats: { wp: 'grm' } }),
    /* ---- China e Índia (5) ---- */
    H('z19', 'Harbin WZ-19', 'China', { Lf: 11.4, R: 5.7, Wf: 0.9, Hf: 1.1, cal: 12.7, vmax: 260, mass: 2.25, climb: 9, rack: 450, wing: 0.5, skids: true, paint: 0x5e6648, stats: { wp: 'grma', atgmName: 'HJ-10' } }),
    H('z10me', 'Changhe Z-10ME', 'China', { Lf: 14.1, R: 6.0, Wf: 1.0, Hf: 1.25, cal: 23, vmax: 270, mass: 7, climb: 11, rack: 750, wing: 1.1, paint: 0x5b6246, stats: { atgmName: 'HJ-10' } }),
    H('z9wa', 'Harbin Z-9WA', 'China', { Lf: 11.7, R: 5.9, Wf: 1.7, Hf: 1.4, cal: 12.7, vmax: 255, mass: 4.1, climb: 8, rack: 400, side: true, wing: 0.7, skids: true, paint: 0x5a6246, stats: { wp: 'grm', atgmName: 'HJ-10' } }),
    H('rudra', 'HAL Rudra', 'Índia', { Lf: 15.9, R: 6.7, Wf: 1.8, Hf: 1.5, cal: 20, vmax: 280, mass: 5.5, climb: 9, rack: 500, side: true, wing: 0.9, paint: 0x6a6f4c, stats: { wp: 'grma', atgmName: 'Spike-ER' } }),
    H('lch', 'HAL LCH Prachand', 'Índia', { Lf: 15.8, R: 6.6, Wf: 0.95, Hf: 1.2, cal: 20, vmax: 330, mass: 5.8, climb: 12, rack: 600, wing: 0.9, skids: true, paint: 0x646a49, stats: { atgmName: 'Spike-ER' } }),
  ];
  list.forEach(h => { SB.HELIS.push(h); SB.TANK_PRESETS[h.id] = () => SB.buildHeli(h.id); SB.TANK_NAMES[h.id] = '🚁 ' + h.name + ' (' + h.nation + ')'; });
  if (SB.HELIS.length !== 50) console.warn('Há ' + SB.HELIS.length + ' helicópteros (esperado 50)');
})(window.SB);
