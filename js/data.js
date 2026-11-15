/* Dados base: materiais, tipos de peças, tipos de munição, utilidades e store */
window.SB = window.SB || {};
(function (SB) {
  'use strict';
  SB.D2R = Math.PI / 180;
  SB.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  SB.uid = () => 'p' + Math.random().toString(36).slice(2, 9);
  SB.rnd = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  SB.round = (x, n = 3) => { const k = Math.pow(10, n); return Math.round(x * k) / k; };

  /* ---------------- MATERIAIS ----------------
     dens kg/m3 | rt resistência do alvo (GPa, Tate) | yld limite de escoamento do projétil (GPa)
     ke  = mm de RHA equivalentes por mm (vs. projéteis cinéticos)
     heat= mm de RHA equivalentes por mm (vs. jato de carga oca)
     spall = tendência a gerar estilhaços (0..1) | ric = bônus de ricochete (graus)
     era / eraKE = fração de redução do jato / da penetração cinética por reação explosiva
     expl = fator TNT (explosivos) */
  const MAT = {};
  function add(o) {
    MAT[o.id] = Object.assign({ color: '#8a96a3', dens: 7850, rt: 6, bhn: 300, ke: 1, heat: 1, spall: 0.5, ric: 0, era: 0, eraKE: 0, yld: 1.0, expl: 0, flam: false, user: false, cat: 'blindagem' }, o);
  }
  add({ id: 'rha', name: 'Aço RHA (laminado homogêneo)', color: '#8a96a3', spall: 0.6 });
  add({ id: 'cast', name: 'Aço fundido', color: '#7b8591', dens: 7800, rt: 5.4, bhn: 260, ke: 0.92, heat: 0.92, spall: 0.7 });
  add({ id: 'fh', name: 'Aço cementado (face dura)', color: '#a3adb8', rt: 7, bhn: 500, ke: 1.15, heat: 1.0, spall: 0.45, ric: 4 });
  add({ id: 'hha', name: 'Aço de alta dureza (Armox)', color: '#b9c3cf', rt: 7.5, bhn: 550, ke: 1.25, heat: 1.05, spall: 0.35, ric: 3 });
  add({ id: 'mild', name: 'Aço comum (macio)', color: '#6a7078', rt: 3.5, bhn: 150, ke: 0.6, heat: 0.6, spall: 0.5 });
  add({ id: 'al', name: 'Alumínio 5083', color: '#cfd6dc', dens: 2660, rt: 2.2, bhn: 100, ke: 0.35, heat: 0.43, spall: 0.25 });
  add({ id: 'ti', name: 'Titânio', color: '#b0b8c8', dens: 4500, rt: 5, bhn: 330, ke: 0.72, heat: 0.66, spall: 0.35 });
  add({ id: 'cer', name: 'Compósito cerâmico', color: '#d9b36a', dens: 3400, rt: 8, bhn: 900, ke: 1.6, heat: 2.4, spall: 0.8, ric: 2 });
  add({ id: 'nera', name: 'NERA (elastômero + aço)', color: '#6fb08b', dens: 2600, rt: 4, bhn: 200, ke: 1.1, heat: 2.0, spall: 0.3 });
  add({ id: 'era', name: 'ERA (placa reativa)', color: '#c76a3a', dens: 3600, rt: 5, bhn: 250, ke: 0.8, heat: 0.9, spall: 0.3, era: 0.6, eraKE: 0.3 });
  add({ id: 'rub', name: 'Borracha / saia', color: '#383838', dens: 1100, rt: 0.02, bhn: 60, ke: 0.02, heat: 0.03, spall: 0.05 });
  add({ id: 'wood', name: 'Madeira', color: '#a97c50', dens: 600, rt: 0.1, bhn: 20, ke: 0.01, heat: 0.02, spall: 0.05 });
  add({ id: 'sand', name: 'Areia / concreto', color: '#c8b27a', dens: 1700, rt: 0.5, bhn: 30, ke: 0.06, heat: 0.12, spall: 0.1 });
  add({ id: 'fuel', name: 'Combustível (diesel)', color: '#d4a017', dens: 830, rt: 0.01, bhn: 1, ke: 0.015, heat: 0.06, spall: 0.2, flam: true, cat: 'módulo' });
  add({ id: 'prop', name: 'Propelente / munição', color: '#8b3a8b', dens: 1300, rt: 0.1, bhn: 5, ke: 0.08, heat: 0.1, spall: 0.1, flam: true, cat: 'módulo' });
  add({ id: 'eng', name: 'Motor', color: '#5b6b4b', dens: 5000, rt: 2, bhn: 120, ke: 0.35, heat: 0.4, spall: 0.4, cat: 'módulo' });
  add({ id: 'trans', name: 'Transmissão', color: '#6b5b4b', dens: 6000, rt: 3, bhn: 150, ke: 0.5, heat: 0.45, spall: 0.4, cat: 'módulo' });
  add({ id: 'elec', name: 'Eletrônicos / ótica', color: '#4a7fb5', dens: 2200, rt: 0.3, bhn: 20, ke: 0.06, heat: 0.1, spall: 0.1, cat: 'módulo' });
  add({ id: 'tissue', name: 'Tecido humano', color: '#e2a587', dens: 1000, rt: 0.01, bhn: 1, ke: 0.02, heat: 0.03, spall: 0, cat: 'módulo' });
  /* materiais de projétil */
  add({ id: 'apst', name: 'Aço de projétil (HRC 60)', color: '#5a5f66', rt: 9, bhn: 650, yld: 1.6, ke: 1.3, heat: 1.2, cat: 'projétil' });
  add({ id: 'whp', name: 'Liga de tungstênio (WHA)', color: '#3c3c48', dens: 17600, rt: 12, bhn: 800, yld: 1.4, ke: 2.5, heat: 2.5, cat: 'projétil' });
  add({ id: 'du', name: 'Urânio empobrecido (DU)', color: '#2b3330', dens: 18600, rt: 12, bhn: 700, yld: 1.6, ke: 2.6, heat: 2.6, cat: 'projétil' });
  add({ id: 'cu', name: 'Cobre (liner de carga oca)', color: '#c0703a', dens: 8960, rt: 0.5, bhn: 80, yld: 0.1, ke: 1, heat: 1, cat: 'projétil' });
  add({ id: 'nylon', name: 'Plástico / nylon (sabô)', color: '#e6e6e6', dens: 1150, rt: 0.2, bhn: 20, yld: 0.1, ke: 0.02, heat: 0.03, cat: 'projétil' });
  add({ id: 'tnt', name: 'Explosivo TNT', color: '#ffb02e', dens: 1650, rt: 0.05, bhn: 1, expl: 1.0, ke: 0.02, heat: 0.03, cat: 'projétil' });
  add({ id: 'compb', name: 'Composição B', color: '#ffd166', dens: 1720, rt: 0.05, bhn: 1, expl: 1.3, ke: 0.02, heat: 0.03, cat: 'projétil' });
  add({ id: 'plast', name: 'Explosivo plástico (HESH)', color: '#ffe985', dens: 1500, rt: 0.05, bhn: 1, expl: 1.15, ke: 0.02, heat: 0.03, cat: 'projétil' });
  SB.MAT = MAT;
  SB.mat = id => MAT[id] || MAT.rha;
  SB.autoKE = (dens, rt) => SB.round(Math.sqrt(dens / 7850) * Math.sqrt(rt / 6), 2);
  SB.autoHEAT = (dens, rt) => SB.round(Math.sqrt(dens / 7850) * (0.6 + 0.4 * rt / 6), 2);
  SB.loadUserMats = function () {
    try {
      const a = JSON.parse(localStorage.getItem('sb.mats') || '[]');
      a.forEach(m => { MAT[m.id] = Object.assign({}, m, { user: true }); });
    } catch (e) {}
  };
  SB.saveUserMats = function () {
    try { localStorage.setItem('sb.mats', JSON.stringify(Object.values(MAT).filter(m => m.user))); } catch (e) {}
  };
  SB.loadUserMats();

  /* ---------------- SUBTIPOS DE PEÇAS ---------------- */
  SB.SUBS = {
    ammo: { kind: 'module', n: 'Munição (paiol)', c: '#e08a2b', hp: 100, t: 80, size: [0.4, 0.35, 0.8], mat: 'prop', shape: 'box' },
    fuel: { kind: 'module', n: 'Combustível', c: '#e0c341', hp: 100, t: 120, size: [0.4, 0.45, 1.2], mat: 'fuel', shape: 'box' },
    engine: { kind: 'module', n: 'Motor', c: '#6b9a5e', hp: 100, t: 400, size: [1.1, 0.8, 1.3], mat: 'eng', shape: 'box' },
    trans: { kind: 'module', n: 'Transmissão', c: '#8a6fb0', hp: 100, t: 400, size: [1.0, 0.6, 0.4], mat: 'trans', shape: 'box' },
    breech: { kind: 'module', n: 'Culatra / canhão', c: '#9aa6b4', hp: 100, t: 600, size: [0.3, 0.3, 0.6], mat: 'cast', shape: 'box' },
    optics: { kind: 'module', n: 'Mira / ótica', c: '#58b0e6', hp: 60, t: 15, size: [0.2, 0.12, 0.25], mat: 'elec', shape: 'box' },
    radio: { kind: 'module', n: 'Rádio', c: '#4ac0a0', hp: 60, t: 60, size: [0.3, 0.25, 0.3], mat: 'elec', shape: 'box' },
    track: { kind: 'module', n: 'Esteira / roda', c: '#7a7a7a', hp: 120, t: 350, size: [0.3, 0.5, 0.5], mat: 'mild', shape: 'box' },
    drive: { kind: 'module', n: 'Giro da torre', c: '#c09060', hp: 80, t: 250, size: [0.3, 0.2, 0.3], mat: 'mild', shape: 'box' },
    generic: { kind: 'module', n: 'Módulo genérico', c: '#a0a0b0', hp: 100, t: 300, size: [0.3, 0.3, 0.3], mat: 'mild', shape: 'box' },
    commander: { kind: 'crew', n: 'Comandante', c: '#f0b890', hp: 100, t: 45, size: [0.42, 0.95, 0.42], mat: 'tissue', shape: 'capsule' },
    gunner: { kind: 'crew', n: 'Atirador', c: '#f0b890', hp: 100, t: 45, size: [0.42, 0.95, 0.42], mat: 'tissue', shape: 'capsule' },
    driver: { kind: 'crew', n: 'Motorista', c: '#f0b890', hp: 100, t: 45, size: [0.42, 0.95, 0.42], mat: 'tissue', shape: 'capsule' },
    loader: { kind: 'crew', n: 'Municiador', c: '#f0b890', hp: 100, t: 45, size: [0.42, 0.95, 0.42], mat: 'tissue', shape: 'capsule' },
    radioop: { kind: 'crew', n: 'Op. de rádio', c: '#f0b890', hp: 100, t: 45, size: [0.42, 0.95, 0.42], mat: 'tissue', shape: 'capsule' },
  };
  SB.SHAPES = { box: 'Caixa', cyl: 'Cilindro', tube: 'Tubo (oco)', sphere: 'Esfera/elipsoide', wedge: 'Cunha', capsule: 'Cápsula' };

  SB.makePart = function (kind, sub, shape) {
    const id = SB.uid();
    if (kind === 'armor') {
      return { id, name: 'Placa', kind, sub: '', shape: shape || 'box', pos: [0, 1, 0], size: [0.5, 0.05, 0.5], rot: [0, 0, 0], mat: 'rha', hp: 0, wall: 0.05 };
    }
    const s = SB.SUBS[sub];
    return { id, name: s.n, kind: s.kind, sub, shape: s.shape, pos: [0, 1, 0], size: s.size.slice(), rot: [0, 0, 0], mat: s.mat, hp: s.hp, wall: 0.05 };
  };

  /* ---------------- TIPOS DE MUNIÇÃO ---------------- */
  SB.TYPE = {
    AP: { fam: 'shot', n: 'AP (perfurante maciço)', k: 1.0, norm: 0, ric: [64, 78] },
    APC: { fam: 'shot', n: 'APC (com capuz)', k: 1.06, norm: 3, ric: [65, 78] },
    APCBC: { fam: 'shot', n: 'APCBC (capuz + capa balística)', k: 1.12, norm: 5, ric: [66, 80] },
    APBC: { fam: 'shot', n: 'APBC (capa balística)', k: 1.08, norm: 4, ric: [65, 79] },
    APHE: { fam: 'shot', n: 'APHE (perfurante c/ explosivo)', k: 1.08, norm: 4, ric: [65, 78] },
    APCR: { fam: 'rod', n: 'APCR/APDS (núcleo duro + sabô)', k: 1, norm: 2, ric: [66, 80] },
    APFSDS: { fam: 'rod', n: 'APFSDS (dardo estabilizado)', k: 1, norm: 0, ric: [70, 82] },
    HEAT: { fam: 'heat', n: 'HEAT (carga oca)', k: 1, norm: 0, ric: [74, 84] },
    HE: { fam: 'he', n: 'HE (alto explosivo)', k: 1, norm: 0, ric: [82, 89] },
    HESH: { fam: 'hesh', n: 'HESH (esmagamento)', k: 1, norm: 0, ric: [82, 89] },
  };

  /* ---------------- STORE (React) ---------------- */
  SB.Store = {
    s: {}, subs: [],
    set(patch) { Object.assign(this.s, patch); this.subs.slice().forEach(f => f()); },
    use() {
      const [, f] = React.useState(0);
      React.useEffect(() => {
        const fn = () => f(x => x + 1);
        SB.Store.subs.push(fn);
        return () => { SB.Store.subs = SB.Store.subs.filter(x => x !== fn); };
      }, []);
      return SB.Store.s;
    },
  };
  SB.h = (t, p, ...c) => React.createElement(t, p, ...c);
})(window.SB);
