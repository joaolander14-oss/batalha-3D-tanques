/* Estilo visual de cada tipo de munição: traçante, rastro, modelo do míssil/foguete, fogo da boca do cano e efeito de impacto */
(function (SB) {
  'use strict';
  const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
  const rr = a => (Math.random() - 0.5) * a;
  const SM = (c, gap, size, grow, life, op) => ({ k: 'smoke', c, gap, size, grow, life, op, add: false, rise: 0.4 });
  const FR = (c, gap, size, grow, life, op) => ({ k: 'fire', c, gap, size, grow, life, op, add: true, rise: 0.8 });
  const SP = (c, gap) => ({ k: 'spark', c, gap, size: 0.22, grow: -0.1, life: 0.28, op: 1, add: true, rise: 0 });
  /* core: cor do traçante, len/w: tamanho, glow/gcol: halo | trail | muzzle | impact | body (streak|missile|rocket) */
  const S = {};
  const put = (keys, o) => keys.split(' ').forEach(k => { S[k] = Object.assign({ body: 'streak', muzzle: 'tank', impact: 'metal', len: 3, w: 0.06, glow: 1.2, core: 0xffe9b0, gcol: 0xffd890, trail: null }, o); });
  /* ---- cinéticas ---- */
  put('AP', { core: 0xffe9b0, len: 2.4, w: 0.05, glow: 0.9 });
  put('AP-T', { core: 0xff3322, gcol: 0xff4422, len: 6, w: 0.07, glow: 2.4, trail: FR(0xff3a22, 3, 0.5, 0.2, 0.35, 0.6) });
  put('APC APBC APCBC', { core: 0xfff2c0, len: 3.2, w: 0.06, glow: 1.2 });
  put('APHE APHEBC APCBC-HE SAP-HE', { core: 0xffa040, gcol: 0xff9030, len: 3.4, w: 0.07, glow: 1.6, impact: 'apHE' });
  put('AP-I', { core: 0xffffff, gcol: 0xffe060, len: 3, w: 0.04, glow: 1.9, trail: SP(0xffe9a0, 4), impact: 'inc', muzzle: 'auto' });
  put('APCR APCNR', { core: 0xe0f4ff, gcol: 0xb0d8ff, len: 4, w: 0.04, glow: 1.4, muzzle: 'sabot' });
  put('APDS', { core: 0xbfe6ff, gcol: 0x9fd0ff, len: 5, w: 0.035, glow: 1.7, muzzle: 'sabot', trail: SM(0xcfe0ff, 8, 0.3, 1, 0.5, 0.3) });
  put('APFSDS-S', { core: 0xcfe9ff, gcol: 0xa0d0ff, len: 6.5, w: 0.03, glow: 1.9, muzzle: 'sabot', trail: SM(0xd0e4ff, 8, 0.3, 1, 0.5, 0.28) });
  put('APFSDS', { core: 0xeaf8ff, gcol: 0x9fd8ff, len: 9, w: 0.028, glow: 2.2, muzzle: 'sabot', trail: SM(0xdcf0ff, 8, 0.3, 1.1, 0.55, 0.3) });
  put('APFSDS-DU', { core: 0xffd2a0, gcol: 0xff9040, len: 9, w: 0.03, glow: 2.4, muzzle: 'sabot', impact: 'pyro', trail: FR(0xff8a40, 4, 0.4, 0.3, 0.4, 0.5) });
  put('APFSDS-AC', { core: 0xd0eaff, gcol: 0x90c8ff, len: 4, w: 0.02, glow: 1.2, muzzle: 'auto' });
  /* ---- alto explosivo ---- */
  put('HE', { core: 0xffd060, gcol: 0xffa030, len: 3.5, w: 0.1, glow: 1.8, trail: SM(0x9a9a9a, 6, 0.6, 2, 1.0, 0.35), impact: 'explosion' });
  put('HE-FRAG HE-FRAG-FS', { core: 0xffb050, gcol: 0xff8a30, len: 3.6, w: 0.1, glow: 1.9, trail: SM(0x9a9a9a, 6, 0.6, 2, 1.0, 0.35), impact: 'explosion' });
  put('HE-TF HE-ABM SHRAPNEL', { core: 0xb8ff60, gcol: 0x90ff40, len: 3.6, w: 0.09, glow: 2.0, impact: 'airburst', trail: SP(0xc0ff80, 5) });
  put('HE-VT', { core: 0x80ff90, gcol: 0x40ff70, len: 3.6, w: 0.09, glow: 2.2, impact: 'airburst', trail: SP(0x90ffb0, 5) });
  put('HE-OR', { core: 0xff7a30, gcol: 0xff5a10, len: 3, w: 0.14, glow: 2.2, impact: 'shock', trail: SM(0x666666, 6, 0.8, 2.5, 1.1, 0.4) });
  put('HEI', { core: 0xff8a2a, gcol: 0xff6a10, len: 3.6, w: 0.05, glow: 1.6, impact: 'inc', muzzle: 'auto', trail: SP(0xffa040, 5) });
  put('HESH', { core: 0xd07040, gcol: 0xc05020, len: 2.8, w: 0.12, glow: 1.6, impact: 'shock' });
  /* ---- carga oca ---- */
  put('HEAT', { core: 0xe0ff60, gcol: 0xc0ff30, len: 3, w: 0.1, glow: 1.7, impact: 'jet' });
  put('HEAT-FS', { core: 0xffffff, gcol: 0xa0ff80, len: 4.4, w: 0.06, glow: 2.1, impact: 'jet', trail: SM(0xe8ffe0, 7, 0.3, 1, 0.5, 0.25) });
  put('HEAT-G', { core: 0xfff080, gcol: 0xffe050, len: 3.6, w: 0.08, glow: 1.8, impact: 'jet' });
  put('HEAT-TDM', { core: 0xffffff, gcol: 0x80e0ff, len: 4.4, w: 0.07, glow: 2.6, impact: 'jet' });
  put('HEAT-MP', { core: 0xffc040, gcol: 0xffa020, len: 3.4, w: 0.07, glow: 1.9, impact: 'jet', muzzle: 'auto' });
  /* ---- mísseis (modelo 3D + chama + rastro grosso) ---- */
  const MS = (o) => Object.assign({ body: 'missile', muzzle: 'atgm', impact: 'jet', glow: 4, gcol: 0xffc060, trail: SM(0xf2f2f2, 4, 0.9, 3, 2.2, 0.55), bc: 0xd8d8d0, nc: 0x555555, flame: 0xffa030 }, o);
  put('ATGM ATGM-TDM', MS({}));
  put('ATGM-TOP', MS({ bc: 0xbfd8ff, nc: 0x2a4a80, trail: SM(0xc8e0ff, 4, 0.9, 3, 2.2, 0.55) }));
  put('ATGM-EFP TOP-ATK', MS({ bc: 0x6a7a50, nc: 0x333b28, trail: FR(0xff9a40, 3, 0.7, 0.8, 0.7, 0.55), impact: 'efp' }));
  put('ATGM-MP', MS({ bc: 0xb8b890, nc: 0xd0a020 }));
  put('ATGM-HE ATGM-PRX', MS({ bc: 0xc8c8c0, nc: 0xcc3322, impact: 'explosion' }));
  put('ATGM-TB', MS({ bc: 0xd09060, nc: 0x802010, trail: SM(0x555555, 4, 1.2, 4, 2.4, 0.6), gcol: 0xff7030, impact: 'tb' }));
  put('ATGM-KE', MS({ bc: 0x333333, nc: 0x888888, flame: 0xfff0c0, glow: 6, trail: SM(0xffffff, 3, 0.7, 2, 1.4, 0.5), impact: 'metal' }));
  put('MRM', MS({ bc: 0x8a8a70, nc: 0x333333, trail: SM(0xdddddd, 5, 0.7, 2, 1.5, 0.5) }));
  put('AAM', MS({ bc: 0xffffff, nc: 0xcccccc, flame: 0xffe090, glow: 5, trail: SM(0xffffff, 3, 1.2, 4, 2.8, 0.65), impact: 'airburst' }));
  /* ---- foguetes não guiados ---- */
  const RK = (o) => Object.assign({ body: 'rocket', muzzle: 'rocket', impact: 'explosion', glow: 5, gcol: 0xffa040, trail: SM(0x8a8a8a, 4, 1.1, 3.5, 2.0, 0.5), bc: 0x6a6e48, nc: 0x333333, flame: 0xff9a30 }, o);
  put('ATGM-PEN', MS({ bc: 0x6a6e5a, nc: 0xcc3322, impact: 'shock' }));
  put('RKT-AP', RK({ bc: 0x55584a, trail: SM(0x909090, 4, 1, 3, 1.8, 0.45), impact: 'metal' }));
  put('RKT-HESH', RK({ bc: 0x6a6a4a, impact: 'shock', trail: SM(0x808080, 4, 1.4, 4, 2.2, 0.5) }));
  const BM = o => Object.assign({ body: 'bomb', bc: 0x4a5040, nc: 0xb0a060, glow: 0, len: 3, trail: null, impact: 'explosion' }, o);
  put('BOMB-HE', BM({ impact: 'shock' })); put('BOMB-FRAG', BM({ impact: 'airburst', nc: 0xaaaaaa })); put('BOMB-INC', BM({ bc: 0x7a3a2a, impact: 'inc' }));
  put('BOMB-CLU', BM({ bc: 0x7a6a9a, impact: 'cluster' })); put('BOMB-PEN', BM({ bc: 0x303430, nc: 0xcc3322, impact: 'shock' })); put('BOMB-WP', BM({ bc: 0xdddddd, impact: 'smoke' }));
  put('BOMB-HEAT', BM({ bc: 0x5a604a, impact: 'jet' })); put('BOMB-AP', BM({ bc: 0x2a2c2a, impact: 'apHE' })); put('TORP', BM({ bc: 0x384048, nc: 0xe0e0e0, impact: 'shock' }));
  put('RKT-HE', RK({ trail: SM(0x707070, 4, 1.6, 5, 2.6, 0.55) }));
  put('RKT-FRAG', RK({}));
  put('RKT-DEM', RK({ bc: 0x45493a, impact: 'shock', trail: SM(0x606060, 4, 1.4, 4.5, 2.4, 0.55) }));
  put('RKT-HEAT', RK({ impact: 'jet', trail: SM(0xaaaaaa, 4, 0.9, 3, 1.8, 0.45) }));
  put('RKT-TB', RK({ bc: 0x7a3a2a, flame: 0xff6020, trail: FR(0xff7030, 3, 1.4, 2, 1.0, 0.5), impact: 'tb' }));
  put('RKT-INC', RK({ trail: SP(0xff9a40, 3), impact: 'inc' }));
  put('RKT-SMK', RK({ bc: 0xdddddd, trail: SM(0xffffff, 4, 1.3, 4, 2.6, 0.6), impact: 'smoke' }));
  put('RKT-CL', RK({ bc: 0x7a6a9a, trail: SM(0xe8e0f8, 4, 1.1, 3.5, 2.2, 0.55), impact: 'cluster' }));
  put('RKT-MC', RK({ bc: 0x4a4a4a, trail: SM(0x555555, 3, 1.8, 6, 3, 0.6), impact: 'shock' }));
  /* ---- antipessoal, especiais, treino ---- */
  put('CANISTER APERS-T', { core: 0xcccccc, gcol: 0xdddddd, len: 2.5, w: 0.09, glow: 1.3, muzzle: 'canister', impact: 'flak' });
  put('SMOKE', { core: 0xffffff, gcol: 0xffffff, len: 3, w: 0.1, glow: 1.4, trail: SM(0xf0f0f0, 5, 0.7, 2.5, 1.6, 0.5), impact: 'smoke' });
  put('WP', { core: 0xfff8e0, gcol: 0xfff0c0, len: 3, w: 0.1, glow: 2.2, trail: SP(0xfff4d0, 3), impact: 'smoke' });
  put('ILLUM', { core: 0xfff2a0, gcol: 0xffe880, len: 3, w: 0.12, glow: 6, trail: FR(0xffe070, 3, 0.8, 0.5, 0.7, 0.6), impact: 'smoke' });
  put('FLAME', { core: 0xff8a30, gcol: 0xff6a10, len: 6, w: 0.25, glow: 4, trail: FR(0xff7a20, 1.5, 1.3, 1.5, 0.6, 0.6), muzzle: 'flame', impact: 'inc' });
  put('TP-T', { core: 0xff5522, gcol: 0xffffff, len: 4, w: 0.06, glow: 1.6, impact: 'dust' });
  put('TPCSDS-T', { core: 0xffaa88, gcol: 0xffffff, len: 5, w: 0.04, glow: 1.4, muzzle: 'sabot', impact: 'dust' });
  put('DUMMY', { core: 0x888888, gcol: 0x888888, len: 2.2, w: 0.09, glow: 0.4, impact: 'dust' });

  const style = A => S[A.sym || A.type] || S.AP;

  /* ---- modelo do projétil ---- */
  function glowSprite(color, size) { return SB.FX.sprite(color, size, true); }
  function make(A) {
    const st = style(A);
    if (st.body === 'bomb') {                                  // bomba: corpo gordo + ogiva + aletas, sem chama
      const r = Math.max(0.12, Math.min(0.5, A.d / 1000 * 0.5)), bl = Math.max(0.9, Math.min(5, (A.L || 1000) / 1000 * 0.9)), grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bl, 10), new THREE.MeshLambertMaterial({ color: st.bc })); body.rotation.x = Math.PI / 2; grp.add(body);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.8, 10), new THREE.MeshLambertMaterial({ color: st.nc })); nose.rotation.x = Math.PI / 2; nose.position.z = bl / 2 + r * 0.9; grp.add(nose);
      for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, r * 2.4, r * 1.6), new THREE.MeshLambertMaterial({ color: st.nc })); f.position.z = -bl / 2 + r * 0.8; f.rotation.z = k * Math.PI / 2; grp.add(f); }
      return { mesh: grp, style: st };
    }
    if (st.body === 'streak') {
      const g = new THREE.CylinderGeometry(st.w, st.w * 0.6, st.len, 6, 1); g.translate(0, -st.len / 2, 0);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: st.core, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      const gl = glowSprite(st.gcol, st.glow); m.add(gl); return { mesh: m, style: st };
    }
    // míssil / foguete: corpo ao longo de +Z (lookAt aponta o +Z para o alvo)
    const r = Math.max(0.07, Math.min(0.42, A.d / 1000 * 0.8)), bl = Math.max(0.9, Math.min(4.2, (A.L || 800) / 1000 * (st.body === 'rocket' ? 1.1 : 1.25)));
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bl, 10), new THREE.MeshLambertMaterial({ color: st.bc })); body.rotation.x = Math.PI / 2; grp.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.6, 10), new THREE.MeshLambertMaterial({ color: st.nc })); nose.rotation.x = Math.PI / 2; nose.position.z = bl / 2 + r * 1.3; grp.add(nose);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, bl * 0.12, 10), new THREE.MeshLambertMaterial({ color: st.nc })); band.rotation.x = Math.PI / 2; band.position.z = bl * 0.2; grp.add(band);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 2.6, r * 1.8), new THREE.MeshLambertMaterial({ color: st.nc })); f.position.z = -bl / 2 + r * 0.9; f.rotation.z = k * Math.PI / 2; grp.add(f); }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(r * 0.85, Math.max(1.2, bl * 1.1), 8), new THREE.MeshBasicMaterial({ color: st.flame, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9, depthWrite: false }));
    flame.rotation.x = -Math.PI / 2; flame.position.z = -bl / 2 - Math.max(1.2, bl * 1.1) / 2; grp.add(flame); grp.userData.flame = flame;
    const gl = glowSprite(st.gcol, st.glow); gl.position.z = -bl / 2 - 0.3; grp.add(gl); grp.userData.glow = gl;
    return { mesh: grp, style: st };
  }
  function update(s, d, prev) {
    const m = s.mesh, st = s.st;
    m.position.copy(s.pos);
    if (st.body === 'streak') m.quaternion.setFromUnitVectors(Y, d);
    else { m.lookAt(s.pos.clone().add(d)); const fl = m.userData.flame; if (fl) { fl.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.5); } if (m.userData.glow) m.userData.glow.scale.setScalar(st.glow * (0.8 + Math.random() * 0.4)); if (s.rocket && !s.guid) m.rotateZ(s.age * 6); }
    if (s.burnt) { const mu = m.userData; if (mu.flame) mu.flame.visible = false; if (mu.glow) mu.glow.visible = false; }   // propelente acabou: sem chama nem fumaça
    if (st.trail && prev && !s.burnt) SB.FX.trailSeg(prev, s.pos, st.trail);
  }
  function dispose(m) { m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose && o.material.dispose(); }); }

  /* ---- fogo na boca do cano / lançamento ---- */
  function muzzle(A, p, d, e) {
    const st = style(A), FX = SB.FX, kind = st.muzzle;
    if (e && (e.st.rof || (e.isHeli && A.wc === 'gun'))) { e.nf = (e.nf || 0) + 1; if (e.nf % 3 !== 0) return; }
    const big = A.wc === 'gun' ? Math.min(1.5, (e && e.st ? e.st.cal : A.d) / 120) : 0.8;
    const back = d.clone().multiplyScalar(-1);
    if (kind === 'auto') { FX.muzzleSmall(p, d); return; }
    if (kind === 'rocket') { FX.muzzleSmall(p, d); for (let i = 0; i < 9; i++) FX.puff(p.clone().addScaledVector(back, 1 + i * 0.5), back.clone().multiplyScalar(6 + Math.random() * 10).add(new V3(rr(4), rr(3), rr(4))), 1.8, 6, 1.6, i % 2 ? 0xdddddd : 0xffb060, 0.7, i % 2 === 0); return; }
    if (kind === 'atgm') { FX.muzzleSmall(p, d); for (let i = 0; i < 6; i++) FX.puff(p.clone().addScaledVector(back, 0.5 + i * 0.4), back.clone().multiplyScalar(4 + Math.random() * 5).add(new V3(rr(3), rr(2), rr(3))), 1.2, 4, 1.4, 0xe8e8e8, 0.55, false); return; }
    if (kind === 'canister') { FX.muzzle(p, d, big); for (let i = 0; i < 14; i++) FX.puff(p.clone().addScaledVector(d, 2), d.clone().multiplyScalar(40 + Math.random() * 25).add(new V3(rr(14), rr(14), rr(14))), 0.35, -0.1, 0.35, 0xe0e0e0, 0.9, true); return; }
    if (kind === 'flame') { for (let i = 0; i < 14; i++) FX.puff(p.clone().addScaledVector(d, 1 + i * 0.7), d.clone().multiplyScalar(14 + Math.random() * 8).add(new V3(rr(3), rr(3), rr(3))), 1.1, 1.5, 0.6, i % 3 ? 0xff7a20 : 0xffd060, 0.8, true); return; }
    FX.muzzle(p, d, big);
    FX.ring(p.clone().addScaledVector(d, 2.2), 2 + big * 2.5, 0.35, 0xdddddd, 0.35);
    if (kind === 'sabot') for (let i = 0; i < 5; i++) { const sd = d.clone().multiplyScalar(30 + Math.random() * 20).add(new V3(rr(26), rr(26), rr(26))); FX.puff(p.clone().addScaledVector(d, 6 + i), sd, 0.4, 0.2, 0.9, 0x8a8a8a, 0.8, false); }
  }

  /* ---- impacto ---- */
  function impact(A, pos, where, dir) {
    const st = style(A), FX = SB.FX, tnt = Math.max(A.tnt || 0, 0.02), size = 0.5 + Math.cbrt(tnt) * (A.blast || 1) * 0.8, n = dir ? dir.clone().multiplyScalar(-1) : new V3(0, 1, 0);
    const k = st.impact;
    if (where === 'tank') {
      if (k === 'jet' || k === 'efp') { for (let i = 0; i < 12; i++) FX.puff(pos.clone(), n.clone().multiplyScalar(-1).multiplyScalar(10 + Math.random() * 16).add(new V3(rr(5), rr(5), rr(5))), 0.45, -0.2, 0.3, i % 2 ? 0x9fe8ff : 0xffffff, 1, true); FX.flash(pos, 0xbfeaff, 2.5); }
      else if (k === 'explosion' || k === 'apHE' || k === 'shock' || k === 'tb' || k === 'inc' || k === 'pyro') { FX.flash(pos, k === 'inc' || k === 'pyro' ? 0xff9a30 : 0xffd080, 2.2); FX.sparks(pos, 8); }
      else FX.sparks(pos, 8);
      return;
    }
    switch (k) {
      case 'metal': case 'dust': FX.dust(pos, 8); FX.sparks(pos, k === 'metal' ? 6 : 0); break;
      case 'jet': FX.explosion(pos, size * 0.8); FX.flash(pos, 0xbfeaff, 3); break;
      case 'efp': FX.explosion(pos, size * 0.6); FX.flash(pos, 0xffc080, 2.5); break;
      case 'apHE': FX.explosion(pos, size * 0.6); FX.sparks(pos, 6); break;
      case 'shock': FX.explosion(pos, size * 1.1); FX.ring(pos, 14 + size * 6, 0.5, 0xe0d8c0, 0.5); break;
      case 'tb': FX.explosion(pos, size * 1.2); for (let i = 0; i < 14; i++) FX.puff(pos.clone().add(new V3(rr(3), Math.random() * 3, rr(3))), new V3(rr(6), 3 + Math.random() * 5, rr(6)), 3 + size, 4 + size * 2, 1.4 + Math.random() * 0.8, i % 2 ? 0xff7020 : 0xffb050, 0.8, true); FX.ring(pos, 16 + size * 6, 0.6, 0xffc080, 0.5); break;
      case 'airburst': FX.explosion(pos, size * 0.7); FX.flash(pos, 0xfff2c0, 3.5); for (let i = 0; i < 20; i++) { const v = new V3(rr(2), rr(2), rr(2)).normalize().multiplyScalar(30 + Math.random() * 50); FX.puff(pos.clone(), v, 0.28, -0.1, 0.32, 0xffe9a0, 1, true); } break;
      case 'inc': FX.explosion(pos, size * 0.5); for (let i = 0; i < 12; i++) FX.puff(pos.clone(), new V3(rr(14), Math.random() * 10, rr(14)), 0.9, 0.5, 0.9 + Math.random(), 0xff8a2a, 0.9, true); break;
      case 'pyro': FX.dust(pos, 6); for (let i = 0; i < 16; i++) FX.puff(pos.clone(), new V3(rr(20), Math.random() * 14, rr(20)), 0.4, -0.1, 0.5, 0xffa050, 1, true); break;
      case 'smoke': break;
      case 'cluster': FX.explosion(pos, 0.8); break;
      case 'flak': FX.sparks(pos, 14); FX.dust(pos, 6); break;
      default: FX.explosion(pos, size);
    }
  }
  SB.Visual = { style, make, update, dispose, muzzle, impact };
})(window.SB);
