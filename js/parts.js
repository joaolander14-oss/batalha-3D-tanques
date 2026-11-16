/* Sistemas e peças adicionais dos veículos (módulos com efeito de jogo quando existem e quando são danificados) */
(function (SB) {
  'use strict';
  Object.assign(SB.SUBS, {
    stab: { kind: 'module', n: 'Estabilizador do canhão', c: '#7fd1b9', hp: 80, t: 180, size: [0.3, 0.25, 0.35], mat: 'trans', shape: 'box', info: 'Mantém a mira em movimento: sem ele (ou destruído) a pontaria piora muito com o tanque andando.' },
    autoload: { kind: 'module', n: 'Carregador automático', c: '#d98a4a', hp: 120, t: 220, size: [0.9, 0.3, 0.9], mat: 'mild', shape: 'box', info: 'Recarrega o canhão sozinho. Danificado: recarga 50% mais lenta. Destruído: o canhão para de atirar.' },
    fire: { kind: 'module', n: 'Supressão automática de incêndio', c: '#ff7a7a', hp: 60, t: 60, size: [0.3, 0.3, 0.3], mat: 'mild', shape: 'box', info: 'Apaga o fogo sozinho (2 vezes por vida).' },
    aps: { kind: 'module', n: 'Proteção ativa (APS)', c: '#c18cff', hp: 70, t: 100, size: [0.5, 0.2, 0.5], mat: 'elec', shape: 'box', info: 'Intercepta mísseis, foguetes e projéteis HEAT que se aproximam (3 cargas).' },
    lrf: { kind: 'module', n: 'Telêmetro laser', c: '#ff5fa8', hp: 40, t: 40, size: [0.22, 0.16, 0.22], mat: 'elec', shape: 'box', info: 'Mede a distância. Destruído: a compensação de queda do tiro fica imprecisa.' },
    smokel: { kind: 'module', n: 'Lançadores de fumaça', c: '#aab0c0', hp: 30, t: 60, size: [0.5, 0.18, 0.3], mat: 'mild', shape: 'box', info: 'Tecla V lança 3 granadas fumígenas à frente (2 vezes por vida).' },
    ring: { kind: 'module', n: 'Anel da torre', c: '#c0a060', hp: 150, t: 300, size: [1.4, 0.1, 1.4], mat: 'cast', shape: 'box', info: 'Rolamento da torre. Destruído: a torre trava.' },
  });
})(window.SB);
