// ═══════════════════════════════════════════════════════════
//  GameOverScreen
// ═══════════════════════════════════════════════════════════
import { GAME, COLOR, DEPTH } from '../constants.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

export default class GameOverScreen {
  constructor(scene) { this.scene = scene; }

  show(score, round) {
    const s = this.scene;
    const D = DEPTH.OVERLAY;
    const ps = (sz, col) => ({
      fontFamily:'"Press Start 2P", monospace',
      fontSize: sz, color: col,
      stroke:'#000000', strokeThickness:6,
    });

    const overlay = s.add.rectangle(W/2, H/2, W, H, 0x000000, 0).setDepth(D);
    s.tweens.add({ targets: overlay, fillAlpha: 0.82, duration: 650 });

    s.time.delayedCall(450, () => {
      s.add.text(W/2, H/2-98, 'GAME OVER', ps('40px','#ff2200'))
        .setOrigin(0.5).setDepth(D+1);

      s.add.text(W/2, H/2-44, 'Os palhaços venceram...', {
        fontFamily:'"Press Start 2P", monospace', fontSize:'10px', color:'#ffaa00',
        stroke:'#000', strokeThickness:3,
      }).setOrigin(0.5).setDepth(D+1);

      s.add.text(W/2, H/2-4,
        `Pontuação: ${score.toLocaleString('pt-BR')}`, ps('11px','#ffd740'))
        .setOrigin(0.5).setDepth(D+1);

      s.add.text(W/2, H/2+30,
        `Rounds: ${round}`, ps('9px','#ff8800'))
        .setOrigin(0.5).setDepth(D+1);

      // Botão
      const btn = s.add.rectangle(W/2, H/2+86, 250, 40, COLOR.WALL)
        .setDepth(D+1).setStrokeStyle(2, COLOR.WALL_GLOW)
        .setInteractive({ useHandCursor: true });

      s.add.text(W/2, H/2+86, 'JOGAR NOVAMENTE', {
        fontFamily:'"Press Start 2P", monospace', fontSize:'9px', color:'#ffffff',
        stroke:'#000', strokeThickness:3,
      }).setOrigin(0.5).setDepth(D+2);

      btn.on('pointerover',  () => btn.setFillStyle(0xcc2200));
      btn.on('pointerout',   () => btn.setFillStyle(COLOR.WALL));
      btn.on('pointerdown',  () => s.scene.restart());

      s.add.text(W/2, H-14, 'ou pressione F5 para recomeçar', {
        fontFamily:'"Press Start 2P", monospace', fontSize:'6px', color:'#ffffff33',
      }).setOrigin(0.5).setDepth(D+1);
    });
  }
}
