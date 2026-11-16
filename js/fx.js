/* Efeitos: partículas (sprites) e áudio sintetizado — com atenuação por distância e limite de sons/partículas */
(function (SB) {
  'use strict';
  const V3 = THREE.Vector3;
  let scene, pool = [], live = [], tex;
  function mkTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }
  function get() {
    let s = pool.pop();
    if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); }
    scene.add(s); return s;
  }
  /* fator 0..1 pela distância até o "ouvinte" (a câmera) */
  const att = p => { const L = SB.FX.listener; if (!L || !p) return 1; const d = L.distanceTo(p); return d > 1400 ? 0 : Math.pow(Math.max(0, 1 - d / 1100), 1.6); };
  function add(pos, vel, size, grow, life, color, op, additive) {
    if (live.length > 700) return;
    const s = get(); s.position.copy(pos); s.material.color.set(color); s.material.opacity = op; s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending; s.scale.setScalar(size);
    live.push({ s, vel, grow, life, max: life, op, size });
  }
  const r = (a) => (Math.random() - 0.5) * a;
  let ac = null, master = null, sndT = 0, sndN = 0;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.4; master.connect(ac.destination); } catch (e) { } } return ac; }
  function noise(dur, vol, f0, f1, type) {
    if (vol < 0.04 || SB.FX.mute) return;
    const now = performance.now(); if (now - sndT > 150) { sndT = now; sndN = 0; } if (++sndN > 4) return;     // no máximo 4 sons a cada 150 ms
    if (!audio()) return; if (ac.state === 'suspended') ac.resume();
    const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = ac.createBufferSource(); src.buffer = b; const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(f0, ac.currentTime); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), ac.currentTime + dur);
    const g = ac.createGain(); g.gain.value = Math.min(1, vol); src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  SB.FX = {
    listener: null, mute: false,
    init(sc) { scene = sc; if (!tex) tex = mkTex(); },
    clear() { live.forEach(p => { scene.remove(p.s); pool.push(p.s); }); live = []; },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i]; p.life -= dt;
        if (p.life <= 0) { scene.remove(p.s); pool.push(p.s); live.splice(i, 1); continue; }
        p.s.position.addScaledVector(p.vel, dt);
        const k = 1 - p.life / p.max; p.s.scale.setScalar(p.size + p.grow * k); p.s.material.opacity = p.op * (1 - k) * (k < 0.1 ? k * 10 : 1);
      }
    },
    smoke(pos, n, dark) { const a = att(pos); if (a < 0.08) return; n = Math.max(1, Math.round((n || 1) * Math.min(1, 0.3 + a))); for (let i = 0; i < n; i++) add(pos.clone().add(new V3(r(1), r(1), r(1))), new V3(r(1.5), 2 + Math.random() * 2, r(1.5)), 2, 8, 3 + Math.random() * 2, dark ? 0x222222 : 0x888888, 0.5, false); },
    fire(pos, n) { const a = att(pos); if (a < 0.08) return; for (let i = 0; i < Math.max(1, Math.round((n || 1) * Math.min(1, 0.4 + a))); i++) add(pos.clone().add(new V3(r(1), r(0.5), r(1))), new V3(r(1), 3 + Math.random() * 2, r(1)), 1.8, -1, 0.7 + Math.random() * 0.5, 0xff7a1a, 0.85, true); },
    explosion(pos, size) {
      const a = att(pos); if (a < 0.04) return;
      const n = Math.max(3, Math.floor((8 + size * 3) * (0.35 + 0.65 * a)));
      for (let i = 0; i < n; i++) add(pos.clone(), new V3(r(14 * size), Math.random() * 9 * size, r(14 * size)), 2 + size, 5 * size, 0.5 + Math.random() * 0.6, i % 3 ? 0xff8a20 : 0xffe080, 0.95, true);
      for (let i = 0; i < Math.ceil(n / 2); i++) add(pos.clone(), new V3(r(8 * size), 2 + Math.random() * 6, r(8 * size)), 2.5 * size, 9 * size, 2 + Math.random() * 2, 0x333333, 0.55, false);
      noise(0.7 + size * 0.15, Math.min(0.8, (0.3 + size * 0.15) * a), 900, 60);
    },
    muzzle(pos, dir, big) {
      const a = att(pos); if (a < 0.04) return;
      const n = Math.max(2, Math.round(6 * (0.3 + 0.7 * a)));
      for (let i = 0; i < n; i++) add(pos.clone().addScaledVector(dir, i * 0.6), dir.clone().multiplyScalar(8 + Math.random() * 10).add(new V3(r(3), r(3), r(3))), 1.4 + (big || 0), 3, 0.3, 0xffd070, 0.9, true);
      if (a > 0.3) for (let i = 0; i < 2; i++) add(pos.clone(), dir.clone().multiplyScalar(3).add(new V3(r(3), 1 + Math.random() * 2, r(3))), 1.6, 6, 1.4, 0x999999, 0.45, false);
      noise(0.5, 0.55 * a, 1400, 80);
    },
    sparks(pos, n) { const a = att(pos); if (a < 0.06) return; for (let i = 0; i < Math.max(2, Math.round(n * a)); i++) add(pos.clone(), new V3(r(16), Math.random() * 12, r(16)), 0.4, -0.2, 0.4 + Math.random() * 0.3, 0xffe9a0, 1, true); noise(0.2, 0.35 * a, 5000, 800, 'bandpass'); },
    dust(pos, n) { const a = att(pos); if (a < 0.06) return; for (let i = 0; i < Math.max(2, Math.round(n * a)); i++) add(pos.clone(), new V3(r(5), 1 + Math.random() * 4, r(5)), 1.6, 5, 1.2, 0x9a8a6a, 0.55, false); noise(0.3, 0.2 * a, 600, 100); },
    puff(pos, vel, size, grow, life, color, op, additive) { if (att(pos) < 0.05) return; add(pos, vel, size, grow, life, color, op, additive); },
    sprite(color, size, additive) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); s.scale.setScalar(size); return s; },
    trailSeg(a, b, st) {
      if (!st) return; const d = a.distanceTo(b); if (d < 0.01 || att(b) < 0.1) return;
      const n = Math.min(8, Math.max(1, Math.round(d / (st.gap || 4))));
      for (let i = 1; i <= n; i++) add(a.clone().lerp(b, i / n), new V3(r(0.8), r(0.6) + (st.rise || 0), r(0.8)), st.size, st.grow, st.life * (0.8 + Math.random() * 0.4), st.c, st.op, st.add);
    },
    ring(pos, size, life, color, op) { if (att(pos) < 0.05) return; add(pos.clone(), new V3(0, 0, 0), 0.5, size * 2, life, color, op, false); },
    flash(pos, color, size) { if (att(pos) < 0.05) return; add(pos.clone(), new V3(0, 0, 0), size * 0.6, size * 2.4, 0.18, color, 1, true); add(pos.clone(), new V3(0, 0, 0), size * 0.3, size * 1.2, 0.3, 0xffffff, 1, true); },
    muzzleSmall(pos, dir) { const a = att(pos); if (a < 0.04) return; for (let i = 0; i < 2; i++) add(pos.clone().addScaledVector(dir, i * 0.5), dir.clone().multiplyScalar(6 + Math.random() * 8), 0.9, 1.5, 0.12, 0xffd070, 0.9, true); noise(0.18, 0.28 * a, 1800, 200); },
    clank(pos) { noise(0.3, 0.5 * att(pos), 4200, 600, 'bandpass'); },
  };
})(window.SB);
