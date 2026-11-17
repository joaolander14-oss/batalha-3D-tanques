/* Interface React (sem JSX): editor do tanque, munição, materiais e simulação */
(function (SB) {
  'use strict';
  const h = SB.h, Store = SB.Store, V3 = THREE.Vector3, clamp = SB.clamp, rd = SB.round;
  const S = () => Store.s;
  const el = (tag) => (p, ...c) => h(tag, p, ...c);
  const div = el('div'), span = el('span'), button = el('button'), label = el('label');

  /* ---------- persistência ---------- */
  function saveTank() { try { localStorage.setItem('sb.tank', JSON.stringify(S().tank)); } catch (e) {} }
  function saveAmmos() { try { localStorage.setItem('sb.ammos', JSON.stringify(S().ammos.filter(a => !a.builtin))); } catch (e) {} }
  function setTank(tank) { Store.set({ tank }); SB.Scene.sync(tank); saveTank(); }
  function updPart(id, patch) {
    const tank = S().tank;
    setTank({ ...tank, parts: tank.parts.map(p => p.id === id ? { ...p, ...patch } : p) });
  }
  const curPart = () => S().tank.parts.find(p => p.id === S().sel);

  /* ---------- controles ---------- */
  function Num({ v, on, step = 0.01, min, max, w }) {
    const [t, setT] = React.useState(String(v));
    React.useEffect(() => { if (parseFloat(t) !== v) setT(String(rd(v, 4))); }, [v]);
    return h('input', { type: 'number', value: t, step, min, max, style: w ? { width: w } : null, onChange: e => { setT(e.target.value); const x = parseFloat(e.target.value); if (isFinite(x)) on(x); } });
  }
  const Row = (lab, ...c) => div({ className: 'row', key: lab }, span({ className: 'lab' }, lab), ...c);
  function Sel({ v, on, opts }) { return h('select', { value: v, onChange: e => on(e.target.value) }, opts.map(o => h('option', { key: o[0], value: o[0] }, o[1]))); }
  const matOpts = (cat) => Object.values(SB.MAT).filter(m => !cat || m.cat !== 'projétil' || cat === 'all').map(m => [m.id, m.name + (m.user ? ' ★' : '')]);
  const allMatOpts = () => Object.values(SB.MAT).map(m => [m.id, m.name + (m.user ? ' ★' : '')]);

  /* ---------- painel do tanque ---------- */
  function TankPanel() {
    const s = Store.use(), p = curPart(), T = s.tank;
    const add = (kind, sub, shape) => {
      const np = SB.makePart(kind, sub, shape); np.name = (kind === 'armor' ? 'Placa ' : '') + np.name + ' ' + (T.parts.length + 1);
      setTank({ ...T, parts: [...T.parts, np] }); Store.set({ sel: np.id }); SB.Scene.setSel(np.id);
    };
    const del = () => { if (!p) return; setTank({ ...T, parts: T.parts.filter(x => x.id !== p.id) }); Store.set({ sel: null }); SB.Scene.setSel(null); };
    const dup = () => { if (!p) return; const n = { ...p, id: SB.uid(), name: p.name + ' (cópia)', pos: [p.pos[0], p.pos[1] + 0.1, p.pos[2]] }; setTank({ ...T, parts: [...T.parts, n] }); Store.set({ sel: n.id }); SB.Scene.setSel(n.id); };
    const mir = () => { if (!p) return; const n = { ...p, id: SB.uid(), name: p.name + ' (espelho)', pos: [-p.pos[0], p.pos[1], p.pos[2]], rot: [p.rot[0], -p.rot[1], -p.rot[2]] }; setTank({ ...T, parts: [...T.parts, n] }); Store.set({ sel: n.id }); SB.Scene.setSel(n.id); };
    const sel = id => { Store.set({ sel: id }); SB.Scene.setSel(id); };
    const setV = (k, i, val) => { const a = p[k].slice(); a[i] = val; updPart(p.id, { [k]: a }); };
    const setSz = (i, mm) => setV('size', i, Math.max(0.001, mm / 1000));
    const shapeSingle = p && ['cyl', 'tube', 'capsule'].includes(p.shape);
    return div({ className: 'panel' },
      div({ className: 'sec' }, 'Tanque: ' + T.name,
        div({ className: 'btns' },
          h('select', { value: '', onChange: e => { if (!e.target.value) return; if (T.parts.length && !confirm('Substituir o tanque atual?')) return; const t = SB.TANK_PRESETS[e.target.value](); setTank(t); Store.set({ sel: null, res: null }); SB.Scene.setSel(null); } },
            h('option', { value: '' }, 'Carregar modelo…'), Object.keys(SB.TANK_NAMES).map(k => h('option', { key: k, value: k }, SB.TANK_NAMES[k]))),
          button({ onClick: exportAll }, 'Exportar'), button({ onClick: () => document.getElementById('imp').click() }, 'Importar'))),
      div({ className: 'sec' }, 'Adicionar',
        div({ className: 'btns' },
          Object.entries({ box: 'Caixa', cyl: 'Cilindro', tube: 'Tubo', sphere: 'Esfera', wedge: 'Cunha' }).map(([k, n]) => button({ key: k, onClick: () => add('armor', '', k) }, '+ ' + n))),
        div({ className: 'btns' },
          h('select', { value: '', onChange: e => { if (e.target.value) add('module', e.target.value); } }, h('option', { value: '' }, '+ Módulo…'), Object.entries(SB.SUBS).filter(([, v]) => v.kind === 'module').map(([k, v]) => h('option', { key: k, value: k }, v.n))),
          h('select', { value: '', onChange: e => { if (e.target.value) add('crew', e.target.value); } }, h('option', { value: '' }, '+ Tripulante…'), Object.entries(SB.SUBS).filter(([, v]) => v.kind === 'crew').map(([k, v]) => h('option', { key: k, value: k }, v.n))))),
      h(SB.StatsForm),
      div({ className: 'list' }, T.parts.map(x => {
        const sub = SB.SUBS[x.sub], col = x.kind === 'armor' ? SB.mat(x.mat).color : sub.c, hid = s.hide.has(x.id);
        return div({ key: x.id, className: 'item' + (x.id === s.sel ? ' on' : ''), onClick: () => sel(x.id) },
          span({ className: 'chip', style: { background: col } }), span({ className: 'nm' }, x.name), span({ className: 'tag' }, x.kind === 'armor' ? Math.round(partThick(x)) + ' mm' : (sub ? sub.n : '')),
          span({ className: 'eye', onClick: e => { e.stopPropagation(); const n = new Set(s.hide); hid ? n.delete(x.id) : n.add(x.id); Store.set({ hide: n }); SB.Scene.setCfg({ hideIds: n }); } }, hid ? '◌' : '●'));
      })),
      p ? div({ className: 'form' },
        Row('Nome', h('input', { value: p.name, onChange: e => updPart(p.id, { name: e.target.value }) })),
        Row('Forma', p.kind === 'armor' ? h(Sel,{ v: p.shape, on: v => updPart(p.id, { shape: v }), opts: Object.entries(SB.SHAPES) }) : span({}, SB.SHAPES[p.shape])),
        p.kind !== 'armor' ? Row('Tipo', h(Sel,{ v: p.sub, on: v => updPart(p.id, { sub: v }), opts: Object.entries(SB.SUBS).filter(([, v]) => v.kind === p.kind).map(([k, v]) => [k, v.n]) })) : null,
        Row('Material', h(Sel,{ v: p.mat, on: v => updPart(p.id, { mat: v }), opts: allMatOpts() })),
        Row('Grupo (batalha)', h(Sel, { v: p.grp || 'hull', on: v => updPart(p.id, { grp: v }), opts: [['hull', 'Casco / fuselagem'], ['turret', 'Torre / canhão de queixo (gira)'], ['gun', 'Canhão (eleva)'], ['rotor', 'Rotor principal (gira)'], ['rotor2', 'Rotor inferior (coaxial)'], ['tail', 'Rotor de cauda (gira)']] })),
        Row('Posição (m)', ...[0, 1, 2].map(i => h(Num,{ key: i, v: p.pos[i], on: v => setV('pos', i, v), step: 0.05, w: 62 }))),
        Row('Tamanho (mm)', ...[0, 1, 2].map(i => (shapeSingle && i === 2) ? null : h(Num,{ key: i, v: rd(p.size[i] * 1000, 1), on: v => setSz(i, v), step: 5, w: 62 }))),
        shapeSingle ? div({ className: 'hint' }, p.shape === 'capsule' ? 'x = diâmetro, y = altura total' : 'x = diâmetro, y = comprimento (eixo local Y)') : null,
        p.shape === 'tube' ? Row('Parede (mm)', h(Num,{ v: rd((p.wall || 0.05) * 1000, 1), on: v => updPart(p.id, { wall: Math.max(0.001, v / 1000) }), step: 5 })) : null,
        Row('Rotação (°)', ...[0, 1, 2].map(i => h(Num,{ key: i, v: p.rot[i], on: v => setV('rot', i, v), step: 5, w: 62 }))),
        p.kind !== 'armor' ? Row('Vida (HP)', h(Num,{ v: p.hp, on: v => updPart(p.id, { hp: Math.max(1, v) }), step: 10 })) : null,
        p.sub === 'ammo' ? Row('Carga (kg TNT)', h(Num,{ v: p.expl || 5, on: v => updPart(p.id, { expl: v }), step: 1 })) : null,
        p.sub === 'ammo' ? Row('Painéis de alívio (blow-out)', h('input', { type: 'checkbox', checked: !!p.blow, onChange: e => updPart(p.id, { blow: e.target.checked }) })) : null,
        p.sub === 'ammo' ? Row('Paiol úmido (wet)', h('input', { type: 'checkbox', checked: !!p.wet, onChange: e => updPart(p.id, { wet: e.target.checked }) })) : null,
        SB.SUBS[p.sub] && SB.SUBS[p.sub].info ? div({ className: 'hint' }, 'ℹ ' + SB.SUBS[p.sub].info) : null,
        div({ className: 'btns' }, button({ onClick: dup }, 'Duplicar'), button({ onClick: mir }, 'Espelhar X'), button({ className: 'danger', onClick: del }, 'Excluir')),
        div({ className: 'hint' }, 'Arraste as setas coloridas no 3D para mover. Espessura da placa = menor dimensão (a chapa é medida pela trajetória real do tiro).'))
        : div({ className: 'hint pad' }, 'Clique numa peça no 3D ou na lista. Frente do tanque = seta azul (−Z).'));
  }
  function partThick(p) { return (p.shape === 'tube' ? p.wall : p.shape === 'cyl' ? p.size[1] : Math.min(p.size[0], p.size[1], p.size[2])) * 1000; }
  function exportAll() {
    const data = { tank: S().tank, ammos: S().ammos.filter(a => !a.builtin), mats: Object.values(SB.MAT).filter(m => m.user) };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })); a.download = 'simulador_blindagem.json'; a.click();
  }
  function importAll(file) {
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); (d.mats || []).forEach(m => { SB.MAT[m.id] = { ...m, user: true }; }); SB.saveUserMats(); if (d.ammos) { Store.set({ ammos: [...S().ammos.filter(a => a.builtin), ...d.ammos] }); saveAmmos(); } if (d.tank) setTank(d.tank); Store.set({ sel: null }); } catch (e) { alert('Arquivo inválido'); } };
    r.readAsText(file);
  }

  /* ---------- editor de perfil 2D da munição ---------- */
  function ProfileEditor() {
    const s = Store.use(), ref = React.useRef(null), a = curAmmo(), layer = a.layers.find(l => l.id === s.layerSel) || a.layers[0];
    const view = React.useRef({});
    const draw = () => {
      const c = ref.current; if (!c) return; const g = c.getContext('2d'), W = c.width, H = c.height;
      let L = 10, Rm = 5; a.layers.forEach(l => l.pts.forEach(p => { L = Math.max(L, p[0]); Rm = Math.max(Rm, p[1]); }));
      const pad = 24, k = Math.min((W - 2 * pad) / (L * 1.05), (H / 2 - pad) / (Rm * 1.15)), cy = H / 2;
      view.current = { k, pad, cy, L };
      g.clearRect(0, 0, W, H); g.fillStyle = '#0b1017'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#1d2a3a'; g.lineWidth = 1; g.font = '10px sans-serif'; g.fillStyle = '#5c7087';
      const stp = L > 300 ? 50 : 20; for (let x = 0; x <= L * 1.05; x += stp) { g.beginPath(); g.moveTo(pad + x * k, 0); g.lineTo(pad + x * k, H); g.stroke(); g.fillText(x + '', pad + x * k + 2, H - 3); }
      for (let r = 0; r <= Rm * 1.2; r += 10) { g.beginPath(); g.moveTo(0, cy - r * k); g.lineTo(W, cy - r * k); g.stroke(); g.beginPath(); g.moveTo(0, cy + r * k); g.lineTo(W, cy + r * k); g.stroke(); }
      g.strokeStyle = '#3a4f69'; g.beginPath(); g.moveTo(0, cy); g.lineTo(W, cy); g.stroke();
      a.layers.forEach(l => {
        const col = SB.mat(l.mat).color, on = l === layer;
        [1, -1].forEach(sg => {
          g.beginPath(); l.pts.forEach((p, i) => { const X = pad + p[0] * k, Y = cy - sg * p[1] * k; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath();
          g.globalAlpha = on ? 0.75 : 0.45; g.fillStyle = col; g.fill(); g.globalAlpha = 1; g.strokeStyle = on ? '#fff' : '#000'; g.lineWidth = on ? 1.5 : 1; g.stroke();
        });
        if (on) l.pts.forEach(p => { g.beginPath(); g.arc(pad + p[0] * k, cy - p[1] * k, 4, 0, 7); g.fillStyle = '#ffdd33'; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); });
      });
      g.fillStyle = '#8aa0b8'; g.fillText('mm (x: base → ponta | y: raio)', 6, 12);
    };
    React.useEffect(draw);
    React.useEffect(() => {
      const c = ref.current; let dragI = -1;
      const pos = e => { const b = c.getBoundingClientRect(); return [(e.clientX - b.left) * c.width / b.width, (e.clientY - b.top) * c.height / b.height]; };
      const toM = ([X, Y]) => { const v = view.current; return [rd(Math.max(0, (X - v.pad) / v.k) * 2, 0) / 2, rd(Math.abs(v.cy - Y) / v.k * 2, 0) / 2]; };
      const near = ([X, Y]) => { const v = view.current; let b = -1, bd = 10; layer.pts.forEach((p, i) => { const d = Math.hypot(pad(p[0], v) - X, v.cy - p[1] * v.k - Y); if (d < bd) { bd = d; b = i; } }); return b; };
      const pad = (x, v) => v.pad + x * v.k;
      const setPts = pts => editAmmo(am => { am.layers = am.layers.map(l => l.id === layer.id ? { ...l, pts } : l); });
      const down = e => { const P = pos(e); const i = near(P); if (e.button === 2) return; if (i >= 0) { dragI = i; c.setPointerCapture(e.pointerId); } };
      const move = e => { if (dragI < 0) return; const m = toM(pos(e)); setPts(layer.pts.map((p, i) => i === dragI ? m : p)); };
      const up = () => { dragI = -1; };
      const dbl = e => { const P = pos(e), v = view.current; let bi = -1, bd = 14; layer.pts.forEach((p, i) => { const q = layer.pts[(i + 1) % layer.pts.length]; const x1 = pad(p[0], v), y1 = v.cy - p[1] * v.k, x2 = pad(q[0], v), y2 = v.cy - q[1] * v.k; const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1; const t = clamp(((P[0] - x1) * dx + (P[1] - y1) * dy) / l2, 0, 1); const d = Math.hypot(x1 + t * dx - P[0], y1 + t * dy - P[1]); if (d < bd) { bd = d; bi = i; } }); if (bi >= 0) { const np = layer.pts.slice(); np.splice(bi + 1, 0, toM(P)); setPts(np); } };
      const ctx = e => { e.preventDefault(); const i = near(pos(e)); if (i >= 0 && layer.pts.length > 3) setPts(layer.pts.filter((_, j) => j !== i)); };
      c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('dblclick', dbl); c.addEventListener('contextmenu', ctx);
      return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('dblclick', dbl); c.removeEventListener('contextmenu', ctx); };
    });
    return h('canvas', { ref, width: 620, height: 250, className: 'prof' });
  }

  /* ---------- munição ---------- */
  const ammoOpts = list => list.slice().sort((a, b) => (a.domain === 'air') - (b.domain === 'air')).map(x => [x.id, (x.domain === 'air' ? '🚁 ' : '') + (x.builtin ? '' : '★ ') + x.name]);
  function curAmmo() { const s = S(); return s.ammos.find(a => a.id === s.ammoId) || s.ammos[0]; }
  function editAmmo(fn) {
    const s = S(); let a = curAmmo();
    let n = SB.ammoClone(a); fn(n);
    if (a.builtin) { n.id = 'u' + Math.random().toString(36).slice(2, 8); n.name = a.name + ' (editada)'; n.builtin = false; n.layers = n.layers.map(l => ({ ...l })); Store.set({ ammos: [...s.ammos, n], ammoId: n.id }); }
    else Store.set({ ammos: s.ammos.map(x => x.id === a.id ? n : x) });
    saveAmmos(); SB.Scene.showAmmo(curAmmo(), S().cut);
  }
  function AmmoPanel() {
    const s = Store.use(), a = curAmmo(), A = SB.deriveAmmo(a), layer = a.layers.find(l => l.id === s.layerSel) || a.layers[0];
    const dists = [0, 500, 1000, 2000];
    return div({ className: 'panel' },
      div({ className: 'sec' }, 'Munição',
        div({ className: 'btns' },
          h(Sel,{ v: a.id, on: id => { Store.set({ ammoId: id, layerSel: null }); SB.Scene.showAmmo(S().ammos.find(x => x.id === id), s.cut); }, opts: ammoOpts(s.ammos) }),
          button({ onClick: () => { const n = SB.ammoClone(a); n.id = 'u' + Math.random().toString(36).slice(2, 8); n.name = a.name + ' (cópia)'; n.builtin = false; Store.set({ ammos: [...s.ammos, n], ammoId: n.id }); saveAmmos(); SB.Scene.showAmmo(n, s.cut); } }, 'Duplicar'),
          !a.builtin ? button({ className: 'danger', onClick: () => { Store.set({ ammos: s.ammos.filter(x => x.id !== a.id), ammoId: s.ammos[0].id }); saveAmmos(); SB.Scene.showAmmo(S().ammos[0], s.cut); } }, 'Excluir') : null)),
      div({ className: 'form' },
        Row('Nome', h('input', { value: a.name, onChange: e => editAmmo(n => { n.name = e.target.value; }) })),
        Row('Tipo', h(Sel,{ v: a.type, on: v => editAmmo(n => { n.type = v; }), opts: Object.entries(SB.TYPE).map(([k, v]) => [k, v.n]) })),
        Row('Vel. de saída (m/s)', h(Num,{ v: a.v0, on: v => editAmmo(n => { n.v0 = Math.max(50, v); }), step: 10 })),
        ['AP', 'APC', 'APCBC', 'APBC', 'APHE'].includes(a.type) ? [Row('Espoleta: sens. (mm)', h(Num,{ v: a.sens, on: v => editAmmo(n => { n.sens = v; }), step: 1 })), Row('Espoleta: retardo (ms)', h(Num,{ v: a.delay, on: v => editAmmo(n => { n.delay = v; }), step: 0.1 }))] : null,
        Row('Uso', h(Sel, { v: a.domain || 'ground', on: v => editAmmo(n => { n.domain = v; }), opts: [['ground', 'Tanques e veículos terrestres'], ['air', 'Aeronaves (helicópteros e aviões)']] })),
        Row('Classe', span({}, (SB.CLS_NAMES[(SB.TYPE[a.type] || {}).cls] || '') + (A.guid ? ' · guiada (' + A.guid + ')' : '') + (A.rocket ? ' · foguete não guiado' : ''))),
        Row('Explosivo (kg TNT, manual)', h(Num, { v: a.tntKg != null ? a.tntKg : rd(A.tnt, 3), on: v => editAmmo(n => { n.tntKg = Math.max(0, v); }), step: 0.1 })),
        Row('Calibração de penetração (×)', h(Num, { v: rd(a.pk || 1, 3), on: v => editAmmo(n => { n.pk = Math.max(0.05, v); }), step: 0.05 })),
        (A.wc !== 'gun') ? [
          Row('Guiagem', h(Sel, { v: a.guid || (SB.TYPE[a.type] || {}).guid || 'none', on: v => editAmmo(n => { n.guid = v === 'none' ? null : v; }), opts: [['none', 'Nenhuma (foguete reto)'], ['sacls', 'Segue a mira (SACLOS/laser)'], ['lock', 'Trava no alvo (dispara e esquece)'], ['top', 'Ataque por cima (mergulho)'], ['over', 'Sobrevoo (EFP)'], ['ir', 'Infravermelho (ar-ar)']] })),
          Row('Giro do míssil (°/s)', h(Num, { v: a.turn || A.turnRate, on: v => editAmmo(n => { n.turn = v; }), step: 5 })),
          Row('Queima do motor (s)', h(Num, { v: a.burn || A.burn, on: v => editAmmo(n => { n.burn = Math.max(0.2, v); }), step: 0.1 })),
          Row('Cadência (tiros/s, helicóptero)', h(Num, { v: a.rof || A.rof, on: v => editAmmo(n => { n.rof = Math.max(0.05, v); }), step: 0.1 })),
          Row('Calibre fixo (não escala)', h('input', { type: 'checkbox', checked: !!a.fixedCal, onChange: e => editAmmo(n => { n.fixedCal = e.target.checked; }) })),
        ] : Row('Cadência (tiros/s, helicóptero)', h(Num, { v: a.rof || 10, on: v => editAmmo(n => { n.rof = Math.max(0.5, v); }), step: 1 })),
        Row('Espaço no paiol (unid.)', h(Num, { v: a.slots || 1, on: v => editAmmo(n => { n.slots = Math.max(0.1, v); }), step: 1 })),
        a.pellets !== undefined || A.pellets ? Row('Pelotas / flechetes', h(Num, { v: a.pellets || A.pellets, on: v => editAmmo(n => { n.pellets = Math.max(0, Math.round(v)); }), step: 50 })) : null,
        (SB.TYPE[a.type] || {}).sub || a.subs ? Row('Submunições', h(Num, { v: a.subs || (SB.TYPE[a.type] || {}).sub, on: v => editAmmo(n => { n.subs = Math.max(1, Math.round(v)); }), step: 1 })) : null,
        a.info ? div({ className: 'hint' }, '📄 PDF: ', h('b', null, a.info.s || ''), ' ', a.info.y || '', ' · ', a.info.m || '', ' · efeitos: ', (a.info.fx || []).join(', ')) : null,
        a.type === 'HEAT' ? Row('Qualidade do liner', h(Num,{ v: a.quality || 1, on: v => editAmmo(n => { n.quality = v; }), step: 0.05 })) : null,
        div({ className: 'btns' }, [['Novo míssil (veículo)', 'ATGM · '], ['Novo foguete', 'RKT-FRAG · '], ['Nova munição de canhão', 'AP · '], ['Nova munição de canhão automático (veículo)', '30×165 mm 2A42 HE-FRAG-T (veículo)'], ['Nova munição de helicóptero', '30×165 mm 2A42 HE-FRAG-T']].map(([lab, pre]) => button({ key: lab, onClick: () => { const t = s.ammos.find(x => x.name.indexOf(pre) === 0); if (!t) return; const n = SB.ammoClone(t); n.id = 'u' + Math.random().toString(36).slice(2, 8); n.name = lab.replace('Novo ', 'Meu ').replace('Nova ', 'Minha ') + ' ' + (s.ammos.length + 1); n.builtin = false; Store.set({ ammos: [...s.ammos, n], ammoId: n.id, layerSel: null }); saveAmmos(); SB.Scene.showAmmo(n, s.cut); } }, '＋ ' + lab))),
        div({ className: 'hint' }, 'Dica: desenhe o projétil/míssil/foguete abaixo e escolha o tipo; a penetração e o dano saem do desenho + calibração. Armas de calibre fixo (foguetes e mísseis) não são reescaladas ao canhão.')),
      div({ className: 'sec' }, 'Desenho do projétil (arraste os pontos; duplo clique na borda cria ponto; botão direito remove)'),
      h(ProfileEditor),
      div({ className: 'btns' },
        a.layers.map(l => button({ key: l.id, className: 'lay' + (l === layer ? ' on' : ''), onClick: () => Store.set({ layerSel: l.id }) }, span({ className: 'chip', style: { background: SB.mat(l.mat).color } }), l.name)),
        button({ onClick: () => editAmmo(n => { const mx = Math.max(...n.layers.flatMap(l => l.pts.map(p => p[0]))), r = 8; n.layers.push({ id: 'l' + Math.random().toString(36).slice(2, 7), name: 'Nova camada', role: 'body', mat: 'apst', pts: [[mx * 0.3, 0], [mx * 0.3, r], [mx * 0.5, r], [mx * 0.5, 0]] }); }) }, '+ Camada')),
      layer ? div({ className: 'form' },
        Row('Camada', h('input', { value: layer.name, onChange: e => editAmmo(n => { n.layers.find(l => l.id === layer.id).name = e.target.value; }) })),
        Row('Função', h(Sel,{ v: layer.role, on: v => editAmmo(n => { n.layers.find(l => l.id === layer.id).role = v; }), opts: [['body', 'Corpo'], ['cap', 'Capuz/capa'], ['core', 'Núcleo penetrador'], ['filler', 'Explosivo'], ['liner', 'Liner (carga oca)'], ['sabot', 'Sabô (descartado)'], ['tracer', 'Traçante']] })),
        Row('Material', h(Sel,{ v: layer.mat, on: v => editAmmo(n => { n.layers.find(l => l.id === layer.id).mat = v; }), opts: allMatOpts() })),
        a.layers.length > 1 ? button({ className: 'danger', onClick: () => editAmmo(n => { n.layers = n.layers.filter(l => l.id !== layer.id); }) }, 'Excluir camada') : null) : null,
      div({ className: 'stats' },
        div({}, 'Massa: ', h('b', null, A.mass.toFixed(2) + ' kg'), ' | Calibre/penetrador: ', h('b', null, A.d.toFixed(0) + ' mm'), ' | Comprimento: ', h('b', null, A.L.toFixed(0) + ' mm')),
        A.core ? div({}, 'Núcleo: ', h('b', null, A.core.L.toFixed(0) + '×' + A.core.D.toFixed(0) + ' mm'), ' (L/D ' + (A.core.L / A.core.D).toFixed(1) + '), ' + A.core.mass.toFixed(2) + ' kg') : null,
        A.tnt > 0 ? div({}, 'Explosivo: ', h('b', null, (A.fillMass * 1000).toFixed(0) + ' g'), ' (' + (A.tnt * 1000).toFixed(0) + ' g TNT-eq)') : null,
        A.liner ? div({}, 'Liner: ', h('b', null, A.liner.D.toFixed(0) + ' mm'), ', ângulo do cone ' + (2 * A.liner.alpha).toFixed(0) + '°, jato ' + (A.heatP0 || 0).toFixed(0) + ' mm') : null,
        div({}, 'Penetração em RHA a 0° (mm): ', dists.map(d => h('span', { key: d, className: 'pen' }, d + ' m: ', h('b', null, SB.nominalPen(A, d).toFixed(0))))),
        A.warnings.map((w, i) => div({ key: i, className: 'warn' }, '⚠ ' + w))),
      div({ className: 'row' }, label({}, h('input', { type: 'checkbox', checked: !!s.cut, onChange: e => { Store.set({ cut: e.target.checked }); SB.Scene.showAmmo(a, e.target.checked); } }), ' Corte (ver interior no 3D)')));
  }

  /* ---------- materiais ---------- */
  function MatPanel() {
    const s = Store.use(), m = s.matEdit || SB.MAT.rha;
    const set = (k, v) => Store.set({ matEdit: { ...m, [k]: v } });
    const numf = (lab, k, step) => Row(lab, h(Num,{ v: m[k], on: v => set(k, v), step }));
    const save = asNew => {
      const id = (!asNew && m.user) ? m.id : 'u_' + Math.random().toString(36).slice(2, 7);
      SB.MAT[id] = { ...m, id, user: true }; SB.saveUserMats(); Store.set({ matEdit: SB.MAT[id] });
    };
    return div({ className: 'panel' },
      div({ className: 'sec' }, 'Materiais (' + Object.keys(SB.MAT).length + ')'),
      div({ className: 'list short' }, Object.values(SB.MAT).map(x => div({ key: x.id, className: 'item' + (x.id === m.id ? ' on' : ''), onClick: () => Store.set({ matEdit: x }) }, span({ className: 'chip', style: { background: x.color } }), span({ className: 'nm' }, x.name + (x.user ? ' ★' : '')), span({ className: 'tag' }, 'ke ' + x.ke + ' · heat ' + x.heat)))),
      div({ className: 'form' },
        Row('Nome', h('input', { value: m.name, onChange: e => set('name', e.target.value) })),
        Row('Cor', h('input', { type: 'color', value: m.color, onChange: e => set('color', e.target.value) })),
        numf('Densidade (kg/m³)', 'dens', 50), numf('Dureza (BHN)', 'bhn', 10), numf('Resistência Rt (GPa)', 'rt', 0.1),
        div({ className: 'btns' }, button({ onClick: () => Store.set({ matEdit: { ...m, ke: SB.autoKE(m.dens, m.rt), heat: SB.autoHEAT(m.dens, m.rt) } }) }, 'Calcular equivalências a partir dos dados')),
        numf('Equiv. cinética (mm RHA/mm)', 'ke', 0.05), numf('Equiv. HEAT (mm RHA/mm)', 'heat', 0.05), numf('Estilhaços (0–1)', 'spall', 0.05), numf('Bônus de ricochete (°)', 'ric', 1),
        numf('ERA: corte do jato (0–1)', 'era', 0.05), numf('ERA: corte cinético (0–1)', 'eraKE', 0.05), numf('Escoamento projétil (GPa)', 'yld', 0.1), numf('Fator explosivo (TNT=1)', 'expl', 0.05),
        div({ className: 'btns' }, button({ className: 'primary', onClick: () => save(false) }, m.user ? 'Salvar' : 'Salvar como novo'), m.user ? button({ onClick: () => save(true) }, 'Salvar como cópia') : null,
          m.user ? button({ className: 'danger', onClick: () => { delete SB.MAT[m.id]; SB.saveUserMats(); Store.set({ matEdit: SB.MAT.rha }); } }, 'Excluir') : null),
        div({ className: 'hint' }, 'ke/heat: quantos mm de RHA cada mm do material vale. Rt e densidade alimentam o modelo de Tate para dardos. Para projéteis: densidade, escoamento e fator explosivo.')));
  }

  /* ---------- simulação ---------- */
  function shotSetup() {
    const s = S(), A = SB.deriveAmmo(s.ammos.find(a => a.id === s.simAmmo) || s.ammos[0]);
    const dir = SB.shooterVec(s.az, s.el).negate(), aim = new V3(...s.aim);
    return { A, dir, aim };
  }
  function fire() {
    const s = S(), { A, dir, aim } = shotSetup();
    // dispersão
    const rnd = SB.rnd(s.seed * 7 + 3); let d = dir.clone();
    if (s.disp > 0) { const a = s.disp / 1000 * s.dist * 0; }
    const res = SB.Sim.run(s.tank, A, { origin: aim.clone().addScaledVector(dir, -14), dir: d, dist: s.dist }, { seed: s.seed, minCrew: s.minCrew });
    Store.set({ res, batch: null }); SB.Scene.setDamage(null); SB.Scene.showShot(res);
  }
  function batch() {
    const s = S(), { A, dir } = shotSetup();
    const u = new V3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0)).normalize(), w = new V3().crossVectors(dir, u).normalize();
    let u0 = 1e9, u1 = -1e9, w0 = 1e9, w1 = -1e9;
    s.tank.parts.forEach(p => { const r = Math.max(...p.size) * 0.6, c = new V3(...p.pos); const a = c.dot(u), b = c.dot(w); u0 = Math.min(u0, a - r); u1 = Math.max(u1, a + r); w0 = Math.min(w0, b - r); w1 = Math.max(w1, b + r); });
    const NU = 30, NW = 18, cnt = { miss: 0, ricochet: 0, naopen: 0, perfurou: 0, damaged: 0, destroyed: 0 }, pts = [];
    const base = new V3(); let n = 0, k = 0;
    for (let i = 0; i < NU; i++) for (let j = 0; j < NW; j++) {
      const a = u0 + (u1 - u0) * (i + 0.5) / NU, b = w0 + (w1 - w0) * (j + 0.5) / NW;
      const o = base.clone().addScaledVector(u, a).addScaledVector(w, b).addScaledVector(dir, -14);
      const r = SB.Sim.run(s.tank, A, { origin: o, dir, dist: s.dist }, { seed: s.seed * 1000 + (k++), minCrew: s.minCrew });
      if (!r.first) { cnt.miss++; continue; }
      n++; let kind = r.outcome === 'ricochet' ? 'ricochet' : r.outcome === 'naopen' ? 'naopen' : (r.verdict.destroyed ? 'destroyed' : r.verdict.kind === 'damaged' ? 'damaged' : 'perfurou');
      cnt[kind]++; pts.push({ x: r.first.pos.x, y: r.first.pos.y, z: r.first.pos.z, color: BCOL[kind] });
    }
    Store.set({ batch: { cnt, n }, res: null }); SB.Scene.setDamage(null); SB.Scene.showBatch(pts);
  }
  const BCOL = { ricochet: '#4dd0ff', naopen: '#5b6b80', perfurou: '#ffe14a', damaged: '#ff9d1a', destroyed: '#ff2a22' };
  const VLAB = { destroyed: ['DESTRUÍDO', 'v-bad'], damaged: ['DANIFICADO', 'v-warn'], nodamage: ['SEM DANO INTERNO', 'v-ok'], ricochet: ['RICOCHETE', 'v-info'], miss: ['ERROU', 'v-info'] };
  const SLAB = { intact: 'Intacto', light: 'Dano leve', damaged: 'Danificado', heavy: 'Muito danificado', destroyed: 'Destruído', det: 'DETONOU', pen: 'Perfurada' };
  const CLAB = { intact: 'Ileso', light: 'Ferido leve', damaged: 'Ferido', heavy: 'Ferido grave', destroyed: 'Fora de combate', det: 'Morto' };

  function SimPanel() {
    const s = Store.use();
    const set = (k, v) => { Store.set({ [k]: v }); if (k === 'az' || k === 'el') SB.Scene.setShooter(k === 'az' ? v : s.az, k === 'el' ? v : s.el, s.aim); };
    return div({ className: 'panel' },
      div({ className: 'sec' }, 'Disparo'),
      div({ className: 'form' },
        Row('Munição', h(Sel,{ v: s.simAmmo, on: v => set('simAmmo', v), opts: ammoOpts(s.ammos) })),
        Row('Distância (m)', h(Num,{ v: s.dist, on: v => set('dist', Math.max(0, v)), step: 100 })),
        Row('Azimute (°)', h('input', { type: 'range', min: -180, max: 180, value: s.az, onChange: e => set('az', +e.target.value) }), h(Num,{ v: s.az, on: v => set('az', v), step: 5, w: 56 })),
        div({ className: 'hint' }, '0° = de frente, 90° = lado direito, 180° = traseira'),
        Row('Elevação (°)', h('input', { type: 'range', min: -30, max: 45, value: s.el, onChange: e => set('el', +e.target.value) }), h(Num,{ v: s.el, on: v => set('el', v), step: 1, w: 56 })),
        Row('Ponto de mira', span({}, s.aim.map(x => x.toFixed(2)).join(', '))),
        div({ className: 'hint' }, 'Clique no tanque (3D) para escolher onde mirar.'),
        Row('Semente (sorte)', h(Num,{ v: s.seed, on: v => set('seed', Math.round(v)), step: 1 }), button({ onClick: () => set('seed', Math.floor(Math.random() * 99999)) }, '🎲')),
        Row('Tripulação mínima', h(Num,{ v: s.minCrew, on: v => set('minCrew', Math.max(0, Math.round(v))), step: 1 })),
        div({ className: 'btns' }, button({ className: 'primary big', onClick: fire }, '🎯 ATIRAR'), button({ onClick: batch }, 'Mapa de impactos (540 tiros)'), button({ onClick: () => { Store.set({ res: null, batch: null }); SB.Scene.clearShot(); SB.Scene.setDamage(null); } }, 'Limpar')),
        div({ className: 'btns' }, button({ onClick: () => SB.Scene.viewFromShooter() }, 'Visão do atirador'), button({ onClick: () => SB.Scene.camPreset('side') }, 'Lado'), button({ onClick: () => SB.Scene.camPreset('top') }, 'Topo'))),
      s.batch ? h(BatchView, { b: s.batch }) : (s.res ? h(ReportView, { r: s.res }) : div({ className: 'hint pad' }, 'Escolha a munição, o ângulo e clique em ATIRAR.')));
  }
  function BatchView({ b }) {
    const pct = k => b.n ? (100 * b.cnt[k] / b.n).toFixed(0) + '%' : '0%';
    return div({ className: 'report' }, div({ className: 'sec' }, 'Mapa de impactos: ' + b.n + ' acertos'),
      Object.keys(BCOL).map(k => div({ key: k, className: 'bar' }, span({ className: 'chip', style: { background: BCOL[k] } }), span({ className: 'nm' }, { ricochet: 'Ricochete', naopen: 'Não penetrou', perfurou: 'Penetrou (sem dano grave)', damaged: 'Penetrou e danificou', destroyed: 'Destruiu' }[k]), span({ className: 'tag' }, b.cnt[k] + ' (' + pct(k) + ')'))),
      div({ className: 'hint' }, 'Cada ponto no 3D é o primeiro contato de um tiro com este azimute/elevação.'));
  }
  function ReportView({ r }) {
    const v = r.verdict, [vt, vc] = VLAB[v.kind] || ['—', ''];
    const parts = r.parts.filter(p => p.kind !== 'armor' && p.state !== 'intact').sort((a, b) => b.acc / b.hp - a.acc / a.hp);
    const pen = r.parts.filter(p => p.state === 'pen');
    return div({ className: 'report' },
      div({ className: 'verdict ' + vc }, vt, div({ className: 'vsub' }, (r.outcome === 'perfurou' ? 'Penetrou' : r.outcome === 'ricochet' ? 'Ricocheteou' : r.outcome === 'naopen' ? 'Não penetrou' : 'Sem impacto') + ' · tripulação ' + v.alive + '/' + v.crew + ' em combate')),
      v.reasons.map((x, i) => div({ key: 'r' + i, className: 'li bad' }, '✖ ' + x)), v.status.map((x, i) => div({ key: 's' + i, className: 'li warn' }, '• ' + x)),
      div({ className: 'sec' }, 'Danos internos'),
      parts.length ? parts.map(p => div({ key: p.id, className: 'bar' }, span({ className: 'chip', style: { background: SB.STATE_COLOR[p.state] } }), span({ className: 'nm' }, p.name), span({ className: 'tag' }, (p.kind === 'crew' ? CLAB : SLAB)[p.state] + ' · ' + Math.min(100, Math.round(100 * p.acc / p.hp)) + '%' + (p.frag ? ' · ' + p.frag + ' frag' : '') + (p.jet ? ' · jato' : ''))))
        : div({ className: 'hint pad' }, 'Nenhum módulo ou tripulante atingido.'),
      pen.length ? div({ className: 'hint' }, 'Placas perfuradas: ' + pen.map(p => p.name).join(', ')) : null,
      div({ className: 'sec' }, 'Cores'), div({ className: 'legend' }, Object.entries({ intact: 'Intacto', light: 'Leve', damaged: 'Danificado', heavy: 'Grave', destroyed: 'Destruído', det: 'Detonou', pen: 'Placa perfurada' }).map(([k, n]) => span({ key: k }, span({ className: 'chip', style: { background: SB.STATE_COLOR[k] } }), n))),
      div({ className: 'sec' }, 'Registro do tiro'),
      div({ className: 'log' }, r.log.map((l, i) => div({ key: i, className: 'li ' + l.k }, l.t))));
  }

  /* ---------- App ---------- */
  const TABS = [['battle', '⚔ Batalha'], ['tank', '🛠 Veículo'], ['ammo', '🔩 Munição'], ['mat', '🧪 Materiais'], ['sim', '🎯 Simulação']];
  function App() {
    const s = Store.use(), host = React.useRef(null);
    React.useEffect(() => {
      SB.Scene.init(host.current);
      SB.Scene.on({
        onPick: id => { Store.set({ sel: id }); SB.Scene.setSel(id); },
        onMove: (id, pos) => updPart(id, { pos }),
        onAim: aim => { Store.set({ aim }); SB.Scene.setShooter(S().az, S().el, aim); },
        onImpact: () => { const r = S().res; if (r) { const m = new Map(); r.parts.forEach(p => m.set(p.id, p.state)); SB.Scene.setDamage(m); } },
      });
      SB.Scene.sync(S().tank); SB.Scene.setShooter(S().az, S().el, S().aim);
    }, []);
    React.useEffect(() => { SB.Scene.setMode(s.tab === 'ammo' ? 'ammo' : s.tab === 'sim' ? 'sim' : s.tab === 'mat' ? 'mat' : 'edit'); if (s.tab === 'ammo') SB.Scene.showAmmo(curAmmo(), s.cut); SB.Scene.setSel(s.tab === 'tank' ? s.sel : null); if (s.tab === 'battle') SB.previewTank(S().lobby.tankId); else SB.Scene.sync(S().tank); }, [s.tab]);
    React.useEffect(() => { SB.Scene.setCfg({ xray: s.xray, color: s.colorMode, frags: s.fragsOn, snap: s.snap }); }, [s.xray, s.colorMode, s.fragsOn, s.snap]);
    const tog = (k, lab) => button({ className: 'tg' + (s[k] ? ' on' : ''), onClick: () => Store.set({ [k]: !s[k] }) }, lab);
    return div({ className: 'app' },
      div({ className: 'top' }, span({ className: 'logo' }, '⚙ Batalha de Tanques 3D'), TABS.map(([k, n]) => button({ key: k, className: 'tab' + (s.tab === k ? ' on' : ''), onClick: () => Store.set({ tab: k }) }, n)),
        h('input', { id: 'imp', type: 'file', accept: '.json', style: { display: 'none' }, onChange: e => { if (e.target.files[0]) importAll(e.target.files[0]); e.target.value = ''; } })),
      div({ className: 'main' },
        div({ className: 'left' }, s.tab === 'battle' ? h(SB.BattlePanel) : s.tab === 'tank' ? h(TankPanel) : s.tab === 'ammo' ? h(AmmoPanel) : s.tab === 'mat' ? h(MatPanel) : h(SimPanel)),
        div({ className: 'view' }, div({ className: 'vp', ref: host }),
          div({ className: 'ov' }, tog('xray', 'Raio-X'), button({ className: 'tg' + (s.colorMode === 'thick' ? ' on' : ''), onClick: () => Store.set({ colorMode: s.colorMode === 'thick' ? 'mat' : 'thick' }) }, 'Mapa de espessura'), tog('fragsOn', 'Estilhaços'),
            button({ className: 'tg' + (s.snap ? ' on' : ''), onClick: () => Store.set({ snap: s.snap ? 0 : 0.05 }) }, 'Snap 5 cm'),
            button({ className: 'tg', onClick: () => SB.Scene.resetCam() }, 'Câmera')))));
  }

  /* ---------- boot ---------- */
  let tank = null, ammos = SB.AMMO_PRESETS();
  try { tank = JSON.parse(localStorage.getItem('sb.tank') || 'null'); } catch (e) {}
  if (!tank || !tank.parts || !tank.parts.length) tank = SB.TANK_PRESETS.t3485();
  SB.fillStats(tank);
  try { ammos = ammos.concat(JSON.parse(localStorage.getItem('sb.ammos') || '[]')); } catch (e) {}
  let lob = {}; try { lob = JSON.parse(localStorage.getItem('sb.lobby') || '{}'); } catch (e) {}
  SB.ammoLib = () => S().ammos || ammos;
  const lobby = Object.assign({ mode: 'solo', name: 'Comandante', tankId: 't3485', nation: 'Todas', map: 'plain', botsA: 4, botsB: 5, winKills: 25, minutes: 15, joinCode: '', loadout: SB.defaultLoadout(SB.buildTank('t3485').stats).map(r => ({ aid: r.ammo.id, n: r.n })) }, lob);
  SB.UI = { Num, Sel, Row, button, div, span, setTank };
  Store.s = { lobby, tab: 'battle', tank, sel: null, hide: new Set(), ammos, ammoId: ammos[2].id, simAmmo: ammos[2].id, layerSel: null, cut: false, matEdit: null, xray: true, colorMode: 'mat', fragsOn: true, snap: 0.05, az: 0, el: 0, dist: 500, aim: [0, 1.1, -2.6], seed: 7, minCrew: 2, disp: 0, res: null, batch: null };
  SB.Lobby.onUpdate = () => Store.set({ lt: Date.now() }); SB.Lobby.onExit = () => Store.set({ lt: Date.now() });
  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})(window.SB);
