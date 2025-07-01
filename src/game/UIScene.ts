

import Phaser from 'phaser'; // Changed import style

import { GAME_WIDTH, GAME_HEIGHT, ASSET_KEYS, INITIAL_PLAYER_ATTRIBUTES, UPGRADES_LIST, BASE_KILLS_FOR_UPGRADE, SHOP_ITEMS_LIST, INITIAL_MUSIC_VOLUME, INITIAL_SFX_VOLUME } from './constants';
import { Upgrade, ShopItem } from './types'; // Added ShopItem
import { GameScene } from './GameScene'; // Keep for type hint

export class UIScene extends Phaser.Scene {
  private waveText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text; 
  private goldText!: Phaser.GameObjects.Text; 
  private healthBarGraphics!: Phaser.GameObjects.Graphics;
  private healthBarMaxWidth: number = 150;
  private healthBarHeight: number = 20;
  private healthBarX: number = GAME_WIDTH - this.healthBarMaxWidth - 20;
  private healthBarY: number = 20;

  private upgradeContainer!: Phaser.GameObjects.Container;
  private upgradeButtonsGroup!: Phaser.GameObjects.Group;
  
  private shopContainer!: Phaser.GameObjects.Container;
  private shopItemsGroup!: Phaser.GameObjects.Group;

  private gameOverContainer!: Phaser.GameObjects.Container;
  private finalWaveTextGO!: Phaser.GameObjects.Text;
  private finalKillsTextGO!: Phaser.GameObjects.Text;

  // Pause Menu Elements
  private pauseMenuContainer!: Phaser.GameObjects.Container;
  private musicVolumeText!: Phaser.GameObjects.Text;
  private sfxVolumeText!: Phaser.GameObjects.Text;
  private currentMusicVolume: number = INITIAL_MUSIC_VOLUME;
  private currentSfxVolume: number = INITIAL_SFX_VOLUME;

  // Boss UI Elements
  private bossUIContainer!: Phaser.GameObjects.Container;
  private bossHealthBar!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;
  private bossHealthBarMaxWidth: number = GAME_WIDTH * 0.6;

  // Boss Defeated Screen
  private bossDefeatedContainer!: Phaser.GameObjects.Container;


  private gameSceneEventManager: Phaser.Events.EventEmitter | null = null;
  private gameSceneListenersAttached: boolean = false;
  private currentPlayerGoldForShop: number = 0;


  constructor() {
    super({ key: 'UIScene', active: true }); 
  }

  init() {
    this.gameSceneListenersAttached = false;
    this.gameSceneEventManager = null;
    this.currentPlayerGoldForShop = 0;
    this.currentMusicVolume = INITIAL_MUSIC_VOLUME;
    this.currentSfxVolume = INITIAL_SFX_VOLUME;
  }

  create(): void {
    if (!this.add || !this.events) {
      console.error("Phaser subsystems not initialized in UIScene.create.");
      return;
    }
    const fontStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Press Start 2P", Arial',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    };
    const goldFontStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Press Start 2P", Arial',
      fontSize: '18px',
      color: '#FFD700', 
      stroke: '#000000',
      strokeThickness: 4
    };


    this.waveText = this.add.text(20, 20, `Wave: 1`, fontStyle);
    this.killsText = this.add.text(20, 50, `Kills: 0`, fontStyle);
    this.xpText = this.add.text(20, 80, `XP: 0/${BASE_KILLS_FOR_UPGRADE}`, fontStyle);
    this.goldText = this.add.text(20, 110, `Gold: ${INITIAL_PLAYER_ATTRIBUTES.gold}`, goldFontStyle);


    this.healthBarGraphics = this.add.graphics();
    this.updateHealthDisplay(INITIAL_PLAYER_ATTRIBUTES.health, INITIAL_PLAYER_ATTRIBUTES.maxHealth);

