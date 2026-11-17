/* Mapas procedurais determinísticos (mesma semente = mesmo mapa em todos os jogadores online) */
(function (SB) {
  'use strict';
  const EMPTY = [];
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const DEFS = {
    plain: { name: 'Planície com colinas', size: 1400, amp: [20, 8, 2.5], sky: 0x9ec3e6, fog: 0xb9d2ea, ground: [0x5f7a36, 0x8d8a4e, 0x6e5f3c] },
    city: { name: 'Cidade em ruínas', size: 1000, amp: [3, 1.5, 0.6], sky: 0xb0b8c4, fog: 0xa9b0ba, ground: [0x6c6c68, 0x84807a, 0x5a5650] },
    desert: { name: 'Deserto de dunas', size: 1500, amp: [26, 12, 3], sky: 0xe3c9a0, fog: 0xe8d3ad, ground: [0xc9a665, 0xb8914f, 0xd9bb7a] },
    snow: { name: 'Tundra nevada', size: 1500, amp: [16, 7, 2], sky: 0xcfd9e6, fog: 0xdfe6ee, ground: [0xe8eef3, 0xcfd8e0, 0xaab6c2], kind: 'snow' },
    forest: { name: 'Floresta densa', size: 1300, amp: [18, 9, 3], sky: 0xa9c9d8, fog: 0xa4bcc0, ground: [0x3f5a2a, 0x56703a, 0x4a4a2e], kind: 'forest' },
    mountain: { name: 'Vale das montanhas', size: 1600, amp: [30, 13, 3.5], sky: 0xa8c0dc, fog: 0xbccbdc, ground: [0x6f7b52, 0x8a8a78, 0x9d9a90], kind: 'mountain' },
    village: { name: 'Vila rural', size: 1200, amp: [10, 5, 1.5], sky: 0xa8cbe8, fog: 0xc0d6e8, ground: [0x7a9448, 0xa39a5c, 0x8a7a50], kind: 'village' },
    industrial: { name: 'Zona industrial', size: 1100, amp: [2, 1, 0.5], sky: 0x9aa4ae, fog: 0x9ea6ae, ground: [0x6d6e70, 0x5c5e60, 0x7a7870], kind: 'industrial' },
    canyon: { name: 'Desfiladeiro', size: 1500, amp: [12, 6, 2], sky: 0xe0b890, fog: 0xe0c0a0, ground: [0xb5683f, 0xc98a55, 0x93502f], kind: 'canyon' },
    swamp: { name: 'Pântano', size: 1300, amp: [5, 3, 1.4], sky: 0x9fb0a0, fog: 0x9aa89a, ground: [0x4a5a35, 0x3d4a2e, 0x5a5a3a], kind: 'swamp' },
  };
  SB.MAP_LIST = Object.keys(DEFS).map(k => ({ id: k, name: DEFS[k].name }));

  SB.makeMap = function (id, seed) {
    const d = DEFS[id] || DEFS.plain, rnd = SB.rnd(seed * 17 + 5), S = d.size, ch = S / 2, EXT = 1100, T = S + 2 * EXT, half = T / 2;   // S = área principal (batalha de tanques); T = mapa total com aeroportos nas pontas
    const ph = Array.from({ length: 8 }, () => rnd() * 6.28);
    const spawns = { A: [], B: [] };
    for (let i = 0; i < 14; i++) {
      const x = -ch * 0.55 + (i % 7) * (ch * 1.1 / 6), zr = Math.floor(i / 7) * 26;
      spawns.A.push({ x, z: -ch + 90 + zr, yaw: Math.PI });   // olha para +Z
      spawns.B.push({ x, z: ch - 90 - zr, yaw: 0 });          // olha para -Z
    }
    /* aeroportos nas áreas afastadas (pista ao longo de Z, de frente para a batalha) */
    const AZ = half - 330, airports = [{ team: 'A', x: 0, z: -AZ, len: 520, wid: 50 }, { team: 'B', x: 0, z: AZ, len: 520, wid: 50 }], airSpawns = { A: [], B: [] };
    for (let i = 0; i < 12; i++) { const col = (i % 3 - 1) * 16, row = Math.floor(i / 3) * 34; airSpawns.A.push({ x: col, z: -AZ - 230 + row, yaw: Math.PI }); airSpawns.B.push({ x: col, z: AZ + 230 - row, yaw: 0 }); }
    const airFlat = (x, z) => { let m = 1; for (const a of airports) { const dd = Math.hypot(Math.max(0, Math.abs(x - a.x) - 110), Math.max(0, Math.abs(z - a.z) - a.len / 2 - 40)); m = Math.min(m, sstep(30, 200, dd)); } return m; };
    const flat = (x, z) => {
      const dA = Math.min(Math.abs(z + ch - 100), Math.abs(z - ch + 100));
      return sstep(30, 150, dA);
    };
    const H = (x, z) => {
      let h = d.amp[0] * Math.sin(x / 190 + ph[0]) * Math.cos(z / 230 + ph[1]) + d.amp[1] * Math.sin(x / 71 + z / 93 + ph[2]) + d.amp[2] * Math.sin(x / 23 + ph[3]) * Math.cos(z / 29 + ph[4]);
      if (d.kind === 'canyon') { const rg = Math.abs(Math.sin(x / 260 + ph[5] + Math.sin(z / 400 + ph[6]) * 1.6)); h += 30 * sstep(0.55, 0.9, rg) - 4; }
      if (d.kind === 'mountain') h += 22 * (1 - Math.abs(Math.sin(x / 210 + ph[5]) * Math.cos(z / 260 + ph[6]))) - 8;
      if (d.kind === 'swamp') h = h * 0.5 - 1.5 + 1.2 * Math.sin(x / 17 + ph[5]) * Math.sin(z / 19 + ph[6]);
      if (id === 'desert') h += 10 * Math.abs(Math.sin(x / 120 + z / 340 + ph[5])) - 5;
      return h * flat(x, z) * airFlat(x, z);
    };
    const obst = [];
    const free = (x, z, r) => {
      if (Math.abs(x) > ch - 20 || Math.abs(z) > ch - 20) return false;
      if (Math.abs(z) > ch - 190) return false;
      return true;
    };
    const place = (n, mk) => { for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * (S - 80), z = (rnd() - 0.5) * (S - 80); if (free(x, z)) { const o = mk(x, z); if (o) obst.push(o); } } };
    const tree = (x, z, cc, h0) => ({ t: 'cyl', x, z, r: 1.1, h: (h0 || 11) + rnd() * 5, c: 0x3a2f22, tree: true, cc });
    const rock = (x, z, big, c) => ({ t: 'cyl', x, z, r: big ? 5 + rnd() * 8 : 2 + rnd() * 4, h: big ? 8 + rnd() * 12 : 2.5 + rnd() * 4, c });
    if (d.kind === 'snow') { place(170, (x, z) => tree(x, z, 0x2f5a44, 12)); place(55, (x, z) => rock(x, z, rnd() < 0.3, 0x8a8f96)); }
    else if (d.kind === 'forest') { place(700, (x, z) => tree(x, z, rnd() < 0.5 ? 0x2a5a2a : 0x35682e, 12)); place(30, (x, z) => rock(x, z, false, 0x6f6c62)); }
    else if (d.kind === 'mountain') { place(80, (x, z) => rock(x, z, rnd() < 0.5, 0x7a786e)); place(60, (x, z) => tree(x, z, 0x2f5a30, 13)); }
    else if (d.kind === 'canyon') { place(70, (x, z) => rock(x, z, rnd() < 0.4, 0x9a5a38)); }
    else if (d.kind === 'swamp') { place(260, (x, z) => tree(x, z, 0x3a5a30, 9)); place(25, (x, z) => rock(x, z, false, 0x5a5a48)); }
    else if (d.kind === 'village') {
      for (let v = 0; v < 7; v++) { const cx = (rnd() - 0.5) * (S - 320), cz = (rnd() - 0.5) * (S - 480); for (let k = 0; k < 5; k++) { const x = cx + (rnd() - 0.5) * 120, z = cz + (rnd() - 0.5) * 120; if (free(x, z)) obst.push({ t: 'box', x, z, hx: 5 + rnd() * 4, hz: 5 + rnd() * 4, h: 5 + rnd() * 4, c: [0xb89c78, 0xa8a090, 0xc4b08a][Math.floor(rnd() * 3)] }); } }
      place(110, (x, z) => tree(x, z, 0x3f6a2a, 10)); place(20, (x, z) => rock(x, z, false, 0x77746c));
    } else if (d.kind === 'industrial') {
      place(110, (x, z) => ({ t: 'box', x, z, hx: 6, hz: 2.4, h: 2.6 + Math.floor(rnd() * 2) * 2.6, c: [0x9a3a2a, 0x2f5a8a, 0x6a7a3a, 0xa8742a][Math.floor(rnd() * 4)] }));
      place(14, (x, z) => ({ t: 'cyl', x, z, r: 7 + rnd() * 3, h: 16 + rnd() * 8, c: 0xa8aaac })); place(9, (x, z) => ({ t: 'box', x, z, hx: 20 + rnd() * 10, hz: 14 + rnd() * 8, h: 10 + rnd() * 5, c: 0x7c8186 }));
    }
    if (d.kind) { /* cenário temático já montado */ }
    else if (id === 'city') {
      for (let gx = -ch + 80; gx < ch - 60; gx += 64) for (let gz = -ch + 220; gz < ch - 200; gz += 64) {
        if (rnd() < 0.62) { const w = 16 + rnd() * 24, dd = 16 + rnd() * 24, h = 8 + rnd() * 24; obst.push({ t: 'box', x: gx + (rnd() - 0.5) * 8, z: gz + (rnd() - 0.5) * 8, hx: w / 2, hz: dd / 2, h, c: [0x8a847a, 0x6f6a63, 0x9a8f80, 0x77706a][Math.floor(rnd() * 4)] }); }
      }
    } else {
      const nR = id === 'desert' ? 60 : 90;   // (plain/desert)
      for (let i = 0; i < nR; i++) { const x = (rnd() - 0.5) * (S - 80), z = (rnd() - 0.5) * (S - 80); if (!free(x, z)) continue; obst.push({ t: 'cyl', x, z, r: 3 + rnd() * 6, h: 3 + rnd() * 6, c: id === 'desert' ? 0x9c7b4b : 0x77746c }); }
      if (id === 'plain') for (let g = 0; g < 14; g++) { const cx = (rnd() - 0.5) * (S - 200), cz = (rnd() - 0.5) * (S - 400); for (let k = 0; k < 14; k++) { const x = cx + (rnd() - 0.5) * 70, z = cz + (rnd() - 0.5) * 70; if (free(x, z)) obst.push({ t: 'cyl', x, z, r: 1.1, h: 11 + rnd() * 5, c: 0x2f4a22, tree: true }); } }
    }
    /* áreas afastadas: poucos obstáculos; aeroportos com hangares e torre */
    for (let i = 0; i < 90; i++) {
      const x = (rnd() - 0.5) * (T - 100), z = (rnd() - 0.5) * (T - 100);
      if (Math.abs(z) < ch + 20 && Math.abs(x) < ch + 20) continue;
      if (airports.some(a => Math.abs(z - a.z) < a.len / 2 + 140 && Math.abs(x) < 240)) continue;
      obst.push({ t: 'cyl', x, z, r: 3 + rnd() * 5, h: 3 + rnd() * 6, c: id === 'desert' ? 0x9c7b4b : 0x77746c });
    }
    airports.forEach(a => { [-1, 1].forEach(sg => [-0.3, 0, 0.3].forEach(k => obst.push({ t: 'box', x: a.x + sg * 140, z: a.z + k * a.len * 0.8, hx: 22, hz: 16, h: 12, c: 0x8a8f95 }))); obst.push({ t: 'box', x: a.x - 100, z: a.z, hx: 4, hz: 4, h: 20, c: 0xb0b4ba }); });
    obst.forEach(o => { o.base = H(o.x, o.z); o.top = o.base + o.h; });
    const zones = [{ x: 0, z: 0, r: 55, n: 'B' }, { x: -S * 0.3, z: S * 0.02, r: 48, n: 'A' }, { x: S * 0.3, z: -S * 0.02, r: 48, n: 'C' }];
    // afasta obstáculos do centro das zonas
    for (let i = obst.length - 1; i >= 0; i--) { const o = obst[i]; if (zones.some(z => Math.hypot(o.x - z.x, o.z - z.z) < z.r + (o.t === 'cyl' ? o.r : Math.max(o.hx, o.hz)))) obst.splice(i, 1); }
    const CS = 64, NC = Math.ceil(T / CS) + 2, grid = new Array(NC * NC);
    obst.forEach(o => {
      const r = (o.t === 'cyl' ? o.r : Math.max(o.hx, o.hz)) + 8;
      const i0 = Math.max(0, Math.floor((o.x - r + half) / CS)), i1 = Math.min(NC - 1, Math.floor((o.x + r + half) / CS)), j0 = Math.max(0, Math.floor((o.z - r + half) / CS)), j1 = Math.min(NC - 1, Math.floor((o.z + r + half) / CS));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) (grid[i + j * NC] || (grid[i + j * NC] = [])).push(o);
    });
    const near = (x, z) => { const i = Math.floor((x + half) / CS), j = Math.floor((z + half) / CS); return (i < 0 || j < 0 || i >= NC || j >= NC) ? EMPTY : (grid[i + j * NC] || EMPTY); };
    return {
      id, def: d, size: T, core: S, half, H, obst, spawns, airSpawns, airports, ph, zones,
      push(x, z, r) {
        for (const o of near(x, z)) {
          if (o.t === 'cyl') { const dx = x - o.x, dz = z - o.z, dd = Math.hypot(dx, dz), m = o.r + r; if (dd < m && dd > 1e-4) { x = o.x + dx / dd * m; z = o.z + dz / dd * m; } }
          else { const cx = Math.max(o.x - o.hx, Math.min(x, o.x + o.hx)), cz = Math.max(o.z - o.hz, Math.min(z, o.z + o.hz)), dx = x - cx, dz = z - cz, dd = Math.hypot(dx, dz); if (dd < r) { if (dd > 1e-4) { x = cx + dx / dd * r; z = cz + dz / dd * r; } else x += r; } }
        }
        const lim = half - 6; x = Math.max(-lim, Math.min(lim, x)); z = Math.max(-lim, Math.min(lim, z));
        return [x, z];
      },
      hit(x, y, z) {
        for (const o of near(x, z)) {
          if (y > o.top || y < o.base - 1) continue;
          if (o.t === 'cyl') { if (Math.hypot(x - o.x, z - o.z) < o.r) return o; }
          else if (Math.abs(x - o.x) < o.hx && Math.abs(z - o.z) < o.hz) return o;
        }
        return null;
      },
      /* linha de visada livre? (terreno + obstáculos) */
      los(a, b) {
        const n = Math.ceil(a.distanceTo(b) / 6);
        for (let i = 1; i < n; i++) { const t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t; if (H(x, z) > y - 0.2 || this.hit(x, y, z)) return false; }
        return true;
      },
    };
  };

  SB.buildMapMesh = function (map) {
    const g = new THREE.Group(), S = map.size, N = Math.min(400, Math.round(S / 9));
    const geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), pal = map.def.ground.map(x => new THREE.Color(x));
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = map.H(x, z); pos.setY(i, h);
      const n = (Math.sin(x * 0.11) * Math.cos(z * 0.13) + 1) / 2, hh = Math.max(0, Math.min(1, (h + 10) / 40));
      c.copy(pal[0]).lerp(pal[1], n).lerp(pal[2], hh * 0.6); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
    map.obst.forEach(o => {
      const m = new THREE.MeshLambertMaterial({ color: o.c });
      let mesh;
      const base = map.H(o.x, o.z);
      if (o.t === 'box') { mesh = new THREE.Mesh(new THREE.BoxGeometry(o.hx * 2, o.h + 6, o.hz * 2), m); mesh.position.set(o.x, base + (o.h - 6) / 2 + 3 - 3, o.z); mesh.position.y = base + o.h / 2 - 3; }
      else if (o.tree) { mesh = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 0.7, o.r, o.h, 6), m); mesh.position.set(o.x, base + o.h / 2, o.z); const cr = new THREE.Mesh(new THREE.ConeGeometry(o.r * 4, o.h * 0.7, 7), new THREE.MeshLambertMaterial({ color: o.cc || 0x2a5a2a })); cr.position.y = o.h * 0.45; mesh.add(cr); }
      else { mesh = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 0.7, o.r, o.h, 8), m); mesh.position.set(o.x, base + o.h / 2 - 0.5, o.z); }
      g.add(mesh);
    });
    /* pistas dos aeroportos */
    map.airports.forEach(a => {
      const gh = map.H(a.x, a.z) + 0.2, rw = new THREE.Mesh(new THREE.PlaneGeometry(a.wid, a.len), new THREE.MeshLambertMaterial({ color: 0x3a3d42 })); rw.rotation.x = -Math.PI / 2; rw.position.set(a.x, gh, a.z); g.add(rw);
      const ap = new THREE.Mesh(new THREE.PlaneGeometry(250, a.len * 0.9), new THREE.MeshLambertMaterial({ color: 0x5a5e62 })); ap.rotation.x = -Math.PI / 2; ap.position.set(a.x, gh - 0.1, a.z); g.add(ap);
      const mk = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
      for (let k = -a.len / 2 + 20; k < a.len / 2 - 10; k += 36) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 16), mk); d.rotation.x = -Math.PI / 2; d.position.set(a.x, gh + 0.05, a.z + k); g.add(d); }
      const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 22, 5), new THREE.MeshBasicMaterial({ color: a.team === 'A' ? 0x3aa0ff : 0xff5a4a })); flag.position.set(a.x + 40, gh + 11, a.z - a.len / 2); g.add(flag);
    });
    return g;
  };
})(window.SB);
