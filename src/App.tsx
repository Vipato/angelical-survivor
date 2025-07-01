

import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser'; // Changed import style

import { PreloadScene } from './game/PreloadScene';
import { StartScene } from './game/StartScene';
import { GameScene } from './game/GameScene';
import { UIScene } from './game/UIScene';
import { GAME_WIDTH, GAME_HEIGHT } from './game/constants';

const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const [isGamePaused, setGamePaused] = useState(false);

  useEffect(() => {
    const bgContainer = document.getElementById('background-container');
    if (bgContainer) {
      if (isGamePaused) {
        bgContainer.classList.add('blurred');
      } else {
        bgContainer.classList.remove('blurred');
      }
    }
  }, [isGamePaused]);

  useEffect(() => {
    const gameDiv = gameContainerRef.current;
    
    const handleGameStateChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ isPaused: boolean }>;
        if (customEvent.detail) {
            setGamePaused(customEvent.detail.isPaused);
        }
    };

    if (gameDiv) {
      gameDiv.addEventListener('gameStateChange', handleGameStateChange);
    }

    // Ensure Phaser (the namespace) and Phaser.Game are defined before creating the game
    if (gameDiv && !gameInstanceRef.current && typeof Phaser !== 'undefined' && Phaser && Phaser.Game) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent: 'phaser-parent', // ID of the div to contain the Phaser canvas
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 600 }, // Apply global Y gravity for platformer
            debug: false, // Explicitly set to false to HIDE physics hitboxes
          },
        },
        scene: [PreloadScene, StartScene, GameScene, UIScene],
        transparent: true, // Make canvas transparent
      };
      gameInstanceRef.current = new Phaser.Game(config);

      // Attempt to resume audio context on first user interaction with the game container
      const resumeAudio = () => {
        if (gameInstanceRef.current && gameInstanceRef.current.sound) {
          // Check if the sound manager is a WebAudioSoundManager, which has the 'context' property
          if (gameInstanceRef.current.sound instanceof Phaser.Sound.WebAudioSoundManager) {
            const audioContext = gameInstanceRef.current.sound.context;
            if (audioContext && audioContext.state === 'suspended') {
              audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully.');
              }).catch(e => console.error('Error resuming AudioContext:', e));
            }
          } else {
            // For HTML5AudioSoundManager or NoAudioSoundManager, context is not available or not applicable.
            // console.log('AudioContext not available for this sound manager type.');
          }
        }
      };
      // Add listener to the game container itself
      gameDiv.addEventListener('pointerdown', resumeAudio, { once: true });

    } else if (typeof Phaser === 'undefined' || !Phaser || !Phaser.Game) {
      console.error('Phaser runtime or Phaser.Game is not available. Check Phaser import.');
    }

    return () => {
      // Cleanup Phaser game instance on component unmount
      if (gameDiv) {
        gameDiv.removeEventListener('gameStateChange', handleGameStateChange);
      }
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
      // Note: The event listener on gameDiv for resumeAudio is automatically removed
      // if {once: true} is supported and used. If not, manual removal would be needed here,
      // but modern browsers widely support {once: true}.
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen text-white p-4 pt-1">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 font-['Press_Start_2P']">
        Angelic Survivor
      </h1>
      <div id="game-container"
           className="relative overflow-hidden w-[800px] h-[600px] border-4 border-indigo-600 shadow-2xl shadow-indigo-500/50"
           style={{ width: `${GAME_WIDTH}px`, height: `${GAME_HEIGHT}px` }}>
        
        {/* Layer 1: Background Video */}
        <div id="background-container">
            <video autoPlay muted loop id="bg-video">
                <source src="https://raw.githubusercontent.com/Vipato/assets/a94647452acff2fa002185b3c3f71ec7df99e1ed/IbT1Phc.mp4" type="video/mp4" />
            </video>
        </div>
        
        {/* Layer 2: Phaser Canvas Parent. Positioned on top of the background. */}
        <div id="phaser-parent"
            ref={gameContainerRef}
            className="absolute top-0 left-0 w-full h-full"
        >
            {/* Phaser will append its canvas here */}
        </div>

      </div>
      <p className="mt-6 text-sm text-gray-400 font-['Press_Start_2P']">
        A,D: Mover | W: Pular | Q: Dash | M: Pausar | Clique: Atirar
      </p>
    </div>
  );
};

export default App;
