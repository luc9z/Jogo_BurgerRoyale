import * as Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');

    this.player = null;
    this.cursors = null;
    this.keys = null;

    this.enemies = null;
    this.bullets = null;

    this.playerHealth = 100;
    this.maxHealth = 100;

    this.lastDirection = new Phaser.Math.Vector2(1, 0);
    this.canShoot = true;

    this.isGameOver = false;
  }

  create() {
    const { width, height } = this.scale;

    // Fundo (mapa fixo)
    this.cameras.main.setBackgroundColor('#1f1f1f');
    this.add.rectangle(width / 2, height / 2, width - 40, height - 40, 0x2d2d2d)
      .setStrokeStyle(4, 0x8b5a2b);

    // Player
    this.player = this.physics.add.sprite(width / 2, height / 2, null);
    this.player.setDisplaySize(40, 40);
    this.player.setCollideWorldBounds(true);

    // Grupos
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();

    // Spawn inicial
    this.spawnEnemies(5);

    // Controles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // UI Vida
    this.healthBar = this.add.rectangle(20, 20, 200, 20, 0x00ff00).setOrigin(0, 0);

    this.healthText = this.add.text(20, 45, 'Vida: 100', {
      color: '#fff',
      fontSize: '16px'
    });

    // Colisões
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);
  }

  update() {
    if (this.isGameOver) return;

    this.movePlayer();
    this.handleShooting();
    this.moveEnemies();
    this.updateUI();
    this.cleanupBullets();
  }

  movePlayer() {
    const speed = 200;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    if (this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    this.player.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.lastDirection = new Phaser.Math.Vector2(vx, vy).normalize();
    }
  }

  handleShooting() {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || !this.canShoot) return;

    const bullet = this.bullets.create(this.player.x, this.player.y, null);
    bullet.setDisplaySize(10, 10);

    const speed = 400;
    bullet.setVelocity(
      this.lastDirection.x * speed,
      this.lastDirection.y * speed
    );

    this.canShoot = false;

    this.time.delayedCall(300, () => {
      this.canShoot = true;
    });
  }

  spawnEnemies(amount) {
    for (let i = 0; i < amount; i++) {
      const enemy = this.enemies.create(
        Phaser.Math.Between(50, 750),
        Phaser.Math.Between(50, 550),
        null
      );

      enemy.setDisplaySize(30, 30);
      enemy.speed = Phaser.Math.Between(40, 80);
      enemy.health = 30;
    }
  }

  moveEnemies() {
    this.enemies.getChildren().forEach(enemy => {
      this.physics.moveToObject(enemy, this.player, enemy.speed);
    });
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.health -= 10;

    if (enemy.health <= 0) {
      enemy.destroy();
    }
  }

  hitPlayer(player, enemy) {
    this.playerHealth -= 0.2;

    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      this.gameOver();
    }
  }

  updateUI() {
    const percent = this.playerHealth / this.maxHealth;

    this.healthBar.width = 200 * percent;
    this.healthText.setText(`Vida: ${Math.floor(this.playerHealth)}`);
  }

  cleanupBullets() {
    this.bullets.getChildren().forEach(b => {
      if (
        b.x < 0 || b.x > 800 ||
        b.y < 0 || b.y > 600
      ) {
        b.destroy();
      }
    });
  }

  gameOver() {
    this.isGameOver = true;
    this.physics.pause();

    this.add.text(400, 300, 'GAME OVER', {
      fontSize: '40px',
      color: '#ff0000'
    }).setOrigin(0.5);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: GameScene
};

new Phaser.Game(config);