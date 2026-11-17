/* Radar de bordo estilo War Thunder: modos de varredura, rastreio, trava (STT), filtro Doppler, "look-down" de radar de pulso,
   alerta de radar (RWR), mísseis de radar (SARH/ARH) e antirradiação (ARM). Aeronaves furtivas (st.stealth) não aparecem no radar.
   Distâncias em escala de jogo. Teclas: Z modo do radar, T próximo alvo, Y trava/destrava (STT). */
(function (SB) {
  'use strict';
  const D2R = Math.PI / 180, wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const MODES = [
    { id: 'off', n: 'DESLIGADO', az: 0, k: 0 },
    { id: 'rws', n: 'BUSCA RWS', az: 60, k: 1 },
    { id: 'tws', n: 'TWS (varre e rastreia)', az: 35, k: 0.85 },
    { id: 'acm', n: 'ACM (dogfight)', az: 12, k: 0.4 },
    { id: 'gnd', n: 'SOLO (alvos móveis)', az: 50, k: 0.7 },
  ];
  const vel = e => ({ x: -Math.sin(e.yaw) * e.v, y: e.vy || 0, z: -Math.cos(e.yaw) * e.v });
  const spec = e => e.st && e.st.radar;
  /* o alvo 'o' é visto pelo radar de 'e' no modo 'm'? devolve {rng, az} ou null */
  function seen(B, e, o, m) {
    const sp = spec(e); if (!sp || !m || !m.k || o === e) return null;
    const dx = o.x - e.x, dz = o.z - e.z, dy = o.y - e.y, hd = Math.hypot(dx, dz), rng = Math.hypot(hd, dy);
    const az = wrap(Math.atan2(-dx, -dz) - e.yaw);
    if (Math.abs(az) > m.az * D2R) return null;
    const air = !!o.isHeli;
    if (m.id === 'gnd') { if (air || Math.abs(o.v) < 1.5 || rng > sp.R * m.k) return null; }
    else {
      if (!air) return null;
      if (o.st.stealth) return null;                                              // furtivo: invisível ao radar
      if (rng > sp.R * m.k * Math.pow(o.st.rcs || 1, 0.25)) return null;
      const u = { x: dx / rng, y: dy / rng, z: dz / rng }, a = vel(e), b = vel(o);
      const closing = (b.x - a.x) * u.x + (b.y - a.y) * u.y + (b.z - a.z) * u.z;
      if (sp.pd && Math.abs(closing) < 28) return null;                           // filtro Doppler (entalhe): alvo "de lado" ou parado some
      if (!sp.pd && dy < 0 && Math.atan2(-dy, hd) > 4 * D2R && o.y - B.map.H(o.x, o.z) < 120) return null; // radar de pulso não enxerga baixo (ruído do solo)
    }
    if (!B.map.los(new THREE.Vector3(e.x, e.y, e.z), new THREE.Vector3(o.x, o.y, o.z))) return null;
    return { rng, az };
  }
  const emitter = o => !!((o.st.radar && (o.bot || (o.rd && o.rd.mode > 0))) || o.st.sam || (o.st.rof && o.st.elev && o.st.elev[1] > 60));
  function ensure(e) { return e.rd || (e.rd = { mode: spec(e) ? 1 : 0, contacts: [], tgt: null, stt: false, t: 0, warn: 0, wt: 0 }); }
  function tick(B, me, dt) {
    const r = ensure(me), sp = spec(me); r.t -= dt; r.wt -= dt;
    if (r.t <= 0) {
      r.t = 0.2; const m = MODES[r.mode]; r.contacts = [];
      if (sp && me.alive && m.k) {
        B.ents.forEach(o => { if (!o.alive || o.team === me.team) return; const s = seen(B, me, o, r.stt && o.eid === r.tgt ? { id: 'rws', az: 60, k: 1 } : m); if (s) r.contacts.push({ eid: o.eid, rng: s.rng, az: s.az, air: !!o.isHeli, name: o.def.name }); });
        r.contacts.sort((a, b) => a.rng - b.rng);
        if (m.id === 'acm' && !r.stt && r.contacts.length) { r.tgt = r.contacts[0].eid; r.stt = true; }
      }
      if (r.stt && !r.contacts.some(c => c.eid === r.tgt)) { r.stt = false; if (me === B.me) B.toast && B.toast('Radar: trava perdida', 1.5); }
      if (r.tgt && !r.contacts.some(c => c.eid === r.tgt)) r.tgt = null;
    }
    if (r.wt <= 0) {                                                                  // alerta de radar (RWR)
      r.wt = 0.4; let lvl = 0, from = '';
      B.ents.forEach(o => {
        if (!o.alive || o.team === me.team || !me.isHeli) return;
        if (o.st.radar && (o.bot || (o.rd && o.rd.mode))) {
          const s = seen(B, o, me, MODES[1]); if (!s) return;
          const locked = o.bot ? (o.ai && o.ai.tg === me && s.rng < o.st.radar.R * 0.7) : (o.rd.stt && o.rd.tgt === me.eid);
          if (locked && lvl < 2) { lvl = 2; from = o.def.name; } else if (lvl < 1) { lvl = 1; from = o.def.name; }
        } else if (o.st.sam && Math.hypot(o.x - me.x, o.z - me.z) < 2400 && B.map.los(new THREE.Vector3(o.x, o.y + 2, o.z), new THREE.Vector3(me.x, me.y, me.z))) { if (lvl < 1) { lvl = 1; from = o.def.name; } }
      });
      if (lvl > r.warn && me === B.me && B.toast) { B.toast(lvl === 2 ? '⚠ ALERTA: RADAR TRAVOU EM VOCÊ! (' + from + ')' : '⚠ Radar inimigo te varrendo (' + from + ')', 2.5); if (SB.FX && SB.FX.clank) SB.FX.clank(new THREE.Vector3(me.x, me.y, me.z)); }
      r.warn = lvl; r.from = from;
    }
  }
  function cycleMode(B, me, toast) {
    if (!spec(me)) { toast('Esta aeronave não tem radar.', 1.5); return; }
    const r = ensure(me); r.mode = (r.mode + 1) % MODES.length; r.stt = false; r.tgt = null; r.t = 0; toast('Radar: ' + MODES[r.mode].n, 1.8);
  }
  function cycleTarget(B, me, toast) {
    const r = ensure(me); if (!spec(me) || !r.contacts.length) { toast('Radar: sem contatos.', 1.2); return; }
    const i = r.contacts.findIndex(c => c.eid === r.tgt), n = r.contacts[(i + 1) % r.contacts.length]; r.tgt = n.eid; r.stt = false;
    toast('Alvo marcado: ' + n.name + ' (' + Math.round(n.rng) + ' m)', 1.5);
  }
  function toggleLock(B, me, toast) {
    const r = ensure(me); if (!spec(me)) return; if (r.stt) { r.stt = false; toast('Radar: trava liberada', 1.2); return; }
    if (!r.tgt) cycleTarget(B, me, toast); if (r.tgt) { r.stt = true; toast('Radar: TRAVADO (STT) — alvo sabe que foi travado', 2); }
  }
  /* autorização de disparo de míssil de radar / ARM pelo jogador: devolve {lock} ou {err} */
  function launch(B, me, A) {
    if (A.radar) {
      const r = ensure(me); if (!spec(me)) return { err: 'Sem radar: míssil de radar indisponível.' };
      const tg = r.tgt && B.ents.get(r.tgt); if (!tg || !tg.alive || !r.contacts.some(c => c.eid === r.tgt)) return { err: 'Sem alvo no radar (Z modo · T marca · Y trava).' };
      if (A.sarh && !r.stt) return { err: 'Míssil SARH exige trava do radar (Y).' };
      return { lock: r.tgt };
    }
    if (A.arm) {
      let best = null, ba = (A.cone || 40) * D2R; const d = new THREE.Vector3(-Math.sin(me.yaw), -0.15, -Math.cos(me.yaw)).normalize();
      B.ents.forEach(o => { if (!o.alive || o.team === me.team || !emitter(o)) return; const a = new THREE.Vector3(o.x - me.x, o.y - me.y, o.z - me.z).angleTo(d); if (a < ba) { ba = a; best = o.eid; } });
      return best ? { lock: best } : { err: 'ARM: nenhum emissor de radar à frente.' };
    }
    return {};
  }
  function draw(B, me, cv) {
    const g = cv.getContext('2d'), W = cv.width, Hh = cv.height, r = me.rd; g.clearRect(0, 0, W, Hh);
    const sp = spec(me); if (!sp || !r) { cv.style.display = 'none'; return; } cv.style.display = 'block';
    const m = MODES[r.mode], cx = W / 2, cy = Hh - 14, R0 = Hh - 34, az = (m.az || 60) * D2R, Rm = sp.R * (m.k || 1);
    g.fillStyle = 'rgba(0,18,8,.72)'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#2f8f4f'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R0, -Math.PI / 2 - az, -Math.PI / 2 + az); g.closePath(); g.stroke();
    for (let k = 1; k < 4; k++) { g.beginPath(); g.arc(cx, cy, R0 * k / 4, -Math.PI / 2 - az, -Math.PI / 2 + az); g.stroke(); }
    g.fillStyle = '#8fe8a8'; g.font = '10px monospace'; g.fillText(m.n + (m.k ? ' · ' + Math.round(Rm) + ' m' : ''), 4, 11);
    if (m.k) r.contacts.forEach(c => {
      const rr = Math.min(1, c.rng / Rm) * R0, a = -Math.PI / 2 - c.az * -1; const x = cx - Math.sin(-c.az) * rr * -1, y = cy - Math.cos(c.az) * rr;
      const px = cx + Math.sin(c.az) * -rr, py = y; const X = cx - Math.sin(c.az) * rr;
      g.fillStyle = c.eid === r.tgt ? (r.stt ? '#ff3030' : '#ffd24a') : (c.air ? '#ff8a5a' : '#c0a060'); g.fillRect(X - 3, py - 3, 6, 6);
      if (c.eid === r.tgt) { g.strokeStyle = r.stt ? '#ff3030' : '#ffd24a'; g.strokeRect(X - 6, py - 6, 12, 12); }
    });
    if (r.warn) { g.fillStyle = r.warn === 2 ? '#ff3030' : '#ffb030'; g.font = 'bold 11px monospace'; g.fillText(r.warn === 2 ? '⚠ RWR: TRAVADO' : '⚠ RWR: VARRIDO', 4, Hh - 3); }
  }
  SB.Radar = { MODES, seen, emitter, ensure, tick, cycleMode, cycleTarget, toggleLock, launch, draw };
})(window.SB);