    this.upgradeContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false).setDepth(100);
    this.upgradeButtonsGroup = this.add.group(); 

    this.shopContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false).setDepth(110); 
    this.shopItemsGroup = this.add.group();
    this.createShopScreenElements();

    this.gameOverContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false).setDepth(120);
    this.createGameOverScreenElements();

    this.pauseMenuContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false).setDepth(200);
    this.createPauseMenuElements();

    // Boss UI
    this.bossUIContainer = this.add.container(GAME_WIDTH / 2, 40).setVisible(false).setDepth(50);
    this.createBossUIElements();
    
    // Boss Defeated Screen
    this.bossDefeatedContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false).setDepth(130);
    this.createBossDefeatedScreen();

    this.tryAttachGameSceneListeners();
  }

  update(): void {
    if (!this.gameSceneListenersAttached) {
      this.tryAttachGameSceneListeners();
    }
  }

  private tryAttachGameSceneListeners(): void {
    if (this.gameSceneListenersAttached) return;

    const gameScene = this.scene.get('GameScene') as GameScene;
    if (gameScene && gameScene.scene.isActive() && gameScene.events) {
      this.gameSceneEventManager = gameScene.events;

      this.gameSceneEventManager.on('updateUIData', this.updateUIDisplay, this);
      this.gameSceneEventManager.on('showUpgrades', this.displayUpgrades, this);
      this.gameSceneEventManager.on('showShop', this.displayShop, this);
      this.gameSceneEventManager.on('closeShopUI', this.hideShop, this);
      this.gameSceneEventManager.on('itemPurchasedFeedback', this.handleItemPurchasedFeedback, this);
      this.gameSceneEventManager.on('gameOverDisplay', this.showGameOverScreen, this);
      
      // Pause Menu specific events
      this.gameSceneEventManager.on('showPauseMenu', this.displayPauseMenu, this);
      this.gameSceneEventManager.on('resumedFromPauseMenu', this.hidePauseMenu, this);
      
      // Boss Events
      this.gameSceneEventManager.on('bossSpawned', this.showBossHealthBar, this);
      this.gameSceneEventManager.on('bossHealthUpdate', this.updateBossHealthBar, this);
      this.gameSceneEventManager.on('bossDefeatedShowScreen', this.showBossDefeatedScreen, this);


      this.gameSceneListenersAttached = true;
      if (this.events) {
          this.events.emit('uiReadyForData');
      }
      console.log('UIScene: Listeners attached and uiReadyForData emitted.');
    }
  }

  shutdown(): void {
    if (this.gameSceneEventManager) {
        this.gameSceneEventManager.off('updateUIData', this.updateUIDisplay, this);
        this.gameSceneEventManager.off('showUpgrades', this.displayUpgrades, this);
        this.gameSceneEventManager.off('showShop', this.displayShop, this);
        this.gameSceneEventManager.off('closeShopUI', this.hideShop, this);
        this.gameSceneEventManager.off('itemPurchasedFeedback', this.handleItemPurchasedFeedback, this);
        this.gameSceneEventManager.off('gameOverDisplay', this.showGameOverScreen, this);
        this.gameSceneEventManager.off('showPauseMenu', this.displayPauseMenu, this);
        this.gameSceneEventManager.off('resumedFromPauseMenu', this.hidePauseMenu, this);
        // Boss Events
        this.gameSceneEventManager.off('bossSpawned', this.showBossHealthBar, this);
        this.gameSceneEventManager.off('bossHealthUpdate', this.updateBossHealthBar, this);
        this.gameSceneEventManager.off('bossDefeatedShowScreen', this.showBossDefeatedScreen, this);
    }
    this.gameSceneListenersAttached = false;
    this.gameSceneEventManager = null;

    if (this.waveText) this.waveText.destroy();
    if (this.killsText) this.killsText.destroy();
    if (this.xpText) this.xpText.destroy();
    if (this.goldText) this.goldText.destroy();
    if (this.healthBarGraphics) this.healthBarGraphics.destroy();
    if (this.upgradeContainer) this.upgradeContainer.destroy(true); 
    if (this.shopContainer) this.shopContainer.destroy(true);
    if (this.gameOverContainer) this.gameOverContainer.destroy(true); 
    if (this.pauseMenuContainer) this.pauseMenuContainer.destroy(true);
    if (this.bossUIContainer) this.bossUIContainer.destroy(true);
    if (this.bossDefeatedContainer) this.bossDefeatedContainer.destroy(true);
  }

  private updateUIDisplay(data: {
    health: number;
    maxHealth: number;
    wave: number;
    totalKills: number;
    currentUpgradeProgressKills: number;
    killsRequiredForThisUpgrade: number;
    gold: number; 
  }): void {
    if (!this.waveText || !this.killsText || !this.xpText || !this.goldText || !this.healthBarGraphics ||
        !this.waveText.scene || !this.killsText.scene || !this.xpText.scene || !this.goldText.scene || !this.healthBarGraphics.scene ||
        !this.waveText.active || !this.killsText.active || !this.xpText.active || !this.goldText.active || !this.healthBarGraphics.active) {
        return;
    }

    this.waveText.setText(`Wave: ${data.wave}`);
    this.killsText.setText(`Kills: ${data.totalKills}`);
    this.xpText.setText(`XP: ${data.currentUpgradeProgressKills}/${data.killsRequiredForThisUpgrade}`);
    this.goldText.setText(`Gold: ${data.gold}`);
    this.updateHealthDisplay(data.health, data.maxHealth);

    if (this.shopContainer.visible) {
        this.currentPlayerGoldForShop = data.gold;
    }
  }

  private updateHealthDisplay(currentHealth: number, maxHealth: number): void {
    if (!this.healthBarGraphics || !this.healthBarGraphics.scene || !this.healthBarGraphics.active) return;

    this.healthBarGraphics.clear();
    this.healthBarGraphics.fillStyle(0x333333, 1);
    this.healthBarGraphics.fillRect(this.healthBarX, this.healthBarY, this.healthBarMaxWidth, this.healthBarHeight);

    const healthPercentage = maxHealth > 0 ? Math.max(0, currentHealth) / maxHealth : 0;
    const currentBarWidth = this.healthBarMaxWidth * healthPercentage;

    if (currentHealth > 0 && currentBarWidth > 0) {
        this.healthBarGraphics.fillStyle(0x00ff00, 1);
        this.healthBarGraphics.fillRect(this.healthBarX, this.healthBarY, currentBarWidth, this.healthBarHeight);
    }

    this.healthBarGraphics.lineStyle(2, 0xffffff, 1);
    this.healthBarGraphics.strokeRect(this.healthBarX, this.healthBarY, this.healthBarMaxWidth, this.healthBarHeight);
  }

  private displayUpgrades(upgrades: Upgrade[]): void {
    if (this.pauseMenuContainer?.visible || this.shopContainer?.visible || this.gameOverContainer?.visible) return;
    
    this.upgradeContainer.setVisible(true);
    this.upgradeContainer.removeAll(true);

    const buttonHeight = 60;
    const padding = 20;
    const totalHeight = upgrades.length * buttonHeight + (upgrades.length - 1) * padding;
    let startY = -totalHeight / 2;

    const buttonTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: '"Press Start 2P", Arial',
        fontSize: '14px',
        color: '#000000',
        align: 'center',
        wordWrap: { width: 180 }
    };
    const descTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#222222',
        align: 'center',
        wordWrap: { width: 180 }
    };


    upgrades.forEach((upgrade, index) => {
        const buttonY = startY + index * (buttonHeight + padding);

        const buttonBg = this.add.image(0, buttonY, ASSET_KEYS.UPGRADE_BUTTON)
            .setDisplaySize(220, buttonHeight)
            .setTint(0xDDDDDD)
            .setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(0, buttonY - 10, upgrade.name, buttonTextStyle).setOrigin(0.5);
        const buttonDesc = this.add.text(0, buttonY + 12, upgrade.description, descTextStyle).setOrigin(0.5);

        this.upgradeContainer.add([buttonBg, buttonText, buttonDesc]);
        
        buttonBg.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (this.gameSceneEventManager) {
              this.gameSceneEventManager.emit('upgradeChosen', upgrade.id);
            }
            this.upgradeContainer.setVisible(false);
        });
        buttonBg.on(Phaser.Input.Events.POINTER_OVER, () => buttonBg.setTint(0xFFFFFF));
        buttonBg.on(Phaser.Input.Events.POINTER_OUT, () => buttonBg.setTint(0xDDDDDD));
    });
  }

  private createShopScreenElements(): void {
    const bg = this.add.graphics().fillStyle(0x111122, 0.9).fillRect(-GAME_WIDTH * 0.4, -GAME_HEIGHT * 0.4, GAME_WIDTH * 0.8, GAME_HEIGHT * 0.8);
    this.shopContainer.add(bg);

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: '"Press Start 2P", Arial',
        fontSize: '28px', color: '#FFD700', stroke: '#000000', strokeThickness: 5
    };
    const shopTitle = this.add.text(0, -GAME_HEIGHT * 0.4 + 40, 'LOJA', titleStyle).setOrigin(0.5);
    this.shopContainer.add(shopTitle);

    const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: '"Press Start 2P", Arial',
        fontSize: '16px', color: '#000000'
    };
    const closeButtonBg = this.add.image(0, GAME_HEIGHT * 0.4 - 50, ASSET_KEYS.UPGRADE_BUTTON)
      .setDisplaySize(180, 45)
      .setTint(0xAAAAFF) 
      .setInteractive({ useHandCursor: true });
    const closeButtonText = this.add.text(0, GAME_HEIGHT * 0.4 - 50, 'Fechar', buttonStyle).setOrigin(0.5); 
    this.shopContainer.add([closeButtonBg, closeButtonText]);

    closeButtonBg.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.gameSceneEventManager) {
          this.gameSceneEventManager.emit('closeShopRequested');
        }
    });
    closeButtonBg.on(Phaser.Input.Events.POINTER_OVER, () => closeButtonBg.setTint(0xCCCCFF));
    closeButtonBg.on(Phaser.Input.Events.POINTER_OUT, () => closeButtonBg.setTint(0xAAAAFF));
  }

  private displayShop(data: { items: ShopItem[], playerGold: number }): void {
    if (this.pauseMenuContainer?.visible || this.upgradeContainer?.visible || this.gameOverContainer?.visible) {
        return; 
    }

    this.currentPlayerGoldForShop = data.playerGold;
    this.shopContainer.setVisible(true);
    this.shopItemsGroup.clear(true, true); 

     while (this.shopContainer.list.length > 4) { 
        this.shopContainer.removeAt(4, true); 
    }


    const itemHeight = 80;
    const itemPadding = 15;
    const numItems = data.items.length;
    const totalItemsHeight = numItems * itemHeight + (numItems > 0 ? (numItems - 1) * itemPadding : 0);
    let startItemY = -GAME_HEIGHT * 0.4 + 40 + 40; 


    const nameStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '14px', color: '#FFFFFF', align: 'left', wordWrap: { width: 200 } };
    const descStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#BBBBBB', align: 'left', wordWrap: { width: 200 } };
    const costStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '14px', color: '#FFD700', stroke: '#442200', strokeThickness: 2, align: 'right' };
    const buyButtonStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '12px', color: '#000000' };


    data.items.forEach((item, index) => {
        const currentItemY = startItemY + index * (itemHeight + itemPadding);
        const canAfford = this.currentPlayerGoldForShop >= item.cost;

        const itemBg = this.add.graphics().fillStyle(0x333344, 0.7).fillRect(-GAME_WIDTH * 0.35, currentItemY - itemHeight / 2, GAME_WIDTH * 0.7, itemHeight);
        this.shopContainer.add(itemBg);
        this.shopItemsGroup.add(itemBg);


        const itemName = this.add.text(-GAME_WIDTH * 0.35 + 10, currentItemY - itemHeight/2 + 10, item.name, nameStyle);
        const itemDesc = this.add.text(-GAME_WIDTH * 0.35 + 10, currentItemY - itemHeight/2 + 30, item.description, descStyle);
        const itemCost = this.add.text(GAME_WIDTH * 0.35 - 90, currentItemY, `Custo: ${item.cost}`, costStyle).setOrigin(1, 0.5);
        
        const buyButtonBg = this.add.image(GAME_WIDTH * 0.35 - 45, currentItemY, ASSET_KEYS.UPGRADE_BUTTON)
            .setDisplaySize(80, 30)
            .setTint(canAfford ? 0x00DD00 : 0x888888);
        
        buyButtonBg.setData('isShopBuyButton', true);
        buyButtonBg.setData('shopItem', item);

        const buyButtonText = this.add.text(GAME_WIDTH * 0.35 - 45, currentItemY, 'Comprar', buyButtonStyle).setOrigin(0.5);

        this.shopContainer.add([itemName, itemDesc, itemCost, buyButtonBg, buyButtonText]);
        this.shopItemsGroup.addMultiple([itemName, itemDesc, itemCost, buyButtonBg, buyButtonText]);


        if (canAfford) {
            buyButtonBg.setInteractive({ useHandCursor: true })
                .on(Phaser.Input.Events.POINTER_DOWN, () => {
                    if (this.gameSceneEventManager) {
                        this.gameSceneEventManager.emit('itemPurchased', item.id);
                    }
                })
                .on(Phaser.Input.Events.POINTER_OVER, () => buyButtonBg.setTint(0x55FF55))
                .on(Phaser.Input.Events.POINTER_OUT, () => buyButtonBg.setTint(0x00DD00));
        }
    });
  }
  
  private handleItemPurchasedFeedback(data: { playerGold: number }): void {
    this.currentPlayerGoldForShop = data.playerGold;
    
    this.shopContainer.list.forEach(gameObject => {
      if (gameObject.getData && gameObject.getData('isShopBuyButton') === true) {
        const item = gameObject.getData('shopItem') as ShopItem;
        const buyButtonBg = gameObject as Phaser.GameObjects.Image; 

        if (!item) return; 

        const canAfford = this.currentPlayerGoldForShop >= item.cost;
        
        buyButtonBg.setTint(canAfford ? 0x00DD00 : 0x888888);

        if (canAfford) {
          if (!buyButtonBg.input || !buyButtonBg.input.enabled) { 
            buyButtonBg.setInteractive({ useHandCursor: true });
            
            // Re-bind listeners
            buyButtonBg.on(Phaser.Input.Events.POINTER_DOWN, () => {
                if (this.gameSceneEventManager) {
                    this.gameSceneEventManager.emit('itemPurchased', item.id);
                }
            })
            .on(Phaser.Input.Events.POINTER_OVER, () => buyButtonBg.setTint(0x55FF55))
            .on(Phaser.Input.Events.POINTER_OUT, () => buyButtonBg.setTint(0x00DD00));
          }
        } else {
          if (buyButtonBg.input && buyButtonBg.input.enabled) {
            buyButtonBg.disableInteractive();
          }
        }
      }
    });
  }


  private hideShop(): void {
    this.shopContainer.setVisible(false);
  }

  private createGameOverScreenElements(): void {
    const bg = this.add.graphics().fillStyle(0x000000, 0.7).fillRect(-GAME_WIDTH/2, -GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT);

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: '"Press Start 2P", Arial',
        fontSize: '32px', color: '#ff0000', stroke: '#000000', strokeThickness: 6
    };
    const scoreStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: '"Press Start 2P", Arial',
        fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    };
    const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: '"Press Start 2P", Arial',
        fontSize: '18px', color: '#000000'
    };


    const gameOverTitle = this.add.text(0, -100, 'FIM DE JOGO', titleStyle).setOrigin(0.5);
    this.finalWaveTextGO = this.add.text(0, -30, `Wave: 0`, scoreStyle).setOrigin(0.5);
    this.finalKillsTextGO = this.add.text(0, 10, `Kills: 0`, scoreStyle).setOrigin(0.5);

    const restartButtonBg = this.add.image(0, 80, ASSET_KEYS.UPGRADE_BUTTON)
      .setDisplaySize(200, 50)
      .setTint(0x00FF00)
      .setInteractive({ useHandCursor: true });
    const restartButtonText = this.add.text(0, 80, 'REINICIAR', buttonStyle).setOrigin(0.5);

    this.gameOverContainer.add([bg, gameOverTitle, this.finalWaveTextGO, this.finalKillsTextGO, restartButtonBg, restartButtonText]);

    restartButtonBg.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.gameSceneEventManager) {
          this.gameSceneEventManager.emit('restartGame');
        }
        this.gameOverContainer.setVisible(false);
    });
    restartButtonBg.on(Phaser.Input.Events.POINTER_OVER, () => restartButtonBg.setTint(0xAAFFAA));
    restartButtonBg.on(Phaser.Input.Events.POINTER_OUT, () => restartButtonBg.setTint(0x00FF00));
  }

  private showGameOverScreen(data: { wave: number; totalKills: number }): void {
    if (this.finalWaveTextGO && this.finalKillsTextGO) {
        this.finalWaveTextGO.setText(`Wave: ${data.wave}`);
        this.finalKillsTextGO.setText(`Kills: ${data.totalKills}`);
    }
    this.gameOverContainer.setVisible(true);
    if (this.upgradeContainer) this.upgradeContainer.setVisible(false);
    if (this.shopContainer) this.shopContainer.setVisible(false);
    if (this.pauseMenuContainer) this.pauseMenuContainer.setVisible(false);
    if (this.bossDefeatedContainer) this.bossDefeatedContainer.setVisible(false);
  }

  // --- Pause Menu Methods ---
  private createPauseMenuElements(): void {
    const bg = this.add.graphics()
        .fillStyle(0x000033, 0.85) // Dark blue, slightly transparent
        .fillRect(-GAME_WIDTH * 0.35, -GAME_HEIGHT * 0.35, GAME_WIDTH * 0.7, GAME_HEIGHT * 0.7)
        .lineStyle(3, 0x6666FF, 1)
        .strokeRect(-GAME_WIDTH * 0.35, -GAME_HEIGHT * 0.35, GAME_WIDTH * 0.7, GAME_HEIGHT * 0.7);
    this.pauseMenuContainer.add(bg);

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: '"Press Start 2P", Arial', fontSize: '32px', color: '#FFFF99', stroke: '#000000', strokeThickness: 5
    };
    const menuTitle = this.add.text(0, -GAME_HEIGHT * 0.35 + 50, 'PAUSA', titleStyle).setOrigin(0.5);
    this.pauseMenuContainer.add(menuTitle);

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '16px', color: '#FFFFFF' };
    const volumeValueStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '16px', color: '#99FF99' };
    const buttonCharStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '20px', color: '#000000' };

    // Music Volume
    const musicLabelY = -GAME_HEIGHT * 0.35 + 130;
    this.pauseMenuContainer.add(this.add.text(-180, musicLabelY, 'Música:', labelStyle).setOrigin(0, 0.5));
    this.musicVolumeText = this.add.text(40, musicLabelY, `${Math.round(this.currentMusicVolume * 100)}%`, volumeValueStyle).setOrigin(0.5);
    this.pauseMenuContainer.add(this.musicVolumeText);
    this.createVolumeButton(100, musicLabelY, '-', () => this.adjustVolume('music', -0.1));
    this.createVolumeButton(160, musicLabelY, '+', () => this.adjustVolume('music', 0.1));

    // SFX Volume
    const sfxLabelY = musicLabelY + 60;
    this.pauseMenuContainer.add(this.add.text(-180, sfxLabelY, 'Efeitos:', labelStyle).setOrigin(0, 0.5));
    this.sfxVolumeText = this.add.text(40, sfxLabelY, `${Math.round(this.currentSfxVolume * 100)}%`, volumeValueStyle).setOrigin(0.5);
    this.pauseMenuContainer.add(this.sfxVolumeText);
    this.createVolumeButton(100, sfxLabelY, '-', () => this.adjustVolume('sfx', -0.1));
    this.createVolumeButton(160, sfxLabelY, '+', () => this.adjustVolume('sfx', 0.1));
    
    // Resume Button
    const resumeButtonY = GAME_HEIGHT * 0.35 - 120;
    this.createMenuButton(0, resumeButtonY, 'Retomar', 0x99FF99, () => {
        if (this.gameSceneEventManager) this.gameSceneEventManager.emit('resumeGameRequested');
    });

    // Restart Button
    const restartButtonY = GAME_HEIGHT * 0.35 - 60;
    this.createMenuButton(0, restartButtonY, 'Reiniciar', 0xFF9999, () => {
        if (this.gameSceneEventManager) this.gameSceneEventManager.emit('restartGame');
        this.hidePauseMenu(); // Hide menu before restarting
    });
  }

  private createVolumeButton(x: number, y: number, text: string, callback: () => void): void {
    const btnSize = 40;
    const btnBg = this.add.image(x, y, ASSET_KEYS.UPGRADE_BUTTON) // Re-use for button shape
        .setDisplaySize(btnSize, btnSize)
        .setTint(0xCCCCCC)
        .setInteractive({ useHandCursor: true });
    
    const btnText = this.add.text(x, y, text, { fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#000000', align: 'center' }).setOrigin(0.5);

    this.pauseMenuContainer.add([btnBg, btnText]);

    btnBg.on(Phaser.Input.Events.POINTER_DOWN, callback);
    btnBg.on(Phaser.Input.Events.POINTER_OVER, () => btnBg.setTint(0xFFFFFF));
    btnBg.on(Phaser.Input.Events.POINTER_OUT, () => btnBg.setTint(0xCCCCCC));
  }
  
  private createMenuButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const btnBg = this.add.image(x, y, ASSET_KEYS.UPGRADE_BUTTON)
        .setDisplaySize(240, 50)
        .setTint(color)
        .setInteractive({ useHandCursor: true });
    
    const btnText = this.add.text(x, y, text, { fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#000000', align: 'center' }).setOrigin(0.5);
    
    this.pauseMenuContainer.add([btnBg, btnText]);

    btnBg.on(Phaser.Input.Events.POINTER_DOWN, callback);
    btnBg.on(Phaser.Input.Events.POINTER_OVER, () => btnBg.setTint(Phaser.Display.Color.HexStringToColor(Phaser.Display.Color.ValueToColor(color).brighten(20).rgba).color));
    btnBg.on(Phaser.Input.Events.POINTER_OUT, () => btnBg.setTint(color));
  }


  private adjustVolume(type: 'music' | 'sfx', amount: number): void {
    if (type === 'music') {
        this.currentMusicVolume = Phaser.Math.Clamp(this.currentMusicVolume + amount, 0, 1);
        this.game.registry.set('musicVolume', this.currentMusicVolume);
        this.musicVolumeText.setText(`${Math.round(this.currentMusicVolume * 100)}%`);
        if (this.gameSceneEventManager) this.gameSceneEventManager.emit('musicVolumeChanged', this.currentMusicVolume);
    } else {
        this.currentSfxVolume = Phaser.Math.Clamp(this.currentSfxVolume + amount, 0, 1);
        this.game.registry.set('sfxVolume', this.currentSfxVolume);
        this.sfxVolumeText.setText(`${Math.round(this.currentSfxVolume * 100)}%`);
        if (this.gameSceneEventManager) this.gameSceneEventManager.emit('sfxVolumeChanged', this.currentSfxVolume);
    }
  }

  private displayPauseMenu(data: { musicVolume: number, sfxVolume: number }): void {
    if (this.upgradeContainer?.visible || this.shopContainer?.visible || this.gameOverContainer?.visible) return;

    this.currentMusicVolume = data.musicVolume;
    this.currentSfxVolume = data.sfxVolume;
    this.musicVolumeText.setText(`${Math.round(this.currentMusicVolume * 100)}%`);
    this.sfxVolumeText.setText(`${Math.round(this.currentSfxVolume * 100)}%`);
    this.pauseMenuContainer.setVisible(true);
  }

  private hidePauseMenu(): void {
    this.pauseMenuContainer.setVisible(false);
  }

  // --- Boss UI Methods ---

  private createBossUIElements(): void {
    const barHeight = 25;
    const barY = 0;

    const bg = this.add.graphics().fillStyle(0x330000, 1).fillRect(-this.bossHealthBarMaxWidth / 2, barY, this.bossHealthBarMaxWidth, barHeight);
    this.bossHealthBar = this.add.graphics();

    const nameStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    this.bossNameText = this.add.text(0, barY - 20, '', nameStyle).setOrigin(0.5);

    this.bossUIContainer.add([bg, this.bossHealthBar, this.bossNameText]);
  }

  private showBossHealthBar(data: { name: string; maxHealth: number }): void {
    this.bossNameText.setText(data.name);
    this.updateBossHealthBar({ currentHealth: data.maxHealth, maxHealth: data.maxHealth });
    this.bossUIContainer.setVisible(true);
  }

  private updateBossHealthBar(data: { currentHealth: number; maxHealth: number }): void {
    if (!this.bossHealthBar || !this.bossHealthBar.scene || !this.bossHealthBar.active) return;
    this.bossHealthBar.clear();
    const percentage = data.maxHealth > 0 ? Math.max(0, data.currentHealth) / data.maxHealth : 0;
    const currentBarWidth = this.bossHealthBarMaxWidth * percentage;
    const barHeight = 25;
    const barY = 0;

    if (currentBarWidth > 0) {
      this.bossHealthBar.fillStyle(0xff0000, 1);
      this.bossHealthBar.fillRect(-this.bossHealthBarMaxWidth / 2, barY, currentBarWidth, barHeight);
    }
  }

  private hideBossHealthBar(): void {
    this.bossUIContainer.setVisible(false);
  }

  private createBossDefeatedScreen(): void {
    const bg = this.add.graphics().fillStyle(0x111122, 0.9).fillRect(-GAME_WIDTH * 0.4, -GAME_HEIGHT * 0.4, GAME_WIDTH * 0.8, GAME_HEIGHT * 0.8);

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '28px', color: '#FFD700', stroke: '#000000', strokeThickness: 5, align: 'center', wordWrap: { width: GAME_WIDTH * 0.7 } };
    const victoryTitle = this.add.text(0, -GAME_HEIGHT * 0.4 + 60, 'PARABÉNS!\nCHEFE DERROTADO!', titleStyle).setOrigin(0.5);

    const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '14px', color: '#000000' };
    
    // Continue Button
    const continueButtonBg = this.add.image(0, 50, ASSET_KEYS.UPGRADE_BUTTON)
      .setDisplaySize(300, 60)
      .setTint(0x99FF99)
      .setInteractive({ useHandCursor: true });
    const continueButtonText = this.add.text(0, 50, 'Continuar\n(Modo Infinito)', { ...buttonStyle, align: 'center', lineSpacing: 5 }).setOrigin(0.5);
    
    // End Run Button
    const endButtonBg = this.add.image(0, 140, ASSET_KEYS.UPGRADE_BUTTON)
      .setDisplaySize(300, 60)
      .setTint(0xFF9999)
      .setInteractive({ useHandCursor: true });
    const endButtonText = this.add.text(0, 140, 'Finalizar Corrida', buttonStyle).setOrigin(0.5);

    this.bossDefeatedContainer.add([bg, victoryTitle, continueButtonBg, continueButtonText, endButtonBg, endButtonText]);

    continueButtonBg.on('pointerdown', () => {
      if (this.gameSceneEventManager) {
        this.gameSceneEventManager.emit('continueEndlessMode');
      }
      this.bossDefeatedContainer.setVisible(false);
    });

    endButtonBg.on('pointerdown', () => {
      if (this.gameSceneEventManager) {
        this.gameSceneEventManager.emit('restartGame'); // Effectively ends run by going to start screen
      }
      this.bossDefeatedContainer.setVisible(false);
    });
  }

  private showBossDefeatedScreen(): void {
    this.hideBossHealthBar();
    this.bossDefeatedContainer.setVisible(true);
    if (this.upgradeContainer) this.upgradeContainer.setVisible(false);
    if (this.shopContainer) this.shopContainer.setVisible(false);
    if (this.pauseMenuContainer) this.pauseMenuContainer.setVisible(false);
  }

}