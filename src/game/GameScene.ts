import Phaser from 'phaser';

import { INITIAL_PLAYER_ATTRIBUTES, GAME_WIDTH, GAME_HEIGHT, ASSET_KEYS, UPGRADES_LIST, BASE_KILLS_FOR_UPGRADE, INCREMENT_KILLS_PER_UPGRADE, ENEMY_TYPES, KILLS_PER_WAVE_INCREMENT, GOLD_MAGNET_RADIUS, GOLD_MAGNET_SPEED, SHOP_ITEMS_LIST, WAVES_PER_SHOP, NUM_SHOP_ITEMS_TO_DISPLAY, IMP_PROJECTILE_SPEED, IMP_PROJECTILE_DAMAGE_MULTIPLIER, IMP_PROJECTILE_LIFESPAN, IMP_PROJECTILE_FIRE_RATE, IMP_ATTACK_RANGE, TRAIL_PARTICLE_DURATION, TRAIL_SPAWN_INTERVAL, IMP_STOP_Y_POSITION, INITIAL_MUSIC_VOLUME, INITIAL_SFX_VOLUME, BOSS_WAVE, BOSS_ATTRIBUTES } from './constants';
// CORREÇÃO: Usado 'import type' para todos os tipos.
import type { PlayerAttributes, Upgrade, GameObjectWithBody, EnemyAttributes, ShopItem } from './types';
// CORREÇÃO: Usado 'import type' para o hint de tipo da UIScene.
import type { UIScene } from './UIScene';

enum GameFlowState {
  Playing,
  ManuallyPaused,
  UpgradeSelection,
  ShopOpen,
  BossFight,
  BossDefeated,
  GameOver
}

type KeyMap = { [key: string]: Phaser.Input.Keyboard.Key };

export class GameScene extends Phaser.Scene {
  public player!: Phaser.Physics.Arcade.Sprite;
  public playerAttributes!: PlayerAttributes;
  private keys!: KeyMap;

  private bullets!: Phaser.Physics.Arcade.Group;
  private imps!: Phaser.Physics.Arcade.Group;
  private otherEnemies!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private goldDrops!: Phaser.Physics.Arcade.Group;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  private waveNumber: number = 0;
  private totalKills: number = 0;

  private numUpgradesCompleted: number = 0;
  private nextUpgradeAtTotalKills: number = 0;
  private currentUpgradeProgressKills: number = 0;
  private killsRequiredForThisUpgrade: number = 0;

  private currentFlowState: GameFlowState = GameFlowState.Playing;

  private availableUpgrades: Upgrade[] = [];
  private currentShopItems: ShopItem[] = [];
  private lastShotTime: number = 0;
  private enemySpawnTimer?: Phaser.Time.TimerEvent;
  private jumpStrength: number = 350;

  private currentEnemySpawnDelay: number = 0;

  private dashTrailParticles!: Phaser.GameObjects.Group;
  private dashEndTimer: Phaser.Time.TimerEvent | null = null;
  private lastTrailSpawnTime: number = 0;

  private celestialFuryTimer?: Phaser.Time.TimerEvent;

  private musicVolumeSetting: number = INITIAL_MUSIC_VOLUME;
  private sfxVolumeSetting: number = INITIAL_SFX_VOLUME;
  private backgroundMusic: Phaser.Sound.BaseSound | null = null;

  private boss?: Phaser.Physics.Arcade.Sprite;
  private bossProjectiles!: Phaser.Physics.Arcade.Group;
  private bossAttackTimer?: Phaser.Time.TimerEvent;
  private bossMoveTimer?: Phaser.Time.TimerEvent;
  private endlessModeActive: boolean = false;


  constructor() {
    super({ key: 'GameScene' });
  }

  init(): void {
    this.playerAttributes = JSON.parse(JSON.stringify(INITIAL_PLAYER_ATTRIBUTES));
    this.availableUpgrades = [...UPGRADES_LIST];
    this.currentShopItems = [];
    this.waveNumber = 1;
    this.currentFlowState = GameFlowState.Playing;
    this.totalKills = 0;

    this.numUpgradesCompleted = 0;
    this.currentUpgradeProgressKills = 0;
    this.killsRequiredForThisUpgrade = BASE_KILLS_FOR_UPGRADE + this.numUpgradesCompleted * INCREMENT_KILLS_PER_UPGRADE;
    this.nextUpgradeAtTotalKills = this.killsRequiredForThisUpgrade;

    this.lastShotTime = 0;
    this.currentEnemySpawnDelay = 3000;
    this.playerAttributes.isInvincible = false;
    this.playerAttributes.gold = 0;

    this.playerAttributes.isDashing = false;
    this.playerAttributes.lastDashTime = 0;
    this.dashEndTimer = null;
    this.lastTrailSpawnTime = 0;

    if (this.celestialFuryTimer) {
      this.celestialFuryTimer.destroy();
    }
    this.celestialFuryTimer = undefined;

    this.backgroundMusic = null;

    this.boss = undefined;
    if (this.bossAttackTimer) this.bossAttackTimer.destroy();
    if (this.bossMoveTimer) this.bossMoveTimer.destroy();
    this.bossAttackTimer = undefined;
    this.bossMoveTimer = undefined;
    this.endlessModeActive = false;
  }

