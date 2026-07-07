import React, { useState } from 'react';
import { GameState, GameSettings, PlayerStats, MonsterState } from './types';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import GameMenu from './components/GameMenu';
import VirtualJoystick from './components/VirtualJoystick';
import { audio } from './utils/audio';

interface Question {
  text: string;
  options: string[];
  correctAnswer: string;
}

const QUESTIONS: Question[] = [
  {
    text: "I have keys but no locks, space but no room, and you can enter but never go outside. What am I?",
    options: ["A map", "A keyboard", "A house", "A book"],
    correctAnswer: "A keyboard",
  },
  {
    text: "The more you take, the more you leave behind. What am I?",
    options: ["Time", "Money", "Footsteps", "Memories"],
    correctAnswer: "Footsteps",
  },
  {
    text: "What has hands but cannot clap?",
    options: ["A puppet", "A clock", "A statue", "A glove"],
    correctAnswer: "A clock",
  },
  {
    text: "What can travel around the world while staying in a corner?",
    options: ["A shadow", "A stamp", "Wind", "A whisper"],
    correctAnswer: "A stamp",
  },
  {
    text: "What belongs to you, but other people use it more than you do?",
    options: ["Your money", "Your name", "Your car", "Your secrets"],
    correctAnswer: "Your name",
  },
  {
    text: "I am light as a feather, yet the strongest person cannot hold me for five minutes. What am I?",
    options: ["Breath", "A bubble", "Water", "A secret"],
    correctAnswer: "Breath",
  }
];

