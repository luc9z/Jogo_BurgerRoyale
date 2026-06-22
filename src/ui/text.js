const FAMILY = '"Press Start 2P", monospace';

// Renderiza o texto em resolução maior antes do NEAREST → nítido.
export const TEXT_RES = Math.min(4, Math.max(2, Math.ceil(window.devicePixelRatio || 1) + 1));

// Hierarquia de tamanhos — grade de 8px
// BODY=8  VALUE=16  TITLE=24  HERO=32
export const FONT = {
  BODY:  8,
  VALUE: 16,
  SUB:   16,
  TITLE: 24,
  HERO:  32,
};

export function txt(px, color = '#ffffff') {
  return {
    fontFamily: FAMILY,
    fontSize: `${px}px`,
    color,
    resolution: TEXT_RES,
  };
}
