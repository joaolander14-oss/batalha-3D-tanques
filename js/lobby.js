/* Sala / lobby (solo, anfitrião, convidado) e montagem das especificações da partida */
(function (SB) {
  'use strict';
  const Net = SB.Net;
  const L = SB.Lobby = { players: [], myPid: 0, info: null, settings: null, onUpdate: null, onExit: null };
  const upd = () => L.onUpdate && L.onUpdate();
  const sumPlayers = () => L.players.map(p => ({ pid: p.pid, name: p.name, team: p.team, tank: p.tankName }));

  /* info = {name, tankId, tank(custom|null), tankName, loadout:[{ammo,n}]} */
  L.hostRoom = async function (info) {
    L.info = info; L.players = [Object.assign({ pid: 0, peer: 'host', team: 'A' }, info)]; L.myPid = 0; L.nextPid = 1;
    const code = Net.newCode();
    Net.onMsg = L.onMsg; Net.onStatus = upd;
    await Net.host(code); upd(); return code;
  };
  L.joinRoom = async function (code, info) {
    L.info = info; L.players = []; Net.onMsg = L.onMsg; Net.onStatus = upd;
    await Net.join(code.trim().toUpperCase()); Net.send({ t: 'hello', info }); upd();
  };
  L.leave = function () { Net.close(); L.players = []; upd(); };

  L.onMsg = function (m, from) {
    if (Net.mode === 'host') {
      if (m.t === 'hello') {
        const nA = L.players.filter(p => p.team === 'A').length, nB = L.players.length - nA, pid = L.nextPid++;
        const p = Object.assign({ pid, peer: from, team: nA <= nB ? 'A' : 'B' }, m.info); L.players.push(p);
        Net.sendTo(from, { t: 'welcome', pid, team: p.team }); Net.send({ t: 'lobby', players: sumPlayers() }); upd();
      } else if (m.t === 'left') { L.players = L.players.filter(p => p.peer !== from); Net.send({ t: 'lobby', players: sumPlayers() }); upd(); }
    } else if (Net.mode === 'client') {
      if (m.t === 'welcome') { L.myPid = m.pid; }
      else if (m.t === 'lobby') { L.players = m.players; upd(); }
      else if (m.t === 'start') { L.begin(m.cfg, 'client'); }
      else if (m.t === 'hostLeft') { L.players = []; upd(); }
    }
  };

  const rosterIds = () => SB.ROSTER.map(r => r.id);
  /* monta a lista de entidades (jogadores + bots) – só o anfitrião/solo */
  L.buildSpecs = function (settings, hostPeer) {
    const specs = [];
    L.players.forEach(p => specs.push({ eid: 'P' + p.pid, owner: p.pid === 0 ? hostPeer : p.peer, team: p.team, name: p.name, tankId: p.tankId, tank: p.tank || null, loadout: p.loadout, bot: false }));
    const ids = rosterIds(), nm = ['Alfa', 'Bravo', 'Cobra', 'Delta', 'Eco', 'Falcão', 'Gama', 'Hotel', 'Índigo', 'Juliet', 'Kilo', 'Lima'];
    let bi = 0;
    ['A', 'B'].forEach(team => {
      const have = specs.filter(s => s.team === team).length, want = settings['bots' + team];
      for (let i = 0; i < want; i++) {
        const id = ids[Math.floor(Math.random() * ids.length)], def = SB.buildTank(id);
        specs.push({ eid: 'B' + (bi++), owner: hostPeer, team, name: '[BOT] ' + nm[(bi + i) % nm.length], tankId: id, tank: null, loadout: SB.defaultLoadout(def.stats), bot: true });
      }
    });
    return specs;
  };
  L.startSolo = function (info, settings) {
    L.players = [Object.assign({ pid: 0, peer: 'local', team: 'A' }, info)];
    const specs = L.buildSpecs(settings, 'local');
    SB.Battle.start({ map: settings.map, seed: (Math.random() * 1e6) | 0, specs, myEid: 'P0', myPeer: 'local', mode: 'solo', winKills: settings.winKills, timeLimit: settings.minutes * 60 });
  };
  L.startHost = function (settings) {
    const specs = L.buildSpecs(settings, Net.id), cfg = { map: settings.map, seed: (Math.random() * 1e6) | 0, specs, winKills: settings.winKills, timeLimit: settings.minutes * 60 };
    Net.send({ t: 'start', cfg }); L.begin(cfg, 'host');
  };
  L.begin = function (cfg, mode) {
    cfg = Object.assign({}, cfg, { myEid: 'P' + L.myPid, myPeer: Net.id, mode });
    SB.Battle.start(cfg);
  };
})(window.SB);
