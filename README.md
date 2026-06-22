# Burger Royale: Clown Apocalypse

> Horde shooter 2D top-down — defenda o império de fast-food contra o apocalipse dos palhaços.

**Frederico Brum · Lucas Bolzan · Lucas Melo** — Desenvolvimento de Jogos 2026

---

## Sobre o jogo

O Rei dos hambúrgueres está sozinho. A rede rival mandou seu exército de palhaços para fechar o Burger Royale de vez. Pegue suas armas, defenda a coroa e mostre quem manda no fast-food.

Campanha de **5 fases** com dificuldade crescente. Limpe a Fase 5 para vencer — ou perca os 3 corações e veja os palhaços tomarem o ponto.

**Engine:** Phaser 3 (3.90) · **Build:** Vite 6 · **Plataforma:** Web (navegador)

---

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173` no navegador.

---

## Controles

| Tecla | Ação |
|---|---|
| WASD / Setas | Movimentação (8 direções) |
| Mouse | Mira |
| Botão esquerdo (segurar) | Atirar / atacar |
| R | Recarregar |
| ESC | Pausar |
| ESPAÇO | Iniciar no menu |

---

## Fases

| Fase | Tema | Destaques |
|---|---|---|
| 1 | Chegada | Apenas palhaços comuns |
| 2 | A Horda | Acrobatas rápidos aparecem |
| 3 | O Chefe | Palhaço-chefe + tanques |
| 4 | Caos | Todos os tipos, spawn acelerado |
| 5 | Apocalipse | Pressão máxima — vitória ao limpar |

Inimigos ganham mais vida e velocidade a cada fase. O progresso (fases liberadas e recorde) é salvo no navegador.

---

## Inimigos

| Tipo | Velocidade | Vida | Pontos | Notas |
|---|---|---|---|---|
| Comum | Normal | Baixa | 100 | Padrão da horda |
| Acrobata | Alta (×1,75) | Baixa | 180 | Surge na Fase 2 |
| Tanque | Baixa (×0,62) | Alta (×2,2) | 250 | 38% chance de soltar cura |
| Chefe | Baixa (×0,42) | Muito alta (×9) | 1400 | Investida, lacaios, modo Fúria |

---

## Arsenal (9 armas em tiers)

| Arma | Tier | Dano | Munição | Tipo |
|---|---|---|---|---|
| Faca | 0 | 55 | ∞ | Corpo a corpo |
| Pistola | 0 | 26 | 12 | 1 tiro |
| Revólver | 1 | 62 | 6 | 1 tiro |
| Escopeta | 2 | 24×6 | 7 | 6 balins |
| Burst | 3 | 30×3 | 24 | Rajada de 3 |
| Metralhadora | 4 | 16 | 40 | Automática |
| Sniper | 5 | 210 | 5 | 1 tiro longo |
| Escopeta Dupla | 6 | 26×8 | 8 | 8 balins |
| Laser | 7 | 72 | 18 | Hitscan |

A arma evolui pela tela de melhoria entre fases — sempre para um tier superior.

---

## Melhorias entre fases

Ao limpar cada fase, escolha uma de até 3 cartas:

| Carta | Efeito | Custo |
|---|---|---|
| Curar | +1 coração | 300 pts |
| Adrenalina | +25 velocidade (máx +120) | 350 pts |
| Dano+ | +20% dano (empilha até 3×) | 600 pts |
| Recarga+ | −25% recarga (máx 0,30×) | 420 pts |
| Arma superior | Próxima arma da escada | 420–1200 pts |

---

## Estrutura do projeto

```
├── index.html
├── vite.config.js
├── public/
│   └── assets/
│       ├── sprites/        ← SVGs do rei, palhaços e background
│       ├── audio/          ← efeitos sonoros e música
│       └── icons/          ← ícones das armas
└── src/
    ├── main.js             ← entry point / config Phaser
    ├── constants.js        ← todas as configurações e balanceamento
    ├── scenes/
    │   ├── MenuScene.js
    │   ├── LevelSelectScene.js
    │   ├── GameScene.js    ← loop principal
    │   ├── UpgradeScene.js ← tela de melhoria entre fases
    │   └── PauseScene.js
    ├── entities/
    │   ├── Player.js       ← rei (movimento, tiro, vida)
    │   └── Enemy.js        ← palhaços (IA, HP, animações)
    ├── systems/
    │   ├── EnemyManager.js ← rounds, spawn, colisões
    │   ├── MapBuilder.js
    │   └── MysteryBox.js
    └── ui/
        ├── HUD.js
        └── GameOverScreen.js
```

---

## Referências

- **Call of Duty: Zombies** — hordas e estética de horror cômico
- **Vampire Survivors** — progressão por ondas
- **Enter the Gungeon** — variedade de armas top-down
- **Brotato** — escolha de melhoria entre ondas

---

## GDD

O documento de game design completo está em [`Burger_Royale-GDD.pdf`](./Burger_Royale-GDD.pdf).
