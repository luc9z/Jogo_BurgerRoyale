// ═══════════════════════════════════════════════════════════
//  Texto padronizado
//  "Press Start 2P" é uma fonte bitmap de grade 8px. Sob pixelArt
//  (NEAREST) + escala FIT, tamanhos fora do múltiplo de 8 e contornos
//  grossos viram borrão/blocos pretos. Aqui centralizamos:
//   • tamanhos SEMPRE múltiplos de 8
//   • contorno fino e proporcional
//   • resolution alto = render nítido mesmo com upscaling
// ═══════════════════════════════════════════════════════════

const FAMILY = '"Press Start 2P", monospace';

// Renderiza o texto em resolução maior antes do NEAREST → nítido.
export const TEXT_RES = Math.min(4, Math.max(2, Math.ceil(window.devicePixelRatio || 1) + 1));

// Tamanhos padrão (px) — múltiplos de 8
export const FONT = {
  BODY:  8,   // textos normais / labels
  VALUE: 16,  // números de destaque (pontos, round)
  SUB:   16,  // subtítulos
  TITLE: 24,  // títulos de tela
  HERO:  32,  // título principal / GAME OVER
};

// Contorno recomendado por tamanho (fino p/ legibilidade pixel)
function defaultStroke(px) {
  if (px <= 8)  return 2;
  if (px <= 16) return 3;
  if (px <= 24) return 4;
  return 5;
}

/**
 * Estilo de texto padronizado.
 * @param {number} px        tamanho em px (use FONT.*)
 * @param {string} color     cor do texto
 * @param {number} [stroke]  espessura do contorno (auto se omitido)
 */
export function txt(px, color = '#ffffff', stroke) {
  return {
    fontFamily: FAMILY,
    fontSize: `${px}px`,
    color,
    stroke: '#000000',
    strokeThickness: stroke ?? defaultStroke(px),
    resolution: TEXT_RES,
  };
}
