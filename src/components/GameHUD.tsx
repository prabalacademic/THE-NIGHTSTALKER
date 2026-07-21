import React from 'react';
import { Shield, Zap, Key, Activity, Eye, AlertTriangle } from 'lucide-react';
import { PlayerStats, MonsterState } from '../types';

interface GameHUDProps {
  playerStats: PlayerStats;
  monsterState: MonsterState;
  monsterDistance: number;
  onLeaveClick: () => void;
}

export default function GameHUD({ playerStats, monsterState, monsterDistance, onLeaveClick }: GameHUDProps) {
  const staminaPercent = Math.max(0, Math.min(100, playerStats.stamina));
  
  // Calculate proximity intensity
  // Safe distance is > 40 units. Critical distance is < 8 units.
  const proximityIntensity = Math.max(0, Math.min(1, (30 - monsterDistance) / 25));

  // Determine stamina color
  const getStaminaColor = () => {
    if (staminaPercent < 20) return 'bg-red-500 shadow-red-500/50 animate-pulse';
    if (staminaPercent < 50) return 'bg-yellow-500 shadow-yellow-500/50';
    return 'bg-emerald-400 shadow-emerald-400/50';
  };

  const isPortalUnlocked = playerStats.fusesCollected >= playerStats.totalFuses;

  return (
    <div className={`absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-2 sm:p-4 md:p-6 transition-opacity duration-300 ${
      monsterState === 'CHASE' && proximityIntensity > 0.7 ? 'opacity-95' : 'opacity-100'
    }`}>
      {/* 1. Immersive Tension Vignette (Pulses & closes in based on proximity) */}
      {proximityIntensity > 0 && (
        <div
          style={{
            opacity: proximityIntensity * 0.9,
            borderWidth: `${Math.max(16, 16 + proximityIntensity * 96)}px`,
            borderColor: monsterState === 'CHASE' ? 'rgba(127, 29, 29, 0.8)' : 'rgba(88, 28, 135, 0.45)',
            animationDuration: monsterState === 'CHASE' ? `${Math.max(0.25, 1.2 - proximityIntensity * 1.05)}s` : '2.0s',
          }}
          className={`absolute inset-0 pointer-events-none transition-all duration-150 z-0 animate-pulse`}
        />
      )}

      {/* 1b. Chromatic Aberration & Radial Blood Gradients */}
      {proximityIntensity > 0.3 && (
        <div
          style={{
            background: `radial-gradient(circle, transparent 20%, rgba(${monsterState === 'CHASE' ? '220, 38, 38' : '124, 58, 237'}, ${proximityIntensity * 0.45}) 100%)`
          }}
          className="absolute inset-0 pointer-events-none z-0"
        />
      )}

      {/* 1c. CRT Scanline / Noise Static Interference (Vibrates and flickers when being chased) */}
      {monsterState === 'CHASE' && (
        <div className="absolute inset-0 pointer-events-none z-0 mix-blend-overlay opacity-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] animate-pulse" />
      )}

      {/* 1d. Red Glitch Warnings across the screen */}
      {monsterState === 'CHASE' && proximityIntensity > 0.6 && (
        <div className="absolute top-28 left-6 right-6 flex flex-col items-center justify-center gap-1.5 animate-pulse z-20">
          <div className="bg-red-600/10 border border-red-500/50 px-3 py-1.5 rounded-md backdrop-blur-md flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-red-500 uppercase">
              CRITICAL THREAT RANGE
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-400">
            DUE TO HIGH SIGNAL DISTORTION, GET TO COVERS!
          </span>
        </div>
      )}

      {/* 2. Top Bar: Title & Core Objectives */}
      <div className="w-full flex justify-between items-start z-10">
        {/* Left: Objectives */}
        <div className="bg-black/75 border border-white/10 p-2 sm:p-3 rounded-lg backdrop-blur-md shadow-lg flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className={`p-1 rounded sm:p-1.5 bg-yellow-500/10 text-yellow-500 ${isPortalUnlocked ? 'animate-bounce bg-emerald-500/10 text-emerald-400' : ''}`}>
              <Key className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-[8px] sm:text-[10px] text-gray-400 font-mono uppercase tracking-wider">Objectives</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-white">
                Fuses: <span className={isPortalUnlocked ? 'text-emerald-400' : 'text-yellow-400'}>{playerStats.fusesCollected}</span> / {playerStats.totalFuses}
              </div>
            </div>
          </div>

          <div className="h-6 sm:h-8 w-[1px] bg-white/10" />

          {/* Player status/score or extra */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="p-1 rounded sm:p-1.5 bg-blue-500/10 text-blue-400">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-[8px] sm:text-[10px] text-gray-400 font-mono uppercase tracking-wider">Stamina</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-white">{Math.round(staminaPercent)}%</div>
            </div>
          </div>
        </div>

        {/* Center: Leave Button - REMOVED, now in top-right HUD compartment */}
        <div />

        {/* Right: State / Danger level indicators */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Leave Button */}
          <button
            onClick={onLeaveClick}
            className="bg-red-950/80 border border-red-600 px-3 py-1.5 rounded-lg text-red-400 text-xs font-mono font-bold tracking-wider hover:text-white hover:bg-red-600/80 transition-all shadow-lg"
          >
            LEAVE
          </button>

          {monsterState === 'CHASE' ? (
            <div className="bg-red-950/80 border border-red-600 px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-lg animate-bounce">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-mono font-black tracking-widest uppercase">CHASE ACTIVE</span>
            </div>
          ) : monsterState === 'INVESTIGATE' ? (
            <div className="bg-yellow-950/80 border border-yellow-600 px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-lg">
              <Eye className="w-5 h-5 text-yellow-500 animate-pulse" />
              <span className="text-yellow-400 text-xs font-mono font-bold tracking-widest uppercase">MONSTER ALERT</span>
            </div>
          ) : (
            <div className="bg-black/75 border border-white/5 px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-gray-400 text-[10px] font-mono tracking-widest uppercase">Stealth Active</span>
            </div>
          )}

          {playerStats.isInsideHidingSpot && (
            <div className="bg-emerald-950/80 border border-emerald-600 px-4 py-1.5 rounded-lg backdrop-blur-md text-emerald-400 text-[10px] font-mono font-bold tracking-wider">
              HIDDEN
            </div>
          )}
        </div>
      </div>

      {/* 3. Center Guidance Overlay (Shows instruction notifications) */}
      <div className="w-full flex justify-center items-center flex-1 my-2 sm:my-4 z-10">
        {isPortalUnlocked ? (
          <div className="bg-emerald-950/90 border border-emerald-500 px-4 py-2 sm:px-6 sm:py-3 rounded-xl backdrop-blur-md shadow-2xl shadow-emerald-900/40 text-center animate-pulse max-w-[90vw] sm:max-w-sm pointer-events-auto">
            <h3 className="text-emerald-400 font-bold tracking-wider uppercase text-xs sm:text-sm">EXIT PORTAL ONLINE</h3>
            <p className="text-white text-[10px] sm:text-xs mt-1">All fuses gathered! Locate the glowing green escape portal quickly!</p>
          </div>
        ) : playerStats.fusesCollected === 0 ? (
          <div className="bg-black/60 border border-white/5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full backdrop-blur-sm text-center max-w-[90vw] sm:max-w-xs animate-fade-in">
            <p className="text-gray-300 text-[10px] sm:text-xs font-medium">Find 3 fuses hidden in the dark sectors.</p>
          </div>
        ) : null}
      </div>

      {/* 4. Bottom Controls / Health bars */}
      <div className="w-full flex flex-col items-center gap-2 z-10">
        {/* Dynamic stamina bar center bottom */}
        <div className="w-full max-w-xs bg-black/80 border border-white/10 rounded-full p-1 shadow-lg backdrop-blur-md">
          <div className="flex justify-between items-center px-2 mb-0.5 text-[9px] font-mono text-gray-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" /> STAMINA
            </span>
            <span>{Math.round(staminaPercent)} / 100</span>
          </div>
          <div className="w-full h-2.5 bg-gray-900/60 rounded-full overflow-hidden">
            <div
              style={{ width: `${staminaPercent}%` }}
              className={`h-full rounded-full transition-all duration-100 ${getStaminaColor()}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
