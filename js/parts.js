/* Sistemas e peças adicionais dos veículos (módulos com efeito de jogo quando existem e quando são danificados) */
(function (SB) {
  'use strict';
  Object.assign(SB.SUBS, {
    stab: { kind: 'module', n: 'Estabilizador do canhão', c: '#7fd1b9', hp: 80, t: 180, size: [0.3, 0.25, 0.35], mat: 'trans', shape: 'box', info: 'Mantém a mira em movimento: com ele o canhão fica apontado na mira (altura e direção) mesmo com o tanque andando, virando ou em rampa. Sem ele (ou destruído) o canhão acompanha o balanço do casco em movimento.' },
    autoload: { kind: 'module', n: 'Carregador automático', c: '#d98a4a', hp: 120, t: 220, size: [0.9, 0.3, 0.9], mat: 'mild', shape: 'box', info: 'Recarrega o canhão sozinho. Danificado: recarga 50% mais lenta. Destruído: o canhão para de atirar.' },
    fire: { kind: 'module', n: 'Supressão automática de incêndio', c: '#ff7a7a', hp: 60, t: 60, size: [0.3, 0.3, 0.3], mat: 'mild', shape: 'box', info: 'Apaga o fogo sozinho (2 vezes por vida).' },
    aps: { kind: 'module', n: 'Proteção ativa (APS)', c: '#c18cff', hp: 70, t: 100, size: [0.5, 0.2, 0.5], mat: 'elec', shape: 'box', info: 'Intercepta mísseis, foguetes e projéteis HEAT que se aproximam (3 cargas).' },
    lrf: { kind: 'module', n: 'Telêmetro laser', c: '#ff5fa8', hp: 40, t: 40, size: [0.22, 0.16, 0.22], mat: 'elec', shape: 'box', info: 'Mede a distância com laser (±3 m, até 4500 m) e a fornece à compensação de queda do tiro; também serve de designador para mísseis a laser. Destruído: cai para o telêmetro óptico/estéreo ou para a alça fixa.' },
    rfo: { kind: 'module', n: 'Telêmetro óptico (coincidência)', c: '#e8a0c8', hp: 35, t: 35, size: [0.8, 0.14, 0.14], mat: 'mild', shape: 'box', info: 'Mede a distância por coincidência de imagens: erro de ~5%, alcance até 2000 m. Com ele a queda do tiro é compensada pela distância medida.' },
    rfs: { kind: 'module', n: 'Telêmetro estereoscópico', c: '#d070b0', hp: 40, t: 40, size: [1.1, 0.14, 0.14], mat: 'mild', shape: 'box', info: 'Base longa estéreo: erro de ~2%, alcance até 3200 m.' },
    ballc: { kind: 'module', n: 'Computador balístico', c: '#8fe0ff', hp: 40, t: 50, size: [0.3, 0.2, 0.3], mat: 'elec', shape: 'box', info: 'Usa a distância do telêmetro e a velocidade do alvo: aplica avanço automático contra alvos em movimento (marcador de avanço no HUD).' },
    smokel: { kind: 'module', n: 'Lançadores de fumaça', c: '#aab0c0', hp: 30, t: 60, size: [0.5, 0.18, 0.3], mat: 'mild', shape: 'box', info: 'Tecla V lança 3 granadas fumígenas à frente (2 vezes por vida).' },
    ring: { kind: 'module', n: 'Anel da torre', c: '#c0a060', hp: 150, t: 300, size: [1.4, 0.1, 1.4], mat: 'cast', shape: 'box', info: 'Rolamento da torre. Destruído: a torre trava.' },
  });
})(window.SB);
