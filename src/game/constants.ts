// src/game/constants.ts

// CORREÇÃO: Usamos 'import type' porque estamos importando apenas "formas" de dados (interfaces/types),
// não valores ou classes. O TypeScript moderno exige essa distinção.
import type { PlayerAttributes, EnemyAttributes, Upgrade, ShopItem, BossAttributes } from './types';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const BASE_KILLS_FOR_UPGRADE = 15;
export const INCREMENT_KILLS_PER_UPGRADE = 10;
export const KILLS_PER_WAVE_INCREMENT = 25;
export const WAVES_PER_SHOP = 5;
export const NUM_SHOP_ITEMS_TO_DISPLAY = 3;

export const INITIAL_MUSIC_VOLUME = 0.3;
export const INITIAL_SFX_VOLUME = 0.5;

export const INITIAL_PLAYER_ATTRIBUTES: PlayerAttributes = {
  health: 10,
  maxHealth: 10,
  speed: 200,
  fireRate: 500, // milliseconds
  damage: 1,
  projectileSpeed: 400,
  projectileLifespan: 1500, // milliseconds
  pierceCount: 1,
  numProjectiles: 1,
  isInvincible: false,
  invincibilityDuration: 750, // 0.75 seconds
  gold: 0, // Initial gold
  isDashing: false,
  dashSpeedMultiplier: 3.5,
  dashDuration: 180,
  dashCooldown: 750,
  lastDashTime: 0,
  celestialFuryLevel: 0,
  celestialFuryBaseDamage: 4,
  celestialFuryDamageBonusPerLevel: 2,
};

// ... (o resto do seu arquivo constants.ts pode permanecer exatamente o mesmo) ...
// (O conteúdo restante do arquivo já estava correto e não precisa de alterações)
export const ASSET_KEYS = {
  START_SCREEN_BG: 'start_screen_bg',
  PLAYER_SPRITE: 'player',
  PLAYER_TRAIL: 'player_trail',
  MED_ENEMY_SPRITE: 'med_enemy',
  IMP_SPRITE: 'imp_sprite',
  BRUTE_SPRITE: 'brute_sprite',
  FLYER_SPRITE: 'flyer_sprite',
  BULLET_SPRITE: 'bullet',
  GOLD_SPRITE: 'gold_coin',
  IMP_PROJECTILE_SPRITE: 'imp_projectile',
  GROUND_TEXTURE: 'ground_texture',
  TILESET_IMAGE: 'tiles',
  SOUND_SHOOT: 'shoot',
  SOUND_ENEMY_HIT: 'enemy_hit',
  SOUND_PLAYER_HIT: 'player_hit',
  SOUND_BACKGROUND_MUSIC: 'background_music',
  SOUND_IMP_DEATH: 'imp_death',
  SOUND_FLYER_DEATH: 'flyer_death',
  SOUND_BRUTE_DEATH: 'brute_death',
  UPGRADE_BUTTON: 'upgrade_button_placeholder',
  ARENA_BACKGROUND: 'arena_background_placeholder',
  BLOOD_PARTICLE: 'blood_particle',
  LIGHTNING_BOLT: 'lightning_bolt_texture',
  LIGHTNING_BOLT_PARTICLE: 'lightning_bolt_particle',
  BOSS_SPRITE: 'boss_sprite',
  BOSS_FIREBALL_1: 'boss_fireball_1',
  BOSS_FIREBALL_2: 'boss_fireball_2',
};

export const BOSS_WAVE = 15;

export const BOSS_ATTRIBUTES: BossAttributes = {
  name: 'Archdemon of the Abyss',
  healthMultiplier: 50,
  speed: 80,
  hitboxScale: 2.0,
  attackInterval: 2000,
  moveInterval: 3500,
  displaySize: { width: 230, height: 230 },
};

export const TRAIL_PARTICLE_DURATION = 350;
export const TRAIL_SPAWN_INTERVAL = 25;

export const ENEMY_TYPES: { [key: string]: EnemyAttributes } = {
  IMP: {
    type: 'IMP',
    health: 2,
    speed: 75,
    damage: 1,
    scoreValue: 10,
    color: 0xff0000,
    size: { width: 100, height: 100 },
    minGold: 0,
    maxGold: 3,
    assetKey: ASSET_KEYS.MED_ENEMY_SPRITE,
  },
  BRUTE: {
    type: 'BRUTE',
    health: 5,
    speed: 50,
    damage: 2,
    scoreValue: 25,
    color: 0x00ff00,
    size: { width: 144, height: 144 },
    minGold: 2,
    maxGold: 5,
    assetKey: ASSET_KEYS.BRUTE_SPRITE,
  },
  FLYER: {
    type: 'FLYER',
    health: 1,
    speed: 120,
    damage: 1,
    scoreValue: 15,
    color: 0xffff00,
    size: { width: 62, height: 62 },
    minGold: 1,
    maxGold: 4,
    assetKey: ASSET_KEYS.FLYER_SPRITE,
  },
};

