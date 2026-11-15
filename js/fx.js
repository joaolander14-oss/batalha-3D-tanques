/* Efeitos: partículas (sprites) e áudio sintetizado */
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
  function add(pos, vel, size, grow, life, color, op, add) {
    if (live.length > 700) return;
    const s = get(); s.position.copy(pos); s.material.color.set(color); s.material.opacity = op; s.material.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending; s.scale.setScalar(size);
    live.push({ s, vel, grow, life, max: life, op, size });
  }
  const r = (a) => (Math.random() - 0.5) * a;
  let ac = null, master = null;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); } catch (e) { } } return ac; }
  function noise(dur, vol, f0, f1, type) {
    if (!audio()) return; if (ac.state === 'suspended') ac.resume();
    const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = ac.createBufferSource(); src.buffer = b; const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(f0, ac.currentTime); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), ac.currentTime + dur);
    const g = ac.createGain(); g.gain.value = vol; src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  SB.FX = {
    init(sc) { scene = sc; if (!tex) tex = mkTex(); },
    clear() { live.forEach(p => { scene.remove(p.s); pool.push(p.s); }); live = []; },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i]; p.life -= dt;
        if (p.life <= 0) { scene.remove(p.s); pool.push(p.s); live.splice(i, 1); continue; }
        p.s.position.addScaledVector(p.vel, dt); p.vel.y += (p.rise || 0) * dt;
        const k = 1 - p.life / p.max; p.s.scale.setScalar(p.size + p.grow * k); p.s.material.opacity = p.op * (1 - k) * (k < 0.1 ? k * 10 : 1);
      }
    },
    smoke(pos, n, dark) { for (let i = 0; i < (n || 1); i++) add(pos.clone().add(new V3(r(1), r(1), r(1))), new V3(r(1.5), 2 + Math.random() * 2, r(1.5)), 2, 8, 3 + Math.random() * 2, dark ? 0x222222 : 0x888888, 0.55, false); },
    fire(pos, n) { for (let i = 0; i < (n || 1); i++) add(pos.clone().add(new V3(r(1), r(0.5), r(1))), new V3(r(1), 3 + Math.random() * 2, r(1)), 1.8, -1, 0.7 + Math.random() * 0.5, 0xff7a1a, 0.85, true); },
    explosion(pos, size) {
      const n = Math.floor(8 + size * 4);
      for (let i = 0; i < n; i++) add(pos.clone(), new V3(r(14 * size), Math.random() * 9 * size, r(14 * size)), 2 + size, 5 * size, 0.5 + Math.random() * 0.6, i % 3 ? 0xff8a20 : 0xffe080, 0.95, true);
      for (let i = 0; i < n; i++) add(pos.clone(), new V3(r(8 * size), 2 + Math.random() * 6, r(8 * size)), 2.5 * size, 9 * size, 2 + Math.random() * 2, 0x333333, 0.6, false);
      noise(0.9 + size * 0.2, Math.min(1, 0.4 + size * 0.2), 900, 60);
    },
    muzzle(pos, dir, big) {
      for (let i = 0; i < 6; i++) add(pos.clone().addScaledVector(dir, i * 0.6), dir.clone().multiplyScalar(8 + Math.random() * 10).add(new V3(r(3), r(3), r(3))), 1.4 + (big || 0), 3, 0.35, 0xffd070, 0.95, true);
      for (let i = 0; i < 4; i++) add(pos.clone(), dir.clone().multiplyScalar(3).add(new V3(r(3), 1 + Math.random() * 2, r(3))), 1.6, 6, 1.6, 0x999999, 0.5, false);
      noise(0.7, 0.8, 1400, 80);
    },
    sparks(pos, n) { for (let i = 0; i < n; i++) add(pos.clone(), new V3(r(16), Math.random() * 12, r(16)), 0.4, -0.2, 0.4 + Math.random() * 0.3, 0xffe9a0, 1, true); noise(0.25, 0.5, 5000, 800, 'bandpass'); },
    dust(pos, n) { for (let i = 0; i < n; i++) add(pos.clone(), new V3(r(5), 1 + Math.random() * 4, r(5)), 1.6, 5, 1.3, 0x9a8a6a, 0.6, false); noise(0.4, 0.3, 600, 100); },
    clank() { noise(0.35, 0.7, 4200, 600, 'bandpass'); },
    engine(vol, pitch) { /* sem som contínuo para economizar CPU */ },
  };
})(window.SB);
