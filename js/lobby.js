/* Sala / lobby (solo, anfitrião, convidado) e montagem das especificações da partida */
(function (SB) {
  'use strict';
  const Net = SB.Net;
  const L = SB.Lobby = { players: [], myPid: 0, info: null, settings: null, set: null, chat: [], ping: null, pings: {}, onUpdate: null, onExit: null, onChat: null };
  const upd = () => L.onUpdate && L.onUpdate();
  const sumPlayers = () => L.players.map(p => ({ pid: p.pid, name: p.name, team: p.team, tank: p.tankName, ping: p.pid === 0 ? 0 : (L.pings[p.peer] == null ? null : L.pings[p.peer]) }));
  let pingT = 0, lastSet = '';
  const bcast = () => { Net.send({ t: 'lobby', players: sumPlayers(), set: L.set }); upd(); };

  /* info = {name, tankId, tank(custom|null), tankName, loadout:[{ammo,n}]} */
  L.hostRoom = async function (info) {
    L.info = info; L.players = [Object.assign({ pid: 0, peer: 'host', team: 'A' }, info)]; L.myPid = 0; L.nextPid = 1; L.chat = []; L.pings = {}; L.set = null; lastSet = '';
    const code = Net.newCode();
    Net.onMsg = L.onMsg; Net.onStatus = upd;
    await Net.host(code); upd(); return code;
  };
  L.joinRoom = async function (code, info) {
    L.info = info; L.players = []; L.chat = []; L.ping = null; Net.onMsg = L.onMsg; Net.onStatus = upd;
    await Net.join(code.trim().toUpperCase()); Net.send({ t: 'hello', info }); upd();
    clearInterval(pingT); const sendPing = () => { if (Net.mode === 'client') Net.send({ t: 'png', ts: Date.now(), p: L.ping }); }; sendPing(); pingT = setInterval(sendPing, 2000);
  };
  L.leave = function () { clearInterval(pingT); Net.close(); L.players = []; L.chat = []; L.ping = null; upd(); };
  /* chat, troca de equipe, expulsão e resumo da partida (anfitrião) */
  L.sendChat = function (x) {
    x = String(x || '').trim().slice(0, 140); if (!x || Net.mode === 'off') return;
    const me = L.players.find(p => p.pid === L.myPid), e = { n: (L.info && L.info.name) || 'Jogador', team: me ? me.team : 'A', x };
    Net.send({ t: 'chat', n: e.n, team: e.team, x }); L.addChat(e);
  };
  L.addChat = function (e) { L.chat.push(e); if (L.chat.length > 60) L.chat.shift(); upd(); L.onChat && L.onChat(e); };
  L.setTeam = function (pid, team) {
    if (Net.mode === 'host') { const p = L.players.find(q => q.pid === pid); if (p) { p.team = team; bcast(); } }
    else if (Net.mode === 'client' && pid === L.myPid) Net.send({ t: 'team', team });
  };
  L.kick = function (pid) {
    if (Net.mode !== 'host') return; const p = L.players.find(q => q.pid === pid); if (!p || p.pid === 0) return;
    Net.sendTo(p.peer, { t: 'kick' }); L.players = L.players.filter(q => q !== p); bcast();
  };
  L.pushSettings = function (set) { if (Net.mode !== 'host') return; set = Object.assign({}, set); delete set.botOff; const j = JSON.stringify(set); if (j === lastSet) return; lastSet = j; L.set = set; bcast(); };

  L.onMsg = function (m, from) {
    if (m.t === 'chat') { L.addChat({ n: String(m.n || '?').slice(0, 24), team: m.team, x: String(m.x || '').slice(0, 140) }); return; }
    if (Net.mode === 'host') {
      if (m.t === 'hello') {
        const nA = L.players.filter(p => p.team === 'A').length, nB = L.players.length - nA, pid = L.nextPid++;
        const p = Object.assign({ pid, peer: from, team: nA <= nB ? 'A' : 'B' }, m.info); L.players.push(p);
        Net.sendTo(from, { t: 'welcome', pid, team: p.team }); bcast();
      } else if (m.t === 'left') { L.players = L.players.filter(p => p.peer !== from); delete L.pings[from]; bcast(); }
      else if (m.t === 'png') { L.pings[from] = m.p == null ? null : m.p; Net.sendTo(from, { t: 'pong', ts: m.ts }); upd(); }
      else if (m.t === 'team') { const p = L.players.find(q => q.peer === from); if (p && (m.team === 'A' || m.team === 'B')) { p.team = m.team; bcast(); } }
    } else if (Net.mode === 'client') {
      if (m.t === 'welcome') { L.myPid = m.pid; }
      else if (m.t === 'lobby') { L.players = m.players; L.set = m.set || null; upd(); }
      else if (m.t === 'pong') { L.ping = Math.max(1, Date.now() - m.ts); upd(); }
      else if (m.t === 'kick') { L.leave(); try { alert('Você foi removido da sala pelo anfitrião.'); } catch (e) { } }
      else if (m.t === 'start') { L.begin(m.cfg, 'client'); }
      else if (m.t === 'hostLeft') { L.players = []; upd(); }
    }
  };

  L.DIFF = [['Recruta', 0.1], ['Normal', 0.5], ['Veterano', 0.8], ['Elite', 1]];
  const rosterIds = () => SB.ROSTER.map(r => r.id);
  /* monta a lista de entidades (jogadores + bots) – só o anfitrião/solo */
  L.buildSpecs = function (settings, hostPeer) {
    const specs = [];
    L.players.forEach(p => specs.push({ eid: 'P' + p.pid, owner: p.pid === 0 ? hostPeer : p.peer, team: p.team, name: p.name, tankId: p.tankId, tank: p.tank || null, loadout: p.loadout, bot: false }));
    const off = new Set(settings.botOff || []), ids = rosterIds().filter(id => !off.has(id)), airIds = SB.HELIS.filter(h => !off.has(h.id)), nm = ['Alfa', 'Bravo', 'Cobra', 'Delta', 'Eco', 'Falcão', 'Gama', 'Hotel', 'Índigo', 'Juliet', 'Kilo', 'Lima'];
    let bi = 0;
    ['A', 'B'].forEach(team => {
      const want = ids.length ? settings['bots' + team] : 0, skill = (L.DIFF[settings['diff' + team]] || L.DIFF[1])[1];
      for (let i = 0; i < want; i++) {
        const id = ids[Math.floor(Math.random() * ids.length)], def = SB.buildTank(id);
        specs.push({ eid: 'B' + (bi++), owner: hostPeer, team, name: '[BOT] ' + nm[(bi + i) % nm.length], tankId: id, tank: null, loadout: SB.defaultLoadout(def.stats), bot: true, skill });
      }
    });
    ['A', 'B'].forEach(team => {
      const skill = (L.DIFF[settings['diff' + team]] || L.DIFF[1])[1];
      for (let i = 0; i < (airIds.length ? settings['heli' + team] || 0 : 0); i++) {
        const h = airIds[Math.floor(Math.random() * airIds.length)], def = SB.buildHeli(h.id);
        specs.push({ eid: 'B' + (bi++), owner: hostPeer, team, name: '[BOT] ' + h.name.split(' ')[0] + ' ' + nm[(bi + i) % nm.length], tankId: h.id, tank: null, loadout: SB.defaultLoadout(def.stats), bot: true, skill });
      }
    });
    return specs;
  };
  L.startSolo = function (info, settings) {
    L.players = [Object.assign({ pid: 0, peer: 'local', team: 'A' }, info)];
    const specs = L.buildSpecs(settings, 'local');
    SB.Battle.start({ map: settings.map, seed: (Math.random() * 1e6) | 0, specs, myEid: 'P0', myPeer: 'local', mode: 'solo', winKills: settings.winKills, rules: settings.rules || 'kills', capPoints: settings.capPoints || 600, timeLimit: settings.minutes * 60 });
  };
  L.startHost = function (settings) {
    const specs = L.buildSpecs(settings, Net.id), cfg = { map: settings.map, seed: (Math.random() * 1e6) | 0, specs, winKills: settings.winKills, rules: settings.rules || 'kills', capPoints: settings.capPoints || 600, timeLimit: settings.minutes * 60 };
    Net.send({ t: 'start', cfg }); L.begin(cfg, 'host');
  };
  L.begin = function (cfg, mode) {
    cfg = Object.assign({}, cfg, { myEid: 'P' + L.myPid, myPeer: Net.id, mode });
    SB.Battle.start(cfg);
  };
})(window.SB);