  create(): void {
    if (!this.physics || !this.add || !this.input || !this.time || !this.events || !this.make || !this.sound) {
      console.error("Phaser subsystems not initialized in GameScene.create.");
      return;
    }

    this.input.keyboard.createCombo('5555555', { resetOnMatch: true });

    this.musicVolumeSetting = this.game.registry.get('musicVolume');
    this.sfxVolumeSetting = this.game.registry.get('sfxVolume');

    this.backgroundMusic = this.sound.add(ASSET_KEYS.SOUND_BACKGROUND_MUSIC, { loop: true, volume: this.musicVolumeSetting });
    if (this.currentFlowState === GameFlowState.Playing && this.backgroundMusic && !this.backgroundMusic.isPlaying) {
      try {
        this.backgroundMusic.play();
      } catch (e) {
        console.warn("Background music could not be played on create:", e);
      }
    }

    const groundY = GAME_HEIGHT - 16;
    const groundTileSprite = this.add.tileSprite(GAME_WIDTH / 2, groundY, GAME_WIDTH, 32, ASSET_KEYS.GROUND_TEXTURE);

    this.ground = this.physics.add.staticGroup();
    this.ground.add(groundTileSprite);

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, ASSET_KEYS.PLAYER_SPRITE);
    this.player.setDisplaySize(115, 115);
    this.player.setCollideWorldBounds(true);
    if (this.player.body) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(true);
      const bodyWidth = 700;
      const bodyHeight = 1000;
      body.setSize(bodyWidth, bodyHeight);
      const offsetX = (this.player.width - bodyWidth) / 2;
      const offsetY = (this.player.height - bodyHeight) / 2;
      body.setOffset(offsetX, offsetY);
    }

    this.player.setBounce(0.1);
    this.player.setDepth(10);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,M,Q') as KeyMap;

    this.bullets = this.physics.add.group({
      defaultKey: ASSET_KEYS.BULLET_SPRITE,
      maxSize: 50,
      createCallback: (bulletGameObject) => {
        const bullet = bulletGameObject as Phaser.Physics.Arcade.Sprite;
        if (bullet.body) {
          (bullet.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        }
      },
      runChildUpdate: true,
    });

    this.enemyProjectiles = this.physics.add.group({
      defaultKey: ASSET_KEYS.IMP_PROJECTILE_SPRITE,
      maxSize: 30,
      createCallback: (projectileGameObject) => {
        const projectile = projectileGameObject as Phaser.Physics.Arcade.Sprite;
        if (projectile.body) {
          const body = projectile.body as Phaser.Physics.Arcade.Body;
          body.allowGravity = false;
          body.setCircle(projectile.width / 2 * 0.9);
        }
      },
      runChildUpdate: true,
    });

    this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      if (this.bullets.contains(body.gameObject as Phaser.Physics.Arcade.Sprite) ||
        this.enemyProjectiles.contains(body.gameObject as Phaser.Physics.Arcade.Sprite)) {
        body.gameObject.destroy();
      }
    });

    this.bossProjectiles = this.physics.add.group({ runChildUpdate: true });

    this.imps = this.physics.add.group({ runChildUpdate: true });
    this.otherEnemies = this.physics.add.group({ runChildUpdate: true });

    this.goldDrops = this.physics.add.group({
      defaultKey: ASSET_KEYS.GOLD_SPRITE,
      createCallback: (goldDropGameObject) => {
        const goldDrop = goldDropGameObject as Phaser.Physics.Arcade.Sprite;
        goldDrop.setDisplaySize(16, 16);
        if (goldDrop.body) {
          const body = goldDrop.body as Phaser.Physics.Arcade.Body;
          body.allowGravity = false;
          body.setCircle(16);
        }
        goldDrop.setDepth(1);
      }
    });

    this.dashTrailParticles = this.add.group({
      defaultKey: ASSET_KEYS.PLAYER_TRAIL,
      maxSize: 30,
    });

    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.imps, this.ground);
    this.physics.add.collider(this.otherEnemies, this.ground);
    this.physics.add.collider(this.imps, this.imps);
    this.physics.add.collider(this.otherEnemies, this.otherEnemies);

    this.physics.add.overlap(this.bullets, this.imps, this.bulletHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.bullets, this.otherEnemies, this.bulletHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.imps, this.playerHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.otherEnemies, this.playerHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.enemyProjectiles, this.playerHitByEnemyProjectile as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.bossProjectiles, this.playerHitByEnemyProjectile as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.goldDrops, this.playerCollectGold as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    this.input.keyboard.on('keycombomatch', () => {
      this.triggerBossFight();
    });
    this.events.on('upgradeChosen', this.applyUpgrade, this);
    this.events.on('restartGame', this.restartGame, this);
    this.events.on('itemPurchased', this.purchaseShopItem, this);
    this.events.on('closeShopRequested', this.closeShop, this);
    this.events.on('resumeGameRequested', this.handleResumeGameRequest, this);
    this.events.on('musicVolumeChanged', this.handleMusicVolumeChange, this);
    this.events.on('sfxVolumeChanged', this.handleSfxVolumeChange, this);
    this.events.on('continueEndlessMode', this.handleContinueEndlessMode, this);

    const uiScene = this.scene.get('UIScene') as UIScene;
    if (uiScene && uiScene.events) {
      uiScene.events.once('uiReadyForData', () => {
        this.updateUI();
      }, this);
    } else {
      console.warn('UIScene not found or UIScene.events not available immediately after launch.');
      this.updateUI();
    }

    this.enemySpawnTimer = this.time.addEvent({
      delay: this.currentEnemySpawnDelay,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
    if (this.currentFlowState !== GameFlowState.Playing && this.enemySpawnTimer) {
      this.enemySpawnTimer.paused = true;
    }
    this.updateCelestialFury();
  }

  shutdown(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.destroy();
      this.backgroundMusic = null;
    }
    if (this.enemySpawnTimer) this.enemySpawnTimer.destroy();
    if (this.dashEndTimer) this.dashEndTimer.destroy();
    if (this.celestialFuryTimer) this.celestialFuryTimer.destroy();
    if (this.bossAttackTimer) this.bossAttackTimer.destroy();
    if (this.bossMoveTimer) this.bossMoveTimer.destroy();

    this.input.keyboard.off('keycombomatch');
    this.events.off('upgradeChosen', this.applyUpgrade, this);
    this.events.off('restartGame', this.restartGame, this);
    this.events.off('itemPurchased', this.purchaseShopItem, this);
    this.events.off('closeShopRequested', this.closeShop, this);
    this.events.off('resumeGameRequested', this.handleResumeGameRequest, this);
    this.events.off('musicVolumeChanged', this.handleMusicVolumeChange, this);
    this.events.off('sfxVolumeChanged', this.handleSfxVolumeChange, this);
    this.events.off('continueEndlessMode', this.handleContinueEndlessMode, this);
  }

  private setFlowState(newState: GameFlowState): void {
    const oldState = this.currentFlowState;
    if (oldState === newState) return;

    this.currentFlowState = newState;

    const isPausedOrInMenu = newState !== GameFlowState.Playing;
    const gameContainer = document.getElementById('phaser-parent');
    if (gameContainer) {
      const event = new CustomEvent('gameStateChange', { detail: { isPaused: isPausedOrInMenu } });
      gameContainer.dispatchEvent(event);
    }

    const shouldPhysicsBeActive = newState === GameFlowState.Playing || newState === GameFlowState.BossFight;

    if (!shouldPhysicsBeActive) {
      this.physics.pause();
      if (this.enemySpawnTimer) this.enemySpawnTimer.paused = true;
      if (this.playerAttributes.isDashing && this.dashEndTimer) {
        this.dashEndTimer.paused = true;
      }
      if (this.celestialFuryTimer) this.celestialFuryTimer.paused = true;
      if (this.bossAttackTimer) this.bossAttackTimer.paused = true;
      if (this.bossMoveTimer) this.bossMoveTimer.paused = true;
      if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
        this.backgroundMusic.pause();
      }
    } else {
      this.physics.resume();
      if (this.enemySpawnTimer) this.enemySpawnTimer.paused = (newState === GameFlowState.BossFight);
      if (this.playerAttributes.isDashing && this.dashEndTimer) {
        this.dashEndTimer.paused = false;
      }
      if (this.celestialFuryTimer) this.celestialFuryTimer.paused = false;
      if (this.bossAttackTimer) this.bossAttackTimer.paused = false;
      if (this.bossMoveTimer) this.bossMoveTimer.paused = false;
      if (this.backgroundMusic) {
        if (this.backgroundMusic.isPaused) {
          this.backgroundMusic.resume();
        } else if (!this.backgroundMusic.isPlaying) {
          try {
            this.backgroundMusic.play();
          } catch (e) {
            console.warn("Background music could not be resumed/played on setFlowState:", e);
          }
        }
      }
    }

    switch (newState) {
      case GameFlowState.ManuallyPaused:
        this.events.emit('showPauseMenu', {
          musicVolume: this.musicVolumeSetting,
          sfxVolume: this.sfxVolumeSetting
        });
        break;
      case GameFlowState.GameOver:
        this.triggerGameOver();
        break;
    }
  }

  private handleResumeGameRequest(): void {
    if (this.currentFlowState === GameFlowState.ManuallyPaused) {
      this.events.emit('resumedFromPauseMenu');
      this.setFlowState(GameFlowState.Playing);
    }
  }

  private handleMusicVolumeChange(newVolume: number): void {
    this.musicVolumeSetting = Phaser.Math.Clamp(newVolume, 0, 1);
    if (this.backgroundMusic) {
      this.backgroundMusic.setVolume(this.musicVolumeSetting);
    }
  }

  private handleSfxVolumeChange(newVolume: number): void {
    this.sfxVolumeSetting = Phaser.Math.Clamp(newVolume, 0, 1);
  }

  update(time: number, _delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) {
      if (this.currentFlowState === GameFlowState.Playing || this.currentFlowState === GameFlowState.BossFight) {
        this.setFlowState(GameFlowState.ManuallyPaused);
      } else if (this.currentFlowState === GameFlowState.ManuallyPaused) {
        this.handleResumeGameRequest();
      }
    }

    if (this.currentFlowState !== GameFlowState.Playing && this.currentFlowState !== GameFlowState.BossFight) {
      if (this.player?.body?.active && !this.playerAttributes.isDashing) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      if (this.boss?.body?.active) {
        (this.boss.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      this.goldDrops.getChildren().forEach(g => {
        const go = g as Phaser.Physics.Arcade.Sprite;
        if (go.active && go.body) (go.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      });
      const allEnemies = [...this.imps.getChildren(), ...this.otherEnemies.getChildren()] as Phaser.Physics.Arcade.Sprite[];
      allEnemies.forEach(e => { if (e.active && e.body) (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0) });
      this.enemyProjectiles.getChildren().forEach(p => {
        const proj = p as Phaser.Physics.Arcade.Sprite;
        if (proj.active && proj.body) (proj.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      });
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
      this.tryDash(time);
    }

    if (this.playerAttributes.isDashing && this.player.active) {
      this.handleDashingState(time);
    }

    if (!this.player.active || !this.player.body) {
      if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
      return;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    if (!this.playerAttributes.isDashing) {
      if (this.keys.A.isDown) {
        this.player.setVelocityX(-this.playerAttributes.speed);
        this.player.setFlipX(true);
      } else if (this.keys.D.isDown) {
        this.player.setVelocityX(this.playerAttributes.speed);
        this.player.setFlipX(false);
      } else {
        this.player.setVelocityX(0);
      }
      if (this.keys.W.isDown && (playerBody.blocked.down || playerBody.touching.down)) {
        this.player.setVelocityY(-this.jumpStrength);
      }
      if (this.input.activePointer.isDown) {
        this.shoot(this.input.activePointer.worldX, this.input.activePointer.worldY);
      }
    }

    const allActiveEnemies = [...this.imps.getChildren(), ...this.otherEnemies.getChildren()] as Phaser.Physics.Arcade.Sprite[];
    allActiveEnemies.forEach(enemy => {
      if (enemy.active && enemy.body && this.player?.active) {
        const speed = enemy.getData('speed') as number || 0;
        const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
        const enemyType = enemy.getData('type') as string;

        if (enemyType === ENEMY_TYPES.IMP.type) {
          if (enemy.y < IMP_STOP_Y_POSITION) {
            enemyBody.setAllowGravity(true); this.physics.moveToObject(enemy, this.player, speed);
          } else {
            enemyBody.setAllowGravity(false); enemyBody.setVelocityY(0); enemy.y = IMP_STOP_Y_POSITION;
            const horizontalDeadZone = 15;
            if (this.player.x < enemy.x - horizontalDeadZone) enemyBody.setVelocityX(-speed * 0.9);
            else if (this.player.x > enemy.x + horizontalDeadZone) enemyBody.setVelocityX(speed * 0.9);
            else enemyBody.setVelocityX(0);
          }
        } else if (enemyType === ENEMY_TYPES.FLYER.type) {
          if (enemy.y < this.player.y - 10) { this.physics.moveToObject(enemy, this.player, speed); }
          else {
            enemyBody.setVelocityY(0);
            if (Math.abs(enemy.x - this.player.x) > 10) enemyBody.setVelocityX(this.player.x > enemy.x ? speed : -speed);
            else enemyBody.setVelocityX(0);
          }
        } else {
          this.physics.moveToObject(enemy, this.player, speed);
        }

        if (enemyType === ENEMY_TYPES.BRUTE.type) {
          if (enemyBody.velocity.x < 0) enemy.setFlipX(false);
          else if (enemyBody.velocity.x > 0) enemy.setFlipX(true);
        } else {
          if (enemyBody.velocity.x < 0) enemy.setFlipX(true);
          else if (enemyBody.velocity.x > 0) enemy.setFlipX(false);
        }

        if (enemyType === ENEMY_TYPES.IMP.type) {
          const now = this.time.now;
          const lastShotTime = enemy.getData('lastImpShotTime') as number || 0;
          const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          if (now > lastShotTime + IMP_PROJECTILE_FIRE_RATE && distanceToPlayer < IMP_ATTACK_RANGE) {
            this.impShootAtPlayer(enemy); enemy.setData('lastImpShotTime', now);
          }
        }
      } else if (enemy.active && enemy.body) { (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0); }
    });

    this.goldDrops.getChildren().forEach(g => {
      const goldDrop = g as Phaser.Physics.Arcade.Sprite;
      if (goldDrop.active && goldDrop.body && this.player?.active) {
        const body = goldDrop.body as Phaser.Physics.Arcade.Body;
        const distance = Phaser.Math.Distance.Between(goldDrop.x, goldDrop.y, this.player.x, this.player.y);
        if (distance < GOLD_MAGNET_RADIUS) this.physics.moveToObject(goldDrop, this.player, GOLD_MAGNET_SPEED);
        else if (body.velocity.x !== 0 || body.velocity.y !== 0) body.setVelocity(0, 0);
      }
    });
  }

  private tryDash(currentTime: number): void {
    if (!this.player?.active || this.playerAttributes.isDashing || (this.currentFlowState !== GameFlowState.Playing && this.currentFlowState !== GameFlowState.BossFight)) return;
    if (currentTime < this.playerAttributes.lastDashTime + this.playerAttributes.dashCooldown) return;
    this.initiateDash(currentTime);
  }

  private initiateDash(currentTime: number): void {
    this.playerAttributes.isDashing = true;
    this.playerAttributes.lastDashTime = currentTime;
    this.lastTrailSpawnTime = currentTime;

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const dashBaseSpeed = this.playerAttributes.speed;
    const actualDashSpeed = dashBaseSpeed * this.playerAttributes.dashSpeedMultiplier;

    let dirX = 0, dirY = 0;
    const { velocity: { x: velX, y: velY } } = playerBody;

    if (Math.abs(velX) > 1 || Math.abs(velY) > 1) {
      const magnitude = Math.sqrt(velX * velX + velY * velY);
      dirX = velX / magnitude;
      dirY = velY / magnitude;
      if ((playerBody.blocked.down || playerBody.touching.down) && Math.abs(velX) > Math.abs(velY) * 1.1) {
        dirY = 0;
        dirX = Math.abs(dirX) < 0.1 ? (this.player.flipX ? -1 : 1) : Math.sign(dirX);
      }
    } else {
      dirX = this.player.flipX ? -1 : 1;
    }

    if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) dirX = this.player.flipX ? -1 : 1;

    playerBody.setAllowGravity(false);
    this.player.setVelocity(dirX * actualDashSpeed, dirY * actualDashSpeed);
    this.player.setAlpha(0.6);
    if (this.dashEndTimer) this.dashEndTimer.destroy();
    this.dashEndTimer = this.time.delayedCall(this.playerAttributes.dashDuration, this.endDash, [], this);
  }

  private handleDashingState(currentTime: number): void {
    if (currentTime > this.lastTrailSpawnTime + TRAIL_SPAWN_INTERVAL) {
      this.spawnDashTrailParticle();
      this.lastTrailSpawnTime = currentTime;
    }
  }

  private endDash(): void {
    this.playerAttributes.isDashing = false;
    if (this.dashEndTimer) { this.dashEndTimer.destroy(); this.dashEndTimer = null; }
    if (!this.player?.active || !this.player.body) return;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(true);
    playerBody.setVelocityX(playerBody.velocity.x * 0.15);
    this.player.setAlpha(1.0);
  }

  private spawnDashTrailParticle(): void {
    if (!this.player?.active) return;
    const trailParticle = this.dashTrailParticles.get(this.player.x, this.player.y, ASSET_KEYS.PLAYER_TRAIL) as Phaser.GameObjects.Sprite;
    if (!trailParticle) return;
    trailParticle.setActive(true).setVisible(true).setAlpha(0.7).setScale(1).setDepth(this.player.depth - 1);
    this.tweens.add({
      targets: trailParticle,
      alpha: { from: 0.7, to: 0 },
      scale: { from: 1, to: 0.1 },
      duration: TRAIL_PARTICLE_DURATION,
      ease: 'Cubic.easeOut',
      onComplete: () => { if (trailParticle.active) this.dashTrailParticles.killAndHide(trailParticle); }
    });
  }

  private shoot(targetX: number, targetY: number): void {
    if (this.time.now < this.lastShotTime + this.playerAttributes.fireRate) return;
    this.lastShotTime = this.time.now;
    this.sound.play(ASSET_KEYS.SOUND_SHOOT, { volume: this.sfxVolumeSetting * 0.8 });
    const bulletOriginX = this.player.x + (this.player.flipX ? -16 : 16);
    const bulletOriginY = this.player.y;
    const baseAngle = Phaser.Math.Angle.Between(bulletOriginX, bulletOriginY, targetX, targetY);
    const spreadAngle = Math.PI / 18;
    for (let i = 0; i < this.playerAttributes.numProjectiles; i++) {
      let currentAngle = baseAngle;
      if (this.playerAttributes.numProjectiles > 1) {
        currentAngle = baseAngle - (spreadAngle * (this.playerAttributes.numProjectiles - 1) / 2) + (i * spreadAngle);
      }
      const bullet = this.bullets.get(bulletOriginX, bulletOriginY, ASSET_KEYS.BULLET_SPRITE) as Phaser.Physics.Arcade.Sprite;
      if (bullet?.body) {
        bullet.setActive(true).setVisible(true).setDepth(3);
        bullet.setData('damage', this.playerAttributes.damage);
        bullet.setData('pierceCount', this.playerAttributes.pierceCount);
        bullet.setData('piercedEnemies', [] as string[]);
        this.physics.velocityFromRotation(currentAngle, this.playerAttributes.projectileSpeed, bullet.body.velocity);
        bullet.setRotation(currentAngle);
        this.time.delayedCall(this.playerAttributes.projectileLifespan, () => { if (bullet.active) bullet.destroy(); });
      }
    }
  }

  private impShootAtPlayer(impEnemy: Phaser.Physics.Arcade.Sprite): void {
    if (!this.player?.active || (this.currentFlowState !== GameFlowState.Playing && this.currentFlowState !== GameFlowState.BossFight)) return;
    const projectile = this.enemyProjectiles.get(impEnemy.x, impEnemy.y, ASSET_KEYS.IMP_PROJECTILE_SPRITE) as Phaser.Physics.Arcade.Sprite;
    if (projectile) {
      projectile.setActive(true).setVisible(true).setDepth(2);
      const impBaseDamage = impEnemy.getData('damage') as number || 0;
      projectile.setData('damage', impBaseDamage * IMP_PROJECTILE_DAMAGE_MULTIPLIER);
      const angle = Phaser.Math.Angle.Between(impEnemy.x, impEnemy.y, this.player.x, this.player.y);
      if (projectile.body) {
        this.physics.velocityFromRotation(angle, IMP_PROJECTILE_SPEED, projectile.body.velocity);
        projectile.setRotation(angle);
        (projectile.body as Phaser.Physics.Arcade.Body).setCircle(projectile.width / 2 * 0.8);
      }
      this.time.delayedCall(IMP_PROJECTILE_LIFESPAN, () => { if (projectile.active) projectile.destroy(); });
    }
  }

  private displayDamageNumber(enemy: Phaser.Physics.Arcade.Sprite, damageAmount: number): void {
    const randomXOffset = Phaser.Math.Between(-enemy.displayWidth / 4, enemy.displayWidth / 4);
    const startY = enemy.y - enemy.displayHeight / 2 - 10;
    const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial, sans-serif', fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 4, };
    const damageText = this.add.text(enemy.x + randomXOffset, startY, damageAmount.toString(), style).setOrigin(0.5, 0.5).setDepth(20);
    this.tweens.add({ targets: damageText, y: startY - 30, alpha: { start: 1, to: 0 }, duration: 800, ease: 'Cubic.easeOut', onComplete: () => { damageText.destroy(); } });
  }

  private calculateGoldDrop(enemyTypeKey: string): number {
    const enemyConfig = ENEMY_TYPES[enemyTypeKey];
    if (!enemyConfig) return 0;
    const { minGold, maxGold } = enemyConfig;
    const rand = Math.random();
    if (rand < 0.40) return minGold;
    if (rand < 0.55) return maxGold;
    const intermediateValues = Array.from({ length: maxGold - minGold - 1 }, (_, i) => minGold + 1 + i);
    return intermediateValues.length > 0 ? Phaser.Utils.Array.GetRandom(intermediateValues) : minGold;
  }

  private spawnBloodParticles(x: number, y: number, enemyDisplayWidth: number): void {
    let particleCount, particleScaleStartMin, particleScaleStartMax;
    if (enemyDisplayWidth < 80) { particleCount = Phaser.Math.Between(8, 15); particleScaleStartMin = 0.5; particleScaleStartMax = 0.8; }
    else if (enemyDisplayWidth < 130) { particleCount = Phaser.Math.Between(15, 25); particleScaleStartMin = 0.7; particleScaleStartMax = 1.2; }
    else { particleCount = Phaser.Math.Between(25, 40); particleScaleStartMin = 1.0; particleScaleStartMax = 1.8; }
    const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = { lifespan: { min: 300, max: 700 }, speed: { min: 50, max: 200 }, angle: { min: 0, max: 360 }, scale: { start: Phaser.Math.FloatBetween(particleScaleStartMin, particleScaleStartMax), end: 0.1, ease: 'Expo.easeOut' }, alpha: { start: 0.9, end: 0, ease: 'Quad.easeIn' }, gravityY: 350, blendMode: 'NORMAL', emitting: false, };
    const emitter = this.add.particles(x, y, ASSET_KEYS.BLOOD_PARTICLE, emitterConfig);
    emitter.setDepth(4).explode(particleCount);
    this.time.delayedCall(1000, () => { if (emitter?.active) emitter.destroy(); });
  }

  private killEnemyByEffect(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active) return;
    this.spawnBloodParticles(enemy.x, enemy.y, enemy.displayWidth);
    const enemyTypeKey = enemy.getData('type') as string;
    if (enemyTypeKey) {
      let deathSoundKey: string | null = null;
      switch (enemyTypeKey) {
        case ENEMY_TYPES.IMP.type: deathSoundKey = ASSET_KEYS.SOUND_IMP_DEATH; break;
        case ENEMY_TYPES.FLYER.type: deathSoundKey = ASSET_KEYS.SOUND_FLYER_DEATH; break;
        case ENEMY_TYPES.BRUTE.type: deathSoundKey = ASSET_KEYS.SOUND_BRUTE_DEATH; break;
      }
      if (deathSoundKey) this.sound.play(deathSoundKey, { volume: this.sfxVolumeSetting });
      const goldAmount = this.calculateGoldDrop(enemyTypeKey);
      if (goldAmount > 0) {
        const goldDrop = this.goldDrops.get(enemy.x, enemy.y, ASSET_KEYS.GOLD_SPRITE) as Phaser.Physics.Arcade.Sprite;
        if (goldDrop) { goldDrop.setData('value', goldAmount).setActive(true).setVisible(true); }
      }
    }
    enemy.destroy();
    this.totalKills++; this.currentUpgradeProgressKills++;
    let waveCompleted = false;
    if (this.totalKills >= this.waveNumber * KILLS_PER_WAVE_INCREMENT) {
      this.waveNumber++; waveCompleted = true;
      this.currentEnemySpawnDelay = Math.max(150, this.currentEnemySpawnDelay * 0.8);
      if (this.enemySpawnTimer) this.enemySpawnTimer.destroy();
      this.enemySpawnTimer = this.time.addEvent({ delay: this.currentEnemySpawnDelay, callback: this.spawnEnemy, callbackScope: this, loop: true, paused: this.currentFlowState !== GameFlowState.Playing });
    }
    this.updateUI();
    if (waveCompleted && this.waveNumber > 0 && (this.waveNumber - 1) % WAVES_PER_SHOP === 0 && this.currentFlowState === GameFlowState.Playing) { this.openShop(); return; }
    if (waveCompleted && this.waveNumber === BOSS_WAVE && !this.endlessModeActive) { this.triggerBossFight(); return; }
    if (this.totalKills >= this.nextUpgradeAtTotalKills && this.currentFlowState === GameFlowState.Playing) this.offerUpgrades();
  }

  private bulletHitEnemy(bullet: GameObjectWithBody, enemy: GameObjectWithBody): void {
    if (!bullet.active || !enemy.active || this.currentFlowState === GameFlowState.GameOver) return;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const bulletSprite = bullet as Phaser.Physics.Arcade.Sprite;
    const damage = bulletSprite.getData('damage') as number;
    let pierceCount = bulletSprite.getData('pierceCount') as number;
    const piercedEnemies = bulletSprite.getData('piercedEnemies') as string[] || [];
    let enemyId = enemySprite.getData('uniqueId') as string;
    if (!enemyId) { enemyId = Phaser.Utils.String.UUID(); enemySprite.setData('uniqueId', enemyId); }
    if (piercedEnemies.includes(enemyId)) return;
    const enemyCurrentHealth = (enemySprite.getData('health') || 0) - damage;
    enemySprite.setData('health', enemyCurrentHealth);
    piercedEnemies.push(enemyId);
    bulletSprite.setData('piercedEnemies', piercedEnemies);
    this.displayDamageNumber(enemySprite, damage);
    if (enemyCurrentHealth <= 0) { this.killEnemyByEffect(enemySprite); }
    else {
      enemySprite.setTint(0xff8888);
      this.time.delayedCall(100, () => {
        if (enemySprite.active) {
          const originalColor = enemySprite.getData('originalColor') as number | undefined;
          enemySprite.clearTint();
          if (originalColor && originalColor !== 0xffffff && enemySprite.getData('type') !== ENEMY_TYPES.IMP.type && enemySprite.getData('type') !== ENEMY_TYPES.FLYER.type && enemySprite.getData('type') !== ENEMY_TYPES.BRUTE.type) { enemySprite.setTint(originalColor); }
        }
      });
    }
    pierceCount--;
    bulletSprite.setData('pierceCount', pierceCount);
    if (pierceCount <= 0) bulletSprite.destroy();
  }

  private playerHit(playerGameObject: GameObjectWithBody, enemyGameObject: GameObjectWithBody): void {
    if (this.playerAttributes.isDashing) return;
    const playerSprite = playerGameObject as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemyGameObject as Phaser.Physics.Arcade.Sprite;
    if ((this.currentFlowState !== GameFlowState.Playing && this.currentFlowState !== GameFlowState.BossFight) || !enemySprite.active || !playerSprite.active || this.playerAttributes.isInvincible) return;
    this.playerAttributes.isInvincible = true;
    const enemyDamage = enemySprite.getData('damage') as number || 0;
    this.playerAttributes.health -= enemyDamage;
    playerSprite.setAlpha(0.5);
    this.time.delayedCall(200, () => { if (playerSprite.active) playerSprite.setAlpha(this.playerAttributes.isDashing ? 0.6 : 1.0); });
    this.time.delayedCall(this.playerAttributes.invincibilityDuration, () => { if (playerSprite.active) this.playerAttributes.isInvincible = false; });
    if (enemySprite.body && playerSprite.body) {
      const enemyBody = enemySprite.body as Phaser.Physics.Arcade.Body;
      const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
      const knockbackForceX = 150, knockbackForceY = -100;
      if (enemyBody.x < playerBody.x) enemyBody.setVelocity(-knockbackForceX, knockbackForceY);
      else enemyBody.setVelocity(knockbackForceX, knockbackForceY);
    }
    this.updateUI();
    if (this.playerAttributes.health <= 0) this.setFlowState(GameFlowState.GameOver);
  }

  private playerHitByEnemyProjectile(playerGameObject: GameObjectWithBody, projectileGameObject: GameObjectWithBody): void {
    const projectileSprite = projectileGameObject as Phaser.Physics.Arcade.Sprite;
    if (this.playerAttributes.isDashing) { if (projectileSprite.active) projectileSprite.destroy(); return; }
    const playerSprite = playerGameObject as Phaser.Physics.Arcade.Sprite;
    if ((this.currentFlowState !== GameFlowState.Playing && this.currentFlowState !== GameFlowState.BossFight) || !projectileSprite.active || !playerSprite.active || this.playerAttributes.isInvincible) { if (projectileSprite.active) projectileSprite.destroy(); return; }
    this.playerAttributes.isInvincible = true;
    const damage = projectileSprite.getData('damage') as number || 0;
    this.playerAttributes.health -= damage;
    projectileSprite.destroy();
    playerSprite.setAlpha(0.5);
    this.time.delayedCall(200, () => { if (playerSprite.active) playerSprite.setAlpha(this.playerAttributes.isDashing ? 0.6 : 1.0); });
    this.time.delayedCall(this.playerAttributes.invincibilityDuration, () => { if (playerSprite.active) this.playerAttributes.isInvincible = false; });
    this.updateUI();
    if (this.playerAttributes.health <= 0) this.setFlowState(GameFlowState.GameOver);
  }

  private playerCollectGold(_playerGameObject: GameObjectWithBody, goldDropGameObject: GameObjectWithBody): void {
    const goldDropSprite = goldDropGameObject as Phaser.Physics.Arcade.Sprite;
    if (!goldDropSprite.active) return;
    const goldValue = goldDropSprite.getData('value') as number || 0;
    this.playerAttributes.gold += goldValue;
    goldDropSprite.destroy();
    this.updateUI();
  }

  private spawnEnemy(): void {
    if (this.currentFlowState !== GameFlowState.Playing) return;
    const enemyTypesArray = Object.values(ENEMY_TYPES);
    const randomEnemyType = Phaser.Math.RND.pick(enemyTypesArray);
    const x = Phaser.Math.Between(randomEnemyType.size.width / 2, GAME_WIDTH - randomEnemyType.size.width / 2);
    const y = -randomEnemyType.size.height / 2;
    let enemy: Phaser.Physics.Arcade.Sprite;
    if (randomEnemyType.type === ENEMY_TYPES.IMP.type) enemy = this.imps.create(x, y, randomEnemyType.assetKey) as Phaser.Physics.Arcade.Sprite;
    else enemy = this.otherEnemies.create(x, y, randomEnemyType.assetKey) as Phaser.Physics.Arcade.Sprite;
    if (enemy) {
      enemy.setActive(true).setVisible(true).setOrigin(0.5, 0.5).setDepth(2);
      if (randomEnemyType.type === ENEMY_TYPES.IMP.type || randomEnemyType.type === ENEMY_TYPES.FLYER.type || randomEnemyType.type === ENEMY_TYPES.BRUTE.type) enemy.clearTint();
      else if (randomEnemyType.color && randomEnemyType.color !== 0xffffff) enemy.setTint(randomEnemyType.color);
      else enemy.clearTint();
      enemy.setData('originalColor', randomEnemyType.color);
      enemy.setDisplaySize(randomEnemyType.size.width, randomEnemyType.size.height);
      enemy.setData('type', randomEnemyType.type);
      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
      if (enemyBody) {
        enemyBody.setAllowGravity(randomEnemyType.type !== ENEMY_TYPES.FLYER.type);
        let hitboxMultiplier: number;
        switch (randomEnemyType.type) {
          case ENEMY_TYPES.IMP.type: hitboxMultiplier = 5.0; break;
          case ENEMY_TYPES.BRUTE.type: hitboxMultiplier = 4.5; break;
          case ENEMY_TYPES.FLYER.type: hitboxMultiplier = 4.8; break;
          default: hitboxMultiplier = 1.5; break;
        }
        enemyBody.setSize(enemy.displayWidth * hitboxMultiplier, enemy.displayHeight * hitboxMultiplier);
        enemyBody.setCollideWorldBounds(true);
        enemyBody.onWorldBounds = true;
        enemyBody.setBounceX(0.2);
        if (randomEnemyType.type !== ENEMY_TYPES.FLYER.type) enemyBody.setBounceY(0.1);
      }
      const healthMultiplier = Math.pow(this.endlessModeActive ? 1.20 : 1.05, this.waveNumber - 1);
      const finalHealth = Math.ceil(randomEnemyType.health * healthMultiplier);
      const speedBonusPercentage = Math.min(0.50, (this.waveNumber - 1) * 0.025);
      const finalSpeed = randomEnemyType.speed * (1 + speedBonusPercentage);
      enemy.setData({ health: finalHealth, damage: randomEnemyType.damage, speed: finalSpeed, scoreValue: randomEnemyType.scoreValue, uniqueId: Phaser.Utils.String.UUID() });
      if (randomEnemyType.type === ENEMY_TYPES.IMP.type) enemy.setData('lastImpShotTime', 0);
    }
  }

  private offerUpgrades(): void {
    if (this.currentFlowState !== GameFlowState.Playing) return;
    this.setFlowState(GameFlowState.UpgradeSelection);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const shuffledUpgrades = Phaser.Utils.Array.Shuffle([...this.availableUpgrades]);
    const chosenUpgrades = shuffledUpgrades.slice(0, Math.min(3, shuffledUpgrades.length));
    this.events.emit('showUpgrades', chosenUpgrades);
  }

  private applyUpgrade(upgradeId: string): void {
    if (this.currentFlowState !== GameFlowState.UpgradeSelection) {
      console.warn(`applyUpgrade called when not in UpgradeSelection state. Ignoring.`);
      return;
    }
    const selectedUpgrade = this.availableUpgrades.find(upg => upg.id === upgradeId);
    if (selectedUpgrade) selectedUpgrade.apply(this.playerAttributes, this);
    const previousTotalKillsTargetForUpgrade = this.nextUpgradeAtTotalKills;
    this.numUpgradesCompleted++;
    this.killsRequiredForThisUpgrade = BASE_KILLS_FOR_UPGRADE + this.numUpgradesCompleted * INCREMENT_KILLS_PER_UPGRADE;
    this.nextUpgradeAtTotalKills = previousTotalKillsTargetForUpgrade + this.killsRequiredForThisUpgrade;
    this.currentUpgradeProgressKills = Math.max(0, this.totalKills - previousTotalKillsTargetForUpgrade);
    this.updateUI();
    this.setFlowState(GameFlowState.Playing);
  }

  private openShop(): void {
    if (this.currentFlowState !== GameFlowState.Playing) return;
    this.setFlowState(GameFlowState.ShopOpen);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const shuffledShopItems = Phaser.Utils.Array.Shuffle([...SHOP_ITEMS_LIST]);
    this.currentShopItems = shuffledShopItems.slice(0, NUM_SHOP_ITEMS_TO_DISPLAY);
    this.events.emit('showShop', { items: this.currentShopItems, playerGold: this.playerAttributes.gold });
  }

  private purchaseShopItem(itemId: string): void {
    const itemToBuy = SHOP_ITEMS_LIST.find(item => item.id === itemId);
    if (!itemToBuy) return;
    if (this.playerAttributes.gold >= itemToBuy.cost) {
      this.playerAttributes.gold -= itemToBuy.cost;
      itemToBuy.apply(this.playerAttributes, this);
      this.updateUI();
      this.events.emit('itemPurchasedFeedback', { playerGold: this.playerAttributes.gold });
    }
  }

  public closeShop(): void {
    if (this.currentFlowState === GameFlowState.ShopOpen) {
      this.setFlowState(GameFlowState.Playing);
      this.events.emit('closeShopUI');
    }
  }

  private triggerGameOver(): void {
    this.currentFlowState = GameFlowState.GameOver;
    if (this.dashEndTimer) { this.dashEndTimer.destroy(); this.dashEndTimer = null; }
    if (this.playerAttributes.isDashing) {
      this.playerAttributes.isDashing = false;
      if (this.player?.active && this.player.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        this.player.setAlpha(1.0);
      }
    }
    if (this.enemySpawnTimer) { this.enemySpawnTimer.destroy(); this.enemySpawnTimer = undefined; }
    if (this.celestialFuryTimer) { this.celestialFuryTimer.destroy(); this.celestialFuryTimer = undefined; }
    if (this.bossAttackTimer) this.bossAttackTimer.destroy();
    if (this.bossMoveTimer) this.bossMoveTimer.destroy();
    if (this.backgroundMusic?.isPlaying || this.backgroundMusic?.isPaused) this.backgroundMusic.stop();
    if (this.player?.active) {
      this.player.setTint(0xff0000);
      if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    this.events.emit('gameOverDisplay', { wave: this.waveNumber, totalKills: this.totalKills });
  }

  private restartGame(): void {
    this.scene.restart();
  }

  public triggerBossFight(): void {
    if (this.currentFlowState === GameFlowState.BossFight || this.currentFlowState === GameFlowState.GameOver) return;
    this.imps.clear(true, true);
    this.otherEnemies.clear(true, true);
    if (this.enemySpawnTimer) this.enemySpawnTimer.paused = true;
    this.spawnBoss();
  }

  private spawnBoss(): void {
    this.setFlowState(GameFlowState.BossFight);
    this.boss = this.physics.add.sprite(GAME_WIDTH / 2, 150, ASSET_KEYS.BOSS_SPRITE);
    this.boss.setDisplaySize(BOSS_ATTRIBUTES.displaySize.width, BOSS_ATTRIBUTES.displaySize.height);
    this.boss.setDepth(5);
    const bossBody = this.boss.body as Phaser.Physics.Arcade.Body;
    if (bossBody) {
      bossBody.setAllowGravity(false);
      bossBody.setCollideWorldBounds(true);
      const bossHealth = this.playerAttributes.damage * BOSS_ATTRIBUTES.healthMultiplier;
      this.boss.setData({ health: bossHealth, maxHealth: bossHealth, name: BOSS_ATTRIBUTES.name });
      const hitboxWidth = this.boss.displayWidth * BOSS_ATTRIBUTES.hitboxScale;
      const hitboxHeight = this.boss.displayHeight * BOSS_ATTRIBUTES.hitboxScale;
      bossBody.setSize(hitboxWidth, hitboxHeight);
      const offsetX = (this.boss.width - hitboxWidth) / 2;
      const offsetY = (this.boss.height - hitboxHeight) / 2;
      bossBody.setOffset(offsetX, offsetY);
      this.physics.add.overlap(this.bullets, this.boss, this.bulletHitBoss as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
      this.events.emit('bossSpawned', { name: this.boss.getData('name'), maxHealth: bossHealth });
      this.bossAttackTimer = this.time.addEvent({ delay: BOSS_ATTRIBUTES.attackInterval, callback: this.performBossAttack, callbackScope: this, loop: true, paused: this.currentFlowState !== GameFlowState.BossFight });
      this.bossMoveTimer = this.time.addEvent({ delay: BOSS_ATTRIBUTES.moveInterval, callback: this.moveBossRandomly, callbackScope: this, loop: true, paused: this.currentFlowState !== GameFlowState.BossFight });
    }
  }

  private moveBossRandomly(): void {
    if (!this.boss?.active || this.currentFlowState !== GameFlowState.BossFight) return;
    const targetX = Phaser.Math.Between(GAME_WIDTH * 0.2, GAME_WIDTH * 0.8);
    const targetY = Phaser.Math.Between(100, 200);
    this.physics.moveTo(this.boss, targetX, targetY, BOSS_ATTRIBUTES.speed);
  }

  private performBossAttack(): void {
    if (!this.boss?.active || !this.player?.active || this.currentFlowState !== GameFlowState.BossFight) return;
    const attackChoice = Phaser.Math.Between(0, 2);
    switch (attackChoice) {
      case 0: this.bossAttackFastball(); break;
      case 1: this.bossAttackNova(); break;
      case 2: this.bossAttackMeteors(); break;
    }
  }

  private bossAttackFastball(): void {
    if (!this.boss) return;
    const projectile = this.bossProjectiles.get(this.boss.x, this.boss.y, ASSET_KEYS.BOSS_FIREBALL_1) as Phaser.Physics.Arcade.Sprite;
    if (projectile) {
      projectile.setActive(true).setVisible(true).setDepth(6).setData('damage', 2);
      if (projectile.body) {
        (projectile.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        projectile.body.setSize(500, 500, true);
      }
      projectile.setScale(0.08);
      this.physics.moveToObject(projectile, this.player, 450);
      this.time.delayedCall(3000, () => projectile.destroy());
    }
  }

  private bossAttackNova(): void {
    if (!this.boss) return;
    const numProjectiles = 10;
    for (let i = 0; i < numProjectiles; i++) {
      const angle = (i / numProjectiles) * 360;
      const projectile = this.bossProjectiles.get(this.boss.x, this.boss.y, ASSET_KEYS.BOSS_FIREBALL_2) as Phaser.Physics.Arcade.Sprite;
      if (projectile) {
        projectile.setActive(true).setVisible(true).setDepth(6).setData('damage', 1);
        if (projectile.body) {
          (projectile.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
          projectile.body.setSize(500, 500, true);
          this.physics.velocityFromAngle(angle, 250, projectile.body.velocity);
        }
        projectile.setScale(0.06);
        this.time.delayedCall(4000, () => projectile.destroy());
      }
    }
  }

  private bossAttackMeteors(): void {
    const numMeteors = 6;
    for (let i = 0; i < numMeteors; i++) {
      this.time.delayedCall(i * 150, () => {
        const x = Phaser.Math.Between(0, GAME_WIDTH);
        const meteor = this.bossProjectiles.get(x, -50, ASSET_KEYS.BOSS_FIREBALL_1) as Phaser.Physics.Arcade.Sprite;
        if (meteor) {
          meteor.setActive(true).setVisible(true).setDepth(6).setData('damage', 2);
          meteor.setScale(0.08);
          if (meteor.body) {
            (meteor.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
            meteor.body.setSize(500, 500, true);
            meteor.body.velocity.y = 300;
          }
          this.time.delayedCall(5000, () => meteor.destroy());
        }
      });
    }
  }

  private bulletHitBoss(bossGameObject: GameObjectWithBody, bulletGameObject: GameObjectWithBody): void {
    const boss = bossGameObject as Phaser.Physics.Arcade.Sprite;
    const bullet = bulletGameObject as Phaser.Physics.Arcade.Sprite;
    if (!boss.active || !bullet.active) return;
    const damage = bullet.getData('damage') as number;
    const currentHealth = (boss.getData('health') || 0) - damage;
    boss.setData('health', currentHealth);
    this.displayDamageNumber(boss, damage);
    this.events.emit('bossHealthUpdate', { currentHealth: currentHealth, maxHealth: boss.getData('maxHealth') });
    if (currentHealth <= 0) this.defeatBoss();
    else { boss.setTint(0xffaaaa); this.time.delayedCall(100, () => { if (boss.active) boss.clearTint(); }); }
    bullet.destroy();
  }

  private defeatBoss(): void {
    if (!this.boss?.active) return;
    if (this.bossAttackTimer) this.bossAttackTimer.destroy();
    if (this.bossMoveTimer) this.bossMoveTimer.destroy();
    this.bossAttackTimer = undefined; this.bossMoveTimer = undefined;
    this.boss.destroy();
    this.boss = undefined;
    this.bossProjectiles.clear(true, true);
    this.setFlowState(GameFlowState.BossDefeated);
    this.events.emit('bossDefeatedShowScreen');
  }

  private handleContinueEndlessMode(): void {
    this.endlessModeActive = true;
    if (this.enemySpawnTimer) this.enemySpawnTimer.paused = false;
    this.setFlowState(GameFlowState.Playing);
  }

  public getPlayerAttributes(): PlayerAttributes {
    return this.playerAttributes;
  }

  public updateUI(): void {
    if (!this.scene.isActive()) return;
    this.events.emit('updateUIData', {
      health: this.playerAttributes.health,
      maxHealth: this.playerAttributes.maxHealth,
      wave: this.waveNumber,
      totalKills: this.totalKills,
      currentUpgradeProgressKills: Math.min(this.currentUpgradeProgressKills, this.killsRequiredForThisUpgrade),
      killsRequiredForThisUpgrade: this.killsRequiredForThisUpgrade,
      gold: this.playerAttributes.gold,
    });
  }

  public updateCelestialFury(): void {
    if (this.playerAttributes.celestialFuryLevel > 0) {
      if (this.celestialFuryTimer && !this.celestialFuryTimer.paused) return;
      if (this.celestialFuryTimer) this.celestialFuryTimer.destroy();
      this.celestialFuryTimer = this.time.addEvent({ delay: 2000, callback: this.triggerCelestialFuryStrikes, callbackScope: this, loop: true, paused: (this.currentFlowState !== GameFlowState.Playing && this.currentFlowState !== GameFlowState.BossFight) });
    } else if (this.celestialFuryTimer) {
      this.celestialFuryTimer.destroy();
      this.celestialFuryTimer = undefined;
    }
  }

  private triggerCelestialFuryStrikes(): void {
    if ((this.currentFlowState !== GameFlowState.Playing && this.currentFlowState !== GameFlowState.BossFight) || this.playerAttributes.celestialFuryLevel <= 0) return;
    const numBolts = this.playerAttributes.celestialFuryLevel;
    const damagePerBolt = this.playerAttributes.celestialFuryBaseDamage + (this.playerAttributes.celestialFuryLevel - 1) * this.playerAttributes.celestialFuryDamageBonusPerLevel;
    for (let i = 0; i < numBolts; i++) {
      this.time.delayedCall(i * 50, () => {
        if (this.currentFlowState === GameFlowState.Playing || this.currentFlowState === GameFlowState.BossFight) {
          const randomX = Phaser.Math.Between(20, GAME_WIDTH - 20);
          this.spawnLightningBolt(randomX, damagePerBolt);
        }
      });
    }
  }

  private spawnLightningBolt(boltX: number, damage: number): void {
    const lightningStrikeWidth = 30;
    const lightningVisualWidth = Phaser.Math.Between(15, 25);
    const visualBolt = this.add.sprite(boltX, GAME_HEIGHT / 2, ASSET_KEYS.LIGHTNING_BOLT).setTint(0xFFFF00).setDisplaySize(lightningVisualWidth, GAME_HEIGHT).setDepth(15).setAlpha(0.9);
    this.tweens.add({ targets: visualBolt, alpha: { from: 0.9, to: 0.3 }, duration: 200, ease: 'Cubic.easeOut', onComplete: () => { visualBolt.destroy(); } });
    const strikeArea = new Phaser.Geom.Rectangle(boltX - lightningStrikeWidth / 2, 0, lightningStrikeWidth, GAME_HEIGHT);
    const allTargets = [...this.imps.getChildren(), ...this.otherEnemies.getChildren()] as Phaser.Physics.Arcade.Sprite[];
    if (this.boss?.active) allTargets.push(this.boss);
    allTargets.forEach(target => {
      if (target.active && Phaser.Geom.Intersects.RectangleToRectangle(strikeArea, target.getBounds())) {
        if (target === this.boss) this.bulletHitBoss(target as GameObjectWithBody, { active: true, getData: () => damage, destroy: () => { } } as any);
        else this.applyLightningDamageToEnemy(target, damage, boltX);
      }
    });
    this.spawnLightningImpactParticles(boltX, GAME_HEIGHT - 20);
  }

  private applyLightningDamageToEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number, boltImpactX: number): void {
    if (!enemy.active) return;
    const enemyCurrentHealth = (enemy.getData('health') || 0) - damage;
    enemy.setData('health', enemyCurrentHealth);
    this.displayDamageNumber(enemy, damage);
    this.spawnLightningImpactParticles(boltImpactX, enemy.y < GAME_HEIGHT - 30 ? enemy.y : GAME_HEIGHT - 30);
    if (enemyCurrentHealth <= 0) { this.killEnemyByEffect(enemy); }
    else {
      enemy.setTint(0xFFFF99);
      this.time.delayedCall(100, () => {
        if (enemy.active) {
          const originalColor = enemy.getData('originalColor') as number | undefined;
          enemy.clearTint();
          if (originalColor && originalColor !== 0xffffff && enemy.getData('type') !== ENEMY_TYPES.IMP.type && enemy.getData('type') !== ENEMY_TYPES.FLYER.type && enemy.getData('type') !== ENEMY_TYPES.BRUTE.type) { enemy.setTint(originalColor); }
        }
      });
    }
  }

  private spawnLightningImpactParticles(x: number, y: number): void {
    const particleCount = Phaser.Math.Between(10, 20);
    const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = { lifespan: { min: 200, max: 500 }, speed: { min: 60, max: 150 }, angle: { min: 0, max: 360 }, scale: { start: Phaser.Math.FloatBetween(0.8, 1.2), end: 0.1, ease: 'Expo.easeOut' }, alpha: { start: 1, end: 0, ease: 'Quad.easeIn' }, gravityY: 100, blendMode: 'ADD', emitting: false, };
    const emitter = this.add.particles(x, y, ASSET_KEYS.LIGHTNING_BOLT_PARTICLE, emitterConfig);
    emitter.setDepth(16).explode(particleCount);
    this.time.delayedCall(700, () => { if (emitter?.active) emitter.destroy(); });
  }
}