const GLITCH_TEXTS = ["ØXØ WARNING ØXØ", "UNSTABLE BIOMASS", "HE IS ANGRY", "RUN", "SYSTEM UNSTABLE"];

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

  // Staring / Encounter state
  const [wrongCount, setWrongCount] = useState(0);
  const [crimsonCountdown, setCrimsonCountdown] = useState<number>(4);
  const [isGlitchingAnger, setIsGlitchingAnger] = useState(false);

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
    // Survive 5 continuous minutes (300 seconds) in chase to get THE_CHASED_ONE ending!
    if (gameState === 'PLAYING' && secs >= 300) {
      setGameState('THE_CHASED_ONE');
    }
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

  const startEncounter = () => {
    setWrongCount(0);
    setCrimsonCountdown(4);
    setIsGlitchingAnger(false);
    setCompletionTime(0);
    setShowLeaveConfirmation(false);
    setGameState('ENCOUNTER');
  };

  const handleBreakEyeContact = () => {
    audio.triggerPickup(); // nice mechanical escape clunk/transition sound
    setIsGlitchingAnger(true);
    setTimeout(() => {
      setIsGlitchingAnger(false);
      setGameState('PLAYING');
    }, 600);
  };

  // Manage Cinematic Staring sequence in ENCOUNTER state
  React.useEffect(() => {
    if (gameState !== 'ENCOUNTER') return;

    setWrongCount(0);
    setCrimsonCountdown(4);

    // 0s to 3s -> Turquoise (wrongCount === 0)
    // 3s to 6s -> Amber (wrongCount === 1)
    // 6s to 10s -> Crimson (wrongCount === 2)

    const timer1 = setTimeout(() => {
      setWrongCount(1);
      audio.triggerAngerSting();
    }, 3000);

    const timer2 = setTimeout(() => {
      setWrongCount(2);
      audio.triggerAngerSting();
    }, 6000);

    let countdownInterval: NodeJS.Timeout | null = null;
    
    const timer3 = setTimeout(() => {
      let timeLeft = 4;
      setCrimsonCountdown(4);
      
      countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCrimsonCountdown(timeLeft);
        if (timeLeft <= 0) {
          if (countdownInterval) clearInterval(countdownInterval);
          setGameState('GAMEOVER');
        }
      }, 1000);
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [gameState]);

  // Keyboard shortcut for spacebar to break eye contact & run
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'ENCOUNTER' && e.code === 'Space') {
        e.preventDefault();
        handleBreakEyeContact();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

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
          wrongCount={wrongCount}
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

      {/* 4. Fullscreen Overlay menus (Main Menu, Settings, Gameover, Win, Paused, endings) */}
      {gameState !== 'PLAYING' && gameState !== 'ENCOUNTER' && (
        <GameMenu
          gameState={gameState}
          settings={settings}
          onUpdateSettings={setSettings}
          onStartGame={startEncounter}
          onRestartGame={startEncounter}
          onReturnToMenu={() => setGameState('MENU')}
          fusesCollected={playerStats.fusesCollected}
          totalFuses={playerStats.totalFuses}
          completionTime={completionTime}
        />
      )}

      {/* 5. ENCOUNTER PHASE CINEMATIC OVERLAY */}
      {gameState === 'ENCOUNTER' && (
        <div className={`absolute inset-0 z-40 flex flex-col justify-between p-6 pointer-events-none transition-colors duration-500 ${isGlitchingAnger ? 'bg-red-950/40' : 'bg-transparent'}`}>
          {isGlitchingAnger && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/50 backdrop-blur-[2px] z-50 pointer-events-none animate-pulse">
              <span className="text-4xl md:text-6xl font-black text-red-600 tracking-wider font-sans select-none animate-bounce">
                BREAK EYE CONTACT!
              </span>
            </div>
          )}

          {/* Top telemetry panel */}
          <div className="w-full max-w-lg mx-auto bg-black/85 border-2 border-zinc-800 rounded-2xl p-5 backdrop-blur-xl pointer-events-auto flex flex-col gap-3 mt-4 shadow-2xl relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/10 border border-red-500 px-3 py-0.5 rounded-full text-[9px] font-mono font-bold text-red-500 tracking-[0.2em] uppercase animate-pulse">
              Eye-Contact Analysis
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-zinc-400 font-mono tracking-[0.2em] uppercase">
                ENTITY: THE NIGHTSTALKER
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                wrongCount === 0 ? 'bg-cyan-950/40 border-cyan-500 text-cyan-400 animate-pulse' :
                wrongCount === 1 ? 'bg-amber-950/40 border-amber-500 text-amber-400 animate-pulse' :
                'bg-red-950/60 border-red-600 text-red-500 animate-bounce'
              }`}>
                {wrongCount === 0 ? '• TURQUOISE CURIOUS •' :
                 wrongCount === 1 ? '• AMBER AGITATED •' :
                 '• CRIMSON RAGE STATE •'}
              </span>
            </div>

            {/* Stare Status Indicator Bars */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">1. CURIOUS</span>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div className={`h-full transition-all duration-500 ${wrongCount >= 0 ? 'bg-cyan-400 w-full' : 'w-0'}`} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">2. AGITATED</span>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div className={`h-full transition-all duration-500 ${wrongCount >= 1 ? 'bg-amber-500 w-full' : 'w-0'}`} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">3. HOSTILE</span>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div className={`h-full transition-all duration-500 ${wrongCount >= 2 ? 'bg-red-600 w-full' : 'w-0'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Crimson Warning Timer display */}
          {wrongCount === 2 && (
            <div className="w-full max-w-sm mx-auto p-4 bg-red-950/40 border border-red-600/30 rounded-xl backdrop-blur-md flex flex-col items-center justify-center gap-1 select-none pointer-events-none animate-pulse">
              <span className="text-[10px] font-mono font-black text-red-500 tracking-[0.25em] uppercase animate-ping">
                CRITICAL EXPOSURE WARNING
              </span>
              <span className="text-3xl md:text-5xl font-black text-white font-mono tracking-wider drop-shadow-[0_0_12px_rgba(239,68,68,0.7)] mt-1">
                {crimsonCountdown.toFixed(1)}s
              </span>
              <span className="text-[10px] font-mono text-red-400 mt-1">
                BREAK CONTACT IMMEDIATELY OR FACE DEATH!
              </span>
            </div>
          )}

          {/* Bottom dialogue / Action box */}
          <div className="w-full max-w-lg mx-auto bg-zinc-950/95 border-2 border-zinc-800/80 rounded-2xl p-6 backdrop-blur-2xl pointer-events-auto flex flex-col gap-5 mb-8 shadow-2xl relative overflow-hidden">
            <div className={`absolute inset-0 bg-red-600/5 transition-opacity duration-300 ${wrongCount > 0 ? 'opacity-100' : 'opacity-0'}`} />
            
            <div className="flex flex-col gap-1.5 relative z-10 text-left">
              <span className={`text-[10px] font-mono font-black tracking-wider uppercase ${
                wrongCount === 0 ? 'text-cyan-400' :
                wrongCount === 1 ? 'text-amber-400' :
                'text-red-500'
              }`}>
                {wrongCount === 0 ? 'THE NIGHTSTALKER WATCHES:' :
                 wrongCount === 1 ? 'THE MONSTER IS AGITATED:' :
                 '⚠️ DO NOT MAINTAIN DIRECT EYE CONTACT:'}
              </span>
              <p className="text-xs md:text-sm text-gray-300 font-sans leading-relaxed tracking-wide">
                {wrongCount === 0 ? (
                  "The anomaly stands frozen, holding curious turquoise eye-contact. It is observing your breathing rate. You are free to turn and escape, but wait too long and it will begin to agitate."
                ) : wrongCount === 1 ? (
                  "Its limbs begin to twitch as Amber light envelopes its gaze. Headlights are flickering, static hum rises. Break eye contact now before it enters full hostile rage!"
                ) : (
                  "The beast has entered CRIMSON RAGE state. Immediate hostility is imminent. Break eye-contact immediately, then run and utilize hiding lockers across the modular Backrooms pillars to break line-of-sight."
                )}
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="relative z-10 flex flex-col gap-2">
              <button
                onClick={handleBreakEyeContact}
                className="w-full py-4 bg-red-700 hover:bg-red-600 border border-red-500/50 hover:border-red-400 text-white font-bold tracking-[0.25em] uppercase rounded-xl transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-98 cursor-pointer text-xs md:text-sm font-sans flex items-center justify-center gap-2"
              >
                [ BREAK EYE CONTACT & RUN! ]
              </button>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest text-center">
                OR PRESS <span className="bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400">SPACEBAR</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
