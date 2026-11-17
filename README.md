# Batalha de Tanques 3D

Jogo de batalha de tanques no navegador (Three.js + React, sem build), no estilo War Thunder.

- 200 veículos terrestres (100 tanques, 40 IFV/APC/leves, 19 autopropulsados e caças-tanques, 41 antiaéreos de canhão e de míssil) , 125 helicópteros e 125 aviões (caças, bombardeiros e furtivos), com garagem para criar os seus
- As 61 munições do PDF "Munições de Tanque" (AP … APFSDS, HE, HEAT, ATGM guiados, foguetes, antipessoal, especiais, treino) + os 200 armamentos aéreos do PDF "armamentos_war_thunder" (60 bombas, 33 foguetes/casulos, 28 mísseis ar-ar, 40 ar-solo/anti-navio, 12 torpedos, 27 canhões/metralhadoras) para helicópteros e aviões
- Mísseis guiados (segue a mira, trava no alvo, ataque por cima, sobrevoo/EFP, infravermelho) e foguetes que voam retos
- Editor 3D de veículo (tanque ou helicóptero), de munição (desenho do projétil/míssil/foguete) e de materiais
- Penetração, ricochete, estilhaços, incêndio e detonação de munição simulados de verdade
- Raio-X do próprio tanque (tecla X) e repetição em raio-X de cada acerto
- Modos: abates por equipe ou captura de zona (3 zonas, 1 ponto/s por zona); base e zonas capturadas reabastecem munição e consertam o veículo (tecla G repara no lugar)
- Sistemas do veículo com efeito real: estabilizador, carregador automático, anel da torre, telêmetro laser, supressão de incêndio, lançadores de fumaça (V), proteção ativa APS, painéis de alívio e paiol úmido
- Munições separadas por uso (tanques/veículos × helicópteros) e visual próprio para cada tipo (traçantes, rastros, mísseis, foguetes, impactos)
- Solo contra bots ou online (P2P via PeerJS, sala por código)

## Como jogar
Abra `index.html` por um servidor estático (`python -m http.server`) ou pelo GitHub Pages.
W/S acelera, A/D vira (helicóptero: Espaço sobe, Shift desce), mouse mira, clique atira, botão direito mira telescópica, 1-8 munição (aviões: o avião segue a mira do mouse, W/S velocidade; bombas caem do pilone), X raio-X, F extintor, Tab placar.

## Radar (aviões)
Z muda o modo do radar (RWS, TWS, ACM, SOLO), T marca o próximo alvo, Y trava/destrava (STT). Filtro Doppler, radar de pulso sem look-down, alerta de radar (RWR), mísseis SARH/ARH exigem alvo no radar e ARM caçam emissores. Aviões furtivos (F-22, F-35, Su-57, J-20, F-117, B-2) não aparecem no radar; só mísseis IR e a vista os pegam.

## Antiaéreas, flares e propelente
Veículos antiaéreos (SAM e canhão) têm radar de busca 360° (Z liga/desliga, T marca, Y trava); SAMs de radar (Buk, Tor, Roland, Hawk…) exigem alvo no radar, SAMs IR (Stinger, Igla…) não. Aeronaves têm flares (B): mísseis IR podem ser enganados por eles; todo míssil guiado pode perder o alvo (fora do campo do buscador, manobra a 90° contra radar, solo, distância). Foguetes e mísseis têm tempo de propelente: ao acabar, somem a chama e a fumaça e eles só planam/caem.

## Mapa grande e aeroportos
Os 3 mapas agora têm 3600 m: a área principal (1400 m) fica no centro, onde é a batalha de tanques, e cada equipe tem um aeroporto (pista, hangares e torre) nas pontas, a ~1500 m da área principal. Os aviões decolam da pista do aeroporto e são reabastecidos/reparados voando baixo sobre ele; tanques e helicópteros usam a base da área principal. Helicópteros e aviões têm flares (B).

## Lock dos ATGM de veículos terrestres (v41)
Todo ATGM de veículo (inclusive os disparados pelo canhão) exige escolher um tipo de lock na munição do lobby; em batalha a tecla **L** troca o lock do míssil selecionado.
- **Fio (SACLOS):** segue a sua mira; rompe a 4000 m ou se o atirador morrer.
- **Laser:** segue o ponto do designador (sua mira); precisa de visada limpa (terreno/fumaça bloqueiam por mais de 1,2 s = míssil perdido) e telêmetro inteiro; alcance 5500 m.
- **TV:** mire no alvo ~0,9 s para tirar a "foto"; dispara-e-esquece, o míssil compara com a própria visão e perde o alvo se a visada for bloqueada por mais de 3 s.
- **IR:** trava na assinatura de calor (em movimento 1,0 · parado 0,7 · imobilizado 0,3 · fogo +0,7; alcance de detecção = calor × 3000 m); fumaça bloqueia, flares enganam helicópteros.
- **GPS:** vai à coordenada mirada no disparo (±1–3,5 m) em mergulho por cima; não acompanha alvo que se mexe.

## Bots: veículos e dificuldade
No lobby: dificuldade por equipe (Recruta, Normal, Veterano, Elite: pontaria, antecipação, reação, recarga e alcance de visão) e lista "Veículos dos bots" para marcar/desmarcar cada tanque, avião e helicóptero (filtro por categoria).