export const GOLD_MAGNET_RADIUS = 600;
export const GOLD_MAGNET_SPEED = 120;

export const IMP_PROJECTILE_SPEED = 180;
export const IMP_PROJECTILE_DAMAGE_MULTIPLIER = 0.5;
export const IMP_PROJECTILE_LIFESPAN = 3000;
export const IMP_PROJECTILE_FIRE_RATE = 2500;
export const IMP_ATTACK_RANGE = 450;
export const IMP_STOP_Y_POSITION = GAME_HEIGHT * 0.4;

export const UPGRADES_LIST: Upgrade[] = [
  {
    id: 'health_up',
    name: 'Vida Extra',
    description: 'Aumenta a vida máxima em 2 e cura 2 de vida.',
    apply: (attr) => {
      attr.maxHealth += 2;
      attr.health = Math.min(attr.maxHealth, attr.health + 2);
    },
  },
  {
    id: 'speed_up',
    name: 'Velocidade Angelical',
    description: 'Aumenta a velocidade de movimento em 20%.',
    apply: (attr) => {
      attr.speed *= 1.2;
    },
  },
  {
    id: 'fire_rate_up',
    name: 'Cadência Aumentada',
    description: 'Reduz o tempo de recarga dos disparos em 20%.',
    apply: (attr) => {
      attr.fireRate = Math.max(100, attr.fireRate * 0.8);
    },
  },
  {
    id: 'damage_up',
    name: 'Potência Divina',
    description: 'Aumenta o dano dos projéteis em 1.',
    apply: (attr) => {
      attr.damage += 1;
    },
  },
  {
    id: 'projectile_speed_up',
    name: 'Projéteis Mais Rápidos',
    description: 'Aumenta a velocidade dos projéteis em 25%.',
    apply: (attr) => {
      attr.projectileSpeed *= 1.25;
    },
  },
  {
    id: 'pierce_up',
    name: 'Projéteis Perfurantes',
    description: 'Seus projéteis atravessam +1 inimigo.',
    apply: (attr) => {
      attr.pierceCount += 1;
    },
  },
  {
    id: 'multi_shot',
    name: 'Tiro Duplo',
    description: 'Dispara um projétil adicional. (Máx 3)',
    apply: (attr) => {
      if (attr.numProjectiles < 3) {
        attr.numProjectiles += 1;
      } else {
        attr.damage += 0.5;
      }
    },
  },
  {
    id: 'projectile_lifespan_up',
    name: 'Alcance Aumentado',
    description: 'Projéteis viajam 30% mais longe.',
    apply: (attr) => {
      attr.projectileLifespan *= 1.3;
    },
  },
  {
    id: 'heal_minor',
    name: 'Bênção Menor',
    description: 'Recupera 3 de vida.',
    apply: (attr) => {
      attr.health = Math.min(attr.maxHealth, attr.health + 3);
    },
  },
  {
    id: 'celestial_fury',
    name: 'Fúria Celestial',
    description: 'Raios caem a cada 2s. Nv.+: +1 raio, +2 dano/raio.',
    apply: (attr, gameScene) => {
      attr.celestialFuryLevel = (attr.celestialFuryLevel || 0) + 1;
      if (gameScene) {
        gameScene.updateCelestialFury();
      }
    },
  },
];

export const SHOP_ITEMS_LIST: ShopItem[] = [
  {
    id: 'shop_full_heal',
    name: 'Cura Completa',
    description: 'Restaura toda a vida.',
    cost: 50,
    apply: (attr) => {
      attr.health = attr.maxHealth;
    },
  },
  {
    id: 'shop_perm_damage_up',
    name: 'Dano Permanente +0.5',
    description: 'Aumenta o dano dos seus projéteis permanentemente.',
    cost: 100,
    apply: (attr) => {
      attr.damage += 0.5;
    },
  },
  {
    id: 'shop_perm_max_health_up',
    name: 'Vida Máx. Permanente +2',
    description: 'Aumenta sua vida máxima permanentemente em 2 e cura 2.',
    cost: 75,
    apply: (attr) => {
      attr.maxHealth += 2;
      attr.health = Math.min(attr.maxHealth, attr.health + 2);
    },
  },
  {
    id: 'shop_perm_fire_rate_boost',
    name: 'Cadência Perm. -5%',
    description: 'Reduz o tempo de recarga dos disparos permanentemente.',
    cost: 120,
    apply: (attr) => {
      attr.fireRate = Math.max(100, attr.fireRate * 0.95);
    },
  },
  {
    id: 'shop_perm_speed_boost',
    name: 'Velocidade Perm. +10%',
    description: 'Aumenta sua velocidade de movimento permanentemente.',
    cost: 80,
    apply: (attr) => {
      attr.speed *= 1.10;
    },
  },
];