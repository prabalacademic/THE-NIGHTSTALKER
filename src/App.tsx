import React, { useState } from 'react';
import { GameState, GameSettings, PlayerStats, MonsterState } from './types';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import GameMenu from './components/GameMenu';
import VirtualJoystick from './components/VirtualJoystick';
import { audio } from './utils/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  const [settings, setSettings] = useState<GameSettings>({
    volume: 0.5,
    sensitivity: 1.0,
    difficulty: 'NORMAL',
    musicEnabled: true,
    soundEnabled: true,
  });

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    score: 0,
    fusesCollected: 0,
    totalFuses: 3,
    flashlightOn: true,
    isInsideHidingSpot: false,
  });

  const [monsterState, setMonsterState] = useState<MonsterState>('PATROL');
  const [monsterDistance, setMonsterDistance] = useState<number>(999);
  const [completionTime, setCompletionTime] = useState<number>(0);

  // Touch & Keyboard joystick direction vector
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [jumpTriggered, setJumpTriggered] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  // Callbacks from GameCanvas
  const handleUpdatePlayerStats = (stats: PlayerStats) => {
    setPlayerStats(stats);
  };

  const handleUpdateMonsterStats = (state: MonsterState, distance: number) => {
    setMonsterState(state);
    setMonsterDistance(distance);
  };

  const handleGameOver = () => {
    setGameState('GAMEOVER');
  };

  const handleWin = () => {
    setGameState('WIN');
  };

  const handleTrackCompletionTime = (secs: number) => {
    setCompletionTime(secs);
  };

  // Controller Handlers
  const handleJoystickMove = (vector: { x: number; y: number }) => {
    setJoystickVector(vector);
  };

  const handleJump = () => {
    setJumpTriggered(true);
  };

  const handleResetJump = () => {
    setJumpTriggered(false);
  };

  const handleToggleFlashlight = () => {
    setPlayerStats((prev) => ({
      ...prev,
      flashlightOn: !prev.flashlightOn,
    }));
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col justify-center select-none">
      {/* 1. Main 3D Canvas rendering underlay */}
      <div className="absolute inset-0 w-full h-full z-0">
        <GameCanvas
          gameState={gameState}
          settings={settings}
          onUpdatePlayerStats={handleUpdatePlayerStats}
          onUpdateMonsterStats={handleUpdateMonsterStats}
          onGameOver={handleGameOver}
          onWin={handleWin}
          onTrackCompletionTime={handleTrackCompletionTime}
          joystickVector={showLeaveConfirmation ? { x: 0, y: 0 } : joystickVector}
          jumpTriggered={showLeaveConfirmation ? false : jumpTriggered}
          onResetJump={handleResetJump}
          flashlightOn={playerStats.flashlightOn}
          onToggleFlashlight={handleToggleFlashlight}
        />
      </div>

      {/* 2. Interactive Game HUD overlay (Active when playing) */}
      {gameState === 'PLAYING' && (
        <GameHUD
          playerStats={playerStats}
          monsterState={monsterState}
          monsterDistance={monsterDistance}
          onLeaveClick={() => {
            audio.triggerClick();
            setShowLeaveConfirmation(true);
          }}
        />
      )}

      {/* 3. Virtual Mobile Controllers overlay (Active when playing) */}
      {gameState === 'PLAYING' && !showLeaveConfirmation && (
        <VirtualJoystick
          onMove={handleJoystickMove}
          onJump={handleJump}
          flashlightOn={playerStats.flashlightOn}
          onToggleFlashlight={handleToggleFlashlight}
          isHiding={playerStats.isInsideHidingSpot}
        />
      )}

      {/* Leave Confirmation Overlay Modal */}
      {gameState === 'PLAYING' && showLeaveConfirmation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm mx-4 bg-zinc-950/90 border-2 border-red-900/40 p-8 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col items-center text-center gap-6 relative">
            
            {/* The Mountain Peak Logo matching the heading */}
            <svg 
              viewBox="0 0 100 60" 
              className="w-24 h-16 text-red-600 fill-current filter drop-shadow-[0_4px_12px_rgba(220,38,38,0.5)] animate-pulse"
            >
              <defs>
                <mask id="mountain-mask-leave">
                  <rect width="100" height="60" fill="white" />
                  <polygon points="50,10 57,26 46,42 51,31" fill="black" />
                  <polygon points="31,31 34,35 33,38" fill="black" />
                  <polygon points="68,25 74,35 71,38" fill="black" />
                </mask>
              </defs>
              <path
                d="M 10,55 L 32,30 L 38,38 L 50,10 L 62,38 L 68,25 L 90,55 Z"
                mask="url(#mountain-mask-leave)"
              />
            </svg>

            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold font-sans text-red-500 tracking-wider">
                WOULD YOU LIKE TO LEAVE?
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Your progress in this run will be lost.
              </p>
            </div>

            <div className="w-full flex gap-4">
              <button
                onClick={() => {
                  audio.triggerClick();
                  setShowLeaveConfirmation(false);
                  setGameState('MENU');
                }}
                className="flex-1 bg-red-600/25 hover:bg-red-600 border border-red-600 px-4 py-2.5 rounded-lg text-white font-mono font-bold text-sm tracking-wider transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] cursor-pointer"
              >
                YES
              </button>
              <button
                onClick={() => {
                  audio.triggerClick();
                  setShowLeaveConfirmation(false);
                }}
                className="flex-1 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-600/50 px-4 py-2.5 rounded-lg text-gray-300 font-mono font-bold text-sm tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Fullscreen Overlay menus (Main Menu, Settings, Gameover, Win, Paused) */}
      {gameState !== 'PLAYING' && (
        <GameMenu
          gameState={gameState}
          settings={settings}
          onUpdateSettings={setSettings}
          onStartGame={() => {
            setShowLeaveConfirmation(false);
            setGameState('PLAYING');
          }}
          onRestartGame={() => {
            setShowLeaveConfirmation(false);
            setGameState('PLAYING');
          }}
          onReturnToMenu={() => setGameState('MENU')}
          fusesCollected={playerStats.fusesCollected}
          totalFuses={playerStats.totalFuses}
          completionTime={completionTime}
        />
      )}
    </div>
  );
}
