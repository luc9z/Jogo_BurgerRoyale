import Phaser from 'phaser';
import { txt, FONT } from './text.js';
import { uiBlip } from '../systems/Sfx.js';

// Slider de volume HORIZONTAL e clicável (clica/arrasta em qualquer ponto).
// Persiste em localStorage e aplica em scene.sound. onChange é opcional
// (ex.: atualizar a trilha de fundo ao vivo).
export function makeVolumeSlider(scene, x, y, w, opts = {}) {
  const depth   = opts.depth ?? 6;
  const onChange = opts.onChange;
  const trackH  = 8;
  const x0 = x, x1 = x + w;

  const label = scene.add.text(x - 10, y, 'SOM', txt(FONT.BODY, '#88ffcc'))
    .setOrigin(1, 0.5).setDepth(depth);

  const pctTxt = scene.add.text(x1 + 14, y, '', txt(FONT.BODY, '#ffffff'))
    .setOrigin(0, 0.5).setDepth(depth);

  // Ícone de alto-falante (alterna mudo ao clicar)
  const spk = scene.add.text(x - 56, y, '♪', txt(FONT.VALUE, '#88ffcc'))
    .setOrigin(0.5).setDepth(depth).setInteractive({ useHandCursor: true });

  const g = scene.add.graphics().setDepth(depth);

  const draw = () => {
    const vol = scene.sound.mute ? 0 : scene.sound.volume;
    g.clear();
    // trilho
    g.fillStyle(0x2a1a1e, 1);
    g.fillRoundedRect(x0, y - trackH / 2, w, trackH, trackH / 2);
    // preenchimento
    const fillW = Math.max(0, Math.min(w, w * vol));
    g.fillStyle(scene.sound.mute ? 0x884444 : 0x44ddaa, 1);
    g.fillRoundedRect(x0, y - trackH / 2, fillW, trackH, trackH / 2);
    // knob
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x0 + fillW, y, 8);
    g.lineStyle(2, scene.sound.mute ? 0x884444 : 0x1d9e75, 1);
    g.strokeCircle(x0 + fillW, y, 8);

    pctTxt.setText(scene.sound.mute ? 'MUDO' : `${Math.round(vol * 100)}%`);
    pctTxt.setColor(scene.sound.mute ? '#ff6666' : '#ffffff');
    spk.setColor(scene.sound.mute ? '#ff6666' : '#88ffcc');
  };

  const apply = (vol, persist = true) => {
    vol = Phaser.Math.Clamp(vol, 0, 1);
    scene.sound.mute   = false;
    scene.sound.volume = vol;
    if (persist) {
      localStorage.setItem('br_volume', String(Math.round(vol * 100)));
      localStorage.setItem('br_muted', '0');
    }
    draw();
    onChange?.();
  };

  const fromPointer = (px) => apply((px - x0) / w);

  // Zona de clique/arrasto (mais alta que o trilho, fácil de acertar)
  const zone = scene.add.zone(x0 + w / 2, y, w + 16, 30)
    .setOrigin(0.5).setDepth(depth).setInteractive({ useHandCursor: true, draggable: true });
  zone.on('pointerdown', (p) => { fromPointer(p.x); uiBlip(scene); });
  zone.on('drag', (p) => fromPointer(p.x));

  spk.on('pointerdown', () => {
    scene.sound.mute = !scene.sound.mute;
    localStorage.setItem('br_muted', scene.sound.mute ? '1' : '0');
    if (!scene.sound.mute) uiBlip(scene, true);
    draw();
    onChange?.();
  });

  draw();
  return { draw, destroy: () => { g.destroy(); label.destroy(); pctTxt.destroy(); spk.destroy(); zone.destroy(); } };
}

// Lê e aplica o volume/mudo salvos (chamar no boot, ex.: MenuScene)
export function applySavedAudio(scene) {
  const v = parseInt(localStorage.getItem('br_volume') ?? '70', 10);
  const m = localStorage.getItem('br_muted') === '1';
  scene.sound.volume = Phaser.Math.Clamp(v, 0, 100) / 100;
  scene.sound.mute   = m;
}
