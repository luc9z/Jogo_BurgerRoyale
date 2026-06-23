# Game Design Document — Burger Royale: Clown Apocalypse

**Equipe:** Frederico Brum · Lucas Bolzan · Lucas Melo
**Disciplina:** Desenvolvimento de Jogos — 2026
**Versão:** 2.0 (atualizada)

---

## 1. Visão geral

Burger Royale: Clown Apocalypse é um **horde shooter 2D top-down** para navegador. O jogador controla o **Rei dos hambúrgueres**, último defensor de Burgerlândia contra um exército de palhaços que quer roubar a Receita Sagrada. O objetivo é sobreviver a ondas de inimigos, evoluir o arsenal e limpar a campanha — depois, sobreviver o máximo possível no modo infinito.

- **Gênero:** ação / horde survival / twin-stick shooter
- **Plataforma:** Web (Phaser 3 + Vite)
- **Sessão típica:** 5–15 min por run
- **Público:** casual/arcade

---

## 2. Pilares de design

1. **Ação rápida e satisfatória** — tiro responsivo, dash com i-frames, combo e feedback (partículas, screen shake, números de dano).
2. **Progressão por ondas** — loja entre fases, evolução de armas, melhorias que empilham.
3. **Risco e recompensa** — caixa misteriosa que aposta todo o saldo; tempo limite por rodada.
4. **Acessível** — joga com teclado+mouse ou controle, com auto-mira leve no gamepad.

---

## 3. Loop de jogo

```
Menu → Abertura (história) → Fase
   → sobreviva à wave (dentro do tempo)
   → loja de melhorias (1 carta de 3, ou caixa misteriosa)
   → próxima fase
   ... limpar Fase 5 = vitória → CONTINUAR ∞ (modo infinito) ou fim
   morte / tempo esgotado = game over (com stats)
```

---

## 4. Jogador (o Rei)

- **Vida:** 3 corações (expansível até 8 com "Vida Extra"); i-frames após dano.
- **Movimento:** 8 direções.
- **Dash:** impulso com i-frames, 2 cargas, recarrega 1 a cada 2 abates.
- **Mira:** mouse ou analógico direito (auto-mira leve no controle).
- **Arma:** inicia com pistola; evolui em tiers até o laser. Asset visível na mão, com som por arma.

---

## 5. Inimigos

| Tipo | Comportamento | Surge |
|---|---|---|
| Comum | Persegue o jogador | Fase 1 |
| Acrobata | Rápido, frágil | Fase 2 |
| Atirador (verde) | Mantém distância e dispara projéteis | Fase 3 |
| Tanque (roxo) | Lento, muita vida | Fase 4 |
| Chefe | Investida, invoca lacaios, modo Fúria | Fase 3+ |

Vida e velocidade escalam por fase. Inimigos podem soltar cura ao morrer.

---

## 6. Armas (8 tiers)

Pistola → Revólver → Escopeta → Burst → Metralhadora → Sniper → Escopeta Dupla → Laser.
Diferenciadas por dano, cadência, munição, dispersão e tipo (projétil / hitscan).

---

## 7. Economia e melhorias

- Pontos por abate (× multiplicador de combo) são a moeda.
- A cada fase, escolhe **1 de 3 cartas**; preços sobem +12% por round.
- Cartas: Curar, Adrenalina (velocidade), Recarga+, Dano+, Vida Extra, Arma superior.
- **Caixa misteriosa:** custa todo o saldo, sorteia uma arma **aleatória** (animação de roleta com raridades e zoom na revelação).

---

## 8. Sistemas de combate / feel

- **Combo:** sobe a cada tiro acertado (janela 2,5s), multiplica pontos até 3×.
- **Tempo por rodada:** 60s + 8s/fase; cronômetro no HUD.
- **Knockback** proporcional ao dano (não empilha).
- **Feedback:** números de dano flutuantes, partículas, screen shake, flash, morte cinematográfica.

---

## 9. Áudio

- Música de fundo + fanfarra de vitória.
- Efeitos sintetizados (WebAudio): tiros por arma, dash, passos, horn de round, batida cardíaca em HP baixo, blips de UI.
- Controle de volume/mudo salvo no navegador.

---

## 10. Interface

- HUD: corações, munição, arma, cargas de dash, combo, cronômetro, pontos, round.
- Telas: Menu, Abertura/História, Seleção de fases, Pause (com volume), Loja, Game over (com stats: abates, precisão, melhor combo), Vitória.
- Navegação completa por controle (A = confirmar, B = voltar).

---

## 11. Tecnologia

- **Engine:** Phaser 3.90 · **Build:** Vite 6 · **Deploy:** GitHub Pages (CI automático).
- Sprites em SVG (rasterizados em 2× para nitidez). Áudio em mp3 + síntese WebAudio.
- Save local (localStorage): fases liberadas, recorde, snapshots de entrada por fase, volume.

---

## 12. Referências

Call of Duty: Zombies · Vampire Survivors · Brotato · Enter the Gungeon · CS:GO (abertura de caixa).
