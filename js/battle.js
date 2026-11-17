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
    const P = (SB.ammoLib ? SB.ammoLib() : SB.AMMO_PRESETS()).filter(a => (a.domain || 'ground') === (stats.kind === 'heli' ? 'air' : 'ground')), pick = t => P.find(a => a.type === t && a.builtin) || P.find(a => a.type === t) || P[0];
    if (stats.kind === 'heli') return SB.airLoadout(stats, P);
    if (stats.rof) {
      const nm = t => P.find(a => a.name && a.name.indexOf(t) >= 0) || P[0], c = stats.cal; let g1, g2;
      if (c <= 8) g1 = nm('7,62×51'); else if (c <= 13) g1 = nm('12,7×99'); else if (c <= 15) g1 = nm('14,5×114'); else if (c <= 21) { g1 = nm('20×102'); g2 = nm('20 mm M53'); } else if (c <= 24) { g1 = nm('23×152 mm ZU-23 HEI'); g2 = nm('23×152 mm ZU-23 API'); } else if (c <= 28) { g1 = nm('25×137 mm M792'); g2 = nm('25×137 mm M791'); } else if (c <= 33) { g1 = nm('30×165 mm 2A42 HE-FRAG-T'); g2 = nm('30×165 mm 2A42 AP-T'); } else if (c <= 37) { g1 = nm('35×228 mm KDG'); g2 = nm('35×228 mm AHEAD'); } else if (c <= 45) { g1 = nm('40×311R Bofors HE-VT'); g2 = nm('40×311R Bofors HEI-T'); } else if (c <= 60 && c >= 50) { g1 = nm('57×348R S-60 HE-FRAG-T'); g2 = nm('57×348R S-60 APC-T'); }
      else { g1 = P.find(a => a.type === 'HE-FRAG' && a.builtin && !(a.info && a.info.heli)) || P[0]; g2 = P.find(a => a.type === 'APHE' && a.builtin) || P[0]; }
      const out = []; let used = 0; const add = (a, n) => { if (!a || n <= 0) return; const sl = a.slots || 1, k = Math.min(n, Math.floor(Math.max(0, stats.rack - used) / sl)); if (k > 0) { out.push({ ammo: a, n: k }); used += k * sl; } };
      const samA = stats.sam ? nm(stats.samName || 'Stinger') : null, gunUnits = Math.max(10, stats.rack - (stats.sam || 0) * (samA ? samA.slots || 40 : 40) - (stats.atgm || 0) * 36);
      add(g1, Math.round(gunUnits * (g2 ? 0.65 : 1))); if (g2) add(g2, Math.round(gunUnits * 0.35));
      if (stats.atgm) add(nm(stats.atgmName || 'TOW-2B'), stats.atgm); if (stats.sam) add(samA, stats.sam);
      return out;
    }
    const main = stats.cal >= 105 ? 'APFSDS' : stats.cal >= 85 ? 'APCBC' : 'APCBC';
    const L = [{ ammo: pick(main), n: 0 }, { ammo: pick('HEAT'), n: 0 }, { ammo: pick('HE'), n: 0 }];
    const atg = stats.atgm ? (P.find(x => x.name && x.name.indexOf(stats.atgmName || 'TOW-2B') >= 0) || null) : null;
    const r = stats.rack - (atg ? stats.atgm * (atg.slots || 36) : 0); L[0].n = Math.round(r * 0.5); L[1].n = Math.round(r * 0.25); L[2].n = r - L[0].n - L[1].n;
    if (atg) L.push({ ammo: atg, n: stats.atgm }); return L;
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
    const Rg = new THREE.Group(), R2 = new THREE.Group(), Tl = new THREE.Group();
    if (st.rotPivot) { Rg.position.set(...st.rotPivot); Gt.add(Rg); R2.position.set(...st.rot2Pivot); Gt.add(R2); Tl.position.set(...st.tailPivot); Gt.add(Tl); }
    ent.Rg = Rg; ent.R2 = R2; ent.Tl = Tl;
    mats.glass = new THREE.MeshLambertMaterial({ color: 0x1a2c3d, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    mats.disc = new THREE.MeshBasicMaterial({ color: 0xd8dde3, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
    const gp = g => g === 'gun' ? U : g === 'turret' ? T : g === 'rotor' ? Rg : g === 'rotor2' ? R2 : g === 'tail' ? Tl : Gt;
    const go = g => g === 'gun' ? st.gunPivot : g === 'turret' ? st.turPivot : g === 'rotor' ? st.rotPivot : g === 'rotor2' ? st.rot2Pivot : g === 'tail' ? st.tailPivot : [0, 0, 0];
    const muz = new THREE.Object3D(); muz.position.set(st.muzzle[0] - st.gunPivot[0], st.muzzle[1] - st.gunPivot[1], st.muzzle[2] - st.gunPivot[2]); U.add(muz); ent.muz = muz;
    def.parts.forEach(p => {
      const parent = gp(p.grp), off = go(p.grp);
      let o;
      if (p.kind === 'armor' && !(st.kind === 'heli' && ['al', 'nylon', 'hha'].indexOf(p.mat) >= 0)) {
        const m = p.mat === 'nylon' ? mats.glass : p.mat === 'era' ? mats.era : (p.mat === 'rub' || p.name.startsWith('Saia') ? mats.dark : mats.body);
        o = new THREE.Mesh(SB.geoFor(p), m);
      } else o = new THREE.Object3D();
      o.position.set(p.pos[0] - off[0], p.pos[1] - off[1], p.pos[2] - off[2]); o.rotation.order = 'YXZ'; o.rotation.set(p.rot[0] * D2R, p.rot[1] * D2R, p.rot[2] * D2R);
      parent.add(o); ent.objs[p.id] = o; const wp = Object.assign({}, p); wp._pos = new V3(); wp._q = new Q(); ent.wparts.push(wp);
    });
    const DCOL = { rubber: 0x1c1c1c, metal: 0x3a3c3e, dark: 0x2a2c28, track: 0x2b2824 }, buckets = {};
    (def.deco || []).forEach(d => {
      const grp = d.grp || 'hull', off = go(grp);
      const g = SB.geoFor({ shape: d.shape, size: d.size, wall: d.wall || 0.03 }).clone();
      g.applyMatrix4(new THREE.Matrix4().compose(new V3(d.pos[0] - off[0], d.pos[1] - off[1], d.pos[2] - off[2]), new Q().setFromEuler(new THREE.Euler(d.rot[0] * D2R, d.rot[1] * D2R, d.rot[2] * D2R, 'YXZ')), new V3(1, 1, 1)));
      const ng = g.index ? g.toNonIndexed() : g, key = grp + '|' + d.color, b = buckets[key] || (buckets[key] = { grp, color: d.color, pos: [], nor: [] });
      b.pos.push(ng.attributes.position.array); b.nor.push(ng.attributes.normal.array);
    });
    Object.values(buckets).forEach(b => {
      const cat = arr => { let n = 0; arr.forEach(a => n += a.length); const o = new Float32Array(n); let i = 0; arr.forEach(a => { o.set(a, i); i += a.length; }); return o; };
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(cat(b.pos), 3)); g.setAttribute('normal', new THREE.BufferAttribute(cat(b.nor), 3));
      let m = b.color === 'body' ? mats.body : (mats[b.color] || (mats[b.color] = new THREE.MeshLambertMaterial({ color: DCOL[b.color] || 0x333333, side: THREE.DoubleSide })));
      gp(b.grp).add(new THREE.Mesh(g, m));
    });
    // sombra simples
    const sh = new THREE.Mesh(new THREE.CircleGeometry(st.bodyLen * 0.55, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.12; if (st.kind === 'heli') sh.visible = false; sh.scale.set(0.6, 1, 1); Gt.add(sh); ent.shadow = sh;
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
    ent.ammo = (spec.loadout || defaultLoadout(ent.st)).filter(l => l.n > 0 || true).slice(0, ent.st.kind === 'heli' ? 8 : 4).map(l => ({ src: l.ammo, A: SB.ammoForGun(l.ammo, ent.st), n: l.n, n0: l.n }));
    if (!ent.ammo.length) ent.ammo = defaultLoadout(ent.st).map(l => ({ src: l.ammo, A: SB.ammoForGun(l.ammo, ent.st), n: l.n, n0: l.n }));
    ent.isHeli = ent.st.kind === 'heli'; ent.vy = 0; ent.fireLeft = 2; ent.apsLeft = 3; ent.smokeLeft = 2; ent.repairsLeft = 3; ent.rep = null; ent.svT = 0;
    ent.rad = ent.isHeli ? 0.5 * ent.st.bodyLen + 1.5 : 0.5 * Math.hypot(ent.st.bodyLen, ent.st.bodyWid) + 0.8;
    buildObj(ent); B.scene.add(ent.G);
    ent.stat = evalDmg(ent);
    return ent;
  }

  /* ---------------- dano acumulado → estado do tanque ---------------- */
  function evalHeli(ent) {
    const P = ent.def.parts, r = p => { const d = ent.dmg[p.id]; const hp = Math.max(1, p.hp || (SB.SUBS[p.sub] ? SB.SUBS[p.sub].hp : 100)); return d ? d.acc / hp : 0; };
    const of = s => P.filter(p => p.sub === s), crew = P.filter(p => p.kind === 'crew'), alive = crew.filter(p => r(p) < 1);
    const engines = of('engine'), engDead = engines.filter(p => r(p) >= 1).length, rotors = of('rotor');
    const hubs = rotors.filter(p => /Cubo/.test(p.name)), blades = rotors.filter(p => !/Cubo/.test(p.name));
    const rotorDead = hubs.some(p => r(p) >= 1) || (blades.length > 0 && blades.every(p => r(p) >= 1));
    const tail = of('tailrot'), tailDead = tail.length > 0 && tail.every(p => r(p) >= 1);
    const pil = crew.filter(p => p.sub === 'pilot'), pilotDead = pil.length > 0 && pil.every(p => r(p) >= 1);
    let speedF = 1, climbF = 1, turnF = 1;
    if (engDead >= 1) { speedF *= 0.65; climbF *= 0.5; }
    if (pilotDead) { speedF *= 0.5; turnF = 0.5; }
    const allEng = engines.length > 0 && engDead >= engines.length;
    return { speedF, turnF, climbF, gunDead: of('breech').length > 0 && of('breech').every(p => r(p) >= 1), travF: 1, loaderDead: false, crew: alive.length, crewTotal: crew.length, tracksD: 0, engDead: allEng, optDead: false, rotorDead, tailDead, dead: rotorDead || tailDead || allEng || (crew.length > 0 && alive.length < 1) };
  }
  function evalDmg(ent) {
    if (ent.st.kind === 'heli') return evalHeli(ent);
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
      hasStab: of('stab').length > 0, stabDead: dead('stab'), hasAuto: of('autoload').length > 0, autoDead: dead('autoload'), autoDmg: of('autoload').some(p => r(p) >= 0.5), ringDead: dead('ring'), lrfDead: dead('lrf'),
      hasFireSup: of('fire').length > 0, fireSupOk: of('fire').length > 0 && !dead('fire'), hasSmokeL: of('smokel').length > 0 && !dead('smokel'), hasAps: of('aps').length > 0 && !dead('aps'),
      speedF, turnF: tD >= 1 ? 0.5 : 1, gunDead: dead('breech') || dead('autoload') || (gunner.length && gunner.every(p => r(p) >= 1) && !crew.some(p => p.sub === 'commander' && r(p) < 1)),
      travF: (gunner.length && gunner.every(p => r(p) >= 1) ? 0.3 : 1) * (dead('drive') ? 0.2 : 1) * (dead('ring') ? 0.04 : 1), loaderDead: loader.length > 0 && loader.every(p => r(p) >= 1),
      crew: alive.length, crewTotal: crew.length, tracksD: tD, engDead: dead('engine'), optDead: dead('optics'), dead: crew.length > 0 && alive.length < Math.min(2, crew.length),
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
    SB.FX.init(scene); SB.FX.listener = camera.position;
    B = {
      shakeMul: (function () { try { const v = parseFloat(localStorage.getItem('sb.shake')); return isFinite(v) ? v : 1; } catch (e) { return 1; } })(),
      myPeer: cfg.myPeer, cfg, map, el, renderer, scene, camera, ents: new Map(), shells: [], keys: {}, camYaw: 0, camPitch: 0.05, dist: 15, scope: false, zoom: 12, last: performance.now(), run: true, score: { A: 0, B: 0 },
      feed: [], msgT: 0, hudT: 0, netT: 0, shake: 0, lock: false, over: false, t: 0, me: null, tracers: new THREE.Group(), smokes: [], flares: [], aimPt: null, zones: [], pts: { A: 0, B: 0 }, names: [], aimR: 500, fovBase: 60, bots: [], paused: false,
    };
    scene.add(B.tracers);
    const los0 = map.los, segS = (a, b, c, r) => { const ab = b.clone().sub(a), t = clamp(c.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1); return a.clone().addScaledVector(ab, t).distanceTo(c) < r; };
    map.los = function (a, b) { if (!los0.call(map, a, b)) return false; for (const s of B.smokes) if (segS(a, b, s.p, s.r)) return false; return true; };
    // entidades
    const slotA = { A: 0, B: 0 };
    cfg.specs.forEach(sp => {
      const e = makeEnt(sp); B.ents.set(e.eid, e);
      const sl = map.spawns[e.team][(slotA[e.team]++) % map.spawns[e.team].length]; placeAt(e, sl.x, sl.z, sl.yaw);
      if (sp.eid === cfg.myEid) B.me = e;
    });
    if (!B.me) { B.me = [...B.ents.values()][0]; }
    B.camYaw = B.me.yaw; scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    mkZones(); bind(); resize();
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
  function placeAt(e, x, z, yaw) { e.x = x; e.z = z; e.yaw = yaw; e.v = 0; e.tYaw = 0; e.gP = 0; e.vy = 0; e.crash = null; e.y = B.map.H(x, z) + (e.isHeli ? 42 : 0); if (e.isHeli) { e.pitch = 0; e.roll = 0; } poseEnt(e, 1); }

  /* ---------------- entrada ---------------- */
  const HUD_HTML = `
<div id="hud">
 <div id="cross"></div><div id="gunmk"></div><div id="scope"><div class="sc-h"></div><div class="sc-v"></div></div>
 <div id="topc"><span class="ta">AZUL 0</span> <span class="tm">15:00</span> <span class="tb">VERM. 0</span></div>
 <div id="feed"></div><div id="msg"></div><div id="zones"></div><div id="svc"></div>
 <div id="rpf" class="frame" style="display:none;left:16px;top:62px;width:420px;height:280px"><span></span></div>
 <div id="xrf" class="frame" style="display:none;right:12px;bottom:192px;width:330px;height:230px"><span>RAIO-X DO MEU TANQUE (X)</span></div>
 <div id="status"><div id="spd">0 km/h</div><div id="rng">alcance: --</div><div id="crewl"></div><canvas id="mods" width="200" height="120"></canvas></div>
 <div id="ammo"></div><div id="reload"><div></div></div>
 <canvas id="mini" width="170" height="170"></canvas>
 <div id="names"></div>
 <div id="score" style="display:none"></div>
 <div id="pause" style="display:none"><h2>Pausa</h2><button id="bres">Continuar</button><button id="bshake"></button><button id="bsound"></button><button id="bexit">Sair da batalha</button></div>
 <div id="endb" style="display:none"></div>
 <div id="help">G reparar · V fumaça · (helicóptero: Espaço sobe, Shift desce) WASD mover · Mouse mirar · Clique atirar · Botão dir. mira · 1-4 munição · X raio-X · F extintor · C câmera · Tab placar · Esc pausa</div>
</div>`;
  const $ = id => B.el.querySelector('#' + id);
  const H = { kd: null, ku: null, mm: null, md: null, mu: null, wh: null, rs: null, cm: null, pl: null };
  function bind() {
    H.kd = e => {
      if (!B) return; if (e.repeat && e.code !== 'Space') { } B.keys[e.code] = true;
      if (e.code >= 'Digit1' && e.code <= 'Digit8') { const i = +e.code.slice(5) - 1; if (B.me.ammo[i]) { B.me.sel = i; } }
      if (e.code === 'KeyF') extinguish(B.me);
      if (e.code === 'KeyG') startRepair(B.me);
      if (e.code === 'KeyV') launchSmoke(B.me);
      if (e.code === 'KeyX') toggleXray();
      if (e.code === 'KeyC') B.scope = !B.scope;
      if (e.code === 'Tab') { e.preventDefault(); $('score').style.display = 'block'; renderScore(); }
      if (e.code === 'Escape') { B.paused = true; $('pause').style.display = 'flex'; }
      if (e.code === 'KeyR') B.me.sel = (B.me.sel + 1) % B.me.ammo.length;
    };
    H.ku = e => { if (!B) return; B.keys[e.code] = false; if (e.code === 'Tab') $('score').style.display = 'none'; };
    H.mm = e => { if (!B || !B.lock || B.paused) return; const s = (B.scope ? 0.0006 * B.zoom / 12 : 0.0022); B.camYaw -= e.movementX * s; B.camPitch = clamp(B.camPitch - e.movementY * s, -0.45, (B.me && B.me.st.elev && B.me.st.elev[1] > 30) ? 1.35 : 0.6); };
    H.md = e => { if (!B) return; if (B.paused) return; if (!B.lock) { B.renderer.domElement.requestPointerLock && B.renderer.domElement.requestPointerLock(); } if (e.button === 0) B.keys.Fire = true; if (e.button === 2) B.scope = !B.scope; };
    H.mu = e => { if (B && e.button === 0) B.keys.Fire = false; };
    H.wh = e => { if (!B) return; if (B.scope) B.zoom = clamp(B.zoom * (e.deltaY > 0 ? 1.15 : 0.87), 4, 24); else B.dist = clamp(B.dist * (e.deltaY > 0 ? 1.1 : 0.9), 7, 34); };
    H.rs = () => resize(); H.cm = e => e.preventDefault();
    H.pl = () => { if (!B) return; B.lock = document.pointerLockElement === B.renderer.domElement; if (!B.lock && !B.over && !B.paused) { B.paused = true; $('pause').style.display = 'flex'; } };
    addEventListener('keydown', H.kd); addEventListener('keyup', H.ku); addEventListener('mousemove', H.mm); addEventListener('mousedown', H.md); addEventListener('mouseup', H.mu);
    addEventListener('wheel', H.wh, { passive: true }); addEventListener('resize', H.rs); addEventListener('contextmenu', H.cm); document.addEventListener('pointerlockchange', H.pl);
    $('bres').onclick = () => { B.paused = false; $('pause').style.display = 'none'; B.renderer.domElement.requestPointerLock && B.renderer.domElement.requestPointerLock(); };
    const lab = () => { $('bshake').textContent = 'Tremor da tela: ' + (B.shakeMul >= 1 ? 'normal' : B.shakeMul > 0 ? 'reduzido' : 'desligado'); $('bsound').textContent = 'Som: ' + (SB.FX.mute ? 'desligado' : 'ligado'); };
    $('bshake').onclick = () => { B.shakeMul = B.shakeMul >= 1 ? 0.35 : B.shakeMul > 0 ? 0 : 1; B.shake = 0; try { localStorage.setItem('sb.shake', String(B.shakeMul)); } catch (e) { } lab(); };
    $('bsound').onclick = () => { SB.FX.mute = !SB.FX.mute; lab(); };
    lab();
    $('bexit').onclick = () => { if (SB.Net.mode === 'host') SB.Net.send({ t: 'abort' }); stop(); };
  }
  function unbind() { removeEventListener('keydown', H.kd); removeEventListener('keyup', H.ku); removeEventListener('mousemove', H.mm); removeEventListener('mousedown', H.md); removeEventListener('mouseup', H.mu); removeEventListener('wheel', H.wh); removeEventListener('resize', H.rs); removeEventListener('contextmenu', H.cm); document.removeEventListener('pointerlockchange', H.pl); }
  function resize() { const w = innerWidth, h = innerHeight; B.renderer.setSize(w, h); B.camera.aspect = w / h; B.camera.updateProjectionMatrix(); }

  /* ---------------- física dos tanques ---------------- */
  function poseEnt(e, k) {
    if (e.isHeli) { const G_ = e.G; G_.position.set(e.x, e.y, e.z); G_.rotation.order = 'YXZ'; G_.rotation.set(e.pitch, e.yaw, e.roll); e.T.rotation.y = e.tYaw; e.U.rotation.x = e.gP; return; }
    const st = e.st, hl = st.bodyLen / 2, hw = st.bodyWid / 2, H_ = B.map.H, fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
    const hF = H_(e.x + fx * hl, e.z + fz * hl), hB = H_(e.x - fx * hl, e.z - fz * hl), hR = H_(e.x + rx * hw, e.z + rz * hw), hL = H_(e.x - rx * hw, e.z - rz * hw);
    const tp = Math.atan2(hF - hB, st.bodyLen), tr = Math.atan2(hR - hL, st.bodyWid), th = (hF + hB + hR + hL) / 4;
    e.pitch += (tp - e.pitch) * k; e.roll += (tr - e.roll) * k; e.y = th;
    const G_ = e.G; G_.position.set(e.x, e.y - 0.12, e.z); G_.rotation.order = 'YXZ'; G_.rotation.set(e.pitch, e.yaw, e.roll);
    e.T.rotation.y = e.tYaw; e.U.rotation.x = e.gP;
  }
  function aimGun(e, dt) {
    const st = e.st, c = e.ctl, S = e.stat, lim = 8 * D2R, wantT = wrap(c.aimYaw - e.yaw), goalT = st.fixedGun ? clamp(wantT, -lim, lim) : wantT, rate = st.trav * D2R * S.travF;
    e.tYaw += clamp(wrap(goalT - e.tYaw), -rate * dt, rate * dt);
    const wantP = c.aimPitch - e.pitch * Math.cos(e.tYaw), goalP = clamp(wantP, st.elev[0] * D2R, st.elev[1] * D2R), rp = 1.6 * Math.max(0.25, S.travF);
    e.gP += clamp(goalP - e.gP, -rp * dt, rp * dt);
  }
  function selfKill(e, why) {
    if (!e.alive) return; const m = { t: 'd', e: e.eid, by: e.eid, dm: {}, o: 'fogo', dead: true, det: false, fire: false, hp: [e.x, e.y + 1, e.z], txt: [why], bl: [], pa: [], fr: [], pn: [] };
    SB.Net.send(m); killEnt(e, e.eid, false);
  }
  function driveHeli(e, dt) {
    const st = e.st, c = e.ctl, S = e.stat, vmax = st.vmax / 3.6 * S.speedF, plane = !!st.plane, vmin = vmax * 0.36;
    if (e.alive) {
      const tgt = plane ? (c.thr > 0 ? vmin + c.thr * (vmax - vmin) : vmin) : c.thr >= 0 ? c.thr * vmax : c.thr * st.rev / 3.6 * S.speedF;
      e.v += clamp(tgt - e.v, -(plane ? 14 : 9) * dt, (plane ? 16 : 7) * dt);
      e.yaw += (c.steer * st.turn * D2R * S.turnF + (S.tailDead ? 1.2 : 0)) * dt;
      e.vy += clamp((c.lift || 0) * st.climb * S.climbF - e.vy, -8 * dt, 8 * dt); e.y += e.vy * dt;
      const gh = B.map.H(e.x, e.z);
      if (e.y < gh + 1.6) { if (e.vy < -11 && e.owner === B.myPeer) selfKill(e, 'Colisão com o solo'); e.y = gh + 1.6; e.vy = Math.max(e.vy, 0); }
      if (e.y > gh + 450) e.y = gh + 450;
      let nx = e.x - Math.sin(e.yaw) * e.v * dt, nz = e.z - Math.cos(e.yaw) * e.v * dt;
      if (B.map.hit(nx, e.y, nz)) { if (Math.abs(e.v) > 7 && e.owner === B.myPeer) selfKill(e, 'Colisão com obstáculo'); nx = e.x; nz = e.z; e.v = 0; }
      const lim = B.map.half - 6; e.x = clamp(nx, -lim, lim); e.z = clamp(nz, -lim, lim);
      if (plane) { e.pitch += (clamp(e.vy / Math.max(e.v, 30), -0.6, 0.6) - e.pitch) * Math.min(1, dt * 3); e.roll += (-c.steer * 1.0 - e.roll) * Math.min(1, dt * 3); }
      else { e.pitch += (-(e.v / Math.max(vmax, 1)) * 0.3 - e.pitch) * Math.min(1, dt * 3);
      e.roll += (-c.steer * 0.35 * clamp(Math.abs(e.v) / Math.max(vmax * 0.5, 1) + 0.3, 0, 1) - e.roll) * Math.min(1, dt * 3); }
      aimGun(e, dt);
    }
    poseEnt(e, 1);
    if (e.reload > 0) e.reload -= dt;
    if (c.fire && e.alive) tryFire(e);
  }
  function driveEnt(e, dt) {
    if (e.isHeli) return driveHeli(e, dt);
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
      const wantP = c.aimPitch - e.pitch * Math.cos(e.tYaw), goalP = clamp(wantP, st.elev[0] * D2R, st.elev[1] * D2R), rp = (st.elevRate || 0.5) * Math.max(0.25, S.travF);
      e.gP += clamp(goalP - e.gP, -rp * dt, rp * dt);
    }
    poseEnt(e, Math.min(1, dt * 6));
    if (e.reload > 0) e.reload -= dt;
    if (c.fire && e.alive) tryFire(e);
  }
  const reloadT = e => e.isHeli ? 0 : e.st.rof ? 1 / e.st.rof : e.st.reload * (e.stat.loaderDead ? 1.8 : 1) * (e.stat.autoDmg ? 1.5 : 1);
  function muzzleInfo(e) { updateWorld(e); const p = new V3(); e.muz.getWorldPosition(p); const q = new Q(); e.U.getWorldQuaternion(q); return { p, d: new V3(0, 0, -1).applyQuaternion(q) }; }
  function pylonPos(e) {
    updateWorld(e); const pl = e.st.pylons && e.st.pylons.length ? e.st.pylons[(e.pyi = ((e.pyi || 0) + 1) % e.st.pylons.length)] : [0, 1, 0];
    return e.G.localToWorld(new V3(pl[0], pl[1], pl[2]));
  }
  let SID = 0;
  /* alvo travado por míssil: inimigo mais perto da mira (ir = só aeronaves) */
  function chooseLock(e, A, p, dir) {
    let best = null, ba = (A.cone || (A.guid === 'ir' ? 22 : 12)) * D2R;
    enemies(e).forEach(o => { if (A.guid === 'ir' && !o.isHeli) return; if (A.bomb && o.isHeli) return; const to = new V3(o.x, o.y + 1.5, o.z).sub(p), a = to.angleTo(dir); if (a < ba) { ba = a; best = o.eid; } });
    return best;
  }
  function tryFire(e) {
    if (e.reload > 0 || !e.alive) return false;
    const slot = e.ammo[e.sel]; if (!slot || slot.n <= 0) { if (e === B.me) toast('Sem munição desse tipo!', 1.5); e.reload = 0.5; return false; }
    const A = slot.A, wc = A.wc || 'gun';
    if (e.stat.gunDead && (!e.isHeli || wc === 'gun')) return false;
    slot.n--;
    e.reload = e.isHeli ? 1 / (A.rof || (wc === 'gun' ? 10 : wc === 'rocket' ? 4 : 0.35)) : (e.st.rof && wc !== 'gun') ? 1 / (A.rof || 0.35) : reloadT(e);
    if (wc === 'bomb') {                                   // bomba / torpedo: cai do pilone com a velocidade da aeronave
      const p = pylonPos(e).add(new V3(0, -0.6, 0)), vel = new V3(-Math.sin(e.yaw) * e.v, (e.vy || 0) - 2, -Math.cos(e.yaw) * e.v), ex = { id: e.eid + '#' + (++SID) };
      if (A.guid) { const fw = new V3(-Math.sin(e.yaw), -0.7, -Math.cos(e.yaw)).normalize(); ex.lock = A.guid === 'sacls' ? null : chooseLock(e, A, p, fw); }
      spawnShell(e.eid, e.sel, A, p, vel, ex);
      SB.Net.send({ t: 'f', e: e.eid, a: e.sel, p: [p.x, p.y, p.z], v: [vel.x, vel.y, vel.z], id: ex.id, lk: ex.lock || null, ba: 0 });
      if (e === B.me) addShake(0.05); return true;
    }
    let p, d;
    if (e.isHeli && wc !== 'gun') { const mi = muzzleInfo(e); d = mi.d; p = pylonPos(e); } else { const mi = muzzleInfo(e); p = mi.p; d = mi.d; }
    const sig = (wc === 'gun' ? 0.0005 : wc === 'rocket' ? 0.004 : 0.0003) + Math.abs(e.v) * 0.0003 * (e.stat.hasStab && !e.stat.stabDead ? 0.15 : 1) + (e.bot ? 0.0008 : 0) + (e.isHeli && wc === 'gun' ? 0.004 : 0) + (e.st.rof && wc === 'gun' ? 0.003 : 0);
    d.x += (Math.random() - 0.5) * sig * 2; d.y += (Math.random() - 0.5) * sig * 2; d.z += (Math.random() - 0.5) * sig * 2; d.normalize();
    const v0 = wc === 'gun' ? A.v0 : A.v0 * (wc === 'rocket' ? 0.5 : 0.3);
    const ex = { id: e.eid + '#' + (++SID) };
    if (A.guid) { ex.lock = (A.guid === 'lock' || A.guid === 'ir') ? chooseLock(e, A, p, d) : null; if (A.guid === 'ir' && !ex.lock) { slot.n++; e.reload = 0.3; if (e === B.me) toast('AAM: sem aeronave inimiga na mira.', 1.5); return false; } }
    if (A.burst === 'time' || A.burst === 'abm' || A.burst === 'cluster') { const tgR = e === B.me ? B.aimR : (e.ai && e.ai.tg ? Math.hypot(e.ai.tg.x - e.x, e.ai.tg.z - e.z) : 600); ex.ba = Math.max(40, tgR - 3); }
    const nSal = A.salvo > 1 ? A.salvo : 1;
    for (let k = 0; k < nSal; k++) {
      const dk = k ? d.clone().add(new V3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02)).normalize() : d, pk = k ? pylonPos(e) : p, exk = k ? { id: e.eid + '#' + (++SID), lock: ex.lock, ba: ex.ba } : ex;
      spawnShell(e.eid, e.sel, A, pk, dk.clone().multiplyScalar(v0), exk);
      if (k) SB.Net.send({ t: 'f', e: e.eid, a: e.sel, p: [pk.x, pk.y, pk.z], v: [dk.x * v0, dk.y * v0, dk.z * v0], id: exk.id, lk: exk.lock || null, ba: exk.ba || 0 });
    }
    SB.Visual.muzzle(A, p, d, e);
    if (!e.isHeli && !e.st.rof) { e.v -= 0.2 * Math.sign(e.v || 1); if (e === B.me) addShake(0.14); } else if (e === B.me) addShake(wc === 'gun' ? 0.015 : 0.06);
    SB.Net.send({ t: 'f', e: e.eid, a: e.sel, p: [p.x, p.y, p.z], v: [d.x * v0, d.y * v0, d.z * v0], id: ex.id, lk: ex.lock || null, ba: ex.ba || 0 });
    return true;
  }
  function spawnShell(eid, ai, A, p, vel, ex) {
    ex = ex || {};
    const big = A.wc === 'rocket' || A.wc === 'missile' || A.wc === 'aam' || A.wc === 'bomb';
    const vis = SB.Visual.make(A), m = vis.mesh;
    m.position.copy(p); B.tracers.add(m);
    const s = { owner: eid, ai, A, pos: p.clone(), vel, age: 0, mesh: m, dist: 0, id: ex.id || (eid + '#' + (++SID)), lock: ex.lock || null, ba: ex.ba || 0, rocket: A.wc === 'rocket', guid: A.guid || (A.wc === 'missile' ? 'sacls' : null), trail: 0 };
    s.big = big; s.st = vis.style; const own = B.ents.get(eid); s.mine = !!own && own.owner === B.myPeer;
    B.shells.push(s); return s;
  }

  /* ---------------- tiros ---------------- */
  function guideDir(s, dir, dt) {
    if (!s.mine) return dir;
    const A = s.A, own = B.ents.get(s.owner); let aim = null;
    if (s.lock) { const t = B.ents.get(s.lock); if (t && t.alive) aim = new V3(t.x, t.y + 1.6, t.z); else s.lock = null; }
    if (!aim) { if (own === B.me && B.aimPt) aim = B.aimPt.clone(); else if (own && own.ai && own.ai.tg) aim = new V3(own.ai.tg.x, own.ai.tg.y + 1.6, own.ai.tg.z); }
    if (!aim) return dir;
    s.gp = aim.clone();
    if (A.guid === 'top') { const hd = Math.hypot(aim.x - s.pos.x, aim.z - s.pos.z); if (!s.dive && hd > 190) aim.y += 75; else s.dive = true; }
    else if (A.guid === 'over') aim.y = Math.max(aim.y, B.map.H(s.pos.x, s.pos.z) + 3) + 3.5;
    const want = aim.sub(s.pos).normalize(), ang = dir.angleTo(want), maxA = (A.turnRate || 28) * D2R * dt;
    if (ang <= maxA || ang < 1e-5) return want;
    return dir.clone().lerp(want, maxA / ang).normalize();
  }
  function addShake(a, pos) {
    const mul = B.shakeMul == null ? 1 : B.shakeMul; if (!mul) return;
    let f = 1; if (pos) f = Math.max(0, 1 - B.camera.position.distanceTo(pos) / 180);
    B.shake = Math.min(0.45, Math.max(B.shake, a * f * mul));
  }
  function stepShells(dt) {
    for (let i = B.shells.length - 1; i >= 0; i--) {
      const s = B.shells[i], A = s.A, powered = s.rocket || (s.guid && !A.bomb), v = s.vel.length();
      s.age += dt;
      if (powered) {
        const k = clamp(0.3 + 0.7 * s.age / A.burn, 0.3, 1), tgt = A.v0 * k;
        let dir = s.vel.clone().normalize();
        if (s.rocket && !s.guid) { dir.y -= G * 0.12 * dt / Math.max(tgt, 50); dir.normalize(); }
        if (s.guid) dir = guideDir(s, dir, dt);
        s.vel.copy(dir.multiplyScalar(tgt));
      } else { s.vel.multiplyScalar(Math.exp(-A.k * v * dt)); s.vel.y -= G * dt; if (A.bomb && s.guid) { const sp0 = Math.max(1, s.vel.length()); s.vel.copy(guideDir(s, s.vel.clone().normalize(), dt).multiplyScalar(sp0)); } }
      const p0 = s.pos, d = s.vel.clone(), sp = d.length(); d.multiplyScalar(1 / sp); const len = sp * dt;
      s.dist += len;
      let best = null;
      const ir = A.guid === 'ir';
      for (const e of B.ents.values()) {
        if (!e.alive || (e.eid === s.owner && s.age < 0.5) || (ir && !e.isHeli)) continue;
        const c = new V3(e.x, e.y + 1.3, e.z), oc = c.clone().sub(p0), tp = oc.dot(d), dd = oc.lengthSq() - tp * tp;
        // espoletas de proximidade e ataque por cima (EFP)
        if (!s.dead && apsCheck(s, e)) { s.dead = 'aps'; break; }
        if (!s.dead && (A.burst === 'prox' || ir) && c.distanceTo(p0) < (ir ? 9 : 6.5) && s.age > 0.3) { s.dead = 'burst'; break; }
        if (A.guid === 'over' && s.age > 0.4 && Math.hypot(e.x - p0.x, e.z - p0.z) < 3.8 && p0.y - e.y > 1.2 && p0.y - e.y < 14) { s.dead = 'efp'; s.tgt = e; break; }
        if (dd > e.rad * e.rad || tp < -e.rad || tp > len + e.rad) continue;
        updateWorld(e); const t0 = SB.Sim.probe(SB.Sim.prepare({ parts: e.wparts }), p0, d);
        if (t0 != null && t0 <= len + 0.02 && (!best || t0 < best.t)) best = { t: t0, ent: e };
      }
      if (s.dead === 'aps') { removeShell(i); continue; }
      if (s.dead === 'burst') { burstAt(s, p0.clone()); removeShell(i); continue; }
      if (s.dead === 'efp') { topAttack(s, s.tgt, p0.clone()); removeShell(i); continue; }
      if (s.ba && s.dist >= s.ba) { burstAt(s, p0.clone()); removeShell(i); continue; }
      const n = Math.ceil(len / 3); let gt = null;
      for (let k = 1; k <= n; k++) { const t = len * k / n, x = p0.x + d.x * t, y = p0.y + d.y * t, z = p0.z + d.z * t; if (B.map.H(x, z) > y || B.map.hit(x, y, z)) { gt = t; break; } }
      if (best && (gt == null || best.t <= gt)) { hitTank(s, best.ent, p0.clone(), d, sp); removeShell(i); continue; }
      if (gt != null) { const hp = p0.clone().addScaledVector(d, gt); groundImpact(s, hp); removeShell(i); continue; }
      const prevP = s.pos.clone(); s.pos.addScaledVector(d, len); SB.Visual.update(s, d, prevP);
      if (s.age > (powered ? 40 : 14) || s.pos.y < -80 || Math.abs(s.pos.x) > B.map.half + 300 || Math.abs(s.pos.z) > B.map.half + 300) removeShell(i);
    }
  }
  function removeShell(i) { const s = B.shells[i]; B.tracers.remove(s.mesh); SB.Visual.dispose(s.mesh); B.shells.splice(i, 1); }

  /* fumaça / luz */
  function smokeAt(p, A) {
    B.smokes.push({ p: p.clone(), r: A.sym === 'WP' ? 11 : 15, t: A.illum ? 0.1 : 26 });
    if (A.illum) { const L = new THREE.PointLight(0xfff2c0, 1.6, 600); L.position.copy(p).add(new V3(0, 45, 0)); B.scene.add(L); B.flares.push({ L, t: 22 }); SB.FX.fire(p.clone().add(new V3(0, 45, 0)), 6); }
    else SB.FX.smoke(p.clone(), 14, false);
  }
  /* dano de sopro/fragmentos para os meus tanques perto de um ponto */
  function burstAt(s, p) {
    const A = s.A; SB.Visual.impact(A, p, 'air');
    if (A.smoke || A.illum) { smokeAt(p, A); if (!A.fireP) return; }
    if (A.sub) { clusterAt(s, p); return; }
    explodeAround(s, p, A);
  }
  function explodeAround(s, p, A) {
    if (A.tnt <= 0.004 && !A.pellets) return;
    const R = 22 + 7 * Math.cbrt(Math.max(A.tnt * (A.blast || 1) * (A.tb || 1), 0.02));
    for (const e of B.ents.values()) {
      if (!e.alive || e.owner !== B.myPeer) continue;
      if (A.guid === 'ir' && !e.isHeli) continue;
      const c = new V3(e.x, e.y + 1.3, e.z); if (c.distanceTo(p) > R) continue;
      updateWorld(e);
      const res = SB.Sim.burst({ parts: e.wparts }, A, p.clone(), new V3(0, -0.7, 0).add(c.clone().sub(p).normalize().multiplyScalar(0.5)).normalize(), { prior: e.dmg, seed: (Math.random() * 1e9) | 0, minCrew: Math.min(e.isHeli ? 1 : 2, e.stat.crewTotal) });
      applyResult(e, res, s.owner, p, true);
    }
  }
  /* submunições: cada bomba cai e faz um jato contra o teto */
  function clusterAt(s, p) {
    const A = s.A, N = A.sub || 12;
    const sub = Object.assign({}, A, { type: 'HEAT', fam: 'heat', heatP0: 120, liner: { D: 45 }, stand: 250, tnt: 0.03, caseMass: 0.08, ric: [89, 90], tandem: false, efp: false, mp: false, pellets: 0, sub: 0, fireP: 0, burst: null, guid: null, wc: 'gun', pk: 1 });
    for (const e of B.ents.values()) {
      if (!e.alive || e.owner !== B.myPeer || Math.hypot(e.x - p.x, e.z - p.z) > 45) continue;
      updateWorld(e); let last = null; const dm = {};
      for (let i = 0; i < N; i++) {
        const o = new V3(e.x + (Math.random() - 0.5) * 7, e.y + 9, e.z + (Math.random() - 0.5) * 9).add(new V3(Math.sin(e.yaw), 0, Math.cos(e.yaw)).multiplyScalar(0));
        const res = SB.Sim.run({ parts: e.wparts }, sub, { origin: o, dir: new V3(0, -1, 0), dist: 0, v: 60 }, { prior: e.dmg, seed: (Math.random() * 1e9) | 0, minCrew: Math.min(e.isHeli ? 1 : 2, e.stat.crewTotal) });
        res.parts.forEach(pr => { if (pr.kind !== 'armor' && (pr.acc > 0 || pr.det || pr.fire)) { e.dmg[pr.id] = { acc: pr.acc, det: pr.det, fire: pr.fire }; } });
        last = res;
      }
      if (last) applyResult(e, last, s.owner, p, true);
    }
  }
  /* míssil de sobrevoo / ataque por cima: jato (EFP) vertical sobre o teto */
  function topAttack(s, ent, p) {
    SB.FX.sparks(p, 4);
    if (ent.owner === B.myPeer) { updateWorld(ent); const res = SB.Sim.run({ parts: ent.wparts }, s.A, { origin: p, dir: new V3(0, -1, 0), dist: 0, v: s.vel.length() }, { prior: ent.dmg, seed: (Math.random() * 1e9) | 0, minCrew: Math.min(ent.isHeli ? 1 : 2, ent.stat.crewTotal) }); applyResult(ent, res, s.owner, p, false); }
  }
  function groundImpact(s, p) {
    const A = s.A, T = SB.TYPE[A.type]; const near = p.distanceTo(B.camera.position) < 600;
    const boom = T.fam === 'he' || T.fam === 'hesh' || T.fam === 'heat' || A.sub || A.tb > 1 || A.blast > 1;
    if (A.smoke || A.illum) { smokeAt(p, A); if (!A.fireP) return; }
    if (boom) { SB.Visual.impact(A, p, 'ground'); if (A.sub) clusterAt(s, p); else explodeAround(s, p.clone().add(new V3(0, 0.7, 0)), A); } else SB.Visual.impact(A, p, 'ground');
    if (near) addShake(0.1 + (A.tnt > 5 ? 0.3 : 0), p);
  }

  function hitTank(s, ent, p0, d, sp) {
    const A = s.A;
    SB.Visual.impact(A, p0.clone().addScaledVector(d, 0.1), 'tank', d);
    if (A.smoke || A.illum) { smokeAt(p0.clone(), A); if (!A.fireP) return; }
    if (A.sub) { SB.FX.explosion(p0, 0.8); clusterAt(s, p0.clone().add(new V3(0, 3, 0))); return; }
    if (ent.owner === B.myPeer) hitTankSim(s, ent, p0, d, sp, A);
    else SB.FX.clank(p0);
  }
  function hitTankSim(s, ent, p0, d, sp, A) {
    if (!ent.alive) return;
    updateWorld(ent);
    const res = SB.Sim.run({ parts: ent.wparts }, A, { origin: p0, dir: d, dist: 0, v: sp }, { prior: ent.dmg, seed: (Math.random() * 1e9) | 0, minCrew: Math.min(ent.isHeli ? 1 : 2, ent.stat.crewTotal) });
    if (!res.first) return;
    applyResult(ent, res, s.owner, p0, false);
  }
  /* aplica o resultado do simulador ao tanque/helicóptero (só o dono da vítima) e avisa os outros */
  function applyResult(ent, res, byEid, p0, isBurst) {
    ent.hitT = B.t; if (ent.rep) ent.rep = null;
    const changed = {};
    res.parts.forEach(pr => { if (pr.kind !== 'armor' && (pr.acc > 0 || pr.det || pr.fire)) { const o = ent.dmg[pr.id], n = { acc: pr.acc, det: pr.det, fire: pr.fire }; if (!o || o.acc !== n.acc || o.det !== n.det) { ent.dmg[pr.id] = n; changed[pr.id] = [n.acc, n.det ? 1 : 0, n.fire ? 1 : 0]; } } });
    ent.stat = evalDmg(ent);
    ent._dead = ent._dead || {}; res.parts.forEach(pr => { if (pr.kind === 'crew' && pr.acc >= pr.hp) ent._dead[pr.id] = 1; });
    const det = res.verdict && res.ctx.ammoDet, fire = res.ctx.fire;
    const destroyed = res.verdict.destroyed || ent.stat.dead;
    const hp = res.first ? res.first.pos : p0;
    const TY = { air: 0, in: 1, armor: 2, jet: 3, rico: 4 }, r2 = x => +x.toFixed(2);
    const pa = res.path.slice(0, 40).map(p => [r2(p.a.x), r2(p.a.y), r2(p.a.z), r2(p.b.x), r2(p.b.y), r2(p.b.z), TY[p.type] != null ? TY[p.type] : 1]);
    const fr = res.frags.slice(0, 110).map(f => [r2(f.a.x), r2(f.a.y), r2(f.a.z), r2(f.b.x), r2(f.b.y), r2(f.b.z), r2(f.e), f.hit ? 1 : 0]);
    const pn = res.parts.filter(p => p.state === 'pen').map(p => p.id);
    const nowT = performance.now(), full = !ent.lastRp || nowT - ent.lastRp > 2200; if (full) ent.lastRp = nowT;
    const m = { pa: full ? pa : [], fr: full ? fr : [], pn: full ? pn : [], t: 'd', e: ent.eid, by: byEid, dm: changed, o: res.outcome, dead: destroyed, det: !!det, fire: !!fire, hp: [hp.x, hp.y, hp.z], txt: [], bl: res.blasts.slice(0, 3).map(b => [b.pos.x, b.pos.y, b.pos.z, b.tnt]) };
    SB.Net.send(m); showHit(m, true);
    if (fire && !ent.burning && ent.alive) { ent.burning = true; ent.burn = 0; }
    if (destroyed) killEnt(ent, byEid, det);
  }
  const alive = e => e.alive;
  function showHit(m, mine) {
    const ent = B.ents.get(m.e), by = B.ents.get(m.by); if (!ent) return;
    ent.pen = ent.pen || new Set(); (m.pn || []).forEach(id => ent.pen.add(id));
    if (!mine) { for (const id in m.dm) ent.dmg[id] = { acc: m.dm[id][0], det: !!m.dm[id][1], fire: !!m.dm[id][2] }; ent.stat = evalDmg(ent); if (m.fire && !ent.burning && ent.alive) { ent.burning = true; ent.burn = 0; } }
    const hp = new V3(...m.hp);
    SB.FX.sparks(hp, 10); if (m.o === 'perfurou') { SB.FX.smoke(hp, 3, true); } if (m.o === 'ricochet') SB.FX.sparks(hp, 14);
    (m.bl || []).forEach(b => SB.FX.explosion(new V3(b[0], b[1], b[2]), 0.4 + Math.cbrt(b[3]) * 0.7));
    if (by === B.me || ent === B.me) { if (!B.rp || performance.now() - B.rp.t0 > 2200) startReplay(ent, m); if (ent === B.me) addShake(0.25); }
    if (!mine && m.dead && ent.alive) killEnt(ent, m.by, m.det, true);
  }
  function killEnt(ent, byEid, det, remote) {
    if (!ent.alive) return; ent.alive = false; ent.burning = false; ent.deadT = 0; ent.deaths++;
    const by = B.ents.get(byEid); if (by && by !== ent) { by.kills++; B.score[by.team]++; } else B.score[ent.team === 'A' ? 'B' : 'A']++;
    ent.mats.body.color.setHex(0x1a1a1a); ent.mats.body.emissive.setHex(0x000000);
    const p = new V3(ent.x, ent.y + 2, ent.z);
    SB.FX.explosion(p, det ? 3 : 1.5); if (ent.isHeli) { ent.crash = ent.y > B.map.H(ent.x, ent.z) + 2.5 ? { vy: 0, spin: (Math.random() - 0.5) * 4 } : null; det = false; } ent.det = !!det; ent.tv = det ? new V3((Math.random() - 0.5) * 6, 12 + Math.random() * 6, (Math.random() - 0.5) * 6) : null; ent.tOff = new V3();
    addFeed((by ? by.name : '?') + ' [' + (by ? by.def.name : '') + '] ➜ ' + ent.name + ' [' + ent.def.name + ']' + (det ? ' 💥' : ''), by ? by.team : 'A');
    if (ent === B.me) toast('Seu ' + (ent.isHeli ? 'helicóptero' : 'tanque') + ' foi destruído! Reaparece em 10 s.', 4);
    if (ent.owner === B.myPeer) ent.respawn = 10;
    if (SB.Net.mode === 'host' || SB.Net.mode === 'off') checkEnd();
  }
  function extinguish(e) { if (!e.burning || e.ext <= 0) return; e.ext--; if (Math.random() < 0.75) { e.burning = false; SB.Net.send({ t: 'ext', e: e.eid }); toast('Incêndio apagado!', 2); } else toast('Extintor falhou!', 2); }
  function respawnEnt(e, x, z, yaw) {
    e.alive = true; e.fireLeft = 2; e.apsLeft = 3; e.smokeLeft = 2; e.repairsLeft = 3; e.rep = null; e.svT = 0; e.dmg = {}; e._dead = {}; e.burning = false; e.burn = 0; e.ext = 1; e.reload = 3; e.ammo.forEach(a => { a.n = a.n0; }); e.stat = evalDmg(e); e.det = false;
    e.mats.body.color.setHex(PAINT[e.def.nation || 'Customizado'] || 0x6d7163); e.mats.body.emissive.copy(new THREE.Color(TEAMCOL[e.team]).multiplyScalar(0.07));
    e.T.position.set(...e.st.turPivot); e.T.rotation.set(0, 0, 0); e.tv = null; e.respawn = 0; e.tYaw = 0; e.gP = 0; e.snap = null; e.pen = null; placeAt(e, x, z, yaw);
    if (e === B.me) { B.camYaw = yaw; }
  }

  /* ---------------- IA dos bots ---------------- */
  function enemies(e) { return [...B.ents.values()].filter(o => o.alive && o.team !== e.team); }
  function droop(A, r) { const v = A.v0 * Math.exp(-A.k * r * 0.5); return Math.asin(clamp(G * r / (2 * v * v), 0, 0.6)); }
  /* ---------------- base, zonas, manutenção e reparo ---------------- */
  const inBase = (team, x, z) => (team === 'A' ? z < -B.map.half + 190 : z > B.map.half - 190);
  const baseWp = e => ({ x: clamp(e.x, -B.map.half * 0.5, B.map.half * 0.5), z: e.team === 'A' ? -B.map.half + 100 : B.map.half - 100 });
  function serviceFor(e) {
    if (inBase(e.team, e.x, e.z)) return 6;
    for (const z of B.zones) if (z.owner === e.team && Math.hypot(e.x - z.x, e.z - z.z) < z.r) return 14;
    return 0;
  }
  const nonCrewDmg = e => e.def.parts.some(p => p.kind !== 'armor' && p.kind !== 'crew' && e.dmg[p.id] && e.dmg[p.id].acc > 0.02 * Math.max(1, p.hp || 100));
  const needsService = e => e.ammo.some(a => a.n < a.n0) || Object.keys(e.dmg).length > 0 || e.burning || e.stat.crew < e.stat.crewTotal;
  const lowSupplies = e => { const t0 = e.ammo.reduce((a, s) => a + s.n0, 0) || 1, t = e.ammo.reduce((a, s) => a + s.n, 0); return t / t0 < 0.25 || e.stat.speedF < 0.6 || e.stat.gunDead || e.stat.crew < e.stat.crewTotal - 1; };
  const isSlow = e => e.isHeli ? (e.st.plane ? e.y - B.map.H(e.x, e.z) < 26 : (Math.abs(e.v) < 6 && e.y - B.map.H(e.x, e.z) < 7)) : Math.abs(e.v) < 1.6;
  function fullService(e) {
    e.dmg = {}; e._dead = {}; e.burning = false; e.burn = 0; e.ext = 1; e.pen = null; e.repairsLeft = 3; e.fireLeft = 2; e.apsLeft = 3; e.smokeLeft = 2; e.rep = null;
    e.ammo.forEach(a => { a.n = a.n0; }); e.stat = evalDmg(e); SB.Net.send({ t: 'rep', e: e.eid, f: 1 });
    if (e === B.me) toast('✔ Reabastecido e reparado por completo!', 2.5);
  }
  function serviceStep(e, dt) {
    if (!e.alive) { e.svT = 0; e.rep = null; return; }
    const need = serviceFor(e), recentHit = B.t - (e.hitT || -99) < 2.5;
    if (need && isSlow(e) && !recentHit && needsService(e)) { e.svT = (e.svT || 0) + dt; e.svDur = need; if (e.svT >= need) { fullService(e); e.svT = 0; } } else e.svT = 0;
    if (e.bot && !e.rep && !(e.ai && e.ai.tg) && e.repairsLeft > 0 && nonCrewDmg(e) && isSlow(e) && !need) startRepair(e, true);
    if (e.rep) {
      if (!isSlow(e) || recentHit) { e.rep = null; if (e === B.me) toast('Reparo interrompido!', 2); return; }
      e.rep.t += dt;
      if (e.rep.t >= e.rep.dur) {
        e.def.parts.forEach(p => { if (p.kind !== 'armor' && p.kind !== 'crew') delete e.dmg[p.id]; });
        e.burning = false; e.burn = 0; e.repairsLeft--; e.stat = evalDmg(e); e.rep = null; SB.Net.send({ t: 'rep', e: e.eid, f: 0 });
        if (e === B.me) toast('🛠 Reparo concluído (restam ' + e.repairsLeft + ')', 2.5);
      }
    }
  }
  function startRepair(e, quiet) {
    if (!e.alive || e.rep) return;
    if (e.repairsLeft <= 0) { if (!quiet && e === B.me) toast('Sem equipe de reparo: volte a uma base ou zona sua.', 2.5); return; }
    if (!nonCrewDmg(e) && !e.burning) { if (!quiet && e === B.me) toast('Nada para reparar (tripulantes só voltam na base).', 2); return; }
    if (!isSlow(e)) { if (!quiet && e === B.me) toast(e.isHeli ? (e.st.plane ? 'Voe baixo sobre a base para reparar.' : 'Pouse (baixa altitude e velocidade) para reparar.') : 'Pare o veículo para reparar.', 2); return; }
    e.rep = { t: 0, dur: 12 }; if (e === B.me) toast('🛠 Reparando… não se mova (12 s)', 2.5);
  }
  function zoneStep(dt) {
    if (!B.zones.length || B.cfg.mode === 'client') return;
    B.zones.forEach(z => {
      let nA = 0, nB = 0;
      for (const e of B.ents.values()) { if (!e.alive || Math.hypot(e.x - z.x, e.z - z.z) > z.r) continue; if (e.isHeli && e.y - B.map.H(e.x, e.z) > 90) continue; if (e.team === 'A') nA++; else nB++; }
      const d = nA - nB; if (d) z.cap = clamp(z.cap + clamp(d, -3, 3) * 0.07 * dt, -1, 1);
      if (z.cap >= 1) z.owner = 'A'; else if (z.cap <= -1) z.owner = 'B'; else if (Math.abs(z.cap) < 0.03) z.owner = null;
    });
    B.zt = (B.zt || 0) + dt;
    if (B.zt >= 1) { B.zt -= 1; B.zones.forEach(z => { if (z.owner) B.pts[z.owner] += 1; }); const cap = B.cfg.capPoints || 600; if (B.pts.A >= cap) endMatch('A'); else if (B.pts.B >= cap) endMatch('B'); }
  }
  function mkZones() {
    B.zones = []; if (B.cfg.rules !== 'capture') return;
    B.map.zones.forEach(z => {
      const gh = B.map.H(z.x, z.z);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(z.r, z.r, 70, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      beam.position.set(z.x, gh + 30, z.z); B.scene.add(beam);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(z.r, 0.9, 6, 48), new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.7 }));
      ring.rotation.x = Math.PI / 2; ring.position.set(z.x, gh + 2.5, z.z); B.scene.add(ring);
      const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 24, 6), new THREE.MeshBasicMaterial({ color: 0xcccccc })); flag.position.set(z.x, gh + 12, z.z); B.scene.add(flag);
      B.zones.push({ x: z.x, z: z.z, r: z.r, n: z.n, cap: 0, owner: null, beam, ring, flag, last: 9 });
    });
    // marcadores das bases (mastros com bandeira da equipe)
    ['A', 'B'].forEach(team => { const zb = team === 'A' ? -B.map.half + 190 : B.map.half - 190; for (let x = -B.map.half * 0.6; x <= B.map.half * 0.6; x += 150) { const gh = B.map.H(x, zb); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 5), new THREE.MeshBasicMaterial({ color: team === 'A' ? 0x3aa0ff : 0xff5a4a })); m.position.set(x, gh + 7, zb); B.scene.add(m); } });
  }
  function zoneColors() {
    B.zones.forEach(z => {
      const k = Math.round(z.cap * 100) + (z.owner || 'n'); if (z.last === k) return; z.last = k;
      const c = new THREE.Color(0x888888).lerp(new THREE.Color(z.cap >= 0 ? 0x3aa0ff : 0xff5a4a), Math.min(1, Math.abs(z.cap)));
      z.beam.material.color.copy(c); z.ring.material.color.copy(c); z.flag.material.color.copy(c);
    });
  }
  function launchSmoke(e) {
    const left = e.smokeLeft == null ? 2 : e.smokeLeft;
    if (!e.alive || !e.stat.hasSmokeL || left <= 0 || B.t - (e.smokeT || -99) < 1) return false;
    e.smokeLeft = left - 1; e.smokeT = B.t; const a = e.yaw + e.tYaw, pts = [];
    for (let k = -1; k <= 1; k++) { const ang = a + k * 0.45, p = new V3(e.x - Math.sin(ang) * 30, e.y + 1.5, e.z - Math.cos(ang) * 30); B.smokes.push({ p, r: 13, t: 24 }); SB.FX.smoke(p.clone(), 10, false); pts.push([p.x, p.y, p.z]); }
    SB.Net.send({ t: 'smk', p: pts }); if (e === B.me) toast('💨 Granadas fumígenas lançadas (' + e.smokeLeft + ' restantes)', 2);
    return true;
  }
  function apsCheck(s, e) {
    if (!e.stat.hasAps || e.owner !== B.myPeer || e.eid === s.owner) return false;
    const A = s.A; if (!(A.wc !== 'gun' || A.fam === 'heat')) return false;
    if ((e.apsLeft == null ? 3 : e.apsLeft) <= 0 || B.t - (e.apsT || -9) < 1) return false;
    const c = new V3(e.x, e.y + 1.5, e.z), to = c.clone().sub(s.pos);
    if (to.length() > 17 || s.vel.dot(to) <= 0) return false;
    e.apsLeft = (e.apsLeft == null ? 3 : e.apsLeft) - 1; e.apsT = B.t;
    SB.FX.explosion(s.pos.clone(), 0.5); SB.Net.send({ t: 'aps', id: s.id, e: e.eid, p: [s.pos.x, s.pos.y, s.pos.z] });
    if (e === B.me) toast('🛡 APS interceptou ' + (A.wc === 'gun' ? 'um projétil HEAT' : 'um míssil/foguete') + '! (' + e.apsLeft + ' cargas)', 2.5);
    return true;
  }
  function scoreAmmo(A, r, tg) {
    if (A.wc === 'aam' && !(tg && tg.isHeli)) return -1; if (A.smoke || A.illum || A.inert) return -1;
    if (tg && tg.isHeli) return A.burst ? 100 + A.tnt * 10 : A.fam === 'he' ? 60 : SB.nominalPen(A, r) * 0.2;
    const pen = SB.nominalPen(A, r) * (A.fam === 'he' ? 0.4 : 1) * (A.guid ? 1.3 : 1) * (A.sub ? 0.5 : 1);
    return A.wc === 'aam' ? -1 : pen;
  }
  function pickWp(e) {
    if (B.zones.length) {
      const cand = B.zones.filter(z => z.owner !== e.team), arr = cand.length ? cand : B.zones, z = arr[Math.floor(Math.random() * arr.length)], a = Math.random() * 6.28, rr = Math.random() * z.r * 0.6;
      return { x: z.x + Math.cos(a) * rr, z: z.z + Math.sin(a) * rr };
    }
    const dirz = e.team === 'A' ? 1 : -1;
    return { x: clamp(e.x + (Math.random() - 0.5) * 500, -B.map.half + 60, B.map.half - 60), z: clamp(e.z + dirz * (150 + Math.random() * 300), -B.map.half + 60, B.map.half - 60) };
  }
  function aiHeli(e, dt) {
    const ai = e.ai || (e.ai = { t: 0, tg: null, alt: 38 + Math.random() * 28, off: Math.random() * 6.28, wp: null });
    const pos = new V3(e.x, e.y, e.z), c = e.ctl; ai.t -= dt;
    if (ai.t <= 0) {
      ai.t = 0.6 + Math.random() * 0.4; let best = null, bd = 1e9;
      enemies(e).forEach(o => { const d0 = Math.hypot(o.x - e.x, o.z - e.z), d = d0 * (e.st.plane && !o.isHeli ? 0.5 : 1); if (d0 < 2800 && d < bd) { bd = d; best = o; } });
      ai.tg = best; ai.los = best ? B.map.los(pos, new V3(best.x, best.y + 2, best.z)) : false;
      ai.svc = lowSupplies(e);
      if (ai.svc) ai.wp = baseWp(e); else if (!ai.wp || ai.wasSvc || Math.hypot(ai.wp.x - e.x, ai.wp.z - e.z) < 60) ai.wp = pickWp(e);
      ai.wasSvc = ai.svc;
    }
    const tg = ai.tg; let gx, gz, thr = 0.9;
    if (e.st.plane) { if (tg) { gx = tg.x; gz = tg.z; const d = Math.hypot(tg.x - e.x, tg.z - e.z); if (d < 380 && ai.pass == null) ai.pass = B.t; if (ai.pass != null && B.t - ai.pass < 6) { gx = e.x - Math.sin(e.yaw) * 900; gz = e.z - Math.cos(e.yaw) * 900; } else ai.pass = null; thr = 0.8; } else { gx = ai.wp.x; gz = ai.wp.z; thr = 0.6; } }
    else if (tg) { gx = tg.x + Math.cos(B.t * 0.3 + ai.off) * 300; gz = tg.z + Math.sin(B.t * 0.3 + ai.off) * 300; const d = Math.hypot(tg.x - e.x, tg.z - e.z); thr = d > 1300 ? 1 : d < 650 ? -0.3 : 0.25; } else { gx = ai.wp.x; gz = ai.wp.z; }
    const want = Math.atan2(-(gx - e.x), -(gz - e.z)), err = wrap(want - e.yaw);
    c.steer = clamp(err * 2, -1, 1); c.thr = (Math.abs(err) > 1.1 && !e.st.plane) ? Math.min(thr, 0.3) : thr;
    if (ai.svc && inBase(e.team, e.x, e.z) && !e.st.plane) { c.thr = 0; c.steer = 0; }
    const ax = e.x - Math.sin(e.yaw) * 70, az = e.z - Math.cos(e.yaw) * 70, gh = Math.max(B.map.H(e.x, e.z), B.map.H(ax, az)), tgtAlt = (ai.svc && inBase(e.team, e.x, e.z)) ? gh + 2.5 : gh + ai.alt + (B.map.hit(ax, e.y, az) ? 60 : 0);
    c.lift = clamp((tgtAlt - e.y) / 12, -1, 1); c.fire = false;
    if (tg) {
      const tp = new V3(tg.x, tg.y + 1.5, tg.z), r = pos.distanceTo(tp);
      const hdist = Math.hypot(tg.x - e.x, tg.z - e.z), alt0 = Math.max(5, e.y - tg.y), lead0 = Math.abs(e.v) * Math.sqrt(2 * alt0 / G), bombOk = !tg.isHeli && Math.abs(hdist - lead0) < 55 && alt0 > 20 && Math.abs(wrap(Math.atan2(-(tg.x - e.x), -(tg.z - e.z)) - e.yaw)) < 0.22;
      let bi = e.sel, bs = -1; e.ammo.forEach((a, i) => { const A = a.A; if (a.n <= 0) return; let sc = 0;
        if (tg.isHeli) sc = A.wc === 'aam' ? 100 : A.wc === 'gun' && r < 1200 ? 50 : 0;
        else if (A.wc === 'aam' || (A.wc === 'bomb' && !bombOk)) sc = -1; else if (A.wc === 'bomb') sc = 95; else if (A.wc === 'missile') sc = r > 900 && ai.los ? 90 : (r > 500 ? 30 : 0); else if (A.wc === 'rocket') sc = r > 350 && r < 1700 ? 60 : 0; else sc = r < 1100 ? 55 : 5;
        if (A.smoke || A.illum || A.inert) sc = -1; if (sc > bs) { bs = sc; bi = i; } });
      if (e.reload <= 0.2 && bi !== e.sel) e.sel = bi;
      const A = e.ammo[e.sel].A, tt = r / Math.max(300, A.v0 * 0.8), lead = tp.clone(); lead.x -= Math.sin(tg.yaw) * tg.v * tt; lead.z -= Math.cos(tg.yaw) * tg.v * tt;
      const dv = lead.sub(pos), hd = Math.hypot(dv.x, dv.z), jit = (Math.random() - 0.5) * 0.003 * r / 100;
      c.aimYaw = Math.atan2(-dv.x, -dv.z) + jit; c.aimPitch = Math.atan2(dv.y, hd) + (A.wc === 'gun' ? droop(A, r) : 0);
      const eY = Math.abs(wrap(c.aimYaw - e.yaw - e.tYaw)), eP = Math.abs(c.aimPitch - e.pitch * Math.cos(e.tYaw) - e.gP), maxR = A.wc === 'missile' ? 3000 : A.wc === 'aam' ? 2200 : A.wc === 'rocket' ? 1800 : 1200;
      if (A.wc === 'bomb') { if (bombOk && e.reload <= 0 && B.t > 12) c.fire = true; } else if (eY < (e.st.plane ? 0.1 : 0.05) && eP < (e.st.plane ? 0.14 : 0.05) && e.reload <= 0 && r < maxR && (ai.los || A.wc === 'aam') && B.t > 12) c.fire = true;
    } else { c.aimYaw = e.yaw; c.aimPitch = -0.05; }
  }
  function aiThink(e, dt) {
    if (e.isHeli) return aiHeli(e, dt);
    const ai = e.ai || (e.ai = { t: 0, tg: null, wp: null, err: 0 });
    if (B.t - (e.hitT || -99) < 1.5 && e.stat.hasSmokeL && Math.random() < 0.2) launchSmoke(e);
    const pos = new V3(e.x, e.y + 2, e.z);
    ai.t -= dt;
    if (ai.t <= 0) {
      ai.t = 0.5 + Math.random() * 0.5; let best = null, bd = 1e9;
      const aaV = e.st.elev && e.st.elev[1] > 60;
      enemies(e).forEach(o => { const d0 = Math.hypot(o.x - e.x, o.z - e.z), d = aaV ? (o.isHeli ? d0 * 0.3 : d0 * 3) : d0, lim = aaV && o.isHeli ? 2600 : 900; if (d0 < lim && d < bd && B.map.los(pos, new V3(o.x, o.y + 2, o.z))) { bd = d; best = o; } });
      ai.tg = best;
      ai.svc = lowSupplies(e);
      if (ai.svc) ai.wp = baseWp(e); else if (!ai.wp || ai.wasSvc || Math.hypot(ai.wp.x - e.x, ai.wp.z - e.z) < 40) ai.wp = pickWp(e);
      ai.wasSvc = ai.svc;
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
    if (ai.svc && inBase(e.team, e.x, e.z) && !tg) { thr = 0; c.steer = 0; }
    c.thr = thr; c.fire = false;
    if (tg) {
      const tp = new V3(tg.x, tg.y + 1.6, tg.z), r = pos.distanceTo(tp), slot = e.ammo[e.sel];
      // escolhe a melhor munição
      let bi = e.sel, bp = -1; e.ammo.forEach((a, i) => { if (a.n > 0) { const pen = scoreAmmo(a.A, r, tg); if (pen > bp) { bp = pen; bi = i; } } }); if (e.reload <= 0.3 && bi !== e.sel) e.sel = bi;
      const A = e.ammo[e.sel].A, tt = r / (A.v0 * 0.9);
      const lead = new V3(tp.x + Math.sin(tg.yaw) * -tg.v * tt * -1, tp.y, tp.z + Math.cos(tg.yaw) * -tg.v * tt * -1);
      lead.x = tp.x - Math.sin(tg.yaw) * tg.v * tt; lead.z = tp.z - Math.cos(tg.yaw) * tg.v * tt;
      const dv = lead.sub(pos), hd = Math.hypot(dv.x, dv.z);
      const jitter = (1 - 0.7 * (ai.skill || 0.5)) * (Math.random() - 0.5) * 0.004 * r / 100;
      c.aimYaw = Math.atan2(-dv.x, -dv.z) + jitter; c.aimPitch = Math.atan2(dv.y, hd) + droop(A, r) + jitter * 0.5;
      const eY = Math.abs(wrap(c.aimYaw - e.yaw - e.tYaw)), eP = Math.abs(c.aimPitch - e.pitch * Math.cos(e.tYaw) - e.gP);
      const tol = e.st.rof ? 0.03 : 0.012;
      if (eY < tol && eP < tol && e.reload <= 0 && r < (e.st.elev && e.st.elev[1] > 60 ? 2200 : 1100)) c.fire = true;
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
      const k = B.keys, c = me.ctl; c.thr = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0); c.steer = (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0); if (me.isHeli) c.lift = (k.Space ? 1 : 0) - (k.ShiftLeft ? 1 : 0); else if (k.Space) { c.thr = 0; me.v *= 0.92; } c.fire = !!k.Fire;
      // ponto mirado pela câmera
      const cd = camDir(), co = camOrigin(cd), hit = rangeAlong(co, cd);
      B.aimR = hit.r; B.aimPt = hit.p; const tp = new V3(me.x, me.y + 2.3, me.z); const aimPt = hit.p; const dv = aimPt.clone().sub(tp), hd = Math.hypot(dv.x, dv.z), A = me.ammo[me.sel].A;
      c.aimYaw = Math.atan2(-dv.x, -dv.z); c.aimPitch = Math.atan2(dv.y, hd) + droop(A, me.stat.lrfDead ? Math.max(30, Math.round(dv.length() / 150) * 150 * (1 + Math.sin(B.t * 0.7) * 0.12)) : Math.max(30, dv.length()));
    } else { me.ctl.thr = 0; me.ctl.steer = 0; me.ctl.fire = false; }
    const stuckInput = B.keys;
    for (const e of B.ents.values()) {
      if (e.owner === B.myPeer) {
        if (e.bot && e.alive) aiThink(e, dt);
        driveEnt(e, dt); serviceStep(e, dt);
        if (!e.alive && e.respawn > 0) { e.respawn -= dt; if (e.respawn <= 0) { const sl = B.map.spawns[e.team][Math.floor(Math.random() * 14)]; respawnEnt(e, sl.x + (Math.random() - 0.5) * 20, sl.z, sl.yaw); SB.Net.send({ t: 'r', e: e.eid, x: e.x, z: e.z, yaw: e.yaw }); } }
      } else remoteStep(e, dt);
      effectsStep(e, dt);
    }
    for (let sub = 0; sub < 2; sub++) stepShells(dt / 2);
    for (let i = B.smokes.length - 1; i >= 0; i--) { const sm = B.smokes[i]; sm.t -= dt; if (sm.t <= 0) { B.smokes.splice(i, 1); continue; } if (Math.random() < dt * 12) SB.FX.smoke(sm.p.clone().add(new V3((Math.random() - 0.5) * sm.r, Math.random() * 4, (Math.random() - 0.5) * sm.r)), 1, false); }
    for (let i = B.flares.length - 1; i >= 0; i--) { const f = B.flares[i]; f.t -= dt; f.L.position.y -= 2 * dt; if (f.t <= 0) { B.scene.remove(f.L); B.flares.splice(i, 1); } }
    SB.FX.update(dt); B.shake = Math.max(0, B.shake - dt * 4);
    zoneStep(dt); zoneColors();
    B.netT -= dt; if (B.netT <= 0) { B.netT = 0.07; netState(); }
    if (B.cfg.mode !== 'client' && B.t > B.cfg.timeLimit) { const sc = B.cfg.rules === 'capture' ? B.pts : B.score; endMatch(sc.A >= sc.B ? (sc.A === sc.B ? 'T' : 'A') : 'B'); }
  }
  function effectsStep(e, dt) {
    if (e.isHeli) {
      const spin = e.alive ? (e.stat.rotorDead ? 4 : 40) : (e.crash ? 22 : 0);
      e.Rg.rotation.y += spin * dt; e.R2.rotation.y -= spin * dt * 0.9; e.Tl.rotation.x += spin * dt * 1.4;
      if (!e.alive && e.crash) {
        const c = e.crash; c.vy -= 14 * dt; e.y += c.vy * dt; e.yaw += c.spin * dt; e.x += -Math.sin(e.yaw) * e.v * dt * 0.5; e.z += -Math.cos(e.yaw) * e.v * dt * 0.5; e.pitch += 0.6 * dt; e.roll += c.spin * 0.2 * dt;
        SB.FX.fire(new V3(e.x, e.y + 1, e.z), 1); SB.FX.smoke(new V3(e.x, e.y + 1, e.z), 1, true);
        const gh = B.map.H(e.x, e.z); if (e.y <= gh + 0.8) { e.y = gh + 0.8; e.crash = null; e.v = 0; SB.FX.explosion(new V3(e.x, e.y + 1, e.z), 2.2); addShake(0.25, new V3(e.x, e.y, e.z)); }
        poseEnt(e, 1);
      }
    }
    if (e.burning && e.alive) { e.burn += dt; if (e.owner === B.myPeer && e.stat.fireSupOk && (e.fireLeft == null || e.fireLeft > 0) && e.burn > 1.6) { e.burning = false; e.fireLeft = (e.fireLeft == null ? 2 : e.fireLeft) - 1; SB.Net.send({ t: 'ext', e: e.eid }); if (e === B.me) toast('🧯 Supressão automática de incêndio acionada!', 2.5); } SB.FX.fire(new V3(e.x, e.y + 2, e.z), 1); SB.FX.smoke(new V3(e.x, e.y + 2.5, e.z), 1, true); if (e.owner === B.myPeer) { if (e.bot && e.burn > 3 && e.ext > 0) extinguish(e); if (e.burn > (e.isHeli ? 9 : 18) && e.burning) { e.burning = false; selfKill(e, 'Queimou'); } } }
    if (!e.alive) { e.deadT += dt; if (e.deadT < 30 && Math.random() < dt * 8) SB.FX.smoke(new V3(e.x, e.y + 2, e.z), 1, true); if (e.det && e.tv) { e.tv.y -= 20 * dt; e.tOff.addScaledVector(e.tv, dt); if (e.tOff.y < 0 && e.tv.y < 0) { e.tOff.y = 0; e.tv = null; } e.T.position.set(e.st.turPivot[0] + e.tOff.x, e.st.turPivot[1] + e.tOff.y, e.st.turPivot[2] + e.tOff.z); e.T.rotation.z += dt * 2; } }
  }
  function remoteStep(e, dt) {
    const s = e.snap; if (!s) { poseEnt(e, 1); return; }
    const k = 1 - Math.exp(-dt * 10);
    s.x += -Math.sin(s.yaw) * s.v * dt; s.z += -Math.cos(s.yaw) * s.v * dt;
    e.x += (s.x - e.x) * k; e.z += (s.z - e.z) * k; e.yaw += wrap(s.yaw - e.yaw) * k; e.tYaw += wrap(s.tYaw - e.tYaw) * k; e.gP += (s.gP - e.gP) * k; e.v = s.v;
    if (e.isHeli && s.y != null) { e.y += (s.y - e.y) * k; e.pitch += (-(s.v / Math.max(e.st.vmax / 3.6, 1)) * 0.3 - e.pitch) * k; }
    poseEnt(e, Math.min(1, dt * 6));
  }
  function netState() {
    if (SB.Net.mode === 'off') return;
    if (B.zones.length && B.cfg.mode !== 'client') { B.zN = (B.zN || 0) - 0.07; if (B.zN <= 0) { B.zN = 0.5; SB.Net.send({ t: 'z', c: B.zones.map(z => +z.cap.toFixed(3)), o: B.zones.map(z => z.owner || ''), p: [Math.floor(B.pts.A), Math.floor(B.pts.B)] }); } }
    const arr = []; for (const e of B.ents.values()) if (e.owner === B.myPeer && e.alive) arr.push([e.eid, +e.x.toFixed(2), +e.z.toFixed(2), +e.yaw.toFixed(3), +e.tYaw.toFixed(3), +e.gP.toFixed(3), +e.v.toFixed(2), +e.y.toFixed(1)]);
    if (arr.length) SB.Net.send({ t: 's', a: arr });
    const gm = B.shells.filter(q => q.mine && q.guid).map(q => [q.id, +q.pos.x.toFixed(1), +q.pos.y.toFixed(1), +q.pos.z.toFixed(1), +q.vel.x.toFixed(1), +q.vel.y.toFixed(1), +q.vel.z.toFixed(1)]);
    if (gm.length) SB.Net.send({ t: 'm', a: gm });
  }
  function onNet(m, from) {
    if (!B) { SB.Lobby && SB.Lobby.onMsg && SB.Lobby.onMsg(m, from); return; }
    switch (m.t) {
      case 's': m.a.forEach(r => { const e = B.ents.get(r[0]); if (!e || e.owner === B.myPeer) return; const sn = { x: r[1], z: r[2], yaw: r[3], tYaw: r[4], gP: r[5], v: r[6], y: r[7] }; if (!e.snap) { e.x = sn.x; e.z = sn.z; e.yaw = sn.yaw; e.tYaw = sn.tYaw; e.gP = sn.gP; } e.snap = sn; }); break;
      case 'f': { const e = B.ents.get(m.e); if (!e || e.owner === B.myPeer) break; const sl = e.ammo[m.a]; if (!sl) break; sl.n = Math.max(0, sl.n - 1); const p = new V3(...m.p); spawnShell(m.e, m.a, sl.A, p, new V3(...m.v), { id: m.id, lock: m.lk, ba: m.ba }); SB.Visual.muzzle(sl.A, p, new V3(...m.v).normalize(), e); break; }
      case 'm': m.a.forEach(r => { const q = B.shells.find(x => x.id === r[0]); if (q && !q.mine) { q.pos.set(r[1], r[2], r[3]); q.vel.set(r[4], r[5], r[6]); } }); break;
      case 'd': { const ent = B.ents.get(m.e); if (ent && ent.owner !== B.myPeer) showHit(m, false); break; }
      case 'r': { const e = B.ents.get(m.e); if (e && e.owner !== B.myPeer) respawnEnt(e, m.x, m.z, m.yaw); break; }
      case 'end': showEnd(m.w); break;
      case 'ext': { const e = B.ents.get(m.e); if (e && e.owner !== B.myPeer) e.burning = false; break; }
      case 'smk': m.p.forEach(p => { const v = new V3(...p); B.smokes.push({ p: v, r: 13, t: 24 }); SB.FX.smoke(v.clone(), 10, false); }); break;
      case 'aps': { const i = B.shells.findIndex(q => q.id === m.id); if (i >= 0) removeShell(i); SB.FX.explosion(new V3(...m.p), 0.5); break; }
      case 'z': if (B.cfg.mode === 'client') { m.c.forEach((c, i) => { if (B.zones[i]) { B.zones[i].cap = c; B.zones[i].owner = m.o[i] || null; } }); B.pts.A = m.p[0]; B.pts.B = m.p[1]; } break;
      case 'rep': { const e = B.ents.get(m.e); if (!e || e.owner === B.myPeer) break; if (m.f) { e.dmg = {}; e._dead = {}; e.burning = false; e.pen = null; e.ammo.forEach(a => { a.n = a.n0; }); } else e.def.parts.forEach(p => { if (p.kind !== 'armor' && p.kind !== 'crew') delete e.dmg[p.id]; }); e.stat = evalDmg(e); break; }
      case 'abort': case 'hostLeft': toast('O anfitrião encerrou a partida.', 3); setTimeout(() => stop(), 1500); break;
      case 'left': { for (const e of B.ents.values()) if (e.owner === from) { e.alive = false; e.snap = null; e.G.visible = false; } break; }
    }
  }
  function checkEnd() { if (B.cfg.mode === 'client' || B.cfg.rules === 'capture') return; if (B.score.A >= B.cfg.winKills) endMatch('A'); else if (B.score.B >= B.cfg.winKills) endMatch('B'); }
  function endMatch(w) { if (B.over) return; SB.Net.send({ t: 'end', w }); showEnd(w); }
  function showEnd(w) {
    if (B.over) return; B.over = true; try { document.exitPointerLock(); } catch (e) { }
    const d = $('endb'); d.style.display = 'flex'; d.innerHTML = '<h1>' + (w === 'T' ? 'EMPATE' : (w === B.me.team ? 'VITÓRIA!' : 'DERROTA')) + '</h1><p>' + (B.cfg.rules === 'capture' ? 'Pontos de zona: Azul ' + Math.floor(B.pts.A) + ' × ' + Math.floor(B.pts.B) + ' Vermelho · abates ' : '') + 'Azul ' + B.score.A + ' × ' + B.score.B + ' Vermelho</p><p>Seus abates: ' + B.me.kills + ' · Mortes: ' + B.me.deaths + '</p><button id="bback">Voltar ao menu</button>';
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
      for (const e of B.ents.values()) if (e !== B.me && e.alive && Math.hypot(e.x - x, e.z - z) < (e.isHeli ? 7 : 3.4) && y < e.y + (e.isHeli ? 4 : 3.4) && y > e.y - (e.isHeli ? 2 : 0)) return { r, p: new V3(x, y, z) };
    }
    return { r: 3200, p: o.clone().addScaledVector(d, 3200) };
  }
  function render(dt) {
    const me = B.me, cam = B.camera, d = camDir(), o = camOrigin(d);
    cam.position.copy(o); if (B.shake > 0.005) { cam.position.x += (Math.random() - 0.5) * B.shake * 0.5; cam.position.y += (Math.random() - 0.5) * B.shake * 0.5; }
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
    if (B.cfg.rules === 'capture') {
      $('topc').innerHTML = '<span class="ta">AZUL ' + Math.floor(B.pts.A) + '</span> <span class="tm">' + mm(Math.max(0, B.cfg.timeLimit - B.t)) + ' · captura até ' + (B.cfg.capPoints || 600) + '</span> <span class="tb">VERM. ' + Math.floor(B.pts.B) + '</span>';
      $('zones').innerHTML = B.zones.map(z => { const col = z.cap >= 0 ? '#3aa0ff' : '#ff5a4a', pct = Math.round(Math.abs(z.cap) * 100); return '<div class="zt" style="border-color:' + (z.owner === 'A' ? '#3aa0ff' : z.owner === 'B' ? '#ff5a4a' : '#667') + '"><b>' + z.n + '</b><i style="background:' + col + ';width:' + pct + '%"></i></div>'; }).join('');
    } else $('topc').innerHTML = '<span class="ta">AZUL ' + B.score.A + '</span> <span class="tm">' + mm(Math.max(0, B.cfg.timeLimit - B.t)) + ' · meta ' + B.cfg.winKills + '</span> <span class="tb">VERM. ' + B.score.B + '</span>';
    { const me = B.me, sv = $('svc'); let t = ''; if (me.rep) t = '🛠 Reparando… ' + Math.round(me.rep.t / me.rep.dur * 100) + '%';
      else if (me.svT > 0) t = '🔧 Reabastecendo e reparando… ' + Math.round(me.svT / (me.svDur || 6) * 100) + '%';
      else if (me.alive && serviceFor(me) && needsService(me)) t = '🔧 Ponto de manutenção: pare' + (me.isHeli ? ' e pouse' : '') + ' (' + serviceFor(me) + ' s)';
      else if (me.alive && (nonCrewDmg(me) || me.burning) && me.repairsLeft > 0) t = 'Danificado: G repara no lugar (' + me.repairsLeft + ' restantes)';
      sv.textContent = t; sv.style.display = t ? 'block' : 'none'; }
    $('feed').innerHTML = B.feed.filter(f => B.t - f.at < 12).map(f => '<div style="color:' + TEAMCOL[f.team] + '">' + f.t + '</div>').join('');
    $('spd').textContent = Math.round(Math.abs(me.v) * 3.6) + ' km/h' + (me.isHeli ? ' · alt ' + Math.round(me.y - B.map.H(me.x, me.z)) + ' m' : '') + '  |  ' + me.def.name;
    $('rng').textContent = 'alcance: ' + (B.aimR >= 3200 ? '--' : Math.round(B.aimR) + ' m') + (me.burning ? '   🔥 INCÊNDIO (F)' : '') + (!me.alive ? '   ☠ reaparece em ' + Math.ceil(me.respawn) + ' s' : '');
    const s = me.stat; $('crewl').innerHTML = 'Tripulação ' + s.crew + '/' + s.crewTotal + (s.gunDead ? ' · CANHÃO FORA' : '') + (s.rotorDead ? ' · ROTOR PERDIDO' : '') + (s.tailDead ? ' · ROTOR DE CAUDA PERDIDO' : '') + (s.speedF === 0 ? ' · IMOBILIZADO' : s.speedF < 0.7 ? ' · AVARIADO' : '') + (function () { const sy = []; if (s.hasStab) sy.push('Estabilizador ' + (s.stabDead ? '✖' : '✔')); if (s.hasAuto) sy.push('Autoloader ' + (s.autoDead ? '✖' : s.autoDmg ? '⚠' : '✔')); if (s.ringDead) sy.push('Anel da torre ✖'); if (s.lrfDead) sy.push('Telêmetro ✖'); if (s.hasFireSup) sy.push('Extintor auto ' + (me.fireLeft == null ? 2 : me.fireLeft)); if (s.hasAps) sy.push('APS ' + (me.apsLeft == null ? 3 : me.apsLeft)); if (s.hasSmokeL) sy.push('Fumaça(V) ' + (me.smokeLeft == null ? 2 : me.smokeLeft)); return sy.length ? '<br><small>' + sy.join(' · ') + '</small>' : ''; })();
    $('ammo').innerHTML = me.ammo.map((a, i) => '<div class="am' + (i === me.sel ? ' on' : '') + '"><b>' + (i + 1) + '</b> ' + ({ gun: '', rocket: '🚀 ', missile: '➶ ', aam: '✈ ', bomb: '💣 ' }[a.A.wc] || '') + (a.A.shortName || a.A.name) + '<br><span>' + a.A.type + ' · ' + a.n + '</span></div>').join('');
    const rt = me.isHeli ? 1 / ((me.ammo[me.sel].A.rof) || 4) : reloadT(me), rr = me.reload > 0 ? 1 - me.reload / Math.max(rt, 0.05) : 1; $('reload').firstChild.style.width = clamp(rr, 0, 1) * 100 + '%'; $('reload').style.opacity = rr < 1 ? 1 : 0.35;
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
    { const hb = 190 / S * W; g.fillStyle = 'rgba(58,160,255,.16)'; g.fillRect(0, 0, W, hb); g.fillStyle = 'rgba(255,90,74,.16)'; g.fillRect(0, W - hb, W, hb);
      B.zones.forEach(z => { const [a, b] = m(z.x, z.z); g.beginPath(); g.arc(a, b, z.r / S * W, 0, 7); g.fillStyle = z.owner === 'A' ? 'rgba(58,160,255,.35)' : z.owner === 'B' ? 'rgba(255,90,74,.35)' : 'rgba(180,180,190,.25)'; g.fill(); g.strokeStyle = '#fff8'; g.stroke(); }); }
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
