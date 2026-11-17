/* Aviões 31–125: caças, atacantes, furtivos, bombardeiros e aviões da 2ª Guerra (medidas aproximadas reais; velocidades em escala de jogo).
   Linha: [id, nome, nação, função, comprimento m, envergadura m, calibre mm, vmax, massa t, flags]
   funções: fjm caça moderno (radar ativo) · fj caça · fjo caça antigo · atk atacante · stl furtivo · bmb bombardeiro · ww2f / ww2b 2ª Guerra
   flags: t bimotor · T deriva dupla · c dois tripulantes · s furtivo · p motores em nacele · u blindagem do piloto · 4 quatro motores · j asa enflechada (bombardeiro a jato) */
(function (SB) {
  'use strict';
  const GUN = c => c >= 38 ? [181, 199] : c >= 28 ? [178, 195] : c >= 21 ? [177, 194] : c >= 16 ? [175, 191] : c >= 10 ? [174, 190] : [188, 187];
  const ROWS = [
    ['f14a', 'F-14A Tomcat', 'EUA', 'fj', 19.1, 14, 20, 580, 18, 'tTc'], ['f14d', 'F-14D Super Tomcat', 'EUA', 'fjm', 19.1, 14, 20, 590, 19, 'tTc'],
    ['f15c', 'F-15C Eagle', 'EUA', 'fjm', 19.4, 13.05, 20, 590, 13, 'tT'], ['f15a', 'F-15A Eagle', 'EUA', 'fj', 19.4, 13.05, 20, 580, 12.7, 'tT'],
    ['f15i', "F-15I Ra'am", 'Israel', 'atk', 19.4, 13.05, 20, 570, 20, 'tTc'], ['f16a', 'F-16A Fighting Falcon', 'EUA', 'fj', 15, 9.96, 20, 570, 9, ''],
    ['f16i', 'F-16I Sufa', 'Israel', 'fjm', 15, 9.96, 20, 570, 12, 'c'], ['f16v', 'F-16V Viper', 'EUA', 'fjm', 15, 9.96, 20, 570, 12, ''],
    ['fa18e', 'F/A-18E Super Hornet', 'EUA', 'fjm', 18.3, 13.6, 20, 570, 14, 'tTc'], ['fa18a', 'F/A-18A Hornet', 'EUA', 'fj', 17.1, 11.4, 20, 550, 10.4, 'tT'],
    ['f5e', 'F-5E Tiger II', 'EUA', 'fjo', 14.7, 8.1, 20, 500, 5, 't'], ['f5a', 'F-5A Freedom Fighter', 'EUA', 'fjo', 14.4, 7.7, 20, 470, 4.4, 't'],
    ['f104g', 'F-104G Starfighter', 'Alemanha', 'fjo', 16.7, 6.6, 20, 560, 6.5, ''], ['f100d', 'F-100D Super Sabre', 'EUA', 'fjo', 15, 11.8, 20, 470, 9.5, ''],
    ['f86f', 'F-86F Sabre', 'EUA', 'fjo', 11.4, 11.3, 12.7, 420, 5.5, ''], ['f8e', 'F-8E Crusader', 'EUA', 'fjo', 16.6, 10.7, 20, 520, 8, ''],
    ['f106a', 'F-106A Delta Dart', 'EUA', 'fj', 21.5, 11.7, 20, 560, 11, ''], ['f111f', 'F-111F Aardvark', 'EUA', 'atk', 22.4, 19, 20, 560, 23, 'tc'],
    ['a7e', 'A-7E Corsair II', 'EUA', 'atk', 14.1, 11.8, 20, 470, 9, ''], ['a6e', 'A-6E Intruder', 'EUA', 'atk', 16.6, 16.2, 7.62, 450, 15, 'tc'],
    ['a4e', 'A-4E Skyhawk', 'EUA', 'atk', 12.2, 8.4, 20, 440, 4.7, ''], ['av8a', 'AV-8A Harrier', 'EUA', 'atk', 13.9, 7.7, 25, 430, 6, ''],
    ['seaharrier', 'Sea Harrier FRS.1', 'Reino Unido', 'fjo', 14.5, 7.7, 30, 430, 6.4, ''], ['hunter', 'Hawker Hunter F.6', 'Reino Unido', 'fjo', 14, 10.3, 30, 440, 6, ''],
    ['lightning', 'English Electric Lightning F.6', 'Reino Unido', 'fj', 16.8, 10.6, 30, 540, 12, 't'], ['jaguar', 'SEPECAT Jaguar GR.1', 'Reino Unido', 'atk', 16.8, 8.7, 30, 470, 7.5, 't'],
    ['buccaneer', 'Blackburn Buccaneer S.2', 'Reino Unido', 'atk', 19.3, 13.4, 7.62, 430, 14, 'tc'], ['fgr2', 'Phantom FGR.2', 'Reino Unido', 'fj', 19.2, 11.7, 20, 540, 13, 'tc'],
    ['tornadof3', 'Tornado F3', 'Reino Unido', 'fj', 18.7, 13.9, 27, 520, 14, 'tc'],
    ['mirage3', 'Mirage III', 'França', 'fjo', 15, 8.2, 30, 540, 7, ''], ['mirage5', 'Mirage 5', 'França', 'atk', 15.5, 8.2, 30, 520, 7.5, ''],
    ['miragef1', 'Mirage F1CT', 'França', 'fj', 15.3, 8.4, 30, 520, 8, ''], ['superetendard', 'Super Étendard', 'França', 'atk', 14.3, 9.6, 30, 450, 8.5, ''],
    ['rafalem', 'Rafale M', 'França', 'fjm', 15.3, 10.9, 30, 560, 10, 't'], ['mig15', 'MiG-15bis', 'URSS', 'fjo', 11.1, 10.1, 23, 420, 3.8, ''],
    ['mig17', 'MiG-17F', 'URSS', 'fjo', 11.3, 9.6, 23, 430, 4, ''], ['mig19', 'MiG-19S', 'URSS', 'fjo', 12.5, 9, 30, 500, 5.2, 't'],
    ['mig21f', 'MiG-21F-13', 'URSS', 'fjo', 13.5, 7.15, 30, 480, 4.8, ''], ['mig21mf', 'MiG-21MF', 'URSS', 'fj', 14.5, 7.15, 23, 500, 5.4, ''],
    ['mig23', 'MiG-23MLD', 'URSS', 'fj', 16.7, 13, 23, 560, 12, ''], ['mig25', 'MiG-25PD', 'URSS', 'fj', 19.7, 14, 23, 590, 20, 'tT'],
    ['mig27', 'MiG-27K', 'URSS', 'atk', 17.1, 13, 30, 520, 13, ''], ['mig29smt', 'MiG-29SMT', 'Rússia', 'fjm', 17.4, 11.4, 30, 560, 12, 'tT'],
    ['mig29k', 'MiG-29K', 'Rússia', 'fjm', 17.3, 12, 30, 550, 13, 'tT'], ['mig31', 'MiG-31', 'Rússia', 'fj', 22.7, 13.5, 23, 590, 22, 'tTc'],
    ['mig35', 'MiG-35', 'Rússia', 'fjm', 17.3, 12, 30, 570, 13, 'tT'], ['su7', 'Su-7BMK', 'URSS', 'atk', 16.8, 9.3, 30, 500, 9, ''],
    ['su17', 'Su-17M4', 'URSS', 'atk', 19, 13.8, 30, 500, 13, ''], ['su24', 'Su-24M', 'URSS', 'atk', 24.6, 17.6, 23, 510, 24, 'tc'],
    ['su27sm', 'Su-27SM', 'Rússia', 'fjm', 21.9, 14.7, 30, 570, 17, 'tT'], ['su30sm', 'Su-30SM', 'Rússia', 'fjm', 21.9, 14.7, 30, 570, 18, 'tTc'],
    ['su33', 'Su-33', 'Rússia', 'fjm', 21.2, 14.7, 30, 560, 18, 'tT'], ['su35s', 'Su-35S', 'Rússia', 'fjm', 21.9, 15.3, 30, 590, 19, 'tT'],
    ['yak38', 'Yak-38', 'URSS', 'atk', 16.4, 7.3, 23, 400, 7.5, ''], ['yak141', 'Yak-141', 'URSS', 'fjm', 18.3, 10.1, 30, 540, 13, 'tT'],
    ['gripene', 'Saab JAS 39E Gripen', 'Suécia', 'fjm', 15.2, 8.6, 27, 560, 8.5, ''], ['viggen', 'Saab 37 Viggen', 'Suécia', 'atk', 16.4, 10.6, 30, 570, 12, ''],
    ['draken', 'Saab 35 Draken', 'Suécia', 'fjo', 15.4, 9.4, 30, 550, 8, ''], ['j7', 'Chengdu J-7', 'China', 'fjo', 14.9, 7.15, 30, 500, 5.3, ''],
    ['j10c', 'Chengdu J-10C', 'China', 'fjm', 16.4, 9.75, 23, 570, 10, ''], ['j11b', 'Shenyang J-11B', 'China', 'fjm', 21.9, 14.7, 30, 570, 17, 'tT'],
    ['j16', 'Shenyang J-16', 'China', 'atk', 21.9, 14.7, 30, 560, 19, 'tTc'], ['jf17', 'JF-17 Thunder', 'Paquistão', 'fj', 14.9, 9.45, 23, 540, 7, ''],
    ['j15', 'Shenyang J-15', 'China', 'fjm', 21.9, 14.7, 30, 550, 18, 'tT'], ['fa50', 'KAI FA-50', 'Coreia do Sul', 'atk', 13.1, 9.45, 20, 500, 6.5, ''],
    ['kfir', 'IAI Kfir C7', 'Israel', 'fj', 15.6, 8.2, 30, 550, 8, ''], ['f2a', 'Mitsubishi F-2A', 'Japão', 'fjm', 15.5, 10.8, 20, 560, 9.5, ''],
    ['f4ej', 'F-4EJ Kai', 'Japão', 'fj', 19.2, 11.7, 20, 540, 13, 'tc'], ['amx', 'AMX International', 'Itália', 'atk', 13.2, 8.9, 20, 450, 6.7, ''],
    ['tornadoecr', 'Tornado ECR', 'Alemanha', 'atk', 16.7, 13.9, 27, 490, 14, 'tc'], ['alphajet', 'Alpha Jet', 'Alemanha', 'atk', 13.2, 9.1, 27, 430, 4.6, 'tc'],
    ['l39za', 'L-39ZA Albatros', 'Tchéquia', 'atk', 12.1, 9.5, 23, 380, 4.7, 'c'], ['hawk200', 'BAE Hawk 200', 'Reino Unido', 'atk', 11.9, 9.4, 25, 420, 5.5, ''],
    ['a10a', 'A-10A Thunderbolt II', 'EUA', 'atk', 16.3, 17.5, 30, 420, 13.5, 'tTup'], ['su25k', 'Su-25K Frogfoot', 'URSS', 'atk', 15.5, 14.4, 30, 440, 14, 'tu'],
    ['f35b', 'F-35B Lightning II', 'EUA', 'stl', 15.6, 10.7, 20, 550, 14, ''], ['f35c', 'F-35C Lightning II', 'EUA', 'stl', 15.7, 13.1, 20, 550, 15, ''],
    ['j35', 'Shenyang J-35', 'China', 'stl', 17.3, 11.5, 30, 560, 16, 't'],
    ['tu160', 'Tu-160 Blackjack', 'Rússia', 'bmb', 54.1, 35, 23, 520, 110, 'tj'], ['tu16', 'Tu-16 Badger', 'URSS', 'bmb', 34.8, 32.9, 23, 430, 72, 'tj'],
    ['tu22', 'Tu-22 Blinder', 'URSS', 'bmb', 41.6, 23.6, 23, 510, 85, 'tj'], ['vulcan', 'Avro Vulcan B.2', 'Reino Unido', 'bmb', 30.5, 33.8, 7.62, 440, 77, 'tj'],
    ['victor', 'Handley Page Victor B.2', 'Reino Unido', 'bmb', 35, 36, 7.62, 440, 80, 'tj'], ['canberra', 'English Electric Canberra B.2', 'Reino Unido', 'bmb', 19.9, 19.5, 7.62, 430, 25, 't'],
    ['il28', 'Il-28 Beagle', 'URSS', 'bmb', 17.6, 21.5, 23, 420, 21, 't'], ['b21', 'B-21 Raider', 'EUA', 'bmb', 20, 45, 7.62, 420, 80, 'ts'],
    ['b29', 'B-29 Superfortress', 'EUA', 'ww2b', 30.2, 43.1, 12.7, 290, 60, '4'], ['b24', 'B-24 Liberator', 'EUA', 'ww2b', 20.5, 33.5, 12.7, 270, 29, '4'],
    ['halifax', 'Handley Page Halifax B.III', 'Reino Unido', 'ww2b', 21.8, 30.1, 7.62, 260, 29, '4'], ['b25h', 'B-25H Mitchell', 'EUA', 'ww2b', 16.1, 20.6, 12.7, 280, 19, 't'],
    ['p51d', 'P-51D Mustang', 'EUA', 'ww2f', 9.8, 11.3, 12.7, 300, 4.5, ''], ['p47d', 'P-47D Thunderbolt', 'EUA', 'ww2f', 11, 12.4, 12.7, 290, 7.9, ''],
    ['spit9', 'Spitfire Mk.IX', 'Reino Unido', 'ww2f', 9.5, 11.2, 20, 290, 3.4, ''], ['bf109g6', 'Bf 109G-6', 'Alemanha', 'ww2f', 8.9, 9.9, 20, 290, 3.1, ''],
    ['fw190a8', 'Fw 190A-8', 'Alemanha', 'ww2f', 8.8, 10.5, 20, 290, 4.3, ''],
  ];
  const DEF = { fjm: { turn: 56, climb: 28, rack: 2800, radar: [3600, 1], wyf: 0.45, sweep: 20 }, fj: { turn: 52, climb: 26, rack: 2800, radar: [2800, 1], wyf: 0.45, sweep: 22 }, fjo: { turn: 48, climb: 22, rack: 2200, wyf: 0.4, sweep: 30 },
    atk: { turn: 44, climb: 17, rack: 2800, wyf: 0.6, sweep: 15 }, stl: { turn: 54, climb: 27, rack: 2800, radar: [3800, 1], wyf: 0.4, sweep: 20 }, bmb: { turn: 17, climb: 8, rack: 12000, wyf: 0.6, sweep: 5, bomber: true },
    ww2f: { turn: 50, climb: 14, rack: 1200, wyf: 0.15, sweep: 0 }, ww2b: { turn: 20, climb: 7, rack: 7000, wyf: 0.6, sweep: 0, bomber: true } };
  const PAL = { 'EUA': [0x6a6f74, 0x5b6048, 0x7a7e84], 'Reino Unido': [0x62665a, 0x6a6f66, 0x4f5a42], 'URSS': [0x8a8e80, 0x5e6840, 0x7a8090], 'Rússia': [0x6a7480, 0x7a8090], 'França': [0x7a7e84, 0x6e7278], 'China': [0x5e6648, 0x6a7480], 'Alemanha': [0x62665a, 0x6a6a52], 'Israel': [0x6a6a50, 0x7a7e84] };
  function loadout(role, cal, mass, fl) {
    const g = GUN(cal), rot = (role === 'fjm' || role === 'fj' || role === 'stl') && cal === 20;
    const g1 = rot ? 176 : g[0], g2 = rot ? 193 : g[1];
    switch (role) {
      case 'fjm': return [[g1, 250], [g2, 150], [115, 4], [95, 2], [22, 2]];
      case 'fj': return [[g1, 250], [g2, 150], [108, 2], [97, 2], [4, 2]];
      case 'fjo': return [[g1, 200], [g2, 100], [94, 2], [2, 2], [67, 4]];
      case 'atk': return [[g1, 250], [g2, 150], [4, 6], [12, 2], [75, 8], [152, 2], [94, 2]];
      case 'stl': return [[g1, 250], [g2, 150], [115, 6], [95, 2], [22, 2]];
      case 'ww2f': return [[g1, 300], [g2, 150], [188, 150], [2, 2]];
      case 'ww2b': return mass > 50 ? [[189, 300], [4, 40], [2, 30], [8, 4]] : [[189, 300], [4, 20], [2, 16]];
      default: return mass > 70 ? [[188, 50], [10, 8], [8, 14], [4, 40]] : [[188, 50], [8, 6], [4, 20], [5, 10]];
    }
  }
  const list = ROWS.map(r => {
    const [id, name, nation, role, Lf, Ws, cal, vmax, mass, fl] = r, D = DEF[role], big = !!D.bomber;
    const cfg = Object.assign({ plane: true, Lf, Ws, Wf: big ? Math.max(2, Math.min(5, Lf * 0.09)) : Math.max(1.2, Math.min(2.6, Lf * 0.105)), Hf: big ? Math.max(2, Math.min(4, Lf * 0.08)) : Math.max(1.3, Math.min(2, Lf * 0.095)),
      cal, vmax, mass, turn: D.turn, climb: D.climb, rack: D.rack, wyf: D.wyf, sweep: fl.indexOf('j') >= 0 ? 28 : D.sweep, paint: (PAL[nation] || [0x6a6e66])[id.length % (PAL[nation] || [0]).length] }, big ? { bomber: true, rcs: mass > 70 ? 5 : 4 } : {});
    if (D.radar) cfg.radar = D.radar; else if (role === 'fjo' && vmax >= 480) cfg.radar = [1800, 0]; else if (role === 'atk' && fl.indexOf('c') >= 0) cfg.radar = [2000, 0];
    if (fl.indexOf('t') >= 0) cfg.twin2 = true; if (fl.indexOf('T') >= 0) cfg.twin = true; if (fl.indexOf('c') >= 0) cfg.crew2 = true; if (fl.indexOf('p') >= 0) cfg.engPod = true; if (fl.indexOf('u') >= 0) cfg.tub = true;
    if (fl.indexOf('4') >= 0) cfg.engN = 4; if (fl.indexOf('s') >= 0 || role === 'stl') { cfg.stealth = true; if (!cfg.radar && role === 'bmb') cfg.radar = [3000, 1]; }
    cfg.stats = { wtl: loadout(role, cal, mass, fl) };
    return { id: 'q_' + id, name, nation, cfg };
  });
  list.forEach(p => { SB.HELIS.push(p); SB.PLANES.push(p); SB.TANK_PRESETS[p.id] = () => SB.buildHeli(p.id); SB.TANK_NAMES[p.id] = '✈ ' + p.name + ' (' + p.nation + ')'; });
  if (SB.PLANES.length !== 125) console.warn('Há ' + SB.PLANES.length + ' aviões (esperado 125)');
})(window.SB);
