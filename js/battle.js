/* Batalha de tanques 3D: física, tiros balísticos, dano real (SB.Sim), bots, HUD e rede */
(function (SB) {
  'use strict';
  const V3 = THREE.Vector3, Q = THREE.Quaternion, D2R = SB.D2R, clamp = SB.clamp, G = 9.81;
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const TEAMCOL = { A: '#3aa0ff', B: '#ff5a4a' };
  const PAINT = { 'EUA': 0x5d6b3b, 'URSS': 0x4b5c36, 'Alemanha': 0x8c8158, 'Reino Unido': 0x6c6c4a, 'Rússia': 0x485a3c, 'Customizado': 0x6d7163 };
  let B = null; // estado da partida

  /* ---------------- util ---------------- */
  function defaultLoadout(stats) {
    const P = SB.ammoLib ? SB.ammoLib() : SB.AMMO_PRESETS(), pick = t => P.find(a => a.type === t && a.builtin) || P.find(a => a.type === t) || P[0];
    const main = stats.cal >= 105 ? 'APFSDS' : stats.cal >= 85 ? 'APCBC' : 'APCBC';
    const L = [{ ammo: pick(main), n: 0 }, { ammo: pick('HEAT'), n: 0 }, { ammo: pick('HE'), n: 0 }];
    const r = stats.rack; L[0].n = Math.round(r * 0.5); L[1].n = Math.round(r * 0.25); L[2].n = r - L[0].n - L[1].n; return L;
  }
  SB.defaultLoadout = defaultLoadout;

  /* ---------------- construção do tanque ---------------- */
  function buildObj(ent) {
    const def = ent.def, st = def.stats, col = def.paint || PAINT[def.nation || 'Customizado'] || 0x6d7163;
    const tc = new THREE.Color(TEAMCOL[ent.team]);
    const mats = {
      body: new THREE.MeshLambertMaterial({ color: col, emissive: tc.clone().multiplyScalar(0.07), side: THREE.DoubleSide }),
      dark: new THREE.MeshLambertMaterial({ color: 0x2b2d2a, side: THREE.DoubleSide }),
      era: new THREE.MeshLambertMaterial({ color: 0x3b3a30, side: THREE.DoubleSide }),
    };
    ent.mats = mats;
    const Gt = new THREE.Group(), T = new THREE.Group(), U = new THREE.Group();
    T.position.set(...st.turPivot); Gt.add(T);
    U.position.set(st.gunPivot[0] - st.turPivot[0], st.gunPivot[1] - st.turPivot[1], st.gunPivot[2] - st.turPivot[2]); T.add(U);
    ent.G = Gt; ent.T = T; ent.U = U; ent.objs = {}; ent.wparts = [];
    const muz = new THREE.Object3D(); muz.position.set(st.muzzle[0] - st.gunPivot[0], st.muzzle[1] - st.gunPivot[1], st.muzzle[2] - st.gunPivot[2]); U.add(muz); ent.muz = muz;
    def.parts.forEach(p => {
      const parent = p.grp === 'gun' ? U : p.grp === 'turret' ? T : Gt, off = p.grp === 'gun' ? st.gunPivot : p.grp === 'turret' ? st.turPivot : [0, 0, 0];
      let o;
      if (p.kind === 'armor') {
        const m = p.mat === 'era' ? mats.era : (p.mat === 'rub' || p.name.startsWith('Saia') ? mats.dark : mats.body);
        o = new THREE.Mesh(SB.geoFor(p), m);
      } else o = new THREE.Object3D();
      o.position.set(p.pos[0] - off[0], p.pos[1] - off[1], p.pos[2] - off[2]); o.rotation.order = 'YXZ'; o.rotation.set(p.rot[0] * D2R, p.rot[1] * D2R, p.rot[2] * D2R);
      parent.add(o); ent.objs[p.id] = o; const wp = Object.assign({}, p); wp._pos = new V3(); wp._q = new Q(); ent.wparts.push(wp);
    });
    const DCOL = { rubber: 0x1c1c1c, metal: 0x3a3c3e, dark: 0x2a2c28, track: 0x2b2824 }, buckets = {};
    (def.deco || []).forEach(d => {
      const grp = d.grp || 'hull', off = grp === 'gun' ? st.gunPivot : grp === 'turret' ? st.turPivot : [0, 0, 0];
      const g = SB.geoFor({ shape: d.shape, size: d.size, wall: d.wall || 0.03 }).clone();
      g.applyMatrix4(new THREE.Matrix4().compose(new V3(d.pos[0] - off[0], d.pos[1] - off[1], d.pos[2] - off[2]), new Q().setFromEuler(new THREE.Euler(d.rot[0] * D2R, d.rot[1] * D2R, d.rot[2] * D2R, 'YXZ')), new V3(1, 1, 1)));
      const ng = g.index ? g.toNonIndexed() : g, key = grp + '|' + d.color, b = buckets[key] || (buckets[key] = { grp, color: d.color, pos: [], nor: [] });
      b.pos.push(ng.attributes.position.array); b.nor.push(ng.attributes.normal.array);
    });
    Object.values(buckets).forEach(b => {
      const cat = arr => { let n = 0; arr.forEach(a => n += a.length); const o = new Float32Array(n); let i = 0; arr.forEach(a => { o.set(a, i); i += a.length; }); return o; };
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(cat(b.pos), 3)); g.setAttribute('normal', new THREE.BufferAttribute(cat(b.nor), 3));
      let m = b.color === 'body' ? mats.body : (mats[b.color] || (mats[b.color] = new THREE.MeshLambertMaterial({ color: DCOL[b.color] || 0x333333, side: THREE.DoubleSide })));
      (b.grp === 'gun' ? U : b.grp === 'turret' ? T : Gt).add(new THREE.Mesh(g, m));
    });
    // sombra simples
    const sh = new THREE.Mesh(new THREE.CircleGeometry(st.bodyLen * 0.55, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.12; sh.scale.set(0.6, 1, 1); Gt.add(sh); ent.shadow = sh;
    return Gt;
  }
  const _s = new V3();
  function updateWorld(ent) {
    ent.G.updateMatrixWorld(true);
    for (const wp of ent.wparts) ent.objs[wp.id].matrixWorld.decompose(wp._pos, wp._q, _s);
  }

  function makeEnt(spec) {
    const def = spec.tank ? SB.fillStats(JSON.parse(JSON.stringify(spec.tank))) : SB.getTankById(spec.tankId);
    def.nation = def.nation || (spec.tank ? 'Customizado' : '');
    const ent = {
      eid: spec.eid, owner: spec.owner, team: spec.team, name: spec.name, bot: !!spec.bot, def, st: def.stats, dmg: {}, alive: true, kills: 0, deaths: 0,
      x: 0, z: 0, y: 0, yaw: 0, pitch: 0, roll: 0, v: 0, tYaw: 0, gP: 0, reload: 2, sel: 0, ctl: { thr: 0, steer: 0, aimYaw: 0, aimPitch: 0, fire: false },
      stat: null, burn: 0, burning: false, ext: 1, respawn: 0, snap: null,
    };
    ent.ammo = (spec.loadout || defaultLoadout(ent.st)).filter(l => l.n > 0 || true).slice(0, 4).map(l => ({ src: l.ammo, A: SB.ammoForGun(l.ammo, ent.st), n: l.n, n0: l.n }));
    if (!ent.ammo.length) ent.ammo = defaultLoadout(ent.st).map(l => ({ src: l.ammo, A: SB.ammoForGun(l.ammo, ent.st), n: l.n, n0: l.n }));
    ent.rad = 0.5 * Math.hypot(ent.st.bodyLen, ent.st.bodyWid) + 0.8;
    buildObj(ent); B.scene.add(ent.G);
    ent.stat = evalDmg(ent);
    return ent;
  }

  /* ---------------- dano acumulado → estado do tanque ---------------- */
  function evalDmg(ent) {
    const P = ent.def.parts, r = p => { const d = ent.dmg[p.id]; const hp = Math.max(1, p.hp || (SB.SUBS[p.sub] ? SB.SUBS[p.sub].hp : 100)); return d ? d.acc / hp : 0; };
    const crew = P.filter(p => p.kind === 'crew'), alive = crew.filter(p => r(p) < 1);
    const of = s => P.filter(p => p.sub === s), dead = s => of(s).length > 0 && of(s).every(p => r(p) >= 1);
    const eng = of('engine')[0], tracks = of('track'), tD = tracks.filter(p => r(p) >= 1).length;
    let speedF = 1;
    if (eng) speedF *= 1 - clamp(r(eng), 0, 1) * 0.6; if (dead('engine') || dead('trans')) speedF = 0;
    if (tracks.length) { if (tD >= tracks.length) speedF = 0; else if (tD > 0) speedF *= 0.4; }
    if (crew.some(p => p.sub === 'driver' && r(p) >= 1)) speedF *= 0.6;
    const gunner = crew.filter(p => p.sub === 'gunner'), loader = crew.filter(p => p.sub === 'loader');
    return {
      speedF, turnF: tD >= 1 ? 0.5 : 1, gunDead: dead('breech') || (gunner.length && gunner.every(p => r(p) >= 1) && !crew.some(p => p.sub === 'commander' && r(p) < 1)),
      travF: (gunner.length && gunner.every(p => r(p) >= 1) ? 0.3 : 1) * (dead('drive') ? 0.2 : 1), loaderDead: loader.length > 0 && loader.every(p => r(p) >= 1),
      crew: alive.length, crewTotal: crew.length, tracksD: tD, engDead: dead('engine'), optDead: dead('optics'),
    };
  }
  SB.evalDmg = evalDmg;

  /* ---------------- iniciar / parar ---------------- */
  function start(cfg) {
    if (B) stop(true);
    const root = document.getElementById('root'); root.style.display = 'none'; SB._paused = true;
    const el = document.createElement('div'); el.id = 'battle'; document.body.appendChild(el);
    el.innerHTML = HUD_HTML;
    const map = SB.makeMap(cfg.map, cfg.seed);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor(map.def.sky);
    el.insertBefore(renderer.domElement, el.firstChild);
    const scene = new THREE.Scene(); scene.fog = new THREE.Fog(map.def.fog, 300, 1500);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 3500);
    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x555544, 0.9)); const sun = new THREE.DirectionalLight(0xfff0d8, 0.9); sun.position.set(300, 500, 200); scene.add(sun);
    scene.add(SB.buildMapMesh(map));
    SB.FX.init(scene);
    B = {
      myPeer: cfg.myPeer, cfg, map, el, renderer, scene, camera, ents: new Map(), shells: [], keys: {}, camYaw: 0, camPitch: 0.05, dist: 15, scope: false, zoom: 12, last: performance.now(), run: true, score: { A: 0, B: 0 },
      feed: [], msgT: 0, hudT: 0, netT: 0, shake: 0, lock: false, over: false, t: 0, me: null, tracers: new THREE.Group(), names: [], aimR: 500, fovBase: 60, bots: [], paused: false,
    };
    scene.add(B.tracers);
    // entidades
    const slotA = { A: 0, B: 0 };
    cfg.specs.forEach(sp => {
      const e = makeEnt(sp); B.ents.set(e.eid, e);
      const sl = map.spawns[e.team][(slotA[e.team]++) % map.spawns[e.team].length]; placeAt(e, sl.x, sl.z, sl.yaw);
      if (sp.eid === cfg.myEid) B.me = e;
    });
    if (!B.me) { B.me = [...B.ents.values()][0]; }
    B.camYaw = B.me.yaw; scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    bind(); resize();
    SB.Net.onMsg = onNet;
    B.run = true; B.raf = requestAnimationFrame(loop);
    toast('Batalha iniciada! WASD move, mouse mira, clique atira, botão direito = mira telescópica.', 5);
    if (el.requestFullscreen) try { el.requestFullscreen(); } catch (e) { }
  }
  function stop(silent) {
    if (!B) return; B.run = false; cancelAnimationFrame(B.raf);
    unbind(); try { document.exitPointerLock(); } catch (e) { } try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { }
    SB.FX.clear(); B.renderer.dispose(); B.el.remove(); B = null;
    document.getElementById('root').style.display = ''; SB._paused = false; SB.Net.onMsg = SB.Lobby && SB.Lobby.onMsg;
    if (!silent && SB.Lobby && SB.Lobby.onExit) SB.Lobby.onExit();
  }
  function placeAt(e, x, z, yaw) { e.x = x; e.z = z; e.yaw = yaw; e.v = 0; e.tYaw = 0; e.gP = 0; e.y = B.map.H(x, z); poseEnt(e, 1); }

  /* ---------------- entrada ---------------- */
  const HUD_HTML = `
<div id="hud">
 <div id="cross"></div><div id="gunmk"></div><div id="scope"><div class="sc-h"></div><div class="sc-v"></div></div>
 <div id="topc"><span class="ta">AZUL 0</span> <span class="tm">15:00</span> <span class="tb">VERM. 0</span></div>
 <div id="feed"></div><div id="msg"></div>
 <div id="rpf" class="frame" style="display:none;left:16px;top:62px;width:420px;height:280px"><span></span></div>
 <div id="xrf" class="frame" style="display:none;right:12px;bottom:192px;width:330px;height:230px"><span>RAIO-X DO MEU TANQUE (X)</span></div>
 <div id="status"><div id="spd">0 km/h</div><div id="rng">alcance: --</div><div id="crewl"></div><canvas id="mods" width="200" height="120"></canvas></div>
 <div id="ammo"></div><div id="reload"><div></div></div>
 <canvas id="mini" width="170" height="170"></canvas>
 <div id="names"></div>
 <div id="score" style="display:none"></div>
 <div id="pause" style="display:none"><h2>Pausa</h2><button id="bres">Continuar</button><button id="bexit">Sair da batalha</button></div>
 <div id="endb" style="display:none"></div>
 <div id="help">WASD mover · Mouse mirar · Clique atirar · Botão dir. mira · 1-4 munição · X raio-X · F extintor · C câmera · Tab placar · Esc pausa</div>
</div>`;
  const $ = id => B.el.querySelector('#' + id);
  const H = { kd: null, ku: null, mm: null, md: null, mu: null, wh: null, rs: null, cm: null, pl: null };
  function bind() {
    H.kd = e => {
      if (!B) return; if (e.repeat && e.code !== 'Space') { } B.keys[e.code] = true;
      if (e.code >= 'Digit1' && e.code <= 'Digit4') { const i = +e.code.slice(5) - 1; if (B.me.ammo[i]) { B.me.sel = i; } }
      if (e.code === 'KeyF') extinguish(B.me);
      if (e.code === 'KeyX') toggleXray();
      if (e.code === 'KeyC') B.scope = !B.scope;
      if (e.code === 'Tab') { e.preventDefault(); $('score').style.display = 'block'; renderScore(); }
      if (e.code === 'Escape') { B.paused = true; $('pause').style.display = 'flex'; }
      if (e.code === 'KeyR') B.me.sel = (B.me.sel + 1) % B.me.ammo.length;
    };
    H.ku = e => { if (!B) return; B.keys[e.code] = false; if (e.code === 'Tab') $('score').style.display = 'none'; };
    H.mm = e => { if (!B || !B.lock || B.paused) return; const s = (B.scope ? 0.0006 * B.zoom / 12 : 0.0022); B.camYaw -= e.movementX * s; B.camPitch = clamp(B.camPitch - e.movementY * s, -0.45, 0.6); };
    H.md = e => { if (!B) return; if (B.paused) return; if (!B.lock) { B.renderer.domElement.requestPointerLock && B.renderer.domElement.requestPointerLock(); } if (e.button === 0) B.keys.Fire = true; if (e.button === 2) B.scope = !B.scope; };
    H.mu = e => { if (B && e.button === 0) B.keys.Fire = false; };
    H.wh = e => { if (!B) return; if (B.scope) B.zoom = clamp(B.zoom * (e.deltaY > 0 ? 1.15 : 0.87), 4, 24); else B.dist = clamp(B.dist * (e.deltaY > 0 ? 1.1 : 0.9), 7, 34); };
    H.rs = () => resize(); H.cm = e => e.preventDefault();
    H.pl = () => { if (!B) return; B.lock = document.pointerLockElement === B.renderer.domElement; if (!B.lock && !B.over && !B.paused) { B.paused = true; $('pause').style.display = 'flex'; } };
    addEventListener('keydown', H.kd); addEventListener('keyup', H.ku); addEventListener('mousemove', H.mm); addEventListener('mousedown', H.md); addEventListener('mouseup', H.mu);
    addEventListener('wheel', H.wh, { passive: true }); addEventListener('resize', H.rs); addEventListener('contextmenu', H.cm); document.addEventListener('pointerlockchange', H.pl);
    $('bres').onclick = () => { B.paused = false; $('pause').style.display = 'none'; B.renderer.domElement.requestPointerLock && B.renderer.domElement.requestPointerLock(); };
    $('bexit').onclick = () => { if (SB.Net.mode === 'host') SB.Net.send({ t: 'abort' }); stop(); };
  }
  function unbind() { removeEventListener('keydown', H.kd); removeEventListener('keyup', H.ku); removeEventListener('mousemove', H.mm); removeEventListener('mousedown', H.md); removeEventListener('mouseup', H.mu); removeEventListener('wheel', H.wh); removeEventListener('resize', H.rs); removeEventListener('contextmenu', H.cm); document.removeEventListener('pointerlockchange', H.pl); }
  function resize() { const w = innerWidth, h = innerHeight; B.renderer.setSize(w, h); B.camera.aspect = w / h; B.camera.updateProjectionMatrix(); }

  /* ---------------- física dos tanques ---------------- */
  function poseEnt(e, k) {
    const st = e.st, hl = st.bodyLen / 2, hw = st.bodyWid / 2, H_ = B.map.H, fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
    const hF = H_(e.x + fx * hl, e.z + fz * hl), hB = H_(e.x - fx * hl, e.z - fz * hl), hR = H_(e.x + rx * hw, e.z + rz * hw), hL = H_(e.x - rx * hw, e.z - rz * hw);
    const tp = Math.atan2(hF - hB, st.bodyLen), tr = Math.atan2(hR - hL, st.bodyWid), th = (hF + hB + hR + hL) / 4;
    e.pitch += (tp - e.pitch) * k; e.roll += (tr - e.roll) * k; e.y = th;
    const G_ = e.G; G_.position.set(e.x, e.y - 0.12, e.z); G_.rotation.order = 'YXZ'; G_.rotation.set(e.pitch, e.yaw, e.roll);
    e.T.rotation.y = e.tYaw; e.U.rotation.x = e.gP;
  }
  function driveEnt(e, dt) {
    const st = e.st, c = e.ctl, S = e.stat, vmax = st.vmax / 3.6 * S.speedF, rev = st.rev / 3.6 * S.speedF;
    if (!e.alive) { e.v *= Math.exp(-2 * dt); }
    else {
      const slope = Math.sin(e.pitch);
      const tgt = (c.thr >= 0 ? c.thr * vmax : c.thr * rev) * (1 - clamp(slope * 1.6, -0.2, 0.85));
      const acc = clamp(7 - st.mass / 12, 1.8, 5.5) * (S.speedF > 0 ? 1 : 3);
      e.v += clamp(tgt - e.v, -acc * 1.6 * dt, acc * dt);
      const tr = st.turn * D2R * S.turnF * (1 - clamp(Math.abs(e.v) / (st.vmax / 3.6 * 1.9), 0, 0.55)) * (S.speedF > 0 ? 1 : 0);
      e.yaw += c.steer * tr * dt * (e.v < -0.5 ? -1 : 1);
    }
    let nx = e.x - Math.sin(e.yaw) * e.v * dt, nz = e.z - Math.cos(e.yaw) * e.v * dt;
    [nx, nz] = B.map.push(nx, nz, 2.6);
    for (const o of B.ents.values()) { if (o === e || !o.alive && false) continue; const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz), m = 6.2; if (d < m && d > 0.01) { nx = o.x + dx / d * m; nz = o.z + dz / d * m; e.v *= 0.9; } }
    if (Math.hypot(nx - e.x, nz - e.z) < Math.abs(e.v) * dt * 0.4) e.v *= 0.5;
    e.x = nx; e.z = nz;
    // torre e canhão
    if (e.alive) {
      const lim = st.fixedGun ? 8 * D2R : 9, wantT = wrap(c.aimYaw - e.yaw), goalT = st.fixedGun ? clamp(wantT, -lim, lim) : wantT, rate = st.trav * D2R * S.travF;
      e.tYaw += clamp(wrap(goalT - e.tYaw), -rate * dt, rate * dt);
      const wantP = c.aimPitch - e.pitch * Math.cos(e.tYaw), goalP = clamp(wantP, st.elev[0] * D2R, st.elev[1] * D2R), rp = 0.5 * Math.max(0.25, S.travF);
      e.gP += clamp(goalP - e.gP, -rp * dt, rp * dt);
    }
    poseEnt(e, Math.min(1, dt * 6));
    if (e.reload > 0) e.reload -= dt;
    if (c.fire && e.alive) tryFire(e);
  }
  const reloadT = e => e.st.reload * (e.stat.loaderDead ? 1.8 : 1);
  function muzzleInfo(e) { updateWorld(e); const p = new V3(); e.muz.getWorldPosition(p); const q = new Q(); e.U.getWorldQuaternion(q); return { p, d: new V3(0, 0, -1).applyQuaternion(q) }; }
  function tryFire(e) {
    if (e.reload > 0 || !e.alive || e.stat.gunDead) return false;
    const slot = e.ammo[e.sel]; if (!slot || slot.n <= 0) { if (e === B.me) toast('Sem munição desse tipo!', 1.5); e.reload = 0.5; return false; }
    slot.n--; e.reload = reloadT(e);
    const { p, d } = muzzleInfo(e), sig = 0.0005 + Math.abs(e.v) * 0.0003 + (e.bot ? 0.0008 : 0);
    d.x += (Math.random() - 0.5) * sig * 2; d.y += (Math.random() - 0.5) * sig * 2; d.z += (Math.random() - 0.5) * sig * 2; d.normalize();
    spawnShell(e.eid, e.sel, slot.A, p, d.clone().multiplyScalar(slot.A.v0));
    SB.FX.muzzle(p, d, e.st.cal / 120);
    e.v -= 0.2 * Math.sign(e.v || 1); if (e === B.me) B.shake = Math.max(B.shake, 0.25);
    SB.Net.send({ t: 'f', e: e.eid, a: e.sel, p: [p.x, p.y, p.z], v: [d.x * slot.A.v0, d.y * slot.A.v0, d.z * slot.A.v0] });
    return true;
  }
  function spawnShell(eid, ai, A, p, vel) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe08a })); m.position.copy(p); B.tracers.add(m);
    B.shells.push({ owner: eid, ai, A, pos: p.clone(), vel, age: 0, mesh: m });
  }

  /* ---------------- tiros ---------------- */
  function stepShells(dt) {
    for (let i = B.shells.length - 1; i >= 0; i--) {
      const s = B.shells[i], v = s.vel.length();
      s.vel.multiplyScalar(Math.exp(-s.A.k * v * dt)); s.vel.y -= G * dt; s.age += dt;
      const p0 = s.pos, d = s.vel.clone(), sp = d.length(); d.multiplyScalar(1 / sp); const len = sp * dt;
      let best = null;
      for (const e of B.ents.values()) {
        if (!e.alive || (e.eid === s.owner && s.age < 0.4)) continue;
        const c = new V3(e.x, e.y + 1.3, e.z), oc = c.clone().sub(p0), tp = oc.dot(d), dd = oc.lengthSq() - tp * tp;
        if (dd > e.rad * e.rad || tp < -e.rad || tp > len + e.rad) continue;
        updateWorld(e); const t0 = SB.Sim.probe(SB.Sim.prepare({ parts: e.wparts }), p0, d);
        if (t0 != null && t0 <= len + 0.02 && (!best || t0 < best.t)) best = { t: t0, ent: e };
      }
      // terreno/obstáculos
      const n = Math.ceil(len / 3); let gt = null;
      for (let k = 1; k <= n; k++) { const t = len * k / n, x = p0.x + d.x * t, y = p0.y + d.y * t, z = p0.z + d.z * t; if (B.map.H(x, z) > y || B.map.hit(x, y, z)) { gt = t; break; } }
      if (best && (gt == null || best.t <= gt)) { hitTank(s, best.ent, p0.clone(), d, sp); removeShell(i); continue; }
      if (gt != null) { const hp = p0.clone().addScaledVector(d, gt); groundImpact(s, hp); removeShell(i); continue; }
      s.pos.addScaledVector(d, len); s.mesh.position.copy(s.pos);
      if (s.age > 14 || s.pos.y < -80) removeShell(i);
    }
  }
  const wpCache = new WeakMap();
  function wpToW(wp) { return wp; }
  function removeShell(i) { const s = B.shells[i]; B.tracers.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); B.shells.splice(i, 1); }
  function groundImpact(s, p) {
    const T = SB.TYPE[s.A.type]; const near = p.distanceTo(B.camera.position) < 600;
    if (T.fam === 'he' || T.fam === 'hesh' || T.fam === 'heat') { SB.FX.explosion(p, 0.6 + Math.cbrt(s.A.tnt)); splash(s, p, s.A.tnt); } else SB.FX.dust(p, 8);
    if (near) B.shake = Math.max(B.shake, 0.1);
  }
  /* explosão no solo fere tanques próximos (apenas o dono do tanque aplica) */
  function splash(s, p, tnt) {
    if (tnt <= 0.05) return;
    for (const e of B.ents.values()) {
      if (!e.alive || e.owner !== B.myPeer) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z) - 3; if (d > 6 * Math.cbrt(tnt) + 2) continue;
      // dano de sopro em módulos: usa o mesmo simulador com explosão encostada na lateral mais próxima
      const dir = new V3(e.x - p.x, 0.0, e.z - p.z).normalize(), org = p.clone(); org.y += 0.6;
      const A2 = Object.assign({}, s.A, { type: 'HE', fam: 'he' });
      hitTankSim(s, e, org, dir.clone().setY(0.02).normalize(), 200, A2, true);
    }
  }

  function hitTank(s, ent, p0, d, sp) {
    const T = SB.TYPE[s.A.type];
    SB.FX.sparks(p0.clone().addScaledVector(d, 0.1), 6);
    if (ent.owner === B.myPeer) hitTankSim(s, ent, p0, d, sp, s.A, false);
    else SB.FX.clank();
  }
  function hitTankSim(s, ent, p0, d, sp, A, isSplash) {
    if (!ent.alive) return;
    updateWorld(ent);
    const res = SB.Sim.run({ parts: ent.wparts }, A, { origin: p0, dir: d, dist: 0, v: sp }, { prior: ent.dmg, seed: (Math.random() * 1e9) | 0, minCrew: Math.min(2, ent.stat.crewTotal) });
    if (!res.first && !isSplash) return;
    const changed = {};
    res.parts.forEach(pr => { if (pr.kind !== 'armor' && (pr.acc > 0 || pr.det || pr.fire)) { const o = ent.dmg[pr.id], n = { acc: pr.acc, det: pr.det, fire: pr.fire }; if (!o || o.acc !== n.acc || o.det !== n.det) { ent.dmg[pr.id] = n; changed[pr.id] = [n.acc, n.det ? 1 : 0, n.fire ? 1 : 0]; } } });
    ent.stat = evalDmg(ent);
    const crewKilled = res.parts.filter(pr => pr.kind === 'crew' && pr.acc >= pr.hp && !(ent._dead && ent._dead[pr.id])).map(pr => pr.name);
    ent._dead = ent._dead || {}; res.parts.forEach(pr => { if (pr.kind === 'crew' && pr.acc >= pr.hp) ent._dead[pr.id] = 1; });
    const det = res.verdict && res.ctx.ammoDet, fire = res.ctx.fire;
    const destroyed = res.verdict.destroyed || ent.stat.crew < Math.min(2, ent.stat.crewTotal);
    const msgs = [];
    msgs.push(res.outcome === 'perfurou' ? 'Perfurou' : res.outcome === 'ricochet' ? 'Ricochete' : res.outcome === 'naopen' ? 'Não perfurou' : 'Dano de explosão');
    crewKilled.forEach(n => msgs.push(n + ' morto')); res.verdict.status.forEach(x => { if (!/morto/.test(x)) msgs.push(x); });
    const hp = res.first ? res.first.pos : p0;
    const TY = { air: 0, in: 1, armor: 2, jet: 3, rico: 4 }, r2 = x => +x.toFixed(2);
    const pa = res.path.slice(0, 40).map(p => [r2(p.a.x), r2(p.a.y), r2(p.a.z), r2(p.b.x), r2(p.b.y), r2(p.b.z), TY[p.type] != null ? TY[p.type] : 1]);
    const fr = res.frags.slice(0, 110).map(f => [r2(f.a.x), r2(f.a.y), r2(f.a.z), r2(f.b.x), r2(f.b.y), r2(f.b.z), r2(f.e), f.hit ? 1 : 0]);
    const pn = res.parts.filter(p => p.state === 'pen').map(p => p.id);
    const m = { pa, fr, pn, t: 'd', e: ent.eid, by: s.owner, dm: changed, o: res.outcome, dead: destroyed, det: !!det, fire: !!fire, hp: [hp.x, hp.y, hp.z], txt: msgs, bl: res.blasts.map(b => [b.pos.x, b.pos.y, b.pos.z, b.tnt]) };
    SB.Net.send(m); showHit(m, true);
    if (fire && !ent.burning && alive(ent)) { ent.burning = true; ent.burn = 0; }
    if (destroyed) killEnt(ent, s.owner, det);
  }
  const alive = e => e.alive;
  function showHit(m, mine) {
    const ent = B.ents.get(m.e), by = B.ents.get(m.by); if (!ent) return;
    ent.pen = ent.pen || new Set(); (m.pn || []).forEach(id => ent.pen.add(id));
    if (!mine) { for (const id in m.dm) ent.dmg[id] = { acc: m.dm[id][0], det: !!m.dm[id][1], fire: !!m.dm[id][2] }; ent.stat = evalDmg(ent); if (m.fire && !ent.burning && ent.alive) { ent.burning = true; ent.burn = 0; } }
    const hp = new V3(...m.hp);
    SB.FX.sparks(hp, 10); if (m.o === 'perfurou') { SB.FX.smoke(hp, 3, true); } if (m.o === 'ricochet') SB.FX.sparks(hp, 14);
    (m.bl || []).forEach(b => SB.FX.explosion(new V3(b[0], b[1], b[2]), 0.4 + Math.cbrt(b[3]) * 0.7));
    if (by === B.me || ent === B.me) { startReplay(ent, m); if (ent === B.me) B.shake = Math.max(B.shake, 0.5); }
    if (!mine && m.dead && ent.alive) killEnt(ent, m.by, m.det, true);
  }
  function killEnt(ent, byEid, det, remote) {
    if (!ent.alive) return; ent.alive = false; ent.burning = false; ent.deadT = 0; ent.deaths++;
    const by = B.ents.get(byEid); if (by && by !== ent) { by.kills++; B.score[by.team]++; } else B.score[ent.team === 'A' ? 'B' : 'A']++;
    ent.mats.body.color.setHex(0x1a1a1a); ent.mats.body.emissive.setHex(0x000000);
    const p = new V3(ent.x, ent.y + 2, ent.z);
    SB.FX.explosion(p, det ? 3 : 1.5); ent.det = !!det; ent.tv = det ? new V3((Math.random() - 0.5) * 6, 12 + Math.random() * 6, (Math.random() - 0.5) * 6) : null; ent.tOff = new V3();
    addFeed((by ? by.name : '?') + ' [' + (by ? by.def.name : '') + '] ➜ ' + ent.name + ' [' + ent.def.name + ']' + (det ? ' 💥' : ''), by ? by.team : 'A');
    if (ent === B.me) toast('Seu tanque foi destruído! Reaparece em 10 s.', 4);
    if (ent.owner === B.myPeer) ent.respawn = 10;
    if (SB.Net.mode === 'host' || SB.Net.mode === 'off') checkEnd();
  }
  function extinguish(e) { if (!e.burning || e.ext <= 0) return; e.ext--; if (Math.random() < 0.75) { e.burning = false; toast('Incêndio apagado!', 2); } else toast('Extintor falhou!', 2); }
  function respawnEnt(e, x, z, yaw) {
    e.alive = true; e.dmg = {}; e._dead = {}; e.burning = false; e.burn = 0; e.ext = 1; e.reload = 3; e.ammo.forEach(a => { a.n = a.n0; }); e.stat = evalDmg(e); e.det = false;
    e.mats.body.color.setHex(PAINT[e.def.nation || 'Customizado'] || 0x6d7163); e.mats.body.emissive.copy(new THREE.Color(TEAMCOL[e.team]).multiplyScalar(0.07));
    e.T.position.set(...e.st.turPivot); e.T.rotation.set(0, 0, 0); e.tv = null; e.respawn = 0; e.tYaw = 0; e.gP = 0; e.snap = null; e.pen = null; placeAt(e, x, z, yaw);
    if (e === B.me) { B.camYaw = yaw; }
  }

  /* ---------------- IA dos bots ---------------- */
  function enemies(e) { return [...B.ents.values()].filter(o => o.alive && o.team !== e.team); }
  function droop(A, r) { const v = A.v0 * Math.exp(-A.k * r * 0.5); return Math.asin(clamp(G * r / (2 * v * v), 0, 0.6)); }
  function aiThink(e, dt) {
    const ai = e.ai || (e.ai = { t: 0, tg: null, wp: null, err: 0 });
    const pos = new V3(e.x, e.y + 2, e.z);
    ai.t -= dt;
    if (ai.t <= 0) {
      ai.t = 0.5 + Math.random() * 0.5; let best = null, bd = 1e9;
      enemies(e).forEach(o => { const d = Math.hypot(o.x - e.x, o.z - e.z); if (d < 900 && d < bd && B.map.los(pos, new V3(o.x, o.y + 2, o.z))) { bd = d; best = o; } });
      ai.tg = best;
      if (!ai.wp || Math.hypot(ai.wp.x - e.x, ai.wp.z - e.z) < 40) { const dirz = e.team === 'A' ? 1 : -1; ai.wp = { x: clamp(e.x + (Math.random() - 0.5) * 500, -B.map.half + 60, B.map.half - 60), z: clamp(e.z + dirz * (150 + Math.random() * 300), -B.map.half + 60, B.map.half - 60) }; }
      ai.strafe = Math.random() < 0.5 ? 1 : -1;
    }
    const c = e.ctl, tg = ai.tg;
    let gx, gz, thr = 0.8;
    if (tg) { gx = tg.x; gz = tg.z; const d = Math.hypot(tg.x - e.x, tg.z - e.z); thr = d > 450 ? 0.8 : d < 220 ? -0.5 : 0.1; } else { gx = ai.wp.x; gz = ai.wp.z; }
    const want = Math.atan2(-(gx - e.x), -(gz - e.z)); let err = wrap(want - e.yaw);
    c.steer = clamp(err * 2, -1, 1); if (Math.abs(err) > 1.0) thr = Math.min(thr, 0.15);
    // evitar obstáculos
    const ax = e.x - Math.sin(e.yaw) * 16, az = e.z - Math.cos(e.yaw) * 16;
    if (B.map.hit(ax, e.y + 1, az) || Math.abs(B.map.H(ax, az) - e.y) > 3.2) { c.steer = ai.strafe; thr = 0.25; }
    if (e.stuck > 1.2) { thr = -0.7; c.steer = ai.strafe; }
    c.thr = thr; c.fire = false;
    if (tg) {
      const tp = new V3(tg.x, tg.y + 1.6, tg.z), r = pos.distanceTo(tp), slot = e.ammo[e.sel];
      // escolhe a melhor munição
      let bi = e.sel, bp = -1; e.ammo.forEach((a, i) => { if (a.n > 0) { const pen = SB.nominalPen(a.A, r) * (a.A.fam === 'he' ? 0.4 : 1); if (pen > bp) { bp = pen; bi = i; } } }); if (e.reload <= 0.3 && bi !== e.sel) e.sel = bi;
      const A = e.ammo[e.sel].A, tt = r / (A.v0 * 0.9);
      const lead = new V3(tp.x + Math.sin(tg.yaw) * -tg.v * tt * -1, tp.y, tp.z + Math.cos(tg.yaw) * -tg.v * tt * -1);
      lead.x = tp.x - Math.sin(tg.yaw) * tg.v * tt; lead.z = tp.z - Math.cos(tg.yaw) * tg.v * tt;
      const dv = lead.sub(pos), hd = Math.hypot(dv.x, dv.z);
      const jitter = (1 - 0.7 * (ai.skill || 0.5)) * (Math.random() - 0.5) * 0.004 * r / 100;
      c.aimYaw = Math.atan2(-dv.x, -dv.z) + jitter; c.aimPitch = Math.atan2(dv.y, hd) + droop(A, r) + jitter * 0.5;
      const eY = Math.abs(wrap(c.aimYaw - e.yaw - e.tYaw)), eP = Math.abs(c.aimPitch - e.pitch * Math.cos(e.tYaw) - e.gP);
      if (eY < 0.012 && eP < 0.012 && e.reload <= 0 && r < 1100) c.fire = true;
    } else { c.aimYaw = e.yaw; c.aimPitch = 0; }
    e.stuck = (Math.abs(e.v) < 0.4 && c.thr > 0.2) ? (e.stuck || 0) + dt : 0;
  }

  /* ---------------- laço principal ---------------- */
  function loop(now) {
    if (!B || !B.run) return; B.raf = requestAnimationFrame(loop);
    const dt = Math.max(0.001, Math.min(0.05, (now - B.last) / 1000)); B.last = now;
    if (!B.paused && !B.over) update(dt); render(dt);
  }
  function update(dt) {
    B.t += dt; const me = B.me; B.myPeer = B.myPeer || B.cfg.myPeer;
    // controle do jogador
    if (me.alive) {
      const k = B.keys, c = me.ctl; c.thr = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0); c.steer = (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0); if (k.Space) { c.thr = 0; me.v *= 0.92; } c.fire = !!k.Fire;
      // ponto mirado pela câmera
      const cd = camDir(), co = camOrigin(cd), hit = rangeAlong(co, cd);
      B.aimR = hit.r; const tp = new V3(me.x, me.y + 2.3, me.z); const aimPt = hit.p; const dv = aimPt.clone().sub(tp), hd = Math.hypot(dv.x, dv.z), A = me.ammo[me.sel].A;
      c.aimYaw = Math.atan2(-dv.x, -dv.z); c.aimPitch = Math.atan2(dv.y, hd) + droop(A, Math.max(30, dv.length()));
    } else { me.ctl.thr = 0; me.ctl.steer = 0; me.ctl.fire = false; }
    const stuckInput = B.keys;
    for (const e of B.ents.values()) {
      if (e.owner === B.myPeer) {
        if (e.bot && e.alive) aiThink(e, dt);
        driveEnt(e, dt);
        if (!e.alive && e.respawn > 0) { e.respawn -= dt; if (e.respawn <= 0) { const sl = B.map.spawns[e.team][Math.floor(Math.random() * 14)]; respawnEnt(e, sl.x + (Math.random() - 0.5) * 20, sl.z, sl.yaw); SB.Net.send({ t: 'r', e: e.eid, x: e.x, z: e.z, yaw: e.yaw }); } }
      } else remoteStep(e, dt);
      effectsStep(e, dt);
    }
    for (let sub = 0; sub < 2; sub++) stepShells(dt / 2);
    SB.FX.update(dt); B.shake = Math.max(0, B.shake - dt * 1.5);
    B.netT -= dt; if (B.netT <= 0) { B.netT = 0.07; netState(); }
    if (B.cfg.mode !== 'client' && B.t > B.cfg.timeLimit) endMatch(B.score.A >= B.score.B ? (B.score.A === B.score.B ? 'T' : 'A') : 'B');
  }
  function effectsStep(e, dt) {
    if (e.burning && e.alive) { e.burn += dt; SB.FX.fire(new V3(e.x, e.y + 2, e.z), 1); SB.FX.smoke(new V3(e.x, e.y + 2.5, e.z), 1, true); if (e.owner === B.myPeer) { if (e.bot && e.burn > 3 && e.ext > 0) extinguish(e); if (e.burn > 18 && e.burning) { e.burning = false; const m = { t: 'd', e: e.eid, by: e.eid, dm: {}, o: 'fogo', dead: true, det: false, fire: false, hp: [e.x, e.y + 1, e.z], txt: ['Queimou'], bl: [] }; SB.Net.send(m); killEnt(e, e.eid, false); } } }
    if (!e.alive) { e.deadT += dt; if (e.deadT < 30 && Math.random() < dt * 8) SB.FX.smoke(new V3(e.x, e.y + 2, e.z), 1, true); if (e.det && e.tv) { e.tv.y -= 20 * dt; e.tOff.addScaledVector(e.tv, dt); if (e.tOff.y < 0 && e.tv.y < 0) { e.tOff.y = 0; e.tv = null; } e.T.position.set(e.st.turPivot[0] + e.tOff.x, e.st.turPivot[1] + e.tOff.y, e.st.turPivot[2] + e.tOff.z); e.T.rotation.z += dt * 2; } }
  }
  function remoteStep(e, dt) {
    const s = e.snap; if (!s) { poseEnt(e, 1); return; }
    const k = 1 - Math.exp(-dt * 10);
    s.x += -Math.sin(s.yaw) * s.v * dt; s.z += -Math.cos(s.yaw) * s.v * dt;
    e.x += (s.x - e.x) * k; e.z += (s.z - e.z) * k; e.yaw += wrap(s.yaw - e.yaw) * k; e.tYaw += wrap(s.tYaw - e.tYaw) * k; e.gP += (s.gP - e.gP) * k; e.v = s.v;
    poseEnt(e, Math.min(1, dt * 6));
  }
  function netState() {
    if (SB.Net.mode === 'off') return;
    const arr = []; for (const e of B.ents.values()) if (e.owner === B.myPeer && e.alive) arr.push([e.eid, +e.x.toFixed(2), +e.z.toFixed(2), +e.yaw.toFixed(3), +e.tYaw.toFixed(3), +e.gP.toFixed(3), +e.v.toFixed(2)]);
    if (arr.length) SB.Net.send({ t: 's', a: arr });
  }
  function onNet(m, from) {
    if (!B) { SB.Lobby && SB.Lobby.onMsg && SB.Lobby.onMsg(m, from); return; }
    switch (m.t) {
      case 's': m.a.forEach(r => { const e = B.ents.get(r[0]); if (!e || e.owner === B.myPeer) return; const sn = { x: r[1], z: r[2], yaw: r[3], tYaw: r[4], gP: r[5], v: r[6] }; if (!e.snap) { e.x = sn.x; e.z = sn.z; e.yaw = sn.yaw; e.tYaw = sn.tYaw; e.gP = sn.gP; } e.snap = sn; }); break;
      case 'f': { const e = B.ents.get(m.e); if (!e || e.owner === B.myPeer) break; const sl = e.ammo[m.a]; if (!sl) break; sl.n = Math.max(0, sl.n - 1); const p = new V3(...m.p); spawnShell(m.e, m.a, sl.A, p, new V3(...m.v)); SB.FX.muzzle(p, new V3(...m.v).normalize(), e.st.cal / 120); break; }
      case 'd': { const ent = B.ents.get(m.e); if (ent && ent.owner !== B.myPeer) showHit(m, false); break; }
      case 'r': { const e = B.ents.get(m.e); if (e && e.owner !== B.myPeer) respawnEnt(e, m.x, m.z, m.yaw); break; }
      case 'end': showEnd(m.w); break;
      case 'abort': case 'hostLeft': toast('O anfitrião encerrou a partida.', 3); setTimeout(() => stop(), 1500); break;
      case 'left': { for (const e of B.ents.values()) if (e.owner === from) { e.alive = false; e.snap = null; e.G.visible = false; } break; }
    }
  }
  function checkEnd() { if (B.cfg.mode === 'client') return; if (B.score.A >= B.cfg.winKills) endMatch('A'); else if (B.score.B >= B.cfg.winKills) endMatch('B'); }
  function endMatch(w) { if (B.over) return; SB.Net.send({ t: 'end', w }); showEnd(w); }
  function showEnd(w) {
    if (B.over) return; B.over = true; try { document.exitPointerLock(); } catch (e) { }
    const d = $('endb'); d.style.display = 'flex'; d.innerHTML = '<h1>' + (w === 'T' ? 'EMPATE' : (w === B.me.team ? 'VITÓRIA!' : 'DERROTA')) + '</h1><p>Azul ' + B.score.A + ' × ' + B.score.B + ' Vermelho</p><p>Seus abates: ' + B.me.kills + ' · Mortes: ' + B.me.deaths + '</p><button id="bback">Voltar ao menu</button>';
    d.querySelector('#bback').onclick = () => stop();
  }


  /* ---------------- raio-X: tanque fantasma, repetição do tiro e visão do meu tanque ---------------- */
  function buildGhost(def) {
    const st = def.stats, Gt = new THREE.Group(), T = new THREE.Group(), U = new THREE.Group(), objs = {};
    T.position.set(...st.turPivot); Gt.add(T); U.position.set(st.gunPivot[0] - st.turPivot[0], st.gunPivot[1] - st.turPivot[1], st.gunPivot[2] - st.turPivot[2]); T.add(U);
    def.parts.forEach(p => {
      const parent = p.grp === 'gun' ? U : p.grp === 'turret' ? T : Gt, off = p.grp === 'gun' ? st.gunPivot : p.grp === 'turret' ? st.turPivot : [0, 0, 0], g = SB.geoFor(p);
      let mesh;
      if (p.kind === 'armor') {
        mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: SB.mat(p.mat).color, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }));
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: 0x8aa4c4, transparent: true, opacity: 0.5 })));
      } else mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: SB.STATE_COLOR.intact, emissive: 0x0a2a0a, side: THREE.DoubleSide }));
      mesh.position.set(p.pos[0] - off[0], p.pos[1] - off[1], p.pos[2] - off[2]); mesh.rotation.order = 'YXZ'; mesh.rotation.set(p.rot[0] * D2R, p.rot[1] * D2R, p.rot[2] * D2R);
      parent.add(mesh); objs[p.id] = mesh;
    });
    return { G: Gt, T, U, objs, def };
  }
  function ghostState(gh, ent, clean) {
    gh.def.parts.forEach(p => {
      const o = gh.objs[p.id];
      if (p.kind === 'armor') { const pen = !clean && ent.pen && ent.pen.has(p.id); o.material.color.set(pen ? SB.STATE_COLOR.pen : SB.mat(p.mat).color); o.material.opacity = pen ? 0.5 : 0.13; return; }
      const d = clean ? null : ent.dmg[p.id], hp = Math.max(1, p.hp || (SB.SUBS[p.sub] ? SB.SUBS[p.sub].hp : 100));
      const stt = d ? SB.stateOf({ flags: { det: !!d.det }, acc: d.acc, hp }) : 'intact', c = SB.STATE_COLOR[stt];
      o.material.color.set(c); o.material.emissive.set(c).multiplyScalar(0.25);
    });
  }
  function mkInsetScene() {
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.15)); const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(5, 10, 6); sc.add(dl); return sc;
  }
  const RPCOL = [[0x9aa5b4, 0.012, 0.5], [0xffd34d, 0.03, 1], [0xff7a1a, 0.05, 1], [0x40e0ff, 0.025, 1], [0x66e0ff, 0.03, 0.8]];
  function endReplay() { if (!B.rp) return; B.rp.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); B.rp = null; $('rpf').style.display = 'none'; }
  function startReplay(ent, m) {
    endReplay(); const scene = mkInsetScene(), gh = buildGhost(ent.def);
    gh.G.position.copy(ent.G.position); gh.G.rotation.copy(ent.G.rotation); gh.T.rotation.y = ent.tYaw; gh.U.rotation.x = ent.gP; scene.add(gh.G); ghostState(gh, ent, true);
    const segs = []; let acc = 0;
    (m.pa || []).forEach(p => {
      const a = new V3(p[0], p[1], p[2]), b = new V3(p[3], p[4], p[5]), len = a.distanceTo(b); if (len < 1e-4) return;
      const [col, r, op] = RPCOL[p[6]] || RPCOL[1], g = new THREE.CylinderGeometry(r, r, 1, 8); g.translate(0, 0.5, 0);
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op })); mesh.position.copy(a); mesh.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize()); mesh.scale.set(1, 1e-4, 1); mesh.visible = false; scene.add(mesh);
      segs.push({ mesh, len, s0: acc }); if (p[6] !== 4) acc += len;
    });
    const fr = (m.fr || []).map(f => ({ a: new V3(f[0], f[1], f[2]), b: new V3(f[3], f[4], f[5]), e: f[6], hit: f[7] }));
    const pos = new Float32Array(fr.length * 6), col = new Float32Array(fr.length * 6), cc = new THREE.Color();
    fr.forEach((f, i) => { cc.setHSL(0.02 + 0.14 * f.e, 1, 0.45 + 0.3 * f.e); col.set([cc.r, cc.g, cc.b, cc.r, cc.g, cc.b], i * 6); });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true })); lines.frustumCulled = false; lines.visible = false; scene.add(lines);
    const blasts = (m.bl || []).map(b => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffa63a, transparent: true, opacity: 0.5, depthWrite: false })); mesh.position.set(b[0], b[1], b[2]); mesh.scale.setScalar(1e-3); scene.add(mesh); return { mesh, r: 0.3 + 0.5 * Math.cbrt(b[3]) }; });
    const dur1 = Math.min(1.4, 0.5 + acc * 0.05), center = new V3(m.hp[0], m.hp[1], m.hp[2]).lerp(new V3(ent.x, ent.y + 1.3, ent.z), 0.5);
    B.rp = { scene, cam: new THREE.PerspectiveCamera(42, 420 / 280, 0.5, 600), gh, ent, segs, fr, lines, blasts, dur1, total: Math.max(acc, 1e-3), t0: performance.now(), applied: false, center, R: Math.max(11, ent.rad * 2.3) };
    const f = $('rpf'); f.style.display = 'block'; f.firstChild.textContent = '💥 ' + ent.def.name + ' — ' + ent.name;
  }
  function updateReplay() {
    const r = B.rp; if (!r) return; const t = (performance.now() - r.t0) / 1000;
    if (t > 6) { endReplay(); return; }
    const rev = Math.min(1, t / r.dur1), reveal = (1 - Math.pow(1 - rev, 2)) * r.total;
    r.segs.forEach(s => { const f = clamp((reveal - s.s0) / s.len, 0, 1); s.mesh.visible = f > 0; s.mesh.scale.y = Math.max(s.len * f, 1e-4); });
    if (t > r.dur1) {
      if (!r.applied) { r.applied = true; ghostState(r.gh, r.ent); }
      const k = clamp((t - r.dur1) / 0.9, 0, 1), pa = r.lines.geometry.attributes.position; r.lines.visible = r.fr.length > 0;
      r.fr.forEach((f, i) => { const q = f.a.clone().lerp(f.b, k); pa.setXYZ(i * 2, f.a.x, f.a.y, f.a.z); pa.setXYZ(i * 2 + 1, q.x, q.y, q.z); }); pa.needsUpdate = true;
      r.blasts.forEach(b => { b.mesh.scale.setScalar(Math.max(1e-3, b.r * clamp(k * 1.6, 0, 1))); b.mesh.material.opacity = 0.5 * (1 - clamp((t - r.dur1 - 0.4) / 1.8, 0, 1)); });
    }
    const a = 0.9 + t * 0.28; r.cam.position.set(r.center.x + Math.sin(a) * r.R, r.center.y + r.R * 0.5, r.center.z + Math.cos(a) * r.R); r.cam.lookAt(r.center);
  }
  /* a máscara escura da mira não pode cobrir os quadros de raio-X */
  function scopeClip() {
    const sc = $('scope'); if (!B.scope) { if (sc._c) { sc.style.clipPath = ''; sc._c = ''; } return; }
    const W = innerWidth, Hh = innerHeight; let d = 'M0 0H' + W + 'V' + Hh + 'H0Z';
    if (B.rp) d += ' M16 62h420v280h-420Z';
    if (B.xrOn) d += ' M' + (W - 342) + ' ' + (Hh - 422) + 'h330v230h-330Z';
    const v = 'path(evenodd, "' + d + '")'; if (sc._c !== v) { sc.style.clipPath = v; sc._c = v; }
  }
  function toggleXray() {
    B.xrOn = !B.xrOn; $('xrf').style.display = B.xrOn ? 'block' : 'none';
    if (B.xrOn && !B.xr) { const sc = mkInsetScene(), gh = buildGhost(B.me.def); sc.add(gh.G); B.xr = { scene: sc, cam: new THREE.PerspectiveCamera(40, 330 / 230, 0.5, 200), gh, t: 0 }; }
  }
  function updateXray(dt) {
    if (!B.xrOn || !B.xr) return; const x = B.xr, me = B.me; x.t += dt; x.gh.T.rotation.y = me.tYaw; x.gh.U.rotation.x = me.gP;
    x.acc = (x.acc || 0) - dt; if (x.acc <= 0) { x.acc = 0.25; ghostState(x.gh, me); }
    const R = me.st.bodyLen * 1.35, a = 0.7 + x.t * 0.35; x.cam.position.set(Math.sin(a) * R, R * 0.55, Math.cos(a) * R); x.cam.lookAt(0, 1.1, 0);
  }
  function insets() {
    const r = B.renderer, W = innerWidth, Hh = innerHeight; if (!B.rp && !B.xrOn) return;
    r.autoClear = false; r.setScissorTest(true);
    const draw = (scene, cam, x, yTop, w, h) => { const y = Hh - yTop - h; r.setViewport(x, y, w, h); r.setScissor(x, y, w, h); r.setClearColor(0x0a1018, 1); r.clear(true, true, false); r.render(scene, cam); };
    if (B.rp) draw(B.rp.scene, B.rp.cam, 16, 62, 420, 280);
    if (B.xrOn && B.xr) draw(B.xr.scene, B.xr.cam, W - 12 - 330, Hh - 192 - 230, 330, 230);
    r.setScissorTest(false); r.setViewport(0, 0, W, Hh); r.setClearColor(B.map.def.sky, 1); r.autoClear = true;
  }

  /* ---------------- câmera / mira ---------------- */
  function camDir() { return new V3(-Math.sin(B.camYaw) * Math.cos(B.camPitch), Math.sin(B.camPitch), -Math.cos(B.camYaw) * Math.cos(B.camPitch)); }
  function camOrigin(d) {
    const me = B.me;
    if (B.scope) { updateWorld(me); const p = new V3(); me.T.getWorldPosition(p); p.y += 0.7; return p; }
    const t = new V3(me.x, me.y + 3.0, me.z), p = t.clone().addScaledVector(d, -B.dist); const gh = B.map.H(p.x, p.z) + 1.6; if (p.y < gh) p.y = gh; return p;
  }
  function rangeAlong(o, d) {
    for (let r = 12; r < 3200; r += (r < 400 ? 6 : 14)) {
      const x = o.x + d.x * r, y = o.y + d.y * r, z = o.z + d.z * r;
      if (B.map.H(x, z) > y || B.map.hit(x, y, z)) return { r, p: new V3(x, y, z) };
      for (const e of B.ents.values()) if (e !== B.me && e.alive && Math.hypot(e.x - x, e.z - z) < 3.4 && y < e.y + 3.4 && y > e.y) return { r, p: new V3(x, y, z) };
    }
    return { r: 3200, p: o.clone().addScaledVector(d, 3200) };
  }
  function render(dt) {
    const me = B.me, cam = B.camera, d = camDir(), o = camOrigin(d);
    cam.position.copy(o); if (B.shake > 0) { cam.position.x += (Math.random() - 0.5) * B.shake; cam.position.y += (Math.random() - 0.5) * B.shake; }
    cam.lookAt(o.clone().add(d)); const fov = B.scope ? B.zoom : 60; if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 12); cam.updateProjectionMatrix(); }
    me.G.visible = !B.scope || !me.alive;
    B.renderer.render(B.scene, cam);
    updateReplay(); updateXray(dt); insets();
    scopeClip();
    B.hudT -= dt; if (B.hudT <= 0) { B.hudT = 0.1; hud(); }
    nameplates();
  }

  /* ---------------- HUD ---------------- */
  const proj = (p) => { const v = p.clone().project(B.camera); return v.z > 1 || v.z < -1 ? null : [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; };
  function toast(t, sec) { if (!B) return; const m = $('msg'); m.textContent = t; m.style.opacity = 1; clearTimeout(B.mt); B.mt = setTimeout(() => { if (B) m.style.opacity = 0; }, (sec || 2) * 1000); }
  function hitMsg(t, col, who) { const m = $('hitmsg'); m.innerHTML = '<small>' + who + '</small><br>' + t; m.style.color = col; m.style.opacity = 1; clearTimeout(B.ht); B.ht = setTimeout(() => { if (B) m.style.opacity = 0; }, 3500); }
  function addFeed(t, team) { B.feed.unshift({ t, team, at: B.t }); B.feed = B.feed.slice(0, 6); }
  const mm = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function hud() {
    const me = B.me, st = me.st;
    $('topc').innerHTML = '<span class="ta">AZUL ' + B.score.A + '</span> <span class="tm">' + mm(Math.max(0, B.cfg.timeLimit - B.t)) + ' · meta ' + B.cfg.winKills + '</span> <span class="tb">VERM. ' + B.score.B + '</span>';
    $('feed').innerHTML = B.feed.filter(f => B.t - f.at < 12).map(f => '<div style="color:' + TEAMCOL[f.team] + '">' + f.t + '</div>').join('');
    $('spd').textContent = Math.round(Math.abs(me.v) * 3.6) + ' km/h  |  ' + me.def.name;
    $('rng').textContent = 'alcance: ' + (B.aimR >= 3200 ? '--' : Math.round(B.aimR) + ' m') + (me.burning ? '   🔥 INCÊNDIO (F)' : '') + (!me.alive ? '   ☠ reaparece em ' + Math.ceil(me.respawn) + ' s' : '');
    const s = me.stat; $('crewl').textContent = 'Tripulação ' + s.crew + '/' + s.crewTotal + (s.gunDead ? ' · CANHÃO FORA' : '') + (s.speedF === 0 ? ' · IMOBILIZADO' : s.speedF < 0.7 ? ' · AVARIADO' : '');
    $('ammo').innerHTML = me.ammo.map((a, i) => '<div class="am' + (i === me.sel ? ' on' : '') + '"><b>' + (i + 1) + '</b> ' + (a.A.shortName || a.A.name) + '<br><span>' + a.A.type + ' · ' + a.n + '</span></div>').join('');
    const rr = me.reload > 0 ? 1 - me.reload / reloadT(me) : 1; $('reload').firstChild.style.width = clamp(rr, 0, 1) * 100 + '%'; $('reload').style.opacity = rr < 1 ? 1 : 0.35;
    // marcador do canhão
    const gm = $('gunmk'); const { p, d } = muzzleInfo(me), R = Math.min(B.aimR, 2500), A = me.ammo[me.sel].A, pt = p.clone().addScaledVector(d, R); pt.y -= R * Math.tan(droop(A, R)); const sp = proj(pt);
    gm.style.display = sp && me.alive ? 'block' : 'none'; if (sp) { gm.style.left = sp[0] + 'px'; gm.style.top = sp[1] + 'px'; }
    $('scope').style.display = B.scope ? 'block' : 'none'; $('cross').style.display = B.scope ? 'none' : 'block';
    drawMods(me); drawMini(me);
  }
  function drawMods(me) {
    const c = $('mods'), g = c.getContext('2d'), W = c.width, Hh = c.height; g.clearRect(0, 0, W, Hh); g.fillStyle = 'rgba(10,15,22,.6)'; g.fillRect(0, 0, W, Hh);
    const k = 17, cx = W / 2, cy = Hh / 2 + 2;
    const ratio = p => { const d = me.dmg[p.id]; return d ? (d.det ? 9 : d.acc / Math.max(1, p.hp || 100)) : 0; };
    const col = r => r >= 9 ? SB.STATE_COLOR.det : r >= 1 ? SB.STATE_COLOR.destroyed : r >= 0.6 ? SB.STATE_COLOR.heavy : r >= 0.25 ? SB.STATE_COLOR.damaged : r > 0.02 ? SB.STATE_COLOR.light : SB.STATE_COLOR.intact;
    g.strokeStyle = '#4c6280'; g.lineWidth = 1.5; g.strokeRect(cx - 1.6 * k, cy - 3.2 * k, 3.2 * k, 6.4 * k);
    me.def.parts.filter(p => p.kind !== 'armor').forEach(p => {
      g.fillStyle = col(ratio(p)); const x = cx + p.pos[0] * k * 0.95, y = cy + p.pos[2] * k * 0.95;
      if (p.kind === 'crew') { g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill(); g.strokeStyle = '#000'; g.stroke(); } else g.fillRect(x - p.size[0] * k / 2, y - p.size[2] * k / 2, Math.max(3, p.size[0] * k), Math.max(3, p.size[2] * k));
    });
  }
  function drawMini(me) {
    const c = $('mini'), g = c.getContext('2d'), W = c.width, S = B.map.size; g.fillStyle = 'rgba(15,22,30,.75)'; g.fillRect(0, 0, W, W);
    const m = (x, z) => [(x + S / 2) / S * W, (z + S / 2) / S * W];
    g.fillStyle = '#4a4f55'; B.map.obst.forEach(o => { if (o.tree) return; const [a, b] = m(o.x, o.z); g.fillRect(a - 1, b - 1, 2, 2); });
    for (const e of B.ents.values()) {
      if (!e.alive) continue; const mine = e.team === me.team; if (!mine) { const d = Math.hypot(e.x - me.x, e.z - me.z); if (d > 700 || !B.map.los(new V3(me.x, me.y + 2, me.z), new V3(e.x, e.y + 2, e.z))) continue; }
      const [a, b] = m(e.x, e.z); g.save(); g.translate(a, b); g.rotate(-e.yaw); g.fillStyle = e === me ? '#fff' : TEAMCOL[e.team]; g.beginPath(); g.moveTo(0, -5); g.lineTo(3.5, 4); g.lineTo(-3.5, 4); g.closePath(); g.fill(); g.restore();
    }
    // cone de visão da câmera
    const [a, b] = m(me.x, me.z); g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(a, b); g.lineTo(a - Math.sin(B.camYaw) * 28, b - Math.cos(B.camYaw) * 28); g.stroke();
  }
  function nameplates() {
    const box = $('names'); let html = '', n = 0;
    for (const e of B.ents.values()) {
      if (e === B.me || !e.alive || n > 14) continue; const d = Math.hypot(e.x - B.me.x, e.z - B.me.z); if (d > 900) continue;
      const mine = e.team === B.me.team; if (!mine && !B.map.los(new V3(B.me.x, B.me.y + 2, B.me.z), new V3(e.x, e.y + 2, e.z))) continue;
      const p = proj(new V3(e.x, e.y + 4.2, e.z)); if (!p) continue; n++;
      html += '<div class="np" style="left:' + p[0] + 'px;top:' + p[1] + 'px;color:' + TEAMCOL[e.team] + '">▼ ' + e.name + '<br><small>' + e.def.name + ' · ' + Math.round(d) + ' m</small></div>';
    }
    if (box._h !== html) { box.innerHTML = html; box._h = html; }
  }
  function renderScore() {
    const rows = [...B.ents.values()].sort((a, b) => b.kills - a.kills);
    $('score').innerHTML = '<table><tr><th>Jogador</th><th>Tanque</th><th>Equipe</th><th>Abates</th><th>Mortes</th></tr>' + rows.map(e => '<tr style="color:' + TEAMCOL[e.team] + '"><td>' + e.name + '</td><td>' + e.def.name + '</td><td>' + (e.team === 'A' ? 'Azul' : 'Verm.') + '</td><td>' + e.kills + '</td><td>' + e.deaths + '</td></tr>').join('') + '</table>';
  }

  SB.Battle = { step(dt) { update(dt); }, start, stop, get state() { return B; }, defaultLoadout };
})(window.SB);
