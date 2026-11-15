/* Tabela de tipos de munição (todas as siglas do PDF + extras de helicóptero).
   cls: KE cinética calibre pleno | KS subcalibre | HE explosiva | HT carga oca | MS míssil/guiada | RK foguete | AP antipessoal | SP especial | TR treino | AA ar-ar
   fam: motor de simulação (shot, rod, heat, he, hesh) | flags: tandem, efp, burst, fire, tb, mp, pellets, smoke, illum, sub, inert, guid, rocket */
(function (SB) {
  'use strict';
  const T = {};
  const add = (s, o) => { T[s] = Object.assign({ k: 1, norm: 0, ric: [64, 78], cls: 'KE', fam: 'shot' }, o); };
  /* ---- cinéticas de calibre pleno ---- */
  add('AP', { n: 'AP (perfurante sólido)', k: 1.0, norm: 0 });
  add('AP-T', { n: 'AP-T (perfurante traçante)', k: 1.0, norm: 0 });
  add('APC', { n: 'APC (com capuz)', k: 1.2, norm: 3, ric: [65, 78] });
  add('APBC', { n: 'APBC (com coifa)', k: 1.2, norm: 4, ric: [65, 79] });
  add('APCBC', { n: 'APCBC (capuz + coifa)', k: 1.4, norm: 5, ric: [66, 80] });
  add('APHE', { n: 'APHE (perfurante explosivo)', k: 1.1, norm: 4, ric: [65, 78] });
  add('APHEBC', { n: 'APHEBC (explosivo c/ coifa)', k: 1.3, norm: 5, ric: [66, 79] });
  add('APCBC-HE', { n: 'APCBC-HE (capuz+coifa+explosivo)', k: 1.4, norm: 5, ric: [66, 80] });
  add('SAP-HE', { n: 'SAP-HE (semi-perfurante)', k: 0.55, norm: 2, ric: [62, 76] });
  add('AP-I', { n: 'AP-I (perfurante incendiário)', k: 0.35, norm: 0, fire: 0.45 });
  /* ---- subcalibre ---- */
  add('APCR', { n: 'APCR (núcleo rígido / HVAP)', cls: 'KS', fam: 'rod', norm: 2, ric: [66, 80] });
  add('APCNR', { n: 'APCNR (calibre cônico)', cls: 'KS', fam: 'rod', norm: 2, ric: [66, 80] });
  add('APDS', { n: 'APDS (sabô descartável)', cls: 'KS', fam: 'rod', norm: 2, ric: [66, 80] });
  add('APFSDS-S', { n: 'APFSDS-S (flecha de aço)', cls: 'KS', fam: 'rod', norm: 0, ric: [70, 82] });
  add('APFSDS', { n: 'APFSDS (flecha de tungstênio)', cls: 'KS', fam: 'rod', norm: 0, ric: [70, 82] });
  add('APFSDS-DU', { n: 'APFSDS-DU (flecha de urânio)', cls: 'KS', fam: 'rod', norm: 0, ric: [70, 82], fire: 0.4 });
  add('APFSDS-AC', { n: 'APFSDS-AC (canhão automático)', cls: 'KS', fam: 'rod', norm: 0, ric: [70, 82] });
  /* ---- alto explosivo ---- */
  const he = { cls: 'HE', fam: 'he', ric: [82, 89] };
  add('HE', Object.assign({ n: 'HE (alto explosivo)' }, he));
  add('HE-FRAG', Object.assign({ n: 'HE-FRAG (fragmentação)', frag: 1.5 }, he));
  add('HE-FRAG-FS', Object.assign({ n: 'HE-FRAG-FS (c/ aletas)', frag: 1.5 }, he));
  add('HE-TF', Object.assign({ n: 'HE-TF (espoleta de tempo)', burst: 'time', frag: 1.3 }, he));
  add('HE-VT', Object.assign({ n: 'HE-VT (proximidade)', burst: 'prox', frag: 1.3 }, he));
  add('HE-ABM', Object.assign({ n: 'HE-ABM (programável)', burst: 'abm', frag: 1.3 }, he));
  add('HE-OR', Object.assign({ n: 'HE-OR (redução de obstáculos)', blast: 2.5, frag: 0.3 }, he));
  add('HEI', Object.assign({ n: 'HEI (explosivo incendiário)', fire: 0.5 }, he));
  add('HESH', { n: 'HESH (esmagamento / HEP)', cls: 'HE', fam: 'hesh', ric: [82, 89] });
  /* ---- carga oca ---- */
  const ht = { cls: 'HT', fam: 'heat', ric: [74, 84] };
  add('HEAT', Object.assign({ n: 'HEAT (carga oca)' }, ht));
  add('HEAT-FS', Object.assign({ n: 'HEAT-FS (c/ aletas)' }, ht));
  add('HEAT-G', Object.assign({ n: 'HEAT-G (desacoplada)' }, ht));
  add('HEAT-TDM', Object.assign({ n: 'HEAT-TDM (carga dupla)', tandem: true }, ht));
  add('HEAT-MP', Object.assign({ n: 'HEAT-MP (multiuso)', mp: true }, ht));
  /* ---- mísseis e guiadas ---- */
  const ms = { cls: 'MS', guid: 'sacls', ric: [76, 86] };
  add('ATGM', Object.assign({}, ms, { n: 'ATGM (míssil carga oca)', fam: 'heat' }));
  add('ATGM-TDM', Object.assign({}, ms, { n: 'ATGM-TDM (carga dupla)', fam: 'heat', tandem: true }));
  add('ATGM-TOP', Object.assign({}, ms, { n: 'ATGM-TOP (ataque mergulho)', fam: 'heat', tandem: true, guid: 'top' }));
  add('ATGM-EFP', Object.assign({}, ms, { n: 'ATGM-EFP (sobrevoo / EFP)', fam: 'heat', efp: true, guid: 'over' }));
  add('ATGM-MP', Object.assign({}, ms, { n: 'ATGM-MP (multiuso)', fam: 'heat', mp: true }));
  add('ATGM-HE', Object.assign({}, ms, { n: 'ATGM-HE (explosivo-frag.)', fam: 'he', frag: 1.4 }));
  add('ATGM-TB', Object.assign({}, ms, { n: 'ATGM-TB (termobárico)', fam: 'he', tb: 3, fire: 0.6 }));
  add('ATGM-PRX', Object.assign({}, ms, { n: 'ATGM-PRX (proximidade)', fam: 'he', burst: 'prox', frag: 1.4 }));
  add('ATGM-KE', Object.assign({}, ms, { n: 'ATGM-KE (míssil cinético)', fam: 'rod', norm: 0 }));
  add('TOP-ATK', Object.assign({}, ms, { n: 'TOP-ATK (inteligente, topo)', fam: 'heat', efp: true, guid: 'over' }));
  add('MRM', Object.assign({}, ms, { n: 'MRM (projétil guiado)', fam: 'heat', tandem: true }));
  /* ---- foguetes não guiados ---- */
  const rk = { cls: 'RK', rocket: true, ric: [80, 88] };
  add('RKT-HE', Object.assign({ n: 'RKT-HE (foguete-morteiro)', fam: 'he', blast: 1.5 }, rk));
  add('RKT-FRAG', Object.assign({ n: 'RKT-FRAG (explosivo-frag.)', fam: 'he', frag: 1.4 }, rk));
  add('RKT-DEM', Object.assign({ n: 'RKT-DEM (demolição)', fam: 'he', blast: 2 }, rk));
  add('RKT-HEAT', Object.assign({ n: 'RKT-HEAT (carga oca)', fam: 'heat' }, rk, { ric: [74, 84] }));
  add('RKT-TB', Object.assign({ n: 'RKT-TB (termobárico)', fam: 'he', tb: 3, fire: 0.6 }, rk));
  add('RKT-INC', Object.assign({ n: 'RKT-INC (incendiário)', fam: 'he', fire: 0.8 }, rk));
  add('RKT-SMK', Object.assign({ n: 'RKT-SMK (fumígeno)', fam: 'he', smoke: 1 }, rk));
  add('RKT-CL', Object.assign({ n: 'RKT-CL (submunições)', fam: 'he', burst: 'cluster', sub: 18 }, rk));
  add('RKT-MC', Object.assign({ n: 'RKT-MC (desminagem em linha)', fam: 'he', blast: 1 }, rk));
  /* ---- antipessoal ---- */
  add('CANISTER', { n: 'CANISTER (metralha)', cls: 'AP', fam: 'he', pellets: 1000, ric: [82, 89] });
  add('APERS-T', { n: 'APERS-T (flechetes / beehive)', cls: 'AP', fam: 'he', pellets: 5000, ric: [82, 89] });
  add('SHRAPNEL', { n: 'SHRAPNEL (granada de estilhaços)', cls: 'AP', fam: 'he', pellets: 250, burst: 'time', ric: [82, 89] });
  /* ---- especiais ---- */
  add('SMOKE', { n: 'SMOKE (fumígena)', cls: 'SP', fam: 'he', smoke: 1, ric: [82, 89] });
  add('WP', { n: 'WP (fósforo branco)', cls: 'SP', fam: 'he', smoke: 1, fire: 0.4, ric: [82, 89] });
  add('ILLUM', { n: 'ILLUM (iluminativa)', cls: 'SP', fam: 'he', illum: 1, ric: [82, 89] });
  add('FLAME', { n: 'FLAME (lança-chamas)', cls: 'SP', fam: 'he', fire: 0.9, ric: [82, 89] });
  /* ---- treino ---- */
  add('TP-T', { n: 'TP-T (treino traçante)', cls: 'TR', k: 0.15, inert: true });
  add('TPCSDS-T', { n: 'TPCSDS-T (treino subcalibre)', cls: 'TR', k: 0.2, inert: true });
  add('DUMMY', { n: 'DUMMY (inerte de manejo)', cls: 'TR', k: 0.05, inert: true });
  /* ---- extra de helicóptero: míssil ar-ar (só contra aeronaves) ---- */
  add('AAM', { n: 'AAM (míssil ar-ar infravermelho)', cls: 'AA', fam: 'he', guid: 'ir', burst: 'prox', frag: 1.5, ric: [85, 89] });
  SB.TYPE = T;
  /* classe de arma: 'gun' | 'rocket' | 'missile' | 'aam' */
  SB.wcls = a => { const t = T[a.type] || T.AP; return t.cls === 'RK' ? 'rocket' : t.cls === 'MS' ? 'missile' : t.cls === 'AA' ? 'aam' : 'gun'; };
  SB.CLS_NAMES = { KE: 'Cinética (calibre pleno)', KS: 'Cinética (subcalibre)', HE: 'Alto explosivo', HT: 'Carga oca', MS: 'Mísseis e guiadas', RK: 'Foguetes não guiados', AP: 'Antipessoal', SP: 'Especial', TR: 'Treino', AA: 'Ar-ar' };
})(window.SB);
