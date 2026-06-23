import Phaser from 'phaser';
import { GAME, COLOR, DEPTH } from '../constants.js';
import { txt, FONT } from '../ui/text.js';
import { makeVolumeSlider } from '../ui/volumeSlider.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

const ps = txt;

export default class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  init(data) {
    this.gameScore = data.score ?? 0;
    this.gameRound = data.round ?? 1;
    this.gameWeapon = data.weapon ?? 'PISTOLA';
  }

  create() {
    // Overlay escuro sobre o jogo pausado
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.78).setDepth(0);

    // Borda decorativa no centro
    const panelW = 340, panelH = 372;
    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(0x0c000f, 0.95);
    panel.fillRoundedRect(W/2 - panelW/2, H/2 - panelH/2, panelW, panelH, 8);
    panel.lineStyle(2, COLOR.GOLD, 0.7);
    panel.strokeRoundedRect(W/2 - panelW/2, H/2 - panelH/2, panelW, panelH, 8);

    // Título PAUSADO
    const title = this.add.text(W/2, H/2 - 120, 'PAUSADO', ps(FONT.TITLE, '#ffd740'))
      .setOrigin(0.5).setDepth(2);

    this.tweens.add({
      targets: title, alpha: 0.7,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Stats da partida atual
    this.add.text(W/2, H/2 - 80, [
      `Pontos: ${this.gameScore.toLocaleString('pt-BR')}`,
      `Round:  ${this.gameRound}   |   Arma: ${this.gameWeapon}`,
    ], {
      ...ps(FONT.BODY, '#ff8800'),
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(2);

    // Linha separadora
    const sg = this.add.graphics().setDepth(2);
    sg.lineStyle(1, COLOR.GOLD, 0.3);
    sg.lineBetween(W/2 - 130, H/2 - 53, W/2 + 130, H/2 - 53);

    // Botões (com navegação por controle)
    this._gpBtns = [];
    this._gpIdx  = 0;
    this._makeBtn(W/2, H/2 - 22,  'CONTINUAR',      0x1fcc3f, '#1fcc3f', () => this._resume());
    this._makeBtn(W/2, H/2 + 34,  'REINICIAR',      0xff8800, '#ff8800', () => this._restart());
    this._makeBtn(W/2, H/2 + 90,  'MENU PRINCIPAL', 0xcc1100, '#cc1100', () => this._toMenu());

    // Controle de volume (slider horizontal clicável). O bgm (mp3) usa o
    // volume master do Phaser, então muda ao vivo sem callback extra.
    makeVolumeSlider(this, W/2 - 30, H/2 + 132, 110, { depth: 2 });

    // Dica
    this.add.text(W/2, H/2 + 166, 'ESC / B — continuar  |  A — selecionar', ps(FONT.BODY, '#ffffff44'))
      .setOrigin(0.5).setDepth(2);

    // Seletor do controle
    this._gpSel = this.add.graphics().setDepth(4);
    this._gpPrev = { up: false, down: false, a: false, b: false, start: false };
    this._gpEnabled = false;
    this.time.delayedCall(250, () => { this._gpEnabled = true; });
    this._drawGpSel();

    // ESC fecha o pause
    this.input.keyboard.once('keydown-ESC', () => this._resume());
  }

  _makeBtn(x, y, label, strokeColor, textColor, onClick) {
    const btn = this.add.rectangle(x, y, 250, 40, 0x110015)
      .setStrokeStyle(2, strokeColor)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    const label2 = this.add.text(x, y, label, ps(FONT.BODY, textColor))
      .setOrigin(0.5).setDepth(3);

    const idx = this._gpBtns.length;
    btn.on('pointerover', () => {
      btn.setFillStyle(0x220028);
      this.tweens.add({ targets: [btn, label2], scaleX: 1.04, scaleY: 1.04, duration: 60 });
      this._gpIdx = idx; this._drawGpSel();
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(0x110015);
      this.tweens.add({ targets: [btn, label2], scaleX: 1, scaleY: 1, duration: 60 });
    });
    btn.on('pointerdown', onClick);

    this._gpBtns.push({ x, y, w: 250, h: 40, col: strokeColor, action: onClick });
  }

  _drawGpSel() {
    if (!this._gpSel || !this._gpBtns?.length) return;
    const b = this._gpBtns[this._gpIdx];
    this._gpSel.clear();
    this._gpSel.lineStyle(3, b.col, 1);
    this._gpSel.strokeRoundedRect(b.x - b.w/2 - 5, b.y - b.h/2 - 5, b.w + 10, b.h + 10, 6);
  }

  update() {
    if (!this._gpEnabled) return;
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) return;
    const ly = pad.leftStick?.y ?? 0;
    const now = {
      up:    !!(pad.buttons[12]?.pressed) || ly < -0.5,
      down:  !!(pad.buttons[13]?.pressed) || ly >  0.5,
      a:     !!(pad.buttons[0]?.pressed),
      b:     !!(pad.buttons[1]?.pressed),
      start: !!(pad.buttons[9]?.pressed),
    };
    const p = this._gpPrev;
    const n = this._gpBtns.length;
    if (now.up    && !p.up)    { this._gpIdx = (this._gpIdx - 1 + n) % n; this._drawGpSel(); }
    if (now.down  && !p.down)  { this._gpIdx = (this._gpIdx + 1) % n;     this._drawGpSel(); }
    if (now.a     && !p.a)     { this._gpBtns[this._gpIdx].action(); }
    if ((now.b && !p.b) || (now.start && !p.start)) { this._resume(); } // B/Start = voltar
    this._gpPrev = now;
  }

  _resume() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  _restart() {
    this.scene.stop();
    this.scene.stop('GameScene');
    // Reinicia na fase atual (carrega o estado de entrada daquela fase)
    this.scene.start('GameScene', { startLevel: this.gameRound });
  }

  _toMenu() {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }
}
