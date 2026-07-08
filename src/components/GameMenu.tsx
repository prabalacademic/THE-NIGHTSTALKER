import React, { useState, useEffect } from 'react';
import { Play, Volume2, Shield, Eye, Info, RefreshCw, LogOut, Moon, VolumeX, EyeOff } from 'lucide-react';
import { GameState, GameSettings } from '../types';

const noiseStyle = {
  backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='noise'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23noise)'/></svg>")`
};

interface GameMenuProps {
  gameState: GameState;
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onStartGame: () => void;
  onRestartGame: () => void;
  onReturnToMenu: () => void;
  fusesCollected: number;
  totalFuses: number;
  completionTime: number; // in seconds
  isAdmin: boolean;
  onAdminLogin: (id: string, pass: string) => void;
  onAdjustSpeed: () => void;
  onLogout: () => void;
}

export default function GameMenu({
  gameState,
  settings,
  onUpdateSettings,
  onStartGame,
  onRestartGame,
  onReturnToMenu,
  fusesCollected,
  totalFuses,
  completionTime,
  isAdmin,
  onAdminLogin,
  onAdjustSpeed,
  onLogout,
}: GameMenuProps) {
  const [activeTab, setActiveTab] = useState<'MAIN' | 'HOWTO' | 'DOSSIER' | 'SETTINGS'>('MAIN');
  const [glitchText, setGlitchText] = useState('NIGHTSTALKER');

  // Text glitch effect on the horror title
  useEffect(() => {
    if (gameState !== 'MENU') return;
    const originalText = 'NIGHTSTALKER';
    const interval = setInterval(() => {
      if (Math.random() < 0.15) {
        const glitched = originalText.split('').map((char) => {
          if (Math.random() < 0.2) return 'ØXØ'[Math.floor(Math.random() * 3)];
          return char;
        }).join('');
        setGlitchText(glitched);
        setTimeout(() => setGlitchText(originalText), 150);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  if (gameState === 'PLAYING') return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="absolute inset-0 bg-[#040408]/90 text-white flex flex-col items-center justify-center p-6 z-50 select-none overflow-y-auto">
      {/* Visual background static grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.08)_0%,transparent_75%)] pointer-events-none" />
      <div style={noiseStyle} className="absolute inset-0 opacity-[0.03] pointer-events-none" />

      {/* ==================== MAIN MENU ==================== */}
      {gameState === 'MENU' && (
        <div className="w-full max-w-md flex flex-col items-center gap-8 relative z-10 animate-fade-in text-center">
          {/* Logo / Title Header */}
          <div className="flex flex-col items-center">
            {/* Mountain Peak Logo matching the uploaded image */}
            <svg 
              viewBox="0 0 100 60" 
              className="w-24 h-16 md:w-28 md:h-20 text-red-600 fill-current mb-4 filter drop-shadow-[0_4px_12px_rgba(220,38,38,0.5)] transition-all duration-300 hover:scale-105"
            >
              <defs>
                <mask id="mountain-mask">
                  {/* Background of mask is white (keep everything) */}
                  <rect width="100" height="60" fill="white" />
                  {/* Center peak cutout (black removes) */}
                  <polygon points="50,10 57,26 46,42 51,31" fill="black" />
                  {/* Left peak cutout */}
                  <polygon points="31,31 34,35 33,38" fill="black" />
                  {/* Right peak cutout */}
                  <polygon points="68,25 74,35 71,38" fill="black" />
                </mask>
              </defs>
              {/* The solid mountain silhouette */}
              <path
                d="M 10,55 L 32,30 L 38,38 L 50,10 L 62,38 L 68,25 L 90,55 Z"
                mask="url(#mountain-mask)"
              />
            </svg>

            <span className="text-[10px] text-red-600 font-mono font-bold tracking-[0.4em] uppercase mb-1">
              • GET CHASED AND SURVIVE •
            </span>
            <h1
              id="game-logo"
              className="text-5xl md:text-6xl font-sans font-black tracking-tighter text-red-600 filter drop-shadow-[0_4px_8px_rgba(239,68,68,0.3)] select-none"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              {glitchText}
            </h1>
            <p className="text-gray-400 font-mono text-[11px] tracking-wider mt-2">
              A 3D horror simulator made by shreshth
            </p>
          </div>

          {/* Navigation Area */}
          {activeTab === 'MAIN' && (
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={onStartGame}
                id="btn-play-game"
                className="w-full py-4 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold tracking-widest uppercase rounded-lg border border-red-500 shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START GAME</span>
              </button>

              <button
                onClick={() => setActiveTab('HOWTO')}
                id="btn-menu-howto"
                className="w-full py-3.5 bg-gray-950/60 hover:bg-gray-900/60 text-gray-300 font-bold tracking-wider uppercase rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Info className="w-4 h-4" />
                <span>HOW TO PLAY</span>
              </button>

              <button
                onClick={() => setActiveTab('DOSSIER')}
                id="btn-menu-dossier"
                className="w-full py-3.5 bg-gray-950/60 hover:bg-gray-900/60 text-red-500 font-bold tracking-wider uppercase rounded-lg border border-red-500/10 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Eye className="w-4 h-4 text-red-500" />
                <span>MONSTER DOSSIER</span>
              </button>

              <button
                onClick={() => setActiveTab('SETTINGS')}
                id="btn-menu-settings"
                className="w-full py-3.5 bg-gray-950/60 hover:bg-gray-900/60 text-gray-300 font-bold tracking-wider uppercase rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Volume2 className="w-4 h-4" />
                <span>SETTINGS</span>
              </button>
              
              <button
                onClick={() => {
                  const id = prompt("Enter ID:");
                  const pass = prompt("Enter Password:");
                  if (id && pass) {
                    onAdminLogin(id, pass);
                  }
                }}
                className="w-full py-3.5 bg-gray-950/60 hover:bg-gray-900/60 text-yellow-500 font-bold tracking-wider uppercase rounded-lg border border-yellow-500/20 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <span>ADMIN LOGIN</span>
              </button>

              {isAdmin && (
                <button
                  onClick={onAdjustSpeed}
                  className="w-full py-3.5 bg-gray-950/60 hover:bg-gray-900/60 text-purple-500 font-bold tracking-wider uppercase rounded-lg border border-purple-500/20 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <span>ADJUST SPEED</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={onLogout}
                  className="w-full py-3.5 bg-gray-950/60 hover:bg-gray-900/60 text-red-500 font-bold tracking-wider uppercase rounded-lg border border-red-500/20 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <span>LOGOUT</span>
                </button>
              )}
            </div>
          )}

          {/* ==================== HOW TO PLAY ==================== */}
          {activeTab === 'HOWTO' && (
            <div className="w-full bg-black/60 border border-white/5 p-5 rounded-xl text-left flex flex-col gap-4 animate-scale-up">
              <h2 className="text-lg font-bold text-red-500 border-b border-white/10 pb-2 flex items-center gap-2">
                <Info className="w-5 h-5" /> Mission Dossier
              </h2>
              <div className="text-xs text-gray-300 space-y-3 leading-relaxed">
                <p>
                  You are trapped inside the <span className="text-white font-semibold">Black Painted Aarav Facility</span>. An ancient bio-organic predator, the <span className="text-red-500 font-bold">Nightstalker</span>, is hunting you.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><span className="text-white font-medium">Gather Objectives:</span> Find <span className="text-yellow-400 font-semibold">3 power fuses</span> rotating in deep rooms.</li>
                  <li><span className="text-white font-medium">Activate Portal:</span> Reach the bright green industrial gate to escape.</li>
                  <li><span className="text-white font-medium">Stealth Mechanism:</span> Running/jumping alerts the monster. Move cautiously. You can hide near dark pillar corridors.</li>
                  <li><span className="text-white font-medium">Stamina management:</span> Sprinting quickly exhausts you. Do not panic-run unless pursued!</li>
                </ul>

                <div className="bg-gray-950/80 p-3 rounded border border-white/10 mt-3">
                  <h3 className="font-bold text-white mb-2 uppercase text-[10px] tracking-wider">Roblox Mobile Touch Layout</h3>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                    <div className="flex flex-col">
                      <span className="text-white font-bold">Left Joystick:</span>
                      <span>Drag to move / Tilt more to Sprint.</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold">Right Button:</span>
                      <span>Tap to jump / Vault obstacles.</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('MAIN')}
                className="mt-2 py-2 w-full bg-white/10 hover:bg-white/15 text-white font-mono uppercase text-xs rounded transition-all"
              >
                Back to Main Menu
              </button>
            </div>
          )}

          {/* ==================== MONSTER DOSSIER ==================== */}
          {activeTab === 'DOSSIER' && (
            <div className="w-full bg-black/75 border border-red-500/20 p-5 rounded-xl text-left flex flex-col gap-4 animate-scale-up">
              <h2 className="text-lg font-bold text-red-500 border-b border-red-500/20 pb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500 animate-pulse" /> CLASSIFIED SPECIMEN FILE
              </h2>
              
              <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
                <div className="relative w-40 h-40 shrink-0 rounded-lg overflow-hidden border border-red-500/30 bg-black flex items-center justify-center shadow-lg">
                  <img 
                    src="/src/assets/images/monster_upscaled_1783416174709.jpg" 
                    alt="Upscaled Specimen" 
                    className="w-full h-full object-cover scale-105 saturate-[1.25] brightness-[0.85]"
                    referrerPolicy="no-referrer"
                  />
                  {/* Scanning scanline/glitch overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/20 to-transparent animate-pulse pointer-events-none" />
                </div>

                <div className="text-xs text-gray-300 space-y-2 leading-relaxed flex-1">
                  <div className="font-mono text-[10px] text-red-500 border-b border-white/5 pb-1 uppercase font-semibold">
                    Specimen: Nightstalker (Level 0 Entity)
                  </div>
                  <p>
                    Captured during surveillance inside the <span className="text-yellow-500 font-bold">Backrooms damp corridors</span>. Features dynamic morphing behavioral patterns:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-400 text-[11px]">
                    <li><strong className="text-white font-medium">Turquoise State (Curious):</strong> Eyes glow blue-green. Calm curiosity but tracks movement.</li>
                    <li><strong className="text-white font-medium">Amber State (Agitated):</strong> Eyes turn yellow-gold. Becomes reactive and swift if quiz responses fail.</li>
                    <li><strong className="text-white font-medium">Crimson State (Rage):</strong> Eyes turn full crimson red. Immediate hostility and maximum chase speed.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gray-950/80 p-3 rounded border border-red-500/10 mt-1">
                <h3 className="font-bold text-red-500 mb-1 uppercase text-[9px] tracking-wider">PREDATOR ASSESSMENT</h3>
                <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                  DO NOT maintain direct eye contact in Crimson state. Player must see everything to run and hide from the monster. Utilize hiding lockers placed across the modular Backrooms pillars to break line-of-sight.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('MAIN')}
                className="mt-2 py-2 w-full bg-white/10 hover:bg-white/15 text-white font-mono uppercase text-xs rounded transition-all"
              >
                Back to Main Menu
              </button>
            </div>
          )}

          {/* ==================== SETTINGS ==================== */}
          {activeTab === 'SETTINGS' && (
            <div className="w-full bg-black/60 border border-white/5 p-5 rounded-xl text-left flex flex-col gap-5 animate-scale-up">
              <h2 className="text-lg font-bold text-red-500 border-b border-white/10 pb-2 flex items-center gap-2">
                <Volume2 className="w-5 h-5" /> System Settings
              </h2>
              
              <div className="space-y-4">
                {/* Sound Settings */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-400 font-mono flex items-center justify-between">
                    <span>Master Audio</span>
                    <span>{Math.round(settings.volume * 100)}%</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                      className={`p-2 rounded ${settings.soundEnabled ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gray-900 text-gray-600'}`}
                    >
                      {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.volume}
                      onChange={(e) => onUpdateSettings({ ...settings, volume: parseFloat(e.target.value) })}
                      className="flex-1 accent-red-600 h-1.5 bg-gray-900 rounded-full cursor-pointer"
                    />
                  </div>
                </div>

                {/* Mouse/Touch Sensitivity */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-400 font-mono flex items-center justify-between">
                    <span>Look Sensitivity</span>
                    <span>{Math.round(settings.sensitivity * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={settings.sensitivity}
                    onChange={(e) => onUpdateSettings({ ...settings, sensitivity: parseFloat(e.target.value) })}
                    className="w-full accent-red-600 h-1.5 bg-gray-900 rounded-full cursor-pointer"
                  />
                </div>

                {/* Difficulty Levels */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-gray-400 font-mono">Monster Aggressiveness</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['EASY', 'NORMAL', 'HARD'] as const).map((dif) => (
                      <button
                        key={dif}
                        onClick={() => onUpdateSettings({ ...settings, difficulty: dif })}
                        className={`py-2 text-xs font-mono font-bold rounded transition-all border ${
                          settings.difficulty === dif
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-gray-950 border-white/5 text-gray-500 hover:text-white hover:bg-gray-900'
                        }`}
                      >
                        {dif}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('MAIN')}
                className="mt-2 py-2 w-full bg-white/10 hover:bg-white/15 text-white font-mono uppercase text-xs rounded transition-all"
              >
                Back to Main Menu
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================== GAME OVER ==================== */}
      {gameState === 'GAMEOVER' && (
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center animate-fade-in z-20">
          {/* Scare Overlay Visuals */}
          <div className="relative w-40 h-40 bg-red-950/20 border-2 border-red-500/30 rounded-full flex items-center justify-center animate-ping pointer-events-none absolute" />
          <div className="w-32 h-32 rounded-full bg-black border-4 border-red-700 flex items-center justify-center shadow-2xl shadow-red-900/60 z-10 animate-scale-up relative">
            {/* SVG scary skull or monster eyes */}
            <svg viewBox="0 0 100 100" className="w-24 h-24 text-red-600 fill-current animate-pulse">
              <path d="M 50,5 A 45,45 0 0,0 5,50 C 5,68 15,85 25,92 L 30,85 A 1,1 0 0,1 32,85 L 35,95 L 42,88 A 1,1 0 0,1 44,88 L 50,95 L 56,88 A 1,1 0 0,1 58,88 L 65,95 L 68,85 L 75,92 C 85,85 95,68 95,50 A 45,45 0 0,0 50,5 Z M 30,40 A 10,10 0 1,1 40,50 A 10,10 0 0,1 30,40 Z M 70,40 A 10,10 0 1,1 60,50 A 10,10 0 0,1 70,40 Z M 50,60 C 42,60 38,68 38,68 C 38,68 44,72 50,72 C 56,72 62,68 62,68 C 62,68 58,60 50,60 Z" />
            </svg>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-red-500 font-mono font-bold tracking-[0.3em] uppercase animate-pulse mb-1">
              SYSTEM REPORT: DECEASED
            </span>
            <h2 className="text-4xl font-black text-red-600 uppercase tracking-tighter">YOU WERE CAUGHT</h2>
            <p className="text-gray-400 text-xs mt-2 max-w-xs font-mono">
              The Nightstalker dragged you into the darkness of Black Painted Aarav.
            </p>
          </div>

          {/* Quick Stats on Fail */}
          <div className="bg-black/80 border border-white/5 px-6 py-3 rounded-lg font-mono text-xs text-gray-400 space-y-1 w-full text-left">
            <div className="flex justify-between">
              <span>Fuses Secured:</span>
              <span className="text-white font-bold">{fusesCollected} / {totalFuses}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Survived:</span>
              <span className="text-white font-bold">{formatTime(completionTime)}</span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={onRestartGame}
              id="btn-retry-game"
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold tracking-wider uppercase rounded-lg border border-red-500 shadow-md shadow-red-950/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>REDEPLOY IN BLACK PAINTED AARAV</span>
            </button>

            <button
              onClick={onReturnToMenu}
              id="btn-gameover-menu"
              className="w-full py-3 bg-gray-950/60 hover:bg-gray-900/60 text-gray-400 font-bold tracking-wider uppercase rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2 text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>RETURN TO MAIN STATION</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== WIN / SURVIVED ==================== */}
      {gameState === 'WIN' && (
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center animate-fade-in z-20">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-950/30 text-emerald-400 animate-bounce">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-[0.35em] uppercase mb-1 animate-pulse">
              STATUS: SECURE
            </span>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">YOU ESCAPED!</h2>
            <p className="text-gray-400 text-xs mt-2 max-w-xs font-mono">
              You powered up the spatial jump-gate and escaped the creature.
            </p>
          </div>

          {/* Escape Statistics */}
          <div className="bg-black/80 border border-emerald-500/20 p-5 rounded-lg font-mono text-xs text-gray-300 space-y-2.5 w-full text-left">
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>Mission Outcome:</span>
              <span className="text-emerald-400 font-bold uppercase">SUCCESS</span>
            </div>
            <div className="flex justify-between">
              <span>Objectives Restored:</span>
              <span className="text-white font-bold">{fusesCollected} / {totalFuses} Fuses</span>
            </div>
            <div className="flex justify-between">
              <span>Escape Duration:</span>
              <span className="text-emerald-400 font-bold">{formatTime(completionTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>Survival Score:</span>
              <span className="text-yellow-400 font-bold">
                {Math.max(100, Math.round(10000 / Math.max(10, completionTime)))} PTS
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={onRestartGame}
              id="btn-win-replay"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold tracking-wider uppercase rounded-lg border border-emerald-500 shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>DEPLOY AGAIN</span>
            </button>

            <button
              onClick={onReturnToMenu}
              id="btn-win-menu"
              className="w-full py-3 bg-gray-950/60 hover:bg-gray-900/60 text-gray-400 font-bold tracking-wider uppercase rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2 text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== THE TRUTH ENDING ==================== */}
      {gameState === 'THE_TRUTH' && (
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center animate-fade-in z-20">
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500 flex items-center justify-center shadow-lg shadow-amber-950/30 text-amber-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="flex flex-col items-center">
            {/* Mountain Peak Logo in Yellow/Gold */}
            <svg 
              viewBox="0 0 100 60" 
              className="w-20 h-12 text-amber-500 fill-current mb-3 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
            >
              <path d="M 10,55 L 32,30 L 38,38 L 50,10 L 62,38 L 68,25 L 90,55 Z" />
            </svg>

            <span className="text-[10px] text-amber-500 font-mono font-bold tracking-[0.35em] uppercase mb-1 animate-pulse">
              INTELLIGENCE OVERCOME: COMPLETED
            </span>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">THE TRUTH</h2>
            <p className="text-gray-400 text-xs mt-2 max-w-xs font-mono leading-relaxed">
              Your sharp intellect satisfied the creature's ancient curiosity. You did not have to run. The Facility has opened its secrets to you.
            </p>
          </div>

          {/* Escape Statistics */}
          <div className="bg-black/80 border border-amber-500/20 p-5 rounded-lg font-mono text-xs text-gray-300 space-y-2.5 w-full text-left">
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>Ending Route:</span>
              <span className="text-amber-400 font-bold uppercase font-mono">THE INTELLECTUAL</span>
            </div>
            <div className="flex justify-between">
              <span>Correct Answers:</span>
              <span className="text-white font-bold">3 / 3</span>
            </div>
            <div className="flex justify-between">
              <span>Monsters Pacified:</span>
              <span className="text-emerald-400 font-bold">1 (NIGHTSTALKER)</span>
            </div>
            <div className="flex justify-between">
              <span>Portal Integrity:</span>
              <span className="text-amber-400 font-bold">100% SECURE</span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={onRestartGame}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 active:scale-98 text-black font-bold tracking-wider uppercase rounded-lg border border-amber-500 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>TEST ENCOUNTER AGAIN</span>
            </button>

            <button
              onClick={onReturnToMenu}
              className="w-full py-3 bg-gray-950/60 hover:bg-gray-900/60 text-gray-400 font-bold tracking-wider uppercase rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== THE CHASED ONE ENDING ==================== */}
      {gameState === 'THE_CHASED_ONE' && (
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center animate-fade-in z-20">
          <div className="w-24 h-24 rounded-full bg-red-600/10 border border-red-600 flex items-center justify-center shadow-lg shadow-red-950/30 text-red-500">
            <Shield className="w-12 h-12" />
          </div>

          <div className="flex flex-col items-center">
            {/* Mountain Peak Logo in Red */}
            <svg 
              viewBox="0 0 100 60" 
              className="w-20 h-12 text-red-600 fill-current mb-3 filter drop-shadow-[0_2px_8px_rgba(220,38,38,0.4)]"
            >
              <path d="M 10,55 L 32,30 L 38,38 L 50,10 L 62,38 L 68,25 L 90,55 Z" />
            </svg>

            <span className="text-[10px] text-red-500 font-mono font-bold tracking-[0.35em] uppercase mb-1 animate-pulse">
              SURVIVAL HORIZON ACHIEVED
            </span>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase font-sans">THE CHASED ONE</h2>
            <p className="text-gray-400 text-xs mt-2 max-w-xs font-mono leading-relaxed">
              Against all mechanical odds, you survived the predator's maximum pursuit duration. The Black Painted Aarav containment doors automatically overrode.
            </p>
          </div>

          {/* Survival Statistics */}
          <div className="bg-black/80 border border-red-500/20 p-5 rounded-lg font-mono text-xs text-gray-300 space-y-2.5 w-full text-left">
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>Route Taken:</span>
              <span className="text-red-500 font-bold uppercase">UNREAL SURVIVAL</span>
            </div>
            <div className="flex justify-between">
              <span>Time Hunted:</span>
              <span className="text-white font-bold">{formatTime(completionTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration Target:</span>
              <span className="text-emerald-400 font-bold">5:00 MINS (300S)</span>
            </div>
            <div className="flex justify-between">
              <span>Predator Aggression:</span>
              <span className="text-red-400 font-bold">MAXIMAL ESCALATION</span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={onRestartGame}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold tracking-wider uppercase rounded-lg border border-red-500 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>TEST SURVIVAL AGAIN</span>
            </button>

            <button
              onClick={onReturnToMenu}
              className="w-full py-3 bg-gray-950/60 hover:bg-gray-900/60 text-gray-400 font-bold tracking-wider uppercase rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
