# Burger Royale: Clown Apocalypse

> Horde shooter 2D top-down — defenda o império de fast-food contra o apocalipse dos palhaços.

**Frederico Brum · Lucas Bolzan · Lucas Melo** — Desenvolvimento de Jogos 2026

🎮 **Jogue agora:** [luc9z.github.io/Jogo_BurgerRoyale](https://luc9z.github.io/Jogo_BurgerRoyale/)

---

## Sobre o jogo

O Rei dos hambúrgueres está sozinho. A rede rival mandou seu exército de palhaços para roubar a **Receita Sagrada** e fechar o Burger Royale de vez. Pegue suas armas, defenda a coroa e mostre quem manda no fast-food.

Campanha de **5 fases** com dificuldade crescente, abertura narrada, loja de melhorias entre ondas, caixa misteriosa estilo CS:GO e um **modo infinito** ao concluir a campanha.

**Engine:** Phaser 3 (3.90) · **Build:** Vite 6 · **Plataforma:** Web (navegador) · **Controle:** teclado + mouse **ou** gamepad

---

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera /dist para deploy
```

O deploy é automático para o GitHub Pages a cada push na `main` (GitHub Actions).

---

## Controles

### Teclado + Mouse
| Tecla | Ação |
|---|---|
| WASD / Setas | Movimentação (8 direções) |
| Mouse | Mira |
| Clique esquerdo (segurar) | Atirar |
| **ESPAÇO** | **Esquiva / dash** |
| R | Recarregar |
| ESC | Pausar (e ajustar volume) |

### Controle (gamepad)
| Botão | Ação |
|---|---|
| Analógico esquerdo / D-pad | Mover |
| Analógico direito | Mirar (com leve auto-mira) |
| RT / A | Atirar |
| B (○) | Esquiva / dash |
| X / LB | Recarregar |
| Start | Pausar |
| **A** | **Confirmar** |
| **B** | **Voltar** |

---

## Mecânicas

- **Esquiva (dash)** — impulso rápido com i-frames (atravessa inimigos sem dano), rastro e som. **2 cargas**, e cada **2 abates recarregam 1 carga**.
- **Combo** — cada **tiro acertado** sobe o combo (janela de 2,5s). O multiplicador cresce até **3×** e aumenta os pontos ganhos.
- **Tempo por rodada** — limite de 60s + 8s por fase. Cronômetro no HUD; zerou antes de limpar a wave → game over.
- **Vida extra** — melhorias podem aumentar o máximo de corações (até 8).
- **Modo infinito** — após vencer a Fase 5, escolha **CONTINUAR ∞** e enfrente ondas sem fim com dificuldade escalando.
- **Caixa misteriosa** — aposte **todo o saldo** numa roleta estilo CS:GO que sorteia **uma arma aleatória** (com raridades e zoom na revelação).

---

## Fases

| Fase | Tema | Destaques |
|---|---|---|
| 1 | Chegada | Apenas palhaços comuns |
| 2 | A Horda | Acrobatas rápidos aparecem |
| 3 | O Chefe | Chefe + atiradores à distância |
| 4 | Caos | Tanques roxos, spawn acelerado |
| 5 | Apocalipse | Pressão máxima — vitória ao limpar |
| ∞ | Infinito | Ondas sem fim após a campanha |

Inimigos ganham mais vida e velocidade a cada fase. Progresso (fases liberadas, recorde) é salvo no navegador.

---

## Inimigos

| Tipo | Velocidade | Vida | Notas |
|---|---|---|---|
| Comum | Normal | Baixa | Padrão da horda |
| Acrobata | Alta (×1,75) | Baixa | Surge na Fase 2 |
| Atirador (verde) | Média | Média | **Dispara projéteis à distância** e mantém distância (Fase 3+) |
| Tanque (roxo) | Baixa | Muito alta (×4,2) | Lento e resistente (Fase 4+) |
| Chefe | Baixa | Altíssima (×9) | Investida, lacaios, modo Fúria |

---

## Arsenal (8 armas em tiers)

| Arma | Tier | Dano | Munição | Tipo |
|---|---|---|---|---|
| Pistola | 0 | 26 | 12 | 1 tiro |
| Revólver | 1 | 62 | 6 | 1 tiro preciso |
| Escopeta | 2 | 24×6 | 7 | 6 balins |
| Burst | 3 | 30×3 | 24 | Rajada de 3 |
| Metralhadora | 4 | 16 | 40 | Automática |
| Sniper | 5 | 210 | 5 | 1 tiro longo |
| Escopeta Dupla | 6 | 26×8 | 8 | 8 balins |
| Laser | 7 | 72 | 18 | Hitscan |

Cada arma aparece como asset na mão do rei e tem som de tiro próprio (pitch variado).

---

## Loja de melhorias (entre fases)

Ao limpar cada fase, escolha **1 de 3 cartas**. Os preços **sobem com a fase** (+12% por round) e melhorias mais fortes liberam conforme avança:

| Carta | Efeito | Custo base |
|---|---|---|
| Curar | +1 coração | 800 pts |
| Adrenalina | +25 velocidade (empilha) | 1.100 pts |
| Recarga+ | −20% recarga (empilha) | 1.400 pts |
| Dano+ | +25% dano (empilha) | 1.900 pts |
| Vida Extra | +1 coração máximo | 2.800 pts |
| Arma superior | Próxima arma da escada | 1.200–5.800 pts |
| 🎁 **Caixa Misteriosa** | Arma **aleatória** — custa **todo o saldo** | todo o saldo |

---

## Áudio

- Música de fundo nas fases + fanfarra de vitória
- Efeitos sintetizados (WebAudio): tiros por arma, dash, passos, clarinada de início de round, batida cardíaca em HP crítico, blips de UI
- **Controle de volume** (slider clicável) no menu e no pause, com mudo — salvo no navegador

---

## Estrutura do projeto

```
├── index.html
├── vite.config.js
├── .github/workflows/deploy.yml   ← deploy automático (GitHub Pages)
├── public/assets/
│   ├── sprites/     ← SVGs do rei, palhaços e background
│   ├── weapons/     ← SVGs das armas (na mão do rei)
│   ├── audio/       ← efeitos e música
│   └── icons/       ← ícones das armas (loja/caixa)
└── src/
    ├── main.js              ← entry point / config Phaser
    ├── constants.js         ← configurações e balanceamento
    ├── scenes/
    │   ├── MenuScene.js
    │   ├── StoryScene.js    ← abertura narrada (lore)
    │   ├── LevelSelectScene.js
    │   ├── GameScene.js     ← loop principal
    │   ├── UpgradeScene.js  ← loja + caixa misteriosa
    │   └── PauseScene.js
    ├── entities/
    │   ├── Player.js        ← rei (movimento, tiro, dash, vida)
    │   └── Enemy.js         ← palhaços (IA, tipos, atirador, chefe)
    ├── systems/
    │   ├── EnemyManager.js  ← rounds, spawn, colisões
    │   ├── Sfx.js           ← efeitos sonoros sintetizados
    │   └── progress.js      ← save de fases/recorde/snapshots
    └── ui/
        ├── HUD.js           ← vida, munição, arma, dash, combo, timer
        ├── volumeSlider.js  ← controle de volume reutilizável
        └── text.js          ← fontes padronizadas
```

---

## Referências

- **Call of Duty: Zombies** — hordas e estética de horror cômico
- **Vampire Survivors / Brotato** — progressão e melhorias por ondas
- **Enter the Gungeon** — variedade de armas top-down
- **CS:GO** — abertura de caixa com raridades

---

## GDD

O documento de game design completo está em [`Burger_Royale-GDD.pdf`](./Burger_Royale-GDD.pdf).
