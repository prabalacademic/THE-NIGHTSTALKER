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

  // Quiz/Encounter state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isGlitchingAnger, setIsGlitchingAnger] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<'NONE' | 'CORRECT' | 'WRONG'>('NONE');

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
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setQuizFeedback('NONE');
    setIsGlitchingAnger(false);
    setCompletionTime(0);
    setShowLeaveConfirmation(false);
    setGameState('ENCOUNTER');
  };

  const handleAnswerSelect = (optionText: string) => {
    const question = QUESTIONS[currentQuestionIndex];
    if (optionText === question.correctAnswer) {
      audio.triggerCorrectAnswer();
      setQuizFeedback('CORRECT');
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      
      if (nextCorrect >= 3) {
        setTimeout(() => {
          setGameState('THE_TRUTH');
          setQuizFeedback('NONE');
        }, 1500);
        return;
      }
    } else {
      audio.triggerWrongAnswer();
      audio.triggerAngerSting();
      setQuizFeedback('WRONG');
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);
      
      setIsGlitchingAnger(true);
      setTimeout(() => {
        setIsGlitchingAnger(false);
      }, 800);

      if (nextWrong >= 3) {
        setTimeout(() => {
          setGameState('PLAYING');
          setQuizFeedback('NONE');
        }, 1800);
        return;
      }
    }

    // Advance to next question
    setTimeout(() => {
      setQuizFeedback('NONE');
      setCurrentQuestionIndex((prev) => (prev + 1) % QUESTIONS.length);
    }, 1500);
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
          wrongCount={wrongCount}
          correctCount={correctCount}
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

      {/* 5. ENCOUNTER PHASE QUIZ OVERLAY */}
      {gameState === 'ENCOUNTER' && (
        <div className={`absolute inset-0 z-40 flex flex-col justify-between p-6 pointer-events-none transition-colors duration-500 ${isGlitchingAnger ? 'bg-red-950/40' : 'bg-transparent'}`}>
          {isGlitchingAnger && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/35 backdrop-blur-[1px] z-50 pointer-events-none animate-pulse">
              <span className="text-4xl md:text-6xl font-black text-red-600 tracking-wider font-sans select-none animate-bounce">
                {GLITCH_TEXTS[Math.floor(Math.random() * GLITCH_TEXTS.length)]}
              </span>
            </div>
          )}

          {/* Top stats bar */}
          <div className="w-full max-w-lg mx-auto bg-black/75 border border-zinc-800 rounded-xl p-4 backdrop-blur-md pointer-events-auto flex flex-col gap-2 mt-4 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-400 font-mono tracking-[0.2em] uppercase">
                ENCOUNTER IN PROGRESS
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                quizFeedback === 'CORRECT' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 animate-pulse' :
                quizFeedback === 'WRONG' ? 'bg-red-950/40 border-red-500 text-red-400 animate-pulse' :
                'bg-yellow-950/20 border-yellow-500/30 text-yellow-500'
              }`}>
                {quizFeedback === 'CORRECT' ? '• PLEASING CUE •' :
                 quizFeedback === 'WRONG' ? '• DISTORTED GROWL •' :
                 '• THE NIGHTSTALKER IS CURIOUS •'}
              </span>
            </div>

            {/* Score Trackers */}
            <div className="grid grid-cols-2 gap-4 mt-1">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-emerald-400">CALMNESS:</span>
                  <span className="text-white font-bold">{correctCount}/3</span>
                </div>
                <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${(correctCount / 3) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-red-500">ANGER LEVEL:</span>
                  <span className="text-white font-bold">{wrongCount}/3</span>
                </div>
                <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="bg-red-600 h-full transition-all duration-500" 
                    style={{ width: `${(wrongCount / 3) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom dialogue box */}
          <div className="w-full max-w-lg mx-auto bg-zinc-950/90 border-2 border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl pointer-events-auto flex flex-col gap-6 mb-8 shadow-2xl relative">
            <div className={`absolute inset-0 bg-red-600/5 rounded-2xl pointer-events-none transition-opacity duration-300 ${wrongCount > 0 ? 'opacity-100' : 'opacity-0'}`} />
            
            {/* Question Text */}
            <div className="flex flex-col gap-1 relative z-10 text-left">
              <span className="text-[10px] text-red-500 font-mono font-bold tracking-wider">
                THE NIGHTSTALKER SPEAKS:
              </span>
              <p className="text-sm md:text-base text-gray-100 font-sans leading-relaxed tracking-wide min-h-[50px]">
                {QUESTIONS[currentQuestionIndex].text}
              </p>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
              {QUESTIONS[currentQuestionIndex].options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswerSelect(opt)}
                  disabled={quizFeedback !== 'NONE'}
                  className={`w-full py-3.5 px-4 bg-zinc-900/60 hover:bg-zinc-800 border rounded-xl text-left text-xs md:text-sm font-mono tracking-wide text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group active:scale-98 ${
                    quizFeedback !== 'NONE' ? 'opacity-50 cursor-not-allowed' : 'border-zinc-800 hover:border-red-600/50'
                  }`}
                >
                  <span>{opt}</span>
                  <span className="text-[10px] text-zinc-500 group-hover:text-red-500 transition-colors">
                    [SELECT]
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
