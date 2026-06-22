# Burger Royale: Clown Apocalypse

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000 no navegador.

## Controles

- **WASD / Setas**: mover
- **ESPAÇO**: atirar
- **R**: recarregar

## Estrutura

```
meu-jogo/
├── index.html
├── package.json
├── vite.config.js
├── public/assets/sprites/  ← imagens (king, clown, background)
└── src/
    ├── main.js              ← entry point
    ├── constants.js         ← configurações
    ├── scenes/GameScene.js  ← cena principal (preload + create + update)
    ├── entities/
    │   ├── Player.js        ← Rei (movimento, tiro, vida)
    │   └── Enemy.js         ← Palhaço (IA, HP, animações)
    ├── systems/
    │   └── EnemyManager.js  ← rounds, spawn, colisões
    └── ui/
        └── HUD.js           ← interface (vida, ammo, score, round)
```

## Features (Semanas 1 e 2)

**Semana 1 — Base:**
- Mapa fixo com background do castelo
- Movimentação 2D (WASD + setas, 8 direções)
- Sistema de ataque (tiro com cooldown e munição)
- Spawn de inimigos das bordas
- Sistema de vida do jogador

**Semana 2 — Combate e Progressão:**
- Dificuldade progressiva (HP e velocidade aumentam por round)
- Pontos por kill (+100, com texto flutuante animado)
- Pontuação em tempo real no HUD
- Contador de rounds
- Barra de vida + 10 ícones de munição visuais
- Game Over com pontuação final e botão de restart
