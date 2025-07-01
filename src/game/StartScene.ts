import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, ASSET_KEYS, INITIAL_MUSIC_VOLUME, INITIAL_SFX_VOLUME } from './constants';

export class StartScene extends Phaser.Scene {
  private optionsContainer!: Phaser.GameObjects.Container;
  private creditsContainer!: Phaser.GameObjects.Container;
  private musicVolumeText!: Phaser.GameObjects.Text;
  private sfxVolumeText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    // Set up registry defaults if they don't exist
    if (!this.game.registry.has('musicVolume')) {
      this.game.registry.set('musicVolume', INITIAL_MUSIC_VOLUME);
    }
    if (!this.game.registry.has('sfxVolume')) {
      this.game.registry.set('sfxVolume', INITIAL_SFX_VOLUME);
    }
    
    // Add background image
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.START_SCREEN_BG)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // --- Create Interactive Button Zones ---
    const startButton = this.add.zone(400, 265, 250, 60).setInteractive({ useHandCursor: true });
    const optionsButton = this.add.zone(400, 335, 220, 60).setInteractive({ useHandCursor: true });
    const creditsButton = this.add.zone(400, 405, 200, 55).setInteractive({ useHandCursor: true });

    // --- Button Hover Sound (Procedural) ---
    const playHoverSound = () => {
        // Don't play hover sound for underlying buttons when a menu is open
        if (this.optionsContainer.visible || this.creditsContainer.visible) return;
        
        // Use Web Audio API to generate a sound on the fly
        if (this.sound instanceof Phaser.Sound.WebAudioSoundManager) {
            const soundContext = this.sound.context;
            const oscillator = soundContext.createOscillator();
            const gainNode = soundContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(soundContext.destination);

            // Set sound properties for a short "blip"
            oscillator.type = 'triangle'; // A softer, less harsh tone than sine for UI
            oscillator.frequency.setValueAtTime(600, soundContext.currentTime); // A nice, noticeable pitch
            
            const sfxVolume = this.game.registry.get('sfxVolume') as number;
            gainNode.gain.setValueAtTime(sfxVolume * 0.4, soundContext.currentTime); // Set volume, slightly reduced
            // Quick fade out for a "plink" effect
            gainNode.gain.exponentialRampToValueAtTime(0.0001, soundContext.currentTime + 0.1); 

            oscillator.start(soundContext.currentTime);
            oscillator.stop(soundContext.currentTime + 0.1); // Play for 100ms
        }
    };


    // --- Button Listeners ---
    startButton.on('pointerover', playHoverSound);
    startButton.on('pointerdown', () => {
        // Prevent other buttons from being clicked while fading
        startButton.disableInteractive();
        optionsButton.disableInteractive();
        creditsButton.disableInteractive();
        
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('GameScene');
            this.scene.launch('UIScene');
        });
    });

    optionsButton.on('pointerover', playHoverSound);
    optionsButton.on('pointerdown', () => {
        this.creditsContainer.setVisible(false);
        this.optionsContainer.setVisible(true);
    });
    
    creditsButton.on('pointerover', playHoverSound);
    creditsButton.on('pointerdown', () => {
        this.optionsContainer.setVisible(false);
        this.creditsContainer.setVisible(true);
    });
    
    // Create popup containers
    this.createOptionsContainer();
    this.createCreditsContainer();
  }
  
  // --- Options Menu ---
  private createOptionsContainer(): void {
    this.optionsContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false).setDepth(100);
    
    const bg = this.add.graphics()
        .fillStyle(0x000033, 0.95)
        .fillRect(-GAME_WIDTH * 0.35, -GAME_HEIGHT * 0.4, GAME_WIDTH * 0.7, GAME_HEIGHT * 0.8);

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '32px', color: '#FFFF99', stroke: '#000000', strokeThickness: 5 };
    const menuTitle = this.add.text(0, -GAME_HEIGHT * 0.4 + 60, 'OPÇÕES', titleStyle).setOrigin(0.5);

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '16px', color: '#FFFFFF' };
    const volumeValueStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '16px', color: '#99FF99' };
    
    // Music Volume
    const musicLabelY = -GAME_HEIGHT * 0.4 + 160;
    const musicLabel = this.add.text(-180, musicLabelY, 'Música:', labelStyle).setOrigin(0, 0.5);
    this.musicVolumeText = this.add.text(40, musicLabelY, `${Math.round(this.game.registry.get('musicVolume') * 100)}%`, volumeValueStyle).setOrigin(0.5);
    
    // SFX Volume
    const sfxLabelY = musicLabelY + 70;
    const sfxLabel = this.add.text(-180, sfxLabelY, 'Efeitos:', labelStyle).setOrigin(0, 0.5);
    this.sfxVolumeText = this.add.text(40, sfxLabelY, `${Math.round(this.game.registry.get('sfxVolume') * 100)}%`, volumeValueStyle).setOrigin(0.5);

    this.optionsContainer.add([bg, menuTitle, musicLabel, this.musicVolumeText, sfxLabel, this.sfxVolumeText]);

    this.createVolumeButton(this.optionsContainer, 100, musicLabelY, '-', () => this.adjustVolume('music', -0.1));
    this.createVolumeButton(this.optionsContainer, 160, musicLabelY, '+', () => this.adjustVolume('music', 0.1));
    this.createVolumeButton(this.optionsContainer, 100, sfxLabelY, '-', () => this.adjustVolume('sfx', -0.1));
    this.createVolumeButton(this.optionsContainer, 160, sfxLabelY, '+', () => this.adjustVolume('sfx', 0.1));

    // Back Button
    this.createMenuButton(this.optionsContainer, 0, GAME_HEIGHT * 0.4 - 70, 'Voltar', 0xDDDDDD, () => this.optionsContainer.setVisible(false));
  }
  
  // --- Credits Screen ---
  private createCreditsContainer(): void {
      this.creditsContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false).setDepth(100);

      const bg = this.add.graphics()
          .fillStyle(0x1a1a1a, 0.95)
          .fillRect(-GAME_WIDTH * 0.35, -GAME_HEIGHT * 0.4, GAME_WIDTH * 0.7, GAME_HEIGHT * 0.8);

      const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '32px', color: '#99DDFF', stroke: '#000000', strokeThickness: 5 };
      const menuTitle = this.add.text(0, -GAME_HEIGHT * 0.4 + 60, 'CRÉDITOS', titleStyle).setOrigin(0.5);
      
      const textStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P", Arial', fontSize: '14px', color: '#FFFFFF', align: 'center', wordWrap: { width: GAME_WIDTH * 0.6 }, lineSpacing: 10 };
      const creditsTextContent = [
          'Um Jogo por:',
          'Vipato, Thurar, Dark e IA',
          '',
          'Design e Programação:',
          'Vipato, Dark e IA',
          '',
          'Arte:',
          'Thurar, Vipato, Dark e IA',
          '',
          'Motor de Jogo:',
          'Phaser 3'
      ];
      const creditsText = this.add.text(0, -50, creditsTextContent, textStyle).setOrigin(0.5);

      this.creditsContainer.add([bg, menuTitle, creditsText]);

      this.createMenuButton(this.creditsContainer, 0, GAME_HEIGHT * 0.4 - 70, 'Voltar', 0xDDDDDD, () => this.creditsContainer.setVisible(false));
  }

  // --- Helper methods for menu creation ---
  private createVolumeButton(container: Phaser.GameObjects.Container, x: number, y: number, text: string, callback: () => void): void {
      const btnSize = 40;
      const btnBg = this.add.image(x, y, ASSET_KEYS.UPGRADE_BUTTON)
          .setDisplaySize(btnSize, btnSize)
          .setTint(0xCCCCCC)
          .setInteractive({ useHandCursor: true });
      
      const btnText = this.add.text(x, y, text, { fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#000000', align: 'center' }).setOrigin(0.5);

      container.add([btnBg, btnText]);

      btnBg.on('pointerdown', callback);
      btnBg.on('pointerover', () => btnBg.setTint(0xFFFFFF));
      btnBg.on('pointerout', () => btnBg.setTint(0xCCCCCC));
  }

  private createMenuButton(container: Phaser.GameObjects.Container, x: number, y: number, text: string, color: number, callback: () => void): void {
      const btnBg = this.add.image(x, y, ASSET_KEYS.UPGRADE_BUTTON)
          .setDisplaySize(240, 50)
          .setTint(color)
          .setInteractive({ useHandCursor: true });
      
      const btnText = this.add.text(x, y, text, { fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#000000', align: 'center' }).setOrigin(0.5);
      
      container.add([btnBg, btnText]);

      btnBg.on('pointerdown', callback);
      btnBg.on('pointerover', () => btnBg.setTint(Phaser.Display.Color.HexStringToColor(Phaser.Display.Color.ValueToColor(color).brighten(20).rgba).color));
      btnBg.on('pointerout', () => btnBg.setTint(color));
  }
  
  private adjustVolume(type: 'music' | 'sfx', amount: number): void {
    if (type === 'music') {
        let currentVolume = this.game.registry.get('musicVolume');
        currentVolume = Phaser.Math.Clamp(currentVolume + amount, 0, 1);
        this.game.registry.set('musicVolume', currentVolume);
        this.musicVolumeText.setText(`${Math.round(currentVolume * 100)}%`);
    } else { // sfx
        let currentVolume = this.game.registry.get('sfxVolume');
        currentVolume = Phaser.Math.Clamp(currentVolume + amount, 0, 1);
        this.game.registry.set('sfxVolume', currentVolume);
        this.sfxVolumeText.setText(`${Math.round(currentVolume * 100)}%`);
    }
  }
}