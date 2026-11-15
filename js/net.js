/* Rede P2P (PeerJS) em estrela: o anfitrião retransmite as mensagens */
(function (SB) {
  'use strict';
  const PREFIX = 'btk3d-';
  const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }, { urls: 'stun:stun.cloudflare.com:3478' }] };
  const N = SB.Net = { mode: 'off', code: '', id: null, peer: null, conns: new Map(), onMsg: null, onStatus: null, hostConn: null, players: [] };
  const st = s => { N.status = s; N.onStatus && N.onStatus(s); };
  function load() {
    return new Promise((res, rej) => {
      if (window.Peer) return res();
      const s = document.createElement('script'); s.src = 'lib/peerjs.min.js'; s.onload = () => res(); s.onerror = () => rej(new Error('PeerJS não carregou')); document.head.appendChild(s);
    });
  }
  N.newCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();
  N.host = async function (code) {
    N.close(); await load(); N.mode = 'host'; N.code = code; st('Criando sala…');
    return new Promise((res, rej) => {
      const p = new Peer(PREFIX + code, { debug: 0, config: ICE }); N.peer = p;
      p.on('open', id => { N.id = id; st('Sala ' + code + ' aberta, aguardando jogadores'); res(code); });
      p.on('error', e => { st('Erro: ' + e.type); rej(e); });
      p.on('connection', c => {
        c.on('open', () => { N.conns.set(c.peer, c); N.onMsg && N.onMsg({ t: 'joined', from: c.peer }, c.peer); });
        c.on('data', m => { N.onMsg && N.onMsg(m, c.peer); relay(m, c.peer); });
        c.on('close', () => { N.conns.delete(c.peer); N.onMsg && N.onMsg({ t: 'left', from: c.peer }, c.peer); });
      });
    });
  };
  N.join = async function (code) {
    N.close(); await load(); N.mode = 'client'; N.code = code; st('Conectando…');
    return new Promise((res, rej) => {
      const p = new Peer({ debug: 0, config: ICE }); N.peer = p;
      const to = setTimeout(() => { st('Tempo esgotado: sala não encontrada'); rej(new Error('timeout')); }, 12000);
      p.on('open', id => {
        N.id = id; const c = p.connect(PREFIX + code, { reliable: true }); N.hostConn = c;
        c.on('open', () => { clearTimeout(to); st('Conectado à sala ' + code); res(); });
        c.on('data', m => N.onMsg && N.onMsg(m, c.peer));
        c.on('close', () => { st('Desconectado do anfitrião'); N.onMsg && N.onMsg({ t: 'hostLeft' }, c.peer); });
      });
      p.on('error', e => { clearTimeout(to); st('Erro: ' + e.type); rej(e); });
    });
  };
  function relay(m, except) { N.conns.forEach((c, id) => { if (id !== except && c.open) try { c.send(m); } catch (e) { } }); }
  /* host: para todos; client: para o anfitrião (que repassa) */
  N.send = function (m) {
    if (N.mode === 'host') relay(m, null);
    else if (N.mode === 'client' && N.hostConn && N.hostConn.open) try { N.hostConn.send(m); } catch (e) { }
  };
  N.sendTo = function (id, m) { const c = N.conns.get(id); if (c && c.open) try { c.send(m); } catch (e) { } };
  N.close = function () { try { N.peer && N.peer.destroy(); } catch (e) { } N.peer = null; N.conns.clear(); N.hostConn = null; N.mode = 'off'; N.id = null; };
})(window.SB);
