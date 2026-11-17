/* Controle de tiro: telêmetros (laser / estereoscópico / óptico), computador balístico (avanço) e retículo do HUD */
(function (SB) {
  'use strict';
  const V3 = THREE.Vector3;
  const RF = {
    laser: { n: 'LASER', dt: 0.2, max: 4500, err: 0, abs: 3, step: 5, hold: 3, col: '#7fffa0' },
    stereo: { n: 'ESTÉREO', dt: 0.5, max: 3200, err: 0.02, abs: 0, step: 10, hold: 2.5, col: '#9fe8ff' },
    optic: { n: 'ÓPTICO', dt: 0.9, max: 2000, err: 0.05, abs: 0, step: 25, hold: 2, col: '#ffe08a' },
  };
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.8;
  const ZERO = 300;     // alça fixa (m) quando não há telêmetro

  /* mede a distância do ponto mirado; a leitura expira se o telêmetro perder o retorno */
  function measure(B, me, hit, dt) {
    const t = me.stat.rf; let rf = B.rf;
    if (!rf || rf.type !== t) rf = B.rf = { type: t, r: null, age: 99, acc: 0, why: '' };
    if (!t) { rf.r = null; rf.why = me.stat.hasRf ? 'telêmetro destruído' : 'sem telêmetro'; return rf; }
    const D = RF[t]; rf.acc += dt;
    if (rf.acc >= D.dt) {
      rf.acc = 0;
      if (hit.r >= 3190) rf.why = 'sem retorno';
      else if (hit.r > D.max) { rf.why = 'fora de alcance (' + D.max + ' m)'; rf.r = null; }
      else if (!B.map.los(new V3(me.x, me.y + 2.3, me.z), hit.p.clone().addScaledVector(new V3(me.x - hit.p.x, 0, me.z - hit.p.z).normalize(), 1.5))) rf.why = 'visada bloqueada';
      else { rf.r = Math.max(D.step, Math.round((hit.r * (1 + gauss() * D.err) + gauss() * D.abs) / D.step) * D.step); rf.age = 0; rf.why = ''; }
    }
    rf.age += dt; if (rf.age > D.hold) rf.r = null;
    return rf;
  }

  /* resolve o ponto de pontaria e a distância usada na compensação de queda */
  function solve(B, me, hit, A, dt) {
    const exact = me.isHeli || me.st.rof || (A.wc && A.wc !== 'gun');     // aeronaves, canhões automáticos e mísseis: compensação exata
    const rf = measure(B, me, hit, dt); let pt = hit.p, r = exact ? Math.max(30, hit.r) : rf.r != null ? rf.r : ZERO, lead = null;
    if (!exact && me.stat.ballc && rf.r != null && hit.e && hit.e.alive && hit.e.team !== me.team && Math.abs(hit.e.v) > 0.5) {
      const e = hit.e, tof = r / Math.max(200, A.v0 * 0.92);
      lead = new V3(hit.p.x - Math.sin(e.yaw) * e.v * tof, hit.p.y + (e.vy || 0) * tof, hit.p.z - Math.cos(e.yaw) * e.v * tof); pt = lead;
    }
    if (!exact && !me.stat.rf && hit.r < 3190) {      // sem telêmetro: estimativa visual (±8%, de 50 em 50 m) em vez de alça fixa
      if (!B.estT || B.t - B.estT > 3) { B.estT = B.t; B.estBias = (Math.random() - 0.5) * 0.16; }
      r = Math.max(50, Math.round(hit.r * (1 + B.estBias) / 50) * 50);
    }
    const rel = exact || rf.r != null || (!me.stat.rf && hit.r < 3190);   // medida a partir da câmera: a distância do cano é recalculada em update()
    B.fc = { r, exact, lead: !!lead, tof: r / Math.max(200, A.v0 * 0.92) };
    return { pt, r, rel, dr: exact ? 0 : rel ? r - hit.r : 0 };
  }

  /* retículo: distância, altura, elevação, alça (marcas de queda por distância) */
  function draw(B, me, cv) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2; g.clearRect(0, 0, W, H);
    if (!me.alive) return;
    const fc = B.fc || { r: 300 }, rf = B.rf || {}, D = RF[rf.type], A = me.ammo[me.sel].A, droop = SB.Battle.droop;
    const fov = (B.camera.fov || 60) * Math.PI / 180, f = (innerHeight / 2) / Math.tan(fov / 2);
    g.font = '600 12px monospace'; g.textBaseline = 'middle';
    const txt = (s, x, y, c, al, sz) => { g.font = '600 ' + (sz || 12) + 'px monospace'; g.fillStyle = 'rgba(0,0,0,.55)'; g.textAlign = al || 'left'; g.fillText(s, x + 1, y + 1); g.fillStyle = c || '#e8f0ff'; g.fillText(s, x, y); };
    const aim = B.aimPt, tgt = B.aimEnt, R = B.aimR < 3190 ? B.aimR : null;
    // alça balística (só canhões de tiro direto)
    if (!me.isHeli && !fc.exact && A.wc === 'gun') {
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy + 18); let yl = cy + 18;
      for (let r = 200; r <= 3000; r += 200) {
        const dy = f * Math.tan(droop(A, r) - droop(A, fc.r)), y = cy + dy; if (y > H - 14 || y < 14) continue;
        const big = r % 1000 === 0, half = r % 500 === 0; g.moveTo(cx - (big ? 11 : half ? 8 : 5), y); g.lineTo(cx + (big ? 11 : half ? 8 : 5), y);
        if (half && Math.abs(r - fc.r) > 60) txt(String(r / 100), cx + 16, y, 'rgba(210,225,255,.8)', 'left', 10);
        yl = Math.max(yl, y);
      }
      g.moveTo(cx, cy + 18); g.lineTo(cx, yl); g.stroke();
    }
    // distância e altura
    const dr = fc.exact ? (R != null ? Math.round(R) : null) : rf.r;
    const col = D ? D.col : '#ffb04a';
    txt(dr != null ? dr + ' m' : '--- m', cx + 40, cy - 22, col, 'left', 20);
    txt(me.isHeli || fc.exact ? '' : (D ? 'TLM ' + D.n : rf.why || 'sem telêmetro') + (rf.r == null && D ? ' · ' + (rf.why || '') : ''), cx + 40, cy - 6, col, 'left', 11);
    if (aim) {
      const dh = aim.y - (me.y + 2.3), gh = B.map.H(aim.x, aim.z);
      txt('Δh ' + (dh >= 0 ? '+' : '') + dh.toFixed(0) + ' m', cx + 40, cy + 10, '#cfe0ff', 'left', 12);
      txt('alt ' + aim.y.toFixed(0) + ' m' + (tgt ? '' : ' · solo ' + gh.toFixed(0)), cx + 40, cy + 24, 'rgba(200,215,240,.75)', 'left', 11);
    }
    if (tgt && tgt.alive) txt((tgt.team === me.team ? '◇ ' : '◆ ') + tgt.name + ' · ' + Math.round(Math.abs(tgt.v) * 3.6) + ' km/h' + (tgt.isHeli ? ' · alt ' + Math.round(tgt.y - B.map.H(tgt.x, tgt.z)) + ' m' : ''), cx, cy + 52, tgt.team === me.team ? '#7fe38f' : '#ff9a8a', 'center', 12);
    // elevação do canhão / extra
    const ge = (me.gP + me.pitch * Math.cos(me.tYaw || 0)) * 57.2958, go = (B.gOff || 0) * 57.2958;
    txt('ELEV ' + (ge >= 0 ? '+' : '') + ge.toFixed(1) + '°', cx - 40, cy - 22, '#cfe0ff', 'right', 14);
    if (Math.abs(go) > 0.05) txt('extra ' + (go >= 0 ? '+' : '') + go.toFixed(1) + '° (Q/E · N zera)', cx - 40, cy - 6, '#ffd06a', 'right', 11);
    if (!me.isHeli) {
      const stab = me.st.rof ? null : me.stat.hasStab ? (me.stat.stabDead ? 'ESTAB ✖' : 'ESTAB ✔') : 'SEM ESTAB';
      if (stab) txt(stab, cx - 40, cy + 10, stab.indexOf('✔') > 0 ? '#7fe38f' : '#ff9a6a', 'right', 11);
      if (me.stat.ballc) txt(fc.lead ? 'AVANÇO ✔' : 'COMP. BALÍSTICO', cx - 40, cy + 24, fc.lead ? '#8fe0ff' : 'rgba(200,215,240,.7)', 'right', 11);
      if (!fc.exact) txt('voo ' + fc.tof.toFixed(1) + ' s', cx - 40, cy + 38, 'rgba(200,215,240,.75)', 'right', 11);
    }
  }

  SB.FCS = { RF, ZERO, measure, solve, draw };
})(window.SB);
