

import Phaser from 'phaser'; // Changed import style

import { GameScene } from './GameScene'; // Keep for type hint

export interface PlayerAttributes {
  health: number;
  maxHealth: number;
  speed: number;
  fireRate: number; // Cooldown in ms between shots
  damage: number;
  projectileSpeed: number;
  projectileLifespan: number;
  pierceCount: number; // How many enemies a projectile can pierce
  numProjectiles: number; // Number of projectiles fired at once
  isInvincible: boolean; // Added for invincibility frames
  invincibilityDuration: number; // Duration of invincibility in ms
  gold: number; // Player's current gold

  // Dash attributes
  isDashing: boolean;
  dashSpeedMultiplier: number;
  dashDuration: number;
  dashCooldown: number;
  lastDashTime: number;

  // Celestial Fury attributes
  celestialFuryLevel: number;
  celestialFuryBaseDamage: number;
  celestialFuryDamageBonusPerLevel: number;
}

export interface EnemyAttributes {
  type: string;
  health: number;
  speed: number;
  damage: number;
  scoreValue: number;
  color: number;
  size: { width: number, height: number };
  minGold: number; // Minimum gold dropped
  maxGold: number; // Maximum gold dropped
  assetKey: string; // Key for the sprite/texture of this enemy
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  // GameScene is optional as not all upgrades might need it
  apply: (attributes: PlayerAttributes, gameScene?: GameScene) => void;
}

// For game objects with physics body
export interface GameObjectWithBody extends Phaser.GameObjects.GameObject {
  body: Phaser.Physics.Arcade.Body;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  apply: (attributes: PlayerAttributes, gameScene?: GameScene) => void;
  // oneTimePurchase?: boolean; // Future: for items that can only be bought once ever
}

export interface BossAttributes {
  name: string;
  healthMultiplier: number;
  speed: number;
  hitboxScale: number;
  attackInterval: number;
  moveInterval: number;
  displaySize: { width: number, height: number };
}