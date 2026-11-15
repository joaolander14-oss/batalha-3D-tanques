/* Rede em estrela: conexão direta (PeerJS/WebRTC) + retransmissão por brokers MQTT públicos como reserva.
   O anfitrião escuta nos dois caminhos ao mesmo tempo; o convidado tenta os dois e usa o primeiro que responder.
   Isso resolve o caso de redes com NAT restritivo (dados móveis, roteadores de operadora), onde só o WebRTC direto falha. */
(function (SB) {
  'use strict';
  const PREFIX = 'btk3d-', TP = 'btk3d1/';
  const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }, { urls: 'stun:stun.cloudflare.com:3478' }] };
  const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const N = SB.Net = { mode: 'off', code: '', id: null, peer: null, conns: new Map(), onMsg: null, onStatus: null, hostConn: null, players: [], transport: '' };
  const st = s => { N.status = s; N.onStatus && N.onStatus(s); };
  function load() {
    return new Promise((res, rej) => {
      if (window.Peer) return res();
      const s = document.createElement('script'); s.src = 'lib/peerjs.min.js'; s.onload = () => res(); s.onerror = () => rej(new Error('PeerJS não carregou')); document.head.appendChild(s);
    });
  }
  N.newCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');

  /* ---------- cliente MQTT 3.1.1 mínimo (QoS 0) sobre WebSocket ---------- */
  const te = new TextEncoder(), td = new TextDecoder();
  const cat = (...parts) => { let n = 0; for (const q of parts) n += q.length; const o = new Uint8Array(n); let i = 0; for (const q of parts) { o.set(q, i); i += q.length; } return o; };
  const u16s = str => { const b = te.encode(str); return cat(new Uint8Array([b.length >> 8, b.length & 255]), b); };
  const remLen = n => { const a = []; do { let d = n & 127; n >>= 7; if (n) d |= 128; a.push(d); } while (n); return new Uint8Array(a); };
  const mqPacket = (b0, body) => cat(new Uint8Array([b0]), remLen(body.length), body);
  class Mq {
    constructor(url, onMsg, onClose) { this.url = url; this.onMsg = onMsg; this.onClose = onClose; this.ws = null; this.ok = false; this.buf = new Uint8Array(0); this.pid = 1; this.waiters = {}; this.pt = 0; }
    connect(ms) {
      return new Promise(res => {
        let done = false, tm = 0; const fin = v => { if (!done) { done = true; clearTimeout(tm); res(v); } };
        tm = setTimeout(() => { fin(false); try { this.ws.close(); } catch (e) { } }, ms || 6000);
        let ws; try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { return fin(false); }
        ws.binaryType = 'arraybuffer'; this.ws = ws;
        ws.onopen = () => ws.send(mqPacket(0x10, cat(u16s('MQTT'), new Uint8Array([4, 2, 0, 30]), u16s('bt' + Math.random().toString(36).slice(2, 10)))));
        ws.onmessage = e => this.feed(new Uint8Array(e.data), fin);
        ws.onerror = () => fin(false);
        ws.onclose = () => { const was = this.ok; this.ok = false; clearInterval(this.pt); fin(false); if (was && this.onClose) this.onClose(this); };
      });
    }
    feed(chunk, fin) {
      this.buf = cat(this.buf, chunk);
      for (;;) {
        const b = this.buf; if (b.length < 2) return;
        let mul = 1, len = 0, i = 1, c;
        do { if (i >= b.length) return; c = b[i++]; len += (c & 127) * mul; mul *= 128; } while ((c & 128) && i < 5);
        if (b.length < i + len) return;
        const type = b[0] >> 4, qos = (b[0] >> 1) & 3, body = b.subarray(i, i + len);
        this.buf = b.slice(i + len);
        if (type === 2) {
          if (body[1] === 0) { this.ok = true; this.pt = setInterval(() => { try { this.ws.send(new Uint8Array([0xC0, 0])); } catch (e) { } }, 15000); fin(true); } else fin(false);
        } else if (type === 9) { const w = this.waiters[(body[0] << 8) | body[1]]; if (w) w(); }
        else if (type === 3) {
          const tl = (body[0] << 8) | body[1]; let q = 2 + tl; if (qos) q += 2;
          try { if (this.onMsg) this.onMsg(td.decode(body.subarray(2, 2 + tl)), td.decode(body.subarray(q))); } catch (e) { }
        }
      }
    }
    sub(topic) {
      return new Promise(res => {
        const id = this.pid++; const t = setTimeout(res, 3000); this.waiters[id] = () => { clearTimeout(t); res(); };
        try { this.ws.send(mqPacket(0x82, cat(new Uint8Array([id >> 8, id & 255]), u16s(topic), new Uint8Array([0])))); } catch (e) { res(); }
      });
    }
    pub(topic, str) { const w = this.ws; if (!w || w.readyState !== 1 || w.bufferedAmount > 400000) return; try { w.send(mqPacket(0x30, cat(u16s(topic), te.encode(str)))); } catch (e) { } }
    close() { this.ok = false; clearInterval(this.pt); try { this.ws.send(new Uint8Array([0xE0, 0])); } catch (e) { } try { this.ws.close(); } catch (e) { } }
  }

  /* ---------- anfitrião ---------- */
  let hostRelay = null, hostTimer = 0, guestRelay = null, guestTimer = 0, guestHB = 0, joinTok = 0;
  const guests = new Map(); // gid → { bi, last, seq, conn }
  function startHostRelay(code) {
    const list = []; let closed = false;
    const open = async (bi) => {
      if (closed) return false;
      const mq = new Mq(BROKERS[bi], (t, pl) => { let m; try { m = JSON.parse(pl); } catch (e) { return; } onUp(bi, m); }, () => { if (!closed) setTimeout(() => open(bi), 3000); });
      list[bi] = mq;
      if (!(await mq.connect(6000))) { if (!closed) setTimeout(() => open(bi), 8000); return false; }
      await mq.sub(TP + code + '/up'); return true;
    };
    hostRelay = {
      start: async () => (await Promise.all(BROKERS.map((_, i) => open(i)))).filter(Boolean).length,
      pub(bi, gid, m) { const mq = list[bi]; if (mq && mq.ok) mq.pub(TP + code + '/to/' + gid, JSON.stringify(m)); },
      count: () => list.filter(m => m && m.ok).length,
      close() { closed = true; list.forEach(m => m && m.close()); },
    };
    return hostRelay.start();
  }
  function onUp(bi, m) {
    const gid = m.g; if (!gid) return; delete m.g;
    let g = guests.get(gid);
    if (!g) {
      g = { bi, last: Date.now(), seq: 0 };
      g.conn = { open: true, relay: true, send(msg) { g.seq++; const o = Object.assign({}, msg); o.q = g.seq; hostRelay && hostRelay.pub(g.bi, gid, o); } };
      guests.set(gid, g);
    }
    g.bi = bi; g.last = Date.now();
    const id = 'r:' + gid;
    if (m.t === '_ping') {
      // responde em todos os brokers de onde veio o ping; o convidado escolhe o primeiro
      hostRelay && hostRelay.pub(bi, gid, { t: '_pong', q: 0 });
      if (!N.conns.has(id)) { N.conns.set(id, g.conn); N.onMsg && N.onMsg({ t: 'joined', from: id }, id); }
      return;
    }
    if (m.t === '_hb') return;
    if (m.q != null && g.lastQ != null && m.q <= g.lastQ && m.q !== 0) return;
    N.onMsg && N.onMsg(m, id); relay(m, id);
  }

  N.host = async function (code) {
    N.close(); N.mode = 'host'; N.code = code; N.id = PREFIX + code; N.transport = ''; st('Criando sala…');
    const relayP = startHostRelay(code).catch(() => 0);
    let p2p = false;
    try {
      await load();
      p2p = await new Promise(res => {
        let done = false; const fin = v => { if (!done) { done = true; res(v); } };
        setTimeout(() => fin(false), 8000);
        const p = new Peer(PREFIX + code, { debug: 0, config: ICE }); N.peer = p;
        p.on('open', () => fin(true));
        p.on('error', e => { if (!done) fin(false); });
        p.on('connection', c => {
          c.on('open', () => { N.conns.set(c.peer, c); N.onMsg && N.onMsg({ t: 'joined', from: c.peer }, c.peer); });
          c.on('data', m => { N.onMsg && N.onMsg(m, c.peer); relay(m, c.peer); });
          c.on('close', () => { N.conns.delete(c.peer); N.onMsg && N.onMsg({ t: 'left', from: c.peer }, c.peer); });
        });
        p.on('disconnected', () => { try { p.reconnect(); } catch (e) { } });
      });
    } catch (e) { p2p = false; }
    const nb = await relayP;
    if (!p2p && !nb) { st('Não foi possível abrir a sala (sem internet?)'); throw new Error('sem rede'); }
    clearInterval(hostTimer);
    hostTimer = setInterval(() => { // convidados por retransmissão que sumiram
      const now = Date.now();
      guests.forEach((g, gid) => { if (now - g.last > 25000) { guests.delete(gid); const id = 'r:' + gid; if (N.conns.delete(id)) N.onMsg && N.onMsg({ t: 'left', from: id }, id); } });
    }, 5000);
    st('Sala ' + code + ' aberta (' + (p2p ? 'direto' : '') + (p2p && nb ? ' + ' : '') + (nb ? 'retransmissão' : '') + '), aguardando jogadores');
    return code;
  };

  /* ---------- convidado ---------- */
  N.join = function (code) {
    N.close(); N.mode = 'client'; N.code = code; N.transport = ''; const tok = ++joinTok; st('Conectando (direto e por retransmissão)…');
    const gid = Math.random().toString(36).slice(2, 10);
    return new Promise((resolve, reject) => {
      let done = false, p2pConn = null, lastQ = -1;
      const fin = (ok, why) => {
        if (done) return; done = true; clearTimeout(to); clearInterval(guestTimer);
        if (ok) resolve(); else { st(why || 'Sala não encontrada'); reject(new Error(why || 'timeout')); }
      };
      const to = setTimeout(() => { if (tok === joinTok) { try { guestRelay && guestRelay.close(); } catch (e) { } try { N.peer && N.peer.destroy(); } catch (e) { } fin(false, 'Sala não encontrada (confira o código e se o anfitrião ainda está na tela da sala)'); } }, 22000);
      /* caminho 1: WebRTC direto */
      load().then(() => {
        if (tok !== joinTok) return;
        const p = new Peer({ debug: 0, config: ICE }); N.peer = p;
        p.on('open', () => {
          const c = p.connect(PREFIX + code, { reliable: true }); p2pConn = c;
          c.on('open', () => { if (done || N.transport) { try { c.close(); } catch (e) { } return; } N.transport = 'p2p'; N.id = p.id; N.hostConn = c; try { guestRelay && guestRelay.close(); } catch (e) { } guestRelay = null; st('Conectado à sala ' + code + ' (direto)'); fin(true); });
          c.on('data', m => N.onMsg && N.onMsg(m, 'host'));
          c.on('close', () => { if (N.transport === 'p2p') { st('Desconectado do anfitrião'); N.onMsg && N.onMsg({ t: 'hostLeft' }, 'host'); } });
        });
        p.on('error', () => { });
      }).catch(() => { });
      /* caminho 2: retransmissão MQTT */
      const list = [], dn = TP + code + '/to/' + gid, up = TP + code + '/up'; let chosen = -1;
      guestRelay = {
        close() { list.forEach(q => q && q.close()); },
        send(m) { m.g = gid; const q = list[chosen]; if (q && q.ok) q.pub(up, JSON.stringify(m)); },
      };
      const onDown = (bi, m) => {
        if (tok !== joinTok) return;
        if (m.t === '_pong') {
          if (chosen < 0 && !N.transport) {
            chosen = bi; list.forEach((q, k) => { if (k !== bi && q) q.close(); });
            N.transport = 'relay'; N.id = 'r:' + gid;
            N.hostConn = { open: true, relay: true, send(msg) { guestRelay && guestRelay.send(msg); }, close() { } };
            try { N.peer && N.peer.destroy(); } catch (e) { } N.peer = null;
            clearInterval(guestHB); guestHB = setInterval(() => { if (chosen >= 0) guestRelay.send({ t: '_hb' }); }, 6000);
            st('Conectado à sala ' + code + ' (retransmissão)'); fin(true);
          }
          return;
        }
        if (chosen >= 0 && bi !== chosen) return;
        if (m.q != null && m.q > 0) { if (m.q <= lastQ) return; lastQ = m.q; }
        N.onMsg && N.onMsg(m, 'host');
      };
      Promise.all(BROKERS.map(async (u, i) => {
        const mq = new Mq(u, (t, pl) => { let m; try { m = JSON.parse(pl); } catch (e) { return; } onDown(i, m); }, () => { if (chosen === i && N.transport === 'relay') { st('Desconectado do anfitrião'); N.onMsg && N.onMsg({ t: 'hostLeft' }, 'host'); } });
        list[i] = mq; if (!(await mq.connect(6000))) return false; await mq.sub(dn); return true;
      })).then(() => {
        if (tok !== joinTok || done) return;
        const ping = () => { if (chosen < 0 && !done) list.forEach(q => { if (q && q.ok) q.pub(up, JSON.stringify({ t: '_ping', g: gid })); }); };
        ping(); guestTimer = setInterval(ping, 1500);
      });
    });
  };

  /* ---------- envio ---------- */
  function relay(m, except) { N.conns.forEach((c, id) => { if (id !== except && c.open) try { c.send(m); } catch (e) { } }); }
  N.send = function (m) {
    if (N.mode === 'host') relay(m, null);
    else if (N.mode === 'client' && N.hostConn && N.hostConn.open) try { N.hostConn.send(m); } catch (e) { }
  };
  N.sendTo = function (id, m) { const c = N.conns.get(id); if (c && c.open) try { c.send(m); } catch (e) { } };
  N.close = function () {
    joinTok++; clearInterval(hostTimer); clearInterval(guestTimer); clearInterval(guestHB);
    try { N.peer && N.peer.destroy(); } catch (e) { } try { hostRelay && hostRelay.close(); } catch (e) { } try { guestRelay && guestRelay.close(); } catch (e) { }
    N.peer = null; hostRelay = null; guestRelay = null; guests.clear(); N.conns.clear(); N.hostConn = null; N.mode = 'off'; N.id = null; N.transport = '';
  };
})(window.SB);
