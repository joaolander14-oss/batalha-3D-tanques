/* Tipos de lock dos ATGM de veículos terrestres (estilo War Thunder):
   fio (SACLOS) · laser (designador) · TV (foto do alvo) · IR (calor) · GPS (coordenada) */
(function (SB) {
  'use strict';
  const V3 = THREE.Vector3, D2R = Math.PI / 180;
  const MODES = {
    wire: { n: 'Fio (SACLOS)', s: 'FIO', d: 'segue a sua mira o voo todo; o fio rompe a 4000 m ou se você morrer' },
    laser: { n: 'Laser (designador)', s: 'LASER', d: 'mire no alvo para iluminar e disparar; o míssil segue o laser (visada limpa, designador inteiro) e, a 350 m do alvo, vai sozinho; alcance 5500 m' },
    tv: { n: 'TV (foto do alvo)', s: 'TV', d: 'mire no alvo até tirar a "foto"; o míssil compara com a própria imagem, dispara-e-esquece, perde o alvo se a visão for bloqueada' },
    ir: { n: 'IR (calor)', s: 'IR', d: 'trava na assinatura de calor (motor ligado/em movimento/fogo); alvo parado e frio some; fumaça bloqueia; flares enganam' },
    gps: { n: 'GPS (coordenada)', s: 'GPS', d: 'vai ao ponto do mapa mirado no disparo (mergulho por cima); não segue alvo que se mexe' },
  };
  const ORDER = ['wire', 'laser', 'tv', 'ir', 'gps'];
  const RANGE = { wire: 4000, laser: 5500, tv: 3600, ir: 3000, gps: 6000 };
  const CONE = { tv: 5 * D2R, ir: 6 * D2R };
  const ACQ = { tv: 0.9, ir: 0.6 };
  const eye = e => new V3(e.x, e.y + 2.3, e.z), tpos = o => new V3(o.x, o.y + 1.6, o.z);
  const applies = (e, slot) => !!slot && !e.isHeli && !!slot.A && slot.A.wc === 'missile' && ((slot.src && slot.src.domain) || 'ground') === 'ground';
  const isAtgmAmmo = a => !!a && (SB.TYPE[a.type] || {}).cls === 'MS' && (a.domain || 'ground') === 'ground';
  /* assinatura de calor: motor ligado em movimento = 1; parado = 0,7; imobilizado/motor morto = 0,3; fogo soma */
  function heat(o) { if (o.isHeli) return 1.3; let h = Math.abs(o.v) > 1 ? 1 : 0.7; if (o.stat && o.stat.speedF === 0) h = 0.3; if (o.burning) h += 0.7; return h; }
  const los = (B, a, b) => B.map.los(a, b);
  const randomLk = () => { const r = Math.random(); return r < 0.34 ? 'wire' : r < 0.55 ? 'laser' : r < 0.75 ? 'tv' : r < 0.9 ? 'ir' : 'gps'; };

  /* melhor alvo inimigo dentro do cone, com visada (e calor, no IR) */
  function probe(B, e, mode, org, dir) {
    let best = null, ba = CONE[mode], why = 'sem alvo na mira';
    for (const o of B.ents.values()) {
      if (!o.alive || o.team === e.team) continue;
      const tp = tpos(o), to = tp.clone().sub(org), r = to.length(), a = to.angleTo(dir);
      if (a > ba || r > RANGE[mode]) continue;
      if (!los(B, org, tp)) { why = 'alvo sem linha de visada'; continue; }
      if (mode === 'ir' && heat(o) * 3000 < r) { why = 'alvo frio demais (sem assinatura de calor)'; continue; }
      ba = a; best = o;
    }
    return { t: best, why };
  }

  /* estado de aquisição do jogador (HUD): B.lk */
  function tick(B, me, dt, dir) {
    const slot = me.ammo[me.sel];
    if (!me.alive || !applies(me, slot)) { B.lk = null; return; }
    const mode = slot.lk || 'wire'; let st = B.lk;
    if (!st || st.mode !== mode || st.sel !== me.sel) st = B.lk = { mode, sel: me.sel, prog: 0, cand: null, lock: null };
    const org = eye(me);
    if (mode === 'wire') { st.ok = true; st.msg = 'FIO pronto · alcance do fio 4000 m'; }
    else if (mode === 'laser') {
      const ap = B.aimPt, e2 = B.aimEnt, onT = !!(e2 && e2.alive && e2.team !== me.team), vis = !!ap && los(B, org, ap);
      st.ok = !me.stat.lrfDead && onT && vis;
      st.msg = me.stat.lrfDead ? 'LASER: designador danificado' : !onT ? 'LASER: aponte a mira no alvo' : !vis ? 'LASER: visada bloqueada' : 'LASER: alvo iluminado — ' + e2.name + ' (' + Math.round(B.aimR) + ' m)';
    } else if (mode === 'gps') {
      st.ok = !!B.aimPt && B.aimR < 3150; st.msg = st.ok ? 'GPS: coordenada X ' + Math.round(B.aimPt.x) + ' Z ' + Math.round(B.aimPt.z) + ' (' + Math.round(B.aimR) + ' m)' : 'GPS: aponte para um ponto do terreno';
    } else {
      let t = st.lock ? B.ents.get(st.lock) : null;
      if (t && t.alive) { const tp = tpos(t), to = tp.clone().sub(org), r = to.length(); if (to.angleTo(dir) > CONE[mode] * 3 || r > RANGE[mode] || !los(B, org, tp) || (mode === 'ir' && heat(t) * 3000 < r)) t = null; } else t = null;
      if (t) { st.ok = true; st.msg = (mode === 'tv' ? 'TV: FOTO TIRADA — ' : 'IR: ALVO TRAVADO — ') + t.name; }
      else {
        st.lock = null; st.ok = false; const p = probe(B, me, mode, org, dir);
        if (p.t) { if (p.t.eid === st.cand) st.prog += dt; else { st.cand = p.t.eid; st.prog = 0; } if (st.prog >= ACQ[mode]) { st.lock = p.t.eid; st.ok = true; st.msg = (mode === 'tv' ? 'TV: FOTO TIRADA — ' : 'IR: ALVO TRAVADO — ') + p.t.name; } else st.msg = (mode === 'tv' ? 'TV: tirando foto… ' : 'IR: travando… ') + Math.round(st.prog / ACQ[mode] * 100) + '%'; }
        else { st.cand = null; st.prog = 0; st.msg = (mode === 'tv' ? 'TV: ' : 'IR: ') + p.why; }
      }
    }
  }

  /* disparo: valida o lock e devolve os dados que o míssil leva */
  function launch(B, e, slot, p, d) {
    const mode = slot.lk || 'wire', GP = () => { const sc = 1 + Math.random() * 2.5, a = Math.random() * 6.28; return [sc * Math.cos(a), sc * Math.sin(a)]; };
    if (e === B.me) {
      const st = B.lk; if (!st || st.mode !== mode || !st.ok) return { err: (st && st.msg) || 'Sem lock.' };
      if (mode === 'gps') { const [dx, dz] = GP(); return { mode, gps: [B.aimPt.x + dx, B.aimPt.y, B.aimPt.z + dz] }; }
      if (mode === 'tv' || mode === 'ir') { const t = B.ents.get(st.lock); if (!t) return { err: 'Alvo perdido.' }; return { mode, tid: t.eid, seen: [t.x, t.y + 1.6, t.z] }; }
      return { mode };
    }
    const tg = e.ai && e.ai.tg; if (!tg || !tg.alive) return { err: 'sem alvo' };
    const org = eye(e), tp = tpos(tg);
    if (mode === 'wire') return { mode };
    if (mode === 'laser') return e.stat.lrfDead || !los(B, org, tp) ? { err: 'laser' } : { mode };
    if (mode === 'gps') { const [dx, dz] = GP(); return { mode, gps: [tg.x + dx, tg.y + 1, tg.z + dz] }; }
    const pr = probe(B, e, mode, org, tp.clone().sub(org).normalize()); if (!pr.t || pr.t !== tg) return { err: pr.why };
    return { mode, tid: tg.eid, seen: [tg.x, tg.y + 1.6, tg.z] };
  }

  /* guiagem em voo: devolve o ponto que o míssil persegue */
  function aim(B, s, own, dir, dt, hz) {
    const m = s.lk;
    if (m === 'gps') return s.gps ? s.gps.clone() : null;
    if (m === 'laser' && s.tid) {     // fase terminal: perto do alvo iluminado, o míssil segue sozinho
      const t = B.ents.get(s.tid);
      if (t && t.alive) { const tp = tpos(t); if (s.term || tp.distanceTo(s.pos) < 350) { s.term = true; if (los(B, s.pos, tp)) s.unseen = 0; else { s.unseen = (s.unseen || 0) + dt; if (s.unseen > 1.5) { s.lost = true; s.why = 'alvo perdido no terminal'; return null; } } return tp; } }
    }
    if (m === 'wire' || m === 'laser') {
      if (!own || !own.alive) { s.lost = true; s.why = 'atirador destruído'; return null; }
      if (new V3(own.x, own.y, own.z).distanceTo(s.pos) > RANGE[m]) { s.lost = true; s.why = m === 'wire' ? 'fio rompido' : 'fora do alcance'; return null; }
      let a = null; if (own === B.me && B.aimPt) a = B.aimPt.clone(); else if (own.ai && own.ai.tg) a = tpos(own.ai.tg);
      if (m === 'laser') {
        if (own.stat.lrfDead) { s.lost = true; s.why = 'designador destruído'; return null; }
        if (a && !los(B, eye(own), a)) { s.blk = (s.blk || 0) + dt; s.why = 'laser bloqueado'; if (s.blk > 1.2) { s.lost = true; return null; } a = s.lastSpot ? s.lastSpot.clone() : null; }
        else if (a) { s.blk = 0; s.why = ''; s.lastSpot = a.clone(); let nb = null, nd = 14; for (const o of B.ents.values()) { if (!o.alive || o.team === own.team) continue; const dd = tpos(o).distanceTo(a); if (dd < nd) { nd = dd; nb = o; } } if (nb) s.tid = nb.eid; }
      } else if (a) s.lastSpot = a.clone();
      return a;
    }
    const t = B.ents.get(s.tid); let seen = false;
    if (t && t.alive) {
      const tp = tpos(t), to = tp.clone().sub(s.pos), r = to.length();
      seen = r < RANGE[m] && to.angleTo(dir) < 0.6 && los(B, s.pos, tp) && (m !== 'ir' || heat(t) * 3000 >= r);
      if (seen) { s.lastSeen = tp.clone(); s.unseen = 0; s.why = ''; hz(s, t, dir, dt); if (s.lost) return null; }
    }
    if (!seen) { s.unseen = (s.unseen || 0) + dt; s.why = m === 'tv' ? 'imagem perdida' : 'calor perdido'; if (s.unseen > 3.2) { s.lost = true; return null; } }
    return s.lastSeen ? s.lastSeen.clone() : null;
  }

  SB.Locks = { MODES, ORDER, RANGE, applies, isAtgmAmmo, heat, probe, tick, launch, aim, randomLk };
})(window.SB);
