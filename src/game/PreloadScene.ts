import Phaser from 'phaser';

import { GAME_WIDTH, GAME_HEIGHT, ASSET_KEYS, ENEMY_TYPES } from './constants';

export class PreloadScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.graphics = this.add.graphics().setVisible(false);

    // Load Start Screen image
    this.load.image(ASSET_KEYS.START_SCREEN_BG, 'https://i.imgur.com/10sO6Nb.jpeg');

    // Load Sounds
    this.load.audio(ASSET_KEYS.SOUND_SHOOT, 'https://files.catbox.moe/ec6gv0.mp3');
    this.load.audio(ASSET_KEYS.SOUND_BACKGROUND_MUSIC, 'https://raw.githubusercontent.com/Vipato/assets/b789eb4ba0fcaba5fb7c1582633af3d6b7706631/Untitled.mp3');

    // Load enemy death sounds
    this.load.audio(ASSET_KEYS.SOUND_IMP_DEATH, 'https://files.catbox.moe/io40yx.mp3');
    this.load.audio(ASSET_KEYS.SOUND_FLYER_DEATH, 'https://files.catbox.moe/pkp03k.mp3');
    this.load.audio(ASSET_KEYS.SOUND_BRUTE_DEATH, 'https://files.catbox.moe/x3baot.mp3');

    // Load Enemy, Gold and Player Sprites
    this.load.image(ASSET_KEYS.MED_ENEMY_SPRITE, 'https://i.imgur.com/2RBNzBM.png');
    this.load.image(ASSET_KEYS.FLYER_SPRITE, 'https://i.imgur.com/0ortiLL.png');
    this.load.image(ASSET_KEYS.BRUTE_SPRITE, 'https://i.imgur.com/dOfgPpq.png');
    this.load.image(ASSET_KEYS.GOLD_SPRITE, 'https://i.imgur.com/8l8XJxc.png');
    this.load.image(ASSET_KEYS.PLAYER_SPRITE, 'https://i.imgur.com/AdiDhDl.png');
    
    // Player Trail Particle
    if (!this.textures.exists(ASSET_KEYS.PLAYER_TRAIL)) {
        this.graphics.fillStyle(0xADD8E6, 0.5);
        this.graphics.fillCircle(8, 8, 8);
        this.graphics.generateTexture(ASSET_KEYS.PLAYER_TRAIL, 16, 16);
    }

    // Bullet Sprite
    if (!this.textures.exists(ASSET_KEYS.BULLET_SPRITE)) {
      this.graphics.fillStyle(0xffff00, 1);
      this.graphics.fillRect(0, 0, 10, 4);
      this.graphics.generateTexture(ASSET_KEYS.BULLET_SPRITE, 10, 4);
    }

    // IMP Projectile Sprite
    if (!this.textures.exists(ASSET_KEYS.IMP_PROJECTILE_SPRITE)) {
        this.graphics.fillStyle(0xFF4500, 1);
        this.graphics.fillCircle(5, 5, 5);
        this.graphics.generateTexture(ASSET_KEYS.IMP_PROJECTILE_SPRITE, 10, 10);
    }

    // Blood Particle Sprite
    if (!this.textures.exists(ASSET_KEYS.BLOOD_PARTICLE)) {
        this.graphics.fillStyle(0xff0000, 1);
        this.graphics.fillCircle(4, 4, 4);
        this.graphics.generateTexture(ASSET_KEYS.BLOOD_PARTICLE, 8, 8);
    }

    // Lightning Bolt Texture
    if (!this.textures.exists(ASSET_KEYS.LIGHTNING_BOLT)) {
        const lightningWidth = 10;
        const lightningHeight = 60;
        this.graphics.lineStyle(3, 0xffffff, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(lightningWidth / 2, 0);
        let currentY = 0;
        const segmentHeight = 15;
        const zigZagAmount = 5;
        let segments = 0;
        while(currentY < lightningHeight && segments < 10) {
            const nextY = Math.min(lightningHeight, currentY + segmentHeight);
            let randomX = (lightningWidth / 2) + Phaser.Math.Between(-zigZagAmount, zigZagAmount);
            randomX = Phaser.Math.Clamp(randomX, 0, lightningWidth);
            this.graphics.lineTo(randomX, nextY);
            currentY = nextY;
            segments++;
        }
         if (currentY < lightningHeight) {
            this.graphics.lineTo(lightningWidth / 2, lightningHeight);
        }
        this.graphics.strokePath();
        this.graphics.generateTexture(ASSET_KEYS.LIGHTNING_BOLT, lightningWidth, lightningHeight);
        this.graphics.clear();
    }

    // Lightning Bolt Particle
    if (!this.textures.exists(ASSET_KEYS.LIGHTNING_BOLT_PARTICLE)) {
        this.graphics.fillStyle(0xffff00, 1);
        this.graphics.fillCircle(3, 3, 3);
        this.graphics.generateTexture(ASSET_KEYS.LIGHTNING_BOLT_PARTICLE, 6, 6);
        this.graphics.clear();
    }

    // Load Boss assets
    this.load.image(ASSET_KEYS.BOSS_SPRITE, 'https://i.imgur.com/iBfrU9r.png');
    this.load.image(ASSET_KEYS.BOSS_FIREBALL_1, 'https://i.imgur.com/ifGftdL.png');
    this.load.image(ASSET_KEYS.BOSS_FIREBALL_2, 'https://i.imgur.com/STcKYXE.png');

    // Enemy Placeholders (if specific sprites aren't loaded)
    Object.values(ENEMY_TYPES).forEach(enemyType => {
      if (enemyType.assetKey !== ASSET_KEYS.MED_ENEMY_SPRITE &&
          enemyType.assetKey !== ASSET_KEYS.FLYER_SPRITE &&
          enemyType.assetKey !== ASSET_KEYS.BRUTE_SPRITE &&
          !this.textures.exists(enemyType.assetKey)) {
        this.graphics.fillStyle(enemyType.color || 0xffffff, 1);
        this.graphics.fillRect(0, 0, enemyType.size.width, enemyType.size.height);
        this.graphics.generateTexture(enemyType.assetKey, enemyType.size.width, enemyType.size.height);
        this.graphics.clear();
      }
    });
    
    // UI Placeholders
    if (!this.textures.exists(ASSET_KEYS.UPGRADE_BUTTON)) {
        this.graphics.fillStyle(0xCCCCCC, 1);
        this.graphics.fillRect(0, 0, 220, 60);
        this.graphics.lineStyle(2, 0x333333, 1);
        this.graphics.strokeRect(0, 0, 220, 60);
        this.graphics.generateTexture(ASSET_KEYS.UPGRADE_BUTTON, 220, 60);
        this.graphics.clear();
    }
    
    if (!this.textures.exists(ASSET_KEYS.ARENA_BACKGROUND)) {
        this.graphics.fillStyle(0x222222, 1);
        this.graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.graphics.generateTexture(ASSET_KEYS.ARENA_BACKGROUND, GAME_WIDTH, GAME_HEIGHT);
        this.graphics.clear();
    }
    
    if (!this.textures.exists(ASSET_KEYS.GROUND_TEXTURE)) {
        const tileWidth = 32;
        const tileHeight = 32;
        this.graphics.fillStyle(0x4a4a4a, 1);
        this.graphics.fillRect(0, 0, tileWidth, tileHeight);
        this.graphics.fillStyle(0x6b6b6b, 1);
        this.graphics.fillRect(0, 0, tileWidth, 4);
        this.graphics.lineStyle(1, 0x222222, 1);
        this.graphics.strokeRect(0, 0, tileWidth, tileHeight);
        this.graphics.generateTexture(ASSET_KEYS.GROUND_TEXTURE, tileWidth, tileHeight);
        this.graphics.clear();
    }

     if (!this.textures.exists(ASSET_KEYS.TILESET_IMAGE)) {
        this.graphics.fillStyle(0x555555, 1);
        this.graphics.fillRect(0, 0, 16, 16);
        this.graphics.lineStyle(1, 0x333333, 1);
        this.graphics.strokeRect(0, 0, 16, 16);
        this.graphics.generateTexture(ASSET_KEYS.TILESET_IMAGE, 16, 16);
        this.graphics.clear();
    }


    this.graphics.destroy();
  }

  create(): void {
    this.scene.start('StartScene');
  }
}