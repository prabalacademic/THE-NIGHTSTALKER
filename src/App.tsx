import React, { useState } from 'react';
import { GameState, GameSettings, PlayerStats, MonsterState } from './types';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import GameMenu from './components/GameMenu';
import VirtualJoystick from './components/VirtualJoystick';
import StunnedAnimation from './components/StunnedAnimation';
import FullscreenButton from './components/FullscreenButton';
import { audio } from './utils/audio';
import { Monitor, Smartphone } from 'lucide-react';

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
  const [playerPlatform, setPlayerPlatform] = useState<'DESKTOP' | 'MOBILE' | null>(null);
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
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
  const [correctCount, setCorrectCount] = useState(0);
  const [isGlitchingAnger, setIsGlitchingAnger] = useState(false);
  const [showStunnedAnimation, setShowStunnedAnimation] = useState(false);
  const [speedBoost, setSpeedBoost] = useState(false);

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
    // Survive 3 continuous minutes (180 seconds) in chase to get THE_CHASED_ONE ending!
    if (gameState === 'PLAYING' && secs >= 180 && !showStunnedAnimation) {
      setShowStunnedAnimation(true);
      setSpeedBoost(true);
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
    setIsGlitchingAnger(false);
    setCompletionTime(0);
    setShowLeaveConfirmation(false);
    
    // Select a random question/riddle to solve before we can run
    const randomIdx = Math.floor(Math.random() * QUESTIONS.length);
    setCurrentQuestion(QUESTIONS[randomIdx]);
    
    setGameState('ENCOUNTER');
  };

  const handleAnswerOption = (option: string) => {
    if (!currentQuestion) return;

    if (option === currentQuestion.correctAnswer) {
      // Correct! Escape direct eye contact
      audio.triggerCorrectAnswer();
      // Logic for 3 correct answers to trigger WIN/THE_TRUTH
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      if (nextCorrect >= 3) {
        setGameState('THE_TRUTH');
      } else {
        // Get next question
        const randomIdx = Math.floor(Math.random() * QUESTIONS.length);
        setCurrentQuestion(QUESTIONS[randomIdx]);
      }
    } else {
      // Incorrect guess penalties
      audio.triggerWrongAnswer();
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);
      if (nextWrong >= 3) {
        setGameState('PLAYING');
      }
      // Eye color changes in GameCanvas based on wrongCount (0, 1, 2)
    }
  };

  // Keyboard shortcut for spacebar to break eye contact is removed (must answer riddle)
  // Instead, support keys 1, 2, 3, 4 to select answers!
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'ENCOUNTER') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const optionIdx = parseInt(e.key, 10) - 1;
          if (currentQuestion && currentQuestion.options[optionIdx]) {
            handleAnswerOption(currentQuestion.options[optionIdx]);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentQuestion]);

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
          correctCount={correctCount}
          speedBoost={speedBoost}
        />
      </div>

      {showStunnedAnimation && (
        <StunnedAnimation onComplete={() => {
          setShowStunnedAnimation(false);
          setSpeedBoost(false);
          setGameState('THE_CHASED_ONE');
        }} />
      )}

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

      {/* 3. Virtual Mobile Controllers overlay (Active when playing and player selected MOBILE) */}
      {gameState === 'PLAYING' && !showLeaveConfirmation && playerPlatform === 'MOBILE' && (
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
                  setPlayerPlatform(null);
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
          onStartGame={() => {
            audio.triggerClick();
            setShowPlatformSelector(true);
          }}
          onRestartGame={() => {
            audio.triggerClick();
            setShowPlatformSelector(true);
          }}
          onReturnToMenu={() => {
            audio.triggerClick();
            setPlayerPlatform(null);
            setGameState('MENU');
          }}
          fusesCollected={playerStats.fusesCollected}
          totalFuses={playerStats.totalFuses}
          completionTime={completionTime}
        />
      )}

      {/* 4b. Platform/Interface Selection Screen */}
      {showPlatformSelector && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#040408]/95 backdrop-blur-xl animate-fade-in select-none">
          {/* Subtle glowing red center flare */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.12)_0%,transparent_70%)] pointer-events-none" />

          <div className="w-full max-w-2xl mx-4 bg-zinc-950/90 border-2 border-zinc-800/60 p-6 md:p-10 rounded-2xl shadow-[0_0_80px_rgba(220,38,38,0.2)] flex flex-col items-center gap-8 relative z-10">
            {/* Corner visual tech lines */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-red-900/40" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-red-900/40" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-red-900/40" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-red-900/40" />

            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-[10px] text-red-500 font-mono font-bold tracking-[0.35em] uppercase animate-pulse">
                • SYSTEM CALIBRATION •
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase font-sans">
                CHOOSE CONTROL PLATFORM
              </h2>
              <p className="text-xs text-zinc-400 max-w-md font-mono mt-1">
                Calibrate your controller interface for the containment facility.
              </p>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
              {/* DESKTOP SELECTION */}
              <button
                onClick={() => {
                  audio.triggerPickup();
                  setPlayerPlatform('DESKTOP');
                  setShowPlatformSelector(false);
                  startEncounter();
                }}
                className="group relative bg-zinc-900/40 hover:bg-zinc-900/85 border border-zinc-800 hover:border-red-600/50 p-6 rounded-xl text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 flex flex-col gap-4 shadow-md hover:shadow-[0_0_30px_rgba(220,38,38,0.08)] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-red-600/40 flex items-center justify-center text-zinc-400 group-hover:text-red-500 transition-colors shadow-inner">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white tracking-wide font-sans group-hover:text-red-400 transition-colors">
                    DESKTOP INTERFACE
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1.5 leading-relaxed">
                    Optimized for desktop keyboard and mouse look. Screen remains completely clean.
                  </p>
                </div>
                <div className="mt-auto border-t border-zinc-800/80 pt-3 flex flex-col gap-1 text-[10px] text-zinc-500 font-mono">
                  <span className="text-zinc-300 font-bold">KEYS:</span>
                  <span>• WASD / Arrow Keys: Move</span>
                  <span>• Shift: Sprint</span>
                  <span>• Space: Jump</span>
                  <span>• F: Toggle Flashlight</span>
                </div>
              </button>

              {/* MOBILE SELECTION */}
              <button
                onClick={() => {
                  audio.triggerPickup();
                  setPlayerPlatform('MOBILE');
                  setShowPlatformSelector(false);
                  startEncounter();
                }}
                className="group relative bg-zinc-900/40 hover:bg-zinc-900/85 border border-zinc-800 hover:border-red-600/50 p-6 rounded-xl text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 flex flex-col gap-4 shadow-md hover:shadow-[0_0_30px_rgba(220,38,38,0.08)] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-red-600/40 flex items-center justify-center text-zinc-400 group-hover:text-red-500 transition-colors shadow-inner">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white tracking-wide font-sans group-hover:text-red-400 transition-colors">
                    MOBILE INTERFACE
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1.5 leading-relaxed">
                    Adds virtual touch joysticks and dedicated action keys for comfortable phone play.
                  </p>
                </div>
                <div className="mt-auto border-t border-zinc-800/80 pt-3 flex flex-col gap-1 text-[10px] text-zinc-500 font-mono">
                  <span className="text-zinc-300 font-bold">CONTROLS:</span>
                  <span>• On-Screen Touch Joystick</span>
                  <span>• Right-Side JUMP Button</span>
                  <span>• Quick Flashlight Toggle</span>
                  <span>• Slide Joystick to Exit Cover</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                audio.triggerClick();
                setShowPlatformSelector(false);
              }}
              className="mt-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 tracking-wider transition-colors cursor-pointer"
            >
              CANCEL CALIBRATION
            </button>
          </div>
        </div>
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
              <p className="text-xs text-gray-300 font-sans leading-relaxed tracking-wide">
                {wrongCount === 0 ? (
                  "The anomaly holds curious turquoise eye-contact. To desynchronize its gaze and gain an opening to run, you must override its anomalous wavelength by solving the security riddle."
                ) : wrongCount === 1 ? (
                  "Amber light envelopes its gaze! An incorrect override or excessive delay is agitating its synaptic core. Answer the riddle correctly before it reaches hostile state!"
                ) : (
                  "CRIMSON RAGE DETECTED. Core synaptic overload. Complete the riddle override immediately!"
                )}
              </p>
            </div>

            {/* Riddle Question Block */}
            {currentQuestion && (
              <div className="flex flex-col gap-2 relative z-10 border-t border-b border-zinc-800/80 py-3 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono font-bold text-red-500 tracking-wider">
                    ⚠️ SYNAPTIC OVERRIDE RIDDLE:
                  </span>
                </div>
                <p className="text-xs md:text-sm text-white font-sans font-bold leading-relaxed bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/40 text-left">
                  {currentQuestion.text}
                </p>
              </div>
            )}

            {/* Grid of Options */}
            {currentQuestion && (
              <div className="relative z-10 flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswerOption(option)}
                      className="group relative bg-zinc-900/60 hover:bg-red-950/20 border border-zinc-800 hover:border-red-600/40 p-3 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-99 flex items-center gap-3 cursor-pointer"
                    >
                      <span className="w-6 h-6 rounded bg-zinc-950 border border-zinc-800 group-hover:border-red-600/30 flex items-center justify-center text-[11px] font-mono font-bold text-zinc-500 group-hover:text-red-500 transition-colors shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">
                        {option}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-zinc-500 font-mono tracking-widest text-center mt-1 uppercase">
                  SOLVE CORRECTLY TO ESCAPE • KEYBOARD INPUT <span className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-zinc-400 font-bold">1 - 4</span> SUPPORTED
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
