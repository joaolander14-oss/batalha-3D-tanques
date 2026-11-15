# Batalha de Tanques 3D

Jogo de batalha de tanques no navegador (Three.js + React, sem build), no estilo War Thunder.

- 200 veículos terrestres (100 tanques, 40 IFV/APC/leves, 19 autopropulsados e caças-tanques, 41 antiaéreos de canhão e de míssil) e 50 helicópteros, com garagem para criar os seus
- As 61 munições do PDF "Munições de Tanque" (AP … APFSDS, HE, HEAT, ATGM guiados, foguetes, antipessoal, especiais, treino) + munições de helicóptero (canhão, foguetes, Hellfire/Ataka/Spike…, ar-ar)
- Mísseis guiados (segue a mira, trava no alvo, ataque por cima, sobrevoo/EFP, infravermelho) e foguetes que voam retos
- Editor 3D de veículo (tanque ou helicóptero), de munição (desenho do projétil/míssil/foguete) e de materiais
- Penetração, ricochete, estilhaços, incêndio e detonação de munição simulados de verdade
- Raio-X do próprio tanque (tecla X) e repetição em raio-X de cada acerto
- Modos: abates por equipe ou captura de zona (3 zonas, 1 ponto/s por zona); base e zonas capturadas reabastecem munição e consertam o veículo (tecla G repara no lugar)
- Solo contra bots ou online (P2P via PeerJS, sala por código)

## Como jogar
Abra `index.html` por um servidor estático (`python -m http.server`) ou pelo GitHub Pages.
W/S acelera, A/D vira (helicóptero: Espaço sobe, Shift desce), mouse mira, clique atira, botão direito mira telescópica, 1-4 munição, X raio-X, F extintor, Tab placar.
