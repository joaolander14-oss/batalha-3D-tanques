/* UI React do lobby de batalha e da garagem (usa SB.UI exportado pelo app.js) */
(function (SB) {
  'use strict';
  const h = SB.h, Store = SB.Store, clamp = SB.clamp, rd = SB.round, V3 = THREE.Vector3;
  const U = () => SB.UI;
  const S = () => Store.s;

  function autoPivots(t) {
    const st = t.stats, turP = t.parts.filter(p => p.grp === 'turret'), gun = t.parts.filter(p => p.grp === 'gun');
    if (turP.length) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
      turP.forEach(p => { x0 = Math.min(x0, p.pos[0]); x1 = Math.max(x1, p.pos[0]); y0 = Math.min(y0, p.pos[1]); y1 = Math.max(y1, p.pos[1]); z0 = Math.min(z0, p.pos[2]); z1 = Math.max(z1, p.pos[2]); });
      st.turPivot = [rd((x0 + x1) / 2, 3), rd((y0 + y1) / 2, 3), rd((z0 + z1) / 2, 3)];
    }
    if (gun.length) {
      let zmax = -1e9, ym = 0; gun.forEach(p => { zmax = Math.max(zmax, p.pos[2]); ym += p.pos[1]; }); ym /= gun.length;
      st.gunPivot = [st.turPivot[0], rd(ym, 3), rd(zmax - 0.3, 3)];
      let best = null; gun.forEach(p => { if ((p.shape === 'tube' || p.shape === 'cyl') && (!best || p.size[1] > best.size[1])) best = p; });
      if (best) {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(best.rot[0] * SB.D2R, best.rot[1] * SB.D2R, best.rot[2] * SB.D2R, 'YXZ'));
        const a = new V3(0, best.size[1] / 2, 0).applyQuaternion(q), b = a.clone().negate(), tip = a.z < b.z ? a : b;
        st.muzzle = [rd(best.pos[0] + tip.x, 3), rd(best.pos[1] + tip.y, 3), rd(best.pos[2] + tip.z, 3)];
      } else st.muzzle = [st.gunPivot[0], st.gunPivot[1], st.gunPivot[2] - 3];
    }
    let zmin = 1e9, zmaxA = -1e9, xmax = 0;
    t.parts.forEach(p => { if (p.kind === 'armor' && p.grp !== 'gun') { zmin = Math.min(zmin, p.pos[2] - p.size[2] / 2); zmaxA = Math.max(zmaxA, p.pos[2] + p.size[2] / 2); xmax = Math.max(xmax, Math.abs(p.pos[0]) + p.size[0] / 2); } });
    if (zmin < 1e8) { st.bodyLen = rd(Math.max(3, Math.min(zmaxA - zmin, 9)), 2); st.bodyWid = rd(Math.max(2, Math.min(xmax * 2, 4.5)), 2); }
    return t;
  }
  function saveGarageTank() {
    const T = S().tank, t = JSON.parse(JSON.stringify(T));
    t.id = T.gid || 'g' + Math.random().toString(36).slice(2, 8); t.gid = t.id; SB.fillStats(t); autoPivots(t);
    SB.garage = SB.garage.filter(x => x.id !== t.id).concat([t]); SB.saveGarage(); U().setTank({ ...T, gid: t.id }); Store.set({ lt: Date.now() });
  }

  SB.StatsForm = function StatsForm() {
    const { Row, Num, button, div, setTank } = U(); const s = Store.use(), T = s.tank, st = T.stats;
    const f = (lab, k, step) => Row(lab, h(Num, { v: st[k], on: v => setTank({ ...T, stats: { ...st, [k]: v } }), step }));
    return div({ className: 'form' },
      div({ className: 'sec' }, 'Garagem e dados de batalha' + (st.kind === 'heli' ? ' (helicóptero)' : '')),
      Row('Nome', h('input', { value: T.name, onChange: e => setTank({ ...T, name: e.target.value }) })),
      f('Calibre do canhão (mm)', 'cal', 5), f('Veloc. do cano (×)', 'vk', 0.05), f('Velocidade máx. (km/h)', 'vmax', 5), f('Giro do casco (°/s)', 'turn', 2), f('Giro da torre (°/s)', 'trav', 2), st.kind === 'heli' ? f('Razão de subida (m/s)', 'climb', 1) : f('Recarga (s)', 'reload', 0.5), f(st.kind === 'heli' ? 'Capacidade de armas (unid.)' : 'Munições no paiol (unid.)', 'rack', 5), f('Massa (t)', 'mass', 1),
      Row('Canhão fixo (casamata)', h('input', { type: 'checkbox', checked: !!st.fixedGun, onChange: e => setTank({ ...T, stats: { ...st, fixedGun: e.target.checked } }) })),
      div({ className: 'btns' }, button({ className: 'primary', onClick: saveGarageTank }, '💾 Salvar na garagem'),
        h('select', { value: '', onChange: e => { const g = SB.garage.find(x => x.id === e.target.value); if (g) { setTank(SB.fillStats(JSON.parse(JSON.stringify(g)))); Store.set({ sel: null }); SB.Scene.setSel(null); } } }, h('option', { value: '' }, 'Garagem (' + SB.garage.length + ')…'), SB.garage.map(g => h('option', { key: g.id, value: g.id }, g.name))),
        T.gid ? button({ className: 'danger', onClick: () => { SB.garage = SB.garage.filter(x => x.id !== T.gid); SB.saveGarage(); setTank({ ...T, gid: null }); } }, 'Apagar da garagem') : null),
      div({ className: 'hint' }, 'Cada peça tem um "Grupo" (casco/torre/canhão): a torre gira e o canhão eleva em batalha. Ao salvar, pivôs e boca do cano são calculados sozinhos. Tanques salvos aparecem em ⚔ Batalha.'));
  };

  function setLobby(p) { const l = { ...S().lobby, ...p }; Store.set({ lobby: l }); try { localStorage.setItem('sb.lobby', JSON.stringify({ ...l, players: undefined })); } catch (e) {} }
  SB.previewTank = function (id) { try { const t = SB.allTanks().find(x => x.id === id); if (t) { SB.Scene.sync(t.get()); SB.Scene.setSel(null); } } catch (e) {} };
  function pickTank(id) {
    const t = SB.allTanks().find(x => x.id === id), def = t.get();
    setLobby({ tankId: id, loadout: SB.defaultLoadout(def.stats).map(r => ({ aid: r.ammo.id, n: r.n })) }); SB.previewTank(id);
  }
  function lobbyInfo() {
    const s = S(), L = s.lobby, t = SB.allTanks().find(x => x.id === L.tankId) || SB.allTanks()[9], def = t.get();
    let loadout = L.loadout.map(r => ({ ammo: s.ammos.find(a => a.id === r.aid), n: r.n })).filter(r => r.ammo && r.n > 0).slice(0, 4);
    if (!loadout.length) loadout = SB.defaultLoadout(def.stats);
    let tot = 0; loadout = loadout.map(r => { const sl = r.ammo.slots || 1, n = Math.max(0, Math.min(r.n, Math.floor((def.stats.rack - tot) / sl))); tot += n * sl; return { ammo: r.ammo, n }; }).filter(r => r.n > 0);
    return { name: L.name || 'Jogador', tankId: t.id, tank: t.custom ? def : null, tankName: t.name, loadout };
  }

  /* seletor de munição agrupado por classe (PDF) */
  function AmmoSel({ v, on, ammos }) {
    const groups = {};
    ammos.forEach(a => { const g = !a.builtin ? '★ Minhas munições' : (a.info && a.info.heli ? '🚁 Helicóptero (canhão / foguete / míssil / ar-ar)' : (SB.CLS_NAMES[(SB.TYPE[a.type] || {}).cls] || 'Outras')); (groups[g] = groups[g] || []).push(a); });
    return h('select', { value: v, onChange: e => on(e.target.value) }, Object.keys(groups).map(g => h('optgroup', { key: g, label: g }, groups[g].map(a => h('option', { key: a.id, value: a.id }, a.name)))));
  }
  SB.BattlePanel = function BattlePanel() {
    const { Row, Num, Sel, button, div, span } = U(); const s = Store.use(), L = s.lobby, tanks = SB.allTanks(), cur = tanks.find(t => t.id === L.tankId) || tanks[9], def = cur.get(), rack = def.stats.rack;
    const slotsOf = id => { const a = s.ammos.find(x => x.id === id); return a ? (a.slots || 1) : 1; };
    const used = L.loadout.reduce((a, r) => a + r.n * slotsOf(r.aid), 0);
    const setRow = (i, k, v) => setLobby({ loadout: L.loadout.map((r, j) => j === i ? { ...r, [k]: v } : r) });
    const maxFor = i => { const others = L.loadout.reduce((a, r, j) => a + (j === i ? 0 : r.n * slotsOf(r.aid)), 0); return Math.max(0, Math.floor((rack - others) / slotsOf(L.loadout[i].aid))); };
    const nations = ['Todas', ...Array.from(new Set(tanks.map(t => t.nation)))];
    const list = tanks.filter(t => (!L.nation || L.nation === 'Todas' || t.nation === L.nation) && (!L.kind || L.kind === 'all' || t.kind === L.kind));
    const net = SB.Net.status, players = SB.Lobby.players, online = L.mode !== 'solo', hosting = SB.Net.mode === 'host', joined = SB.Net.mode === 'client';
    const settings = () => ({ map: L.map, botsA: L.botsA, botsB: L.botsB, heliA: L.heliA || 0, heliB: L.heliB || 0, winKills: L.winKills, minutes: L.minutes });
    const go = async () => {
      const info = lobbyInfo();
      if (L.mode === 'solo') return SB.Lobby.startSolo(info, settings());
      if (L.mode === 'host') { if (!hosting) { try { const code = await SB.Lobby.hostRoom(info); setLobby({ code }); } catch (e) { alert('Não foi possível criar a sala: ' + (e.type || e.message)); } } else SB.Lobby.startHost(settings()); }
      else if (!joined) { try { await SB.Lobby.joinRoom(L.joinCode || '', info); } catch (e) { alert('Não foi possível entrar na sala.'); } }
    };
    return div({ className: 'panel' },
      div({ className: 'sec' }, '⚔ Batalha de tanques'),
      div({ className: 'form' },
        Row('Seu nome', h('input', { value: L.name, onChange: e => setLobby({ name: e.target.value }) })),
        Row('Modo', h(Sel, { v: L.mode, on: v => { if (v === 'solo') SB.Lobby.leave(); setLobby({ mode: v }); }, opts: [['solo', 'Solo contra bots'], ['host', 'Online: criar sala'], ['join', 'Online: entrar em sala']] })),
        L.mode === 'join' ? Row('Código da sala', h('input', { value: L.joinCode || '', placeholder: 'ex.: K7P2Q', onChange: e => setLobby({ joinCode: e.target.value.toUpperCase() }) })) : null),
      div({ className: 'sec' }, 'Veículo (' + list.length + ')  ', h(Sel, { v: L.kind || 'all', on: v => setLobby({ kind: v }), opts: [['all', 'Todos'], ['tank', 'Tanques (100)'], ['heli', 'Helicópteros (10)']] }), ' ', h(Sel, { v: L.nation || 'Todas', on: v => setLobby({ nation: v }), opts: nations.map(n => [n, n]) })),
      div({ className: 'list tall' }, list.map(t => div({ key: t.id, className: 'item' + (t.id === cur.id ? ' on' : ''), onClick: () => pickTank(t.id) },
        span({ className: 'nm' }, (t.custom ? '★ ' : '') + (t.kind === 'heli' ? '🚁 ' : '') + t.name), span({ className: 'tag' }, t.nation + ' · ' + t.cal + ' mm · ' + t.mass + ' t · ' + t.vmax + ' km/h')))),
      div({ className: 'hint' }, 'Selecionado: ', h('b', null, cur.name), ' — ' + (def.stats.kind === 'heli' ? 'helicóptero: canhão ' + def.stats.cal + ' mm, capacidade ' + rack + ' unidades (tiro=1, foguete=8, míssil=40). Espaço sobe, Shift desce.' : 'canhão ' + def.stats.cal + ' mm, recarga ' + def.stats.reload + ' s, paiol ' + rack + ' unidades') + '. Crie veículos na aba 🛠 Veículo.'),
      div({ className: 'sec' }, 'Munições (' + used + '/' + rack + ' unid.)'),
      div({ className: 'form' },
        L.loadout.map((r, i) => div({ className: 'row', key: i },
          h(AmmoSel, { v: r.aid, on: v => setRow(i, 'aid', v), ammos: s.ammos }),
          h(Num, { v: r.n, on: v => setRow(i, 'n', Math.max(0, Math.min(maxFor(i), Math.round(v)))), step: 1, w: 56 }),
          button({ className: 'danger', onClick: () => setLobby({ loadout: L.loadout.filter((_, j) => j !== i) }) }, '×'))),
        L.loadout.length < 4 ? button({ onClick: () => setLobby({ loadout: [...L.loadout, { aid: s.ammos[0].id, n: Math.max(0, rack - used) }] }) }, '+ Tipo de munição') : null,
        used > rack ? div({ className: 'warn' }, '⚠ Passou do limite do paiol: o excesso será cortado.') : null,
        div({ className: 'hint' }, 'As munições (inclusive as que você criar na aba 🔩) são ajustadas ao calibre e à velocidade do cano do tanque escolhido.')),
      div({ className: 'sec' }, 'Partida'),
      div({ className: 'form' },
        Row('Mapa', h(Sel, { v: L.map, on: v => setLobby({ map: v }), opts: SB.MAP_LIST.map(m => [m.id, m.name]) })),
        Row('Bots equipe azul', h(Num, { v: L.botsA, on: v => setLobby({ botsA: clamp(Math.round(v), 0, 10) }), step: 1 })),
        Row('Bots equipe vermelha', h(Num, { v: L.botsB, on: v => setLobby({ botsB: clamp(Math.round(v), 0, 10) }), step: 1 })),
        Row('Helicópteros bot (azul)', h(Num, { v: L.heliA || 0, on: v => setLobby({ heliA: clamp(Math.round(v), 0, 5) }), step: 1 })),
        Row('Helicópteros bot (verm.)', h(Num, { v: L.heliB || 0, on: v => setLobby({ heliB: clamp(Math.round(v), 0, 5) }), step: 1 })),
        Row('Abates para vencer', h(Num, { v: L.winKills, on: v => setLobby({ winKills: clamp(Math.round(v), 3, 100) }), step: 5 })),
        Row('Tempo (min)', h(Num, { v: L.minutes, on: v => setLobby({ minutes: clamp(v, 2, 60) }), step: 1 }))),
      online ? div({ className: 'sec' }, 'Sala online') : null,
      online ? div({ className: 'form' },
        div({ className: 'hint' }, net || 'Offline'),
        hosting ? div({ className: 'code' }, 'Código: ', h('b', null, SB.Net.code), ' (passe aos amigos)') : null,
        players.map((p, i) => div({ key: i, className: 'bar' }, span({ className: 'chip', style: { background: p.team === 'A' ? '#3aa0ff' : '#ff5a4a' } }), span({ className: 'nm' }, p.name), span({ className: 'tag' }, p.tank || p.tankName || ''))),
        (hosting || joined) ? button({ onClick: () => SB.Lobby.leave() }, 'Sair da sala') : null,
        joined ? div({ className: 'hint' }, 'Aguardando o anfitrião iniciar…') : null) : null,
      div({ className: 'btns' }, button({ className: 'primary big', disabled: joined, onClick: go }, L.mode === 'solo' ? '▶ INICIAR BATALHA' : L.mode === 'host' ? (hosting ? '▶ INICIAR PARA TODOS' : '🌐 CRIAR SALA') : (joined ? 'Conectado' : '🔗 ENTRAR NA SALA'))),
      div({ className: 'hint pad' }, 'Controles: W/S acelera, A/D vira, mouse mira a torre, clique esquerdo atira, botão direito = mira telescópica (roda = zoom), 1-4 troca munição, F extintor, Tab placar, Esc pausa.'));
  };
})(window.SB);
