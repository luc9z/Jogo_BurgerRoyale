# -*- coding: utf-8 -*-
"""Gera o PDF do GDD do Burger Royale a partir de conteudo estruturado."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

GOLD = colors.HexColor("#C8941A")
DARKRED = colors.HexColor("#7A1410")
INK = colors.HexColor("#2A2118")
LIGHT = colors.HexColor("#F3E9D6")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], textColor=DARKRED, fontSize=15,
                    spaceBefore=14, spaceAfter=6)
BODY = ParagraphStyle("Body", parent=styles["Normal"], textColor=INK, fontSize=10,
                      leading=15, spaceAfter=4)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=9, textColor=colors.HexColor("#5a5040"))
TITLE = ParagraphStyle("Title", parent=styles["Title"], textColor=GOLD, fontSize=30, leading=34)
SUB = ParagraphStyle("Sub", parent=styles["Normal"], alignment=TA_CENTER, fontSize=12,
                     textColor=DARKRED, spaceAfter=2)
META = ParagraphStyle("Meta", parent=styles["Normal"], alignment=TA_CENTER, fontSize=10,
                      textColor=INK)

story = []

def h(t): story.append(Paragraph(t, H1))
def p(t): story.append(Paragraph(t, BODY))
def sp(x=6): story.append(Spacer(1, x))
def rule(): story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=4, spaceAfter=8))

def table(data, col_w):
    t = Table(data, colWidths=col_w, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DARKRED),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("TEXTCOLOR", (0,1), (-1,-1), INK),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT]),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#D8C7A0")),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    sp(8)

# ── Capa ──
sp(40)
story.append(Paragraph("BURGER ROYALE", TITLE))
story.append(Paragraph("Clown Apocalypse", SUB))
sp(6)
story.append(HRFlowable(width="50%", thickness=2, color=GOLD, hAlign="CENTER"))
sp(10)
story.append(Paragraph("Game Design Document - versao 2.0", META))
story.append(Paragraph("Frederico Brum &nbsp;&middot;&nbsp; Lucas Bolzan &nbsp;&middot;&nbsp; Lucas Melo", META))
story.append(Paragraph("Desenvolvimento de Jogos - 2026", META))
sp(18)

# ── 1 ──
h("1. Visao geral")
p("Burger Royale: Clown Apocalypse e um <b>horde shooter 2D top-down</b> para navegador. "
  "O jogador controla o <b>Rei dos hamburgueres</b>, ultimo defensor de Burgerlandia contra "
  "um exercito de palhacos que quer roubar a Receita Sagrada. O objetivo e sobreviver a ondas "
  "de inimigos, evoluir o arsenal e limpar a campanha - depois, sobreviver o maximo possivel no modo infinito.")
table([
    ["Genero", "Acao / horde survival / twin-stick shooter"],
    ["Plataforma", "Web (Phaser 3 + Vite)"],
    ["Sessao tipica", "5 a 15 min por run"],
    ["Publico", "Casual / arcade"],
], [40*mm, 120*mm])

# ── 2 ──
h("2. Pilares de design")
p("1. <b>Acao rapida e satisfatoria</b> - tiro responsivo, dash com i-frames, combo e feedback "
  "(particulas, screen shake, numeros de dano).")
p("2. <b>Progressao por ondas</b> - loja entre fases, evolucao de armas, melhorias que empilham.")
p("3. <b>Risco e recompensa</b> - caixa misteriosa que aposta todo o saldo; tempo limite por rodada.")
p("4. <b>Acessivel</b> - joga com teclado+mouse ou controle, com auto-mira leve no gamepad.")

# ── 3 ──
h("3. Loop de jogo")
p("Menu -> Abertura (historia) -> Fase -> sobreviva a wave (dentro do tempo) -> loja de melhorias "
  "(1 carta de 3, ou caixa misteriosa) -> proxima fase. Limpar a Fase 5 = vitoria, com opcao de "
  "CONTINUAR no modo infinito. Morte ou tempo esgotado = game over (com estatisticas).")

# ── 4 ──
h("4. Jogador (o Rei)")
p("<b>Vida:</b> 3 coracoes (expansivel ate 8 com Vida Extra); i-frames apos dano.<br/>"
  "<b>Movimento:</b> 8 direcoes.<br/>"
  "<b>Dash:</b> impulso com i-frames, 2 cargas, recarrega 1 a cada 2 abates.<br/>"
  "<b>Mira:</b> mouse ou analogico direito (auto-mira leve no controle).<br/>"
  "<b>Arma:</b> inicia com pistola; evolui em tiers ate o laser. Asset visivel na mao, som por arma.")

# ── 5 ──
h("5. Inimigos")
table([
    ["Tipo", "Comportamento", "Surge"],
    ["Comum", "Persegue o jogador", "Fase 1"],
    ["Acrobata", "Rapido, fragil", "Fase 2"],
    ["Atirador (verde)", "Mantem distancia e dispara projeteis", "Fase 3"],
    ["Tanque (roxo)", "Lento, muita vida", "Fase 4"],
    ["Chefe", "Investida, invoca lacaios, modo Furia", "Fase 3+"],
], [38*mm, 92*mm, 30*mm])
p("Vida e velocidade escalam por fase. Inimigos podem soltar cura ao morrer.", )

# ── 6 ──
h("6. Armas (8 tiers)")
table([
    ["Arma", "Tier", "Dano", "Municao", "Tipo"],
    ["Pistola", "0", "26", "12", "1 tiro"],
    ["Revolver", "1", "62", "6", "1 tiro preciso"],
    ["Escopeta", "2", "24x6", "7", "6 balins"],
    ["Burst", "3", "30x3", "24", "Rajada de 3"],
    ["Metralhadora", "4", "16", "40", "Automatica"],
    ["Sniper", "5", "210", "5", "1 tiro longo"],
    ["Escopeta Dupla", "6", "26x8", "8", "8 balins"],
    ["Laser", "7", "72", "18", "Hitscan"],
], [38*mm, 16*mm, 22*mm, 24*mm, 50*mm])

# ── 7 ──
h("7. Economia e melhorias")
p("Pontos por abate (x multiplicador de combo) sao a moeda. A cada fase, escolhe 1 de 3 cartas; "
  "precos sobem +12% por round.")
table([
    ["Carta", "Efeito", "Custo base"],
    ["Curar", "+1 coracao", "800 pts"],
    ["Adrenalina", "+25 velocidade (empilha)", "1.100 pts"],
    ["Recarga+", "-20% recarga (empilha)", "1.400 pts"],
    ["Dano+", "+25% dano (empilha)", "1.900 pts"],
    ["Vida Extra", "+1 coracao maximo", "2.800 pts"],
    ["Arma superior", "Proxima arma da escada", "1.200 a 5.800"],
    ["Caixa Misteriosa", "Arma aleatoria - custa TODO o saldo", "todo o saldo"],
], [40*mm, 90*mm, 30*mm])

# ── 8 ──
h("8. Sistemas de combate / feel")
p("<b>Combo:</b> sobe a cada tiro acertado (janela 2,5s), multiplica pontos ate 3x.<br/>"
  "<b>Tempo por rodada:</b> 60s + 8s/fase; cronometro no HUD.<br/>"
  "<b>Knockback</b> proporcional ao dano (nao empilha).<br/>"
  "<b>Feedback:</b> numeros de dano flutuantes, particulas, screen shake, flash, morte cinematografica.")

# ── 9 ──
h("9. Audio")
p("Musica de fundo + fanfarra de vitoria. Efeitos sintetizados (WebAudio): tiros por arma, dash, "
  "passos, horn de round, batida cardiaca em HP baixo, blips de UI. Controle de volume/mudo salvo no navegador.")

# ── 10 ──
h("10. Interface")
p("<b>HUD:</b> coracoes, municao, arma, cargas de dash, combo, cronometro, pontos, round.<br/>"
  "<b>Telas:</b> Menu, Abertura/Historia, Selecao de fases, Pause (com volume), Loja, Game over "
  "(stats: abates, precisao, melhor combo), Vitoria.<br/>"
  "Navegacao completa por controle (A = confirmar, B = voltar).")

# ── 11 ──
h("11. Tecnologia")
p("<b>Engine:</b> Phaser 3.90 &nbsp; <b>Build:</b> Vite 6 &nbsp; <b>Deploy:</b> GitHub Pages (CI automatico).<br/>"
  "Sprites em SVG (rasterizados em 2x para nitidez). Audio em mp3 + sintese WebAudio. "
  "Save local (localStorage): fases liberadas, recorde, snapshots por fase, volume.")

# ── 12 ──
h("12. Referencias")
p("Call of Duty: Zombies &middot; Vampire Survivors &middot; Brotato &middot; Enter the Gungeon "
  "&middot; CS:GO (abertura de caixa).")

sp(10)
rule()
story.append(Paragraph("Jogue: luc9z.github.io/Jogo_BurgerRoyale", SMALL))

doc = SimpleDocTemplate("Burger_Royale-GDD.pdf", pagesize=A4,
                        topMargin=18*mm, bottomMargin=16*mm,
                        leftMargin=20*mm, rightMargin=20*mm,
                        title="Burger Royale - GDD", author="Frederico Brum, Lucas Bolzan, Lucas Melo")
doc.build(story)
print("PDF gerado: Burger_Royale-GDD.pdf")
