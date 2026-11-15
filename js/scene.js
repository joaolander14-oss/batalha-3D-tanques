/* Cena Three.js: editor 3D, raio-X, gizmo, trajetória, estilhaços, modelo da munição */
(function (SB) {
  'use strict';
  const V3 = THREE.Vector3, D2R = SB.D2R, clamp = SB.clamp;
  let R, scene, cam, host, tankG, shotG, ammoG, aimG, gizG, rc, clock;
  const st = { th: 0.7, ph: 1.15, r: 13, tg: new V3(0, 1.1, 0) };
  const ents = new Map();
  const cfg = { xray: true, color: 'mat', frags: true, sel: null, mode: 'edit', dmg: null, snap: 0, aim: new V3(0, 1.1, -1.5), az: 0, el: 0, hideIds: new Set() };
  const cb = {};
  let shot = null, gizmo = null, drag = null, orbit = null, ammoCut = false, batchPts = null;
  const clipPlane = new THREE.Plane(new V3(0, 0, -1), 0);

  SB.STATE_COLOR = { intact: '#38c93f', light: '#b9dc3a', damaged: '#ffd21f', heavy: '#ff8a1a', destroyed: '#ff2a22', det: '#d63cff', pen: '#ff6a3a' };
  SB.shooterVec = (az, el) => { const a = az * D2R, e = el * D2R; return new V3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };

  /* ---------- geometria das peças ---------- */
  function wedgeGeo(sx, sy, sz) {
    const T = [[-1, -1], [-1, 1], [1, 1]], tris = [];
    const v = (x, t) => [x * sx / 2, t[0] * sy / 2, t[1] * sz / 2];
    tris.push(v(1, T[0]), v(1, T[1]), v(1, T[2]), v(-1, T[0]), v(-1, T[2]), v(-1, T[1]));
    const quad = (a, b, c, d) => tris.push(a, b, c, a, c, d);
    quad(v(-1, T[0]), v(1, T[0]), v(1, T[1]), v(-1, T[1]));
    quad(v(-1, T[1]), v(1, T[1]), v(1, T[2]), v(-1, T[2]));
    quad(v(-1, T[0]), v(-1, T[2]), v(1, T[2]), v(1, T[0]));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
    g.computeVertexNormals();
    return g;
  }
  function geoFor(p) {
    const [sx, sy, sz] = p.size;
    switch (p.shape) {
      case 'cyl': return new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 28);
      case 'sphere': { const g = new THREE.SphereGeometry(1, 24, 16); g.scale(sx / 2, sy / 2, sz / 2); return g; }
      case 'tube': { const Ro = sx / 2, ri = Math.max(0.001, Ro - (p.wall || 0.05)), h = sy / 2; return new THREE.LatheGeometry([[ri, -h], [Ro, -h], [Ro, h], [ri, h], [ri, -h]].map(a => new THREE.Vector2(a[0], a[1])), 36); }
      case 'capsule': {
        const Ro = sx / 2, hh = Math.max(0, sy / 2 - Ro), pts = [];
        for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; pts.push(new THREE.Vector2(Ro * Math.sin(a), (a <= Math.PI / 2 ? -hh : hh) - Ro * Math.cos(a))); }
        return new THREE.LatheGeometry(pts, 20);
      }
      case 'wedge': return wedgeGeo(sx, sy, sz);
      default: return new THREE.BoxGeometry(sx, sy, sz);
    }
  }
  SB.geoFor = geoFor;
  function place(mesh, p) { mesh.position.set(p.pos[0], p.pos[1], p.pos[2]); mesh.rotation.order = 'YXZ'; mesh.rotation.set(p.rot[0] * D2R, p.rot[1] * D2R, p.rot[2] * D2R); }
  function makeEnt(p) {
    const g = geoFor(p);
    const m = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide, transparent: true });
    const mesh = new THREE.Mesh(g, m);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
    mesh.add(edges); mesh.userData.id = p.id; place(mesh, p);
    tankG.add(mesh);
    return { part: p, mesh, edges, key: key(p) };
  }
  const key = p => [p.shape, p.size.join(','), p.wall].join('|');
  function thickColor(p) {
    const mm = (p.shape === 'tube' ? p.wall : (p.shape === 'cyl' ? p.size[1] : Math.min(p.size[0], p.size[1], p.size[2]))) * 1000;
    const c = new THREE.Color(); c.setHSL(clamp(mm / 300, 0, 1) * 0.33, 0.85, 0.5); return c;
  }
  function applyStyle() {
    ents.forEach((e, id) => {
      const p = e.part, m = e.mesh.material;
      const state = cfg.dmg ? cfg.dmg.get(id) : null;
      e.mesh.visible = !cfg.hideIds.has(id);
      m.emissive.setHex(0x000000);
      if (p.kind === 'armor') {
        const c = cfg.color === 'thick' ? thickColor(p) : new THREE.Color(SB.mat(p.mat).color);
        m.color.copy(c);
        m.opacity = cfg.xray ? 0.17 : 1; m.depthWrite = !cfg.xray;
        if (state === 'pen') { m.color.set(SB.STATE_COLOR.pen); m.opacity = cfg.xray ? 0.5 : 1; m.emissive.set(0x5a1a00); }
        e.edges.material.opacity = cfg.xray ? 0.75 : 0.35;
      } else {
        const sub = SB.SUBS[p.sub], base = sub ? sub.c : '#aaaaaa';
        m.color.set(state ? SB.STATE_COLOR[state] : base);
        if (state) m.emissive.set(SB.STATE_COLOR[state]).multiplyScalar(0.28);
        m.opacity = 1; m.depthWrite = true; e.edges.material.opacity = 0.5;
      }
      e.edges.material.color.set(cfg.sel === id ? 0xffff55 : 0x000000);
      if (cfg.sel === id) { e.edges.material.opacity = 1; m.emissive.set(0x222200); }
      m.needsUpdate = false;
    });
  }

  /* ---------- gizmo ---------- */
  function buildGizmo() {
    gizmo = new THREE.Group();
    [['x', 0xff4040, new V3(1, 0, 0)], ['y', 0x40ff60, new V3(0, 1, 0)], ['z', 0x4080ff, new V3(0, 0, 1)]].forEach(([ax, col, dir]) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: 0.95 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), mat); shaft.position.y = 0.5;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 12), mat); head.position.y = 1.12;
      [shaft, head].forEach(o => { o.renderOrder = 999; o.userData.axis = ax; g.add(o); });
      g.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir);
      gizmo.add(g);
    });
    gizmo.visible = false; gizG.add(gizmo);
  }
  function updateGizmo() {
    const e = cfg.sel && ents.get(cfg.sel);
    gizmo.visible = !!e && cfg.mode === 'edit';
    if (gizmo.visible) { gizmo.position.copy(e.mesh.position); gizmo.scale.setScalar(st.r * 0.11); }
  }

  /* ---------- câmera ---------- */
  function updateCam() {
    st.ph = clamp(st.ph, 0.05, Math.PI - 0.05); st.r = clamp(st.r, 0.8, 80);
    cam.position.set(st.tg.x + st.r * Math.sin(st.ph) * Math.sin(st.th), st.tg.y + st.r * Math.cos(st.ph), st.tg.z + st.r * Math.sin(st.ph) * Math.cos(st.th));
    cam.lookAt(st.tg);
  }
  function ndcOf(ev) { const b = R.domElement.getBoundingClientRect(); return new THREE.Vector2(((ev.clientX - b.left) / b.width) * 2 - 1, -((ev.clientY - b.top) / b.height) * 2 + 1); }
  function pickParts(ev) {
    rc.setFromCamera(ndcOf(ev), cam);
    const list = []; ents.forEach(e => { if (e.mesh.visible) list.push(e.mesh); });
    const hits = rc.intersectObjects(list, false);
    return hits;
  }
  function axisParam(ev, p0, u) {
    rc.setFromCamera(ndcOf(ev), cam);
    const o = rc.ray.origin, r = rc.ray.direction, w0 = p0.clone().sub(o);
    const b = u.dot(r), d = u.dot(w0), e = r.dot(w0), den = 1 - b * b;
    if (Math.abs(den) < 1e-5) return null;
    return (b * e - d) / den;
  }

  function onDown(ev) {
    R.domElement.setPointerCapture(ev.pointerId);
    const info = { x: ev.clientX, y: ev.clientY, moved: 0, btn: ev.button, shift: ev.shiftKey };
    if (ev.button === 0 && cfg.mode === 'edit' && gizmo.visible) {
      rc.setFromCamera(ndcOf(ev), cam);
      const hits = rc.intersectObjects(gizmo.children.flatMap(g => g.children), false);
      if (hits.length) {
        const ax = hits[0].object.userData.axis, e = ents.get(cfg.sel);
        const u = new V3(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0);
        const s0 = axisParam(ev, e.mesh.position.clone(), u);
        if (s0 != null) { drag = { ax, u, s0, start: e.mesh.position.clone(), id: cfg.sel }; return; }
      }
    }
    orbit = info;
  }
  function onMove(ev) {
    if (drag) {
      const e = ents.get(drag.id); if (!e) return;
      const s = axisParam(ev, drag.start, drag.u); if (s == null) return;
      const np = drag.start.clone().addScaledVector(drag.u, s - drag.s0);
      if (cfg.snap > 0) { np.x = Math.round(np.x / cfg.snap) * cfg.snap; np.y = Math.round(np.y / cfg.snap) * cfg.snap; np.z = Math.round(np.z / cfg.snap) * cfg.snap; }
      e.mesh.position.copy(np);
      cb.onMove && cb.onMove(drag.id, [SB.round(np.x, 3), SB.round(np.y, 3), SB.round(np.z, 3)]);
      return;
    }
    if (!orbit) return;
    const dx = ev.clientX - orbit.x, dy = ev.clientY - orbit.y;
    orbit.moved += Math.abs(dx) + Math.abs(dy); orbit.x = ev.clientX; orbit.y = ev.clientY;
    if (orbit.btn === 0 && !orbit.shift) { st.th -= dx * 0.006; st.ph -= dy * 0.006; }
    else { const k = st.r * 0.0016, right = new V3().setFromMatrixColumn(cam.matrix, 0), up = new V3().setFromMatrixColumn(cam.matrix, 1); st.tg.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  }
  function onUp(ev) {
    if (drag) { drag = null; return; }
    if (!orbit) return;
    const o = orbit; orbit = null;
    if (o.btn === 0 && o.moved < 5) {
      if (cfg.mode === 'edit') {
        const hits = pickParts(ev);
        cb.onPick && cb.onPick(hits.length ? hits[0].object.userData.id : null);
      } else if (cfg.mode === 'sim') {
        const hits = pickParts(ev);
        if (hits.length) cb.onAim && cb.onAim([SB.round(hits[0].point.x, 3), SB.round(hits[0].point.y, 3), SB.round(hits[0].point.z, 3)]);
      }
    }
  }
  function onWheel(ev) { ev.preventDefault(); st.r *= Math.exp(ev.deltaY * 0.0012); }

  /* ---------- init ---------- */
  function init(el) {
    host = el; clock = new THREE.Clock(); rc = new THREE.Raycaster();
    R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.setClearColor(0x0d1117); R.localClippingEnabled = true;
    host.appendChild(R.domElement);
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x0d1117, 40, 90);
    cam = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x3a3a44, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.75); dl.position.set(6, 12, 8); scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0x8899ff, 0.35); dl2.position.set(-8, 5, -6); scene.add(dl2);
    const grid = new THREE.GridHelper(40, 40, 0x2f4058, 0x1c2735); grid.name = 'grid'; scene.add(grid);
    tankG = new THREE.Group(); shotG = new THREE.Group(); ammoG = new THREE.Group(); aimG = new THREE.Group(); gizG = new THREE.Group();
    [tankG, shotG, ammoG, aimG, gizG].forEach(g => scene.add(g));
    const front = new THREE.ArrowHelper(new V3(0, 0, -1), new V3(0, 0.02, -3.6), 1.1, 0x4a90ff, 0.3, 0.2); front.name = 'front'; scene.add(front);
    buildGizmo();
    const c = R.domElement;
    c.addEventListener('pointerdown', onDown); c.addEventListener('pointermove', onMove); c.addEventListener('pointerup', onUp);
    c.addEventListener('wheel', onWheel, { passive: false }); c.addEventListener('contextmenu', e => e.preventDefault());
    const rs = () => { const w = host.clientWidth || 600, h = host.clientHeight || 400; R.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    new ResizeObserver(rs).observe(host); rs();
    updateCam();
    (function loop() { requestAnimationFrame(loop); frame(); })();
  }

  /* ---------- animação ---------- */
  function frame() {
    const dt = clock.getDelta();
    if (SB._paused) return;
    updateCam(); updateGizmo();
    if (shot) animShot();
    aimG.children.forEach(o => { if (o.userData.pulse) o.scale.setScalar(st.r * 0.012 * (1 + 0.15 * Math.sin(performance.now() / 200))); });
    R.render(scene, cam);
  }
  function animShot() {
    const t = (performance.now() - shot.t0) / 1000;
    const rev = Math.min(1, t / shot.dur1), e = 1 - Math.pow(1 - rev, 2), reveal = e * shot.total;
    shot.segs.forEach(s => { const f = clamp((reveal - s.s0) / s.len, 0, 1); s.mesh.visible = f > 0; s.mesh.scale.y = Math.max(s.len * f, 1e-4); });
    // marcador do projétil
    let acc = 0, pos = null;
    for (const s of shot.segs) { if (s.type === 'rico') continue; if (reveal <= s.s0 + s.len) { pos = s.a.clone().lerp(s.b, clamp((reveal - s.s0) / s.len, 0, 1)); break; } }
    shot.marker.visible = rev < 1 && !!pos; if (pos) shot.marker.position.copy(pos);
    if (t > shot.dur1) {
      if (!shot.impacted) { shot.impacted = true; cb.onImpact && cb.onImpact(); }
      const k = clamp((t - shot.dur1) / 0.8, 0, 1);
      if (shot.fragLines) {
        const pa = shot.fragLines.geometry.attributes.position, pts = shot.fragPts.geometry.attributes.position;
        shot.frags.forEach((f, i) => {
          const q = f.a.clone().lerp(f.b, k);
          pa.setXYZ(i * 2, f.a.x, f.a.y, f.a.z); pa.setXYZ(i * 2 + 1, q.x, q.y, q.z);
          pts.setXYZ(i, q.x, q.y, q.z);
        });
        pa.needsUpdate = true; pts.needsUpdate = true;
        shot.fragLines.visible = shot.fragPts.visible = cfg.frags;
      }
      shot.blastMeshes.forEach(b => { const s = b.r * clamp(k * 1.5, 0, 1); b.mesh.scale.setScalar(Math.max(s, 1e-3)); b.mesh.material.opacity = 0.55 * (1 - clamp((t - shot.dur1 - 0.3) / 1.6, 0, 1)) ; });
    }
  }

  function seg(a, b, r, color, opacity) {
    const len = a.distanceTo(b);
    const g = new THREE.CylinderGeometry(r, r, 1, 8); g.translate(0, 0.5, 0);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: opacity != null, opacity: opacity == null ? 1 : opacity, depthTest: true }));
    m.position.copy(a); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize()); m.scale.set(1, len, 1);
    return { mesh: m, len };
  }
  function clearGroup(g) { while (g.children.length) { const o = g.children.pop(); o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose && x.material.dispose(); }); } }

  const PATHCOL = { air: [0x9aa5b4, 0.007, 0.55], in: [0xffd34d, 0.016], armor: [0xff7a1a, 0.026], jet: [0x40e0ff, 0.014], rico: [0x66e0ff, 0.014, 0.8] };

  SB.Scene = {
    init,
    on(o) { Object.assign(cb, o); },
    state: st,
    setMode(m) {
      cfg.mode = m;
      tankG.visible = m !== 'ammo'; ammoG.visible = m === 'ammo'; shotG.visible = m === 'sim'; aimG.visible = m === 'sim';
      scene.getObjectByName('front').visible = m !== 'ammo'; scene.getObjectByName('grid').visible = m !== 'ammo';
      if (m === 'ammo') { st.tg.set(0, 0, 0); st.r = 11; st.ph = 1.3; st.th = 0.6; } else if (st.tg.length() < 0.5 && st.r < 8) { st.tg.set(0, 1.1, 0); st.r = 13; }
    },
    sync(tank) {
      const ids = new Set(tank.parts.map(p => p.id));
      ents.forEach((e, id) => { if (!ids.has(id)) { tankG.remove(e.mesh); e.mesh.geometry.dispose(); ents.delete(id); } });
      tank.parts.forEach(p => {
        let e = ents.get(p.id);
        if (!e) { e = makeEnt(p); ents.set(p.id, e); }
        else if (e.part !== p) {
          if (e.key !== key(p)) { e.mesh.geometry.dispose(); e.mesh.geometry = geoFor(p); e.edges.geometry.dispose(); e.edges.geometry = new THREE.EdgesGeometry(e.mesh.geometry, 28); e.key = key(p); }
          place(e.mesh, p); e.part = p;
        }
      });
      applyStyle();
    },
    setSel(id) { cfg.sel = id; applyStyle(); },
    setCfg(o) { Object.assign(cfg, o); if (o.hideIds) cfg.hideIds = o.hideIds; applyStyle(); },
    setDamage(map) { cfg.dmg = map; applyStyle(); },
    setShooter(az, el, aim) {
      cfg.az = az; cfg.el = el; cfg.aim = new V3(aim[0], aim[1], aim[2]);
      clearGroup(aimG);
      const s = SB.shooterVec(az, el);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.14, 8, 28), new THREE.MeshBasicMaterial({ color: 0xff3b3b, depthTest: false, transparent: true, opacity: 0.95 }));
      ring.position.copy(cfg.aim); ring.renderOrder = 500; ring.userData.pulse = true; ring.lookAt(cfg.aim.clone().add(s)); aimG.add(ring);
      const arrow = new THREE.ArrowHelper(s.clone().negate(), cfg.aim.clone().addScaledVector(s, 5), 5, 0xff5555, 0.5, 0.3);
      aimG.add(arrow);
    },
    viewFromShooter() { const s = SB.shooterVec(cfg.az, cfg.el); st.tg.copy(cfg.aim); st.ph = Math.acos(clamp(s.y, -1, 1)); st.th = Math.atan2(s.x, s.z); st.r = 9; },
    resetCam() { st.tg.set(0, 1.1, 0); st.r = 13; st.th = 0.7; st.ph = 1.15; },
    camPreset(n) { st.tg.set(0, 1.1, 0); st.r = 13; if (n === 'top') { st.ph = 0.05; st.th = 0; } else if (n === 'side') { st.ph = Math.PI / 2; st.th = Math.PI / 2; } else if (n === 'front') { st.ph = Math.PI / 2; st.th = Math.PI; } else if (n === 'back') { st.ph = Math.PI / 2; st.th = 0; } },
    clearShot() { shot = null; clearGroup(shotG); batchPts = null; },
    showShot(res) {
      clearGroup(shotG); shot = null;
      const segs = []; let acc = 0;
      res.path.forEach(p => {
        const [col, r, op] = PATHCOL[p.type] || PATHCOL.in;
        const s = seg(p.a, p.b, r, col, op); shotG.add(s.mesh);
        segs.push({ mesh: s.mesh, len: s.len, s0: acc, a: p.a, b: p.b, type: p.type });
        if (p.type !== 'rico') acc += s.len; else acc += 0;
      });
      // segmentos 'rico' não somam ao comprimento; recalcula s0
      let a2 = 0; segs.forEach(s => { s.s0 = a2; if (s.type !== 'rico') a2 += s.len; else s.len = Math.max(s.len, 1e-3); });
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); shotG.add(marker);
      if (res.endPos) {
        const ec = res.endType === 'stop' ? 0xff3030 : res.endType === 'boom' ? 0xffa030 : res.endType === 'rico' ? 0x66e0ff : 0xffffff;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: ec, depthTest: false, transparent: true, opacity: 0.9 })); m.position.copy(res.endPos); m.renderOrder = 400; shotG.add(m);
      }
      const blastMeshes = res.blasts.map(b => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffa63a, transparent: true, opacity: 0.55, depthWrite: false }));
        mesh.position.copy(b.pos); mesh.scale.setScalar(1e-3); shotG.add(mesh);
        return { mesh, r: 0.25 + 0.45 * Math.cbrt(b.tnt) };
      });
      const fr = res.frags, pos = new Float32Array(fr.length * 6), col = new Float32Array(fr.length * 6), pp = new Float32Array(fr.length * 3), pc = new Float32Array(fr.length * 3);
      const cc = new THREE.Color();
      fr.forEach((f, i) => {
        cc.setHSL(0.02 + 0.14 * f.e, 1, 0.42 + 0.3 * f.e);
        col.set([cc.r, cc.g, cc.b, cc.r, cc.g, cc.b], i * 6);
        if (f.hit) pc.set([1, 1, 1], i * 3); else pc.set([cc.r, cc.g, cc.b], i * 3);
      });
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.9 })); lines.renderOrder = 300; lines.frustumCulled = false; shotG.add(lines);
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, depthTest: false })); pts.renderOrder = 301; pts.frustumCulled = false; shotG.add(pts);
      shot = { t0: performance.now(), dur1: Math.min(1.4, 0.5 + acc * 0.05), total: Math.max(a2, 1e-3), segs, marker, frags: fr, fragLines: fr.length ? lines : null, fragPts: pts, blastMeshes, impacted: false };
      if (!fr.length) { shot.fragLines = null; }
    },
    showBatch(points) {
      clearGroup(shotG); shot = null;
      const pos = new Float32Array(points.length * 3), col = new Float32Array(points.length * 3), c = new THREE.Color();
      points.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); c.set(p.color); col.set([c.r, c.g, c.b], i * 3); });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, depthTest: false, transparent: true, opacity: 0.9 })); pts.renderOrder = 350; pts.frustumCulled = false;
      shotG.add(pts);
    },
    showAmmo(ammo, cut) {
      clearGroup(ammoG);
      const S = 0.02; let L = 0;
      ammo.layers.forEach(l => l.pts.forEach(p => { L = Math.max(L, p[0]); }));
      const grp = new THREE.Group();
      ammo.layers.forEach(l => {
        if (l.pts.length < 3) return;
        const pts = l.pts.map(p => new THREE.Vector2(Math.max(p[1], 0) * S, p[0] * S));
        pts.push(pts[0].clone());
        const g = new THREE.LatheGeometry(pts, 48);
        const mt = SB.mat(l.mat);
        const m = new THREE.MeshStandardMaterial({ color: mt.color, roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide, transparent: l.role === 'sabot', opacity: l.role === 'sabot' ? 0.5 : 1, clippingPlanes: cut ? [clipPlane] : [] });
        grp.add(new THREE.Mesh(g, m));
      });
      grp.rotation.z = -Math.PI / 2; grp.position.x = -L * S / 2; grp.position.y = 0;
      ammoG.add(grp);
      const grid = new THREE.GridHelper(10, 20, 0x2f4058, 0x1c2735); grid.position.y = -2; ammoG.add(grid);
    },
    snapshot() { return R.domElement.toDataURL('image/png'); },
    render() { R.render(scene, cam); },
    _dbg: { ents, cfg, st },
  };
})(window.SB);
