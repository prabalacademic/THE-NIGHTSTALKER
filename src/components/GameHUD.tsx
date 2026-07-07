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
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-6">
      {/* 1. Immersive Tension Vignette (Pulses based on proximity) */}
      {proximityIntensity > 0 && (
        <div
          style={{
            opacity: proximityIntensity * 0.75,
            animationDuration: `${Math.max(0.4, 1.5 - proximityIntensity * 1.1)}s`,
          }}
          className={`absolute inset-0 border-[24px] md:border-[48px] pointer-events-none transition-all duration-300 z-0 ${
            monsterState === 'CHASE'
              ? 'border-red-900/60 animate-pulse'
              : 'border-red-950/40'
          }`}
        />
      )}

      {/* 2. Top Bar: Title & Core Objectives */}
      <div className="w-full flex justify-between items-start z-10">
        {/* Left: Objectives */}
        <div className="bg-black/75 border border-white/10 p-3 rounded-lg backdrop-blur-md shadow-lg flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded bg-yellow-500/10 text-yellow-500 ${isPortalUnlocked ? 'animate-bounce bg-emerald-500/10 text-emerald-400' : ''}`}>
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Objectives</div>
              <div className="text-sm font-bold font-mono text-white">
                Fuses: <span className={isPortalUnlocked ? 'text-emerald-400' : 'text-yellow-400'}>{playerStats.fusesCollected}</span> / {playerStats.totalFuses}
              </div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10" />

          {/* Player status/score or extra */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Stamina</div>
              <div className="text-sm font-bold font-mono text-white">{Math.round(staminaPercent)}%</div>
            </div>
          </div>
        </div>

        {/* Center: Leave Button */}
        <button
          onClick={onLeaveClick}
          className="pointer-events-auto flex flex-col items-center justify-center bg-black/75 hover:bg-black/90 border border-red-600/30 hover:border-red-600 px-4 py-1.5 rounded-lg backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 group shadow-[0_4px_12px_rgba(220,38,38,0.15)] hover:shadow-[0_4px_16px_rgba(220,38,38,0.35)] cursor-pointer self-start"
        >
          {/* Mountain Peak Logo matching the header */}
          <svg 
            viewBox="0 0 100 60" 
            className="w-10 h-6 text-red-600 fill-current filter drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)] transition-colors group-hover:text-red-500"
          >
            <defs>
              <mask id="mountain-mask-hud">
                {/* Background of mask is white */}
                <rect width="100" height="60" fill="white" />
                {/* Cutouts */}
                <polygon points="50,10 57,26 46,42 51,31" fill="black" />
                <polygon points="31,31 34,35 33,38" fill="black" />
                <polygon points="68,25 74,35 71,38" fill="black" />
              </mask>
            </defs>
            <path
              d="M 10,55 L 32,30 L 38,38 L 50,10 L 62,38 L 68,25 L 90,55 Z"
              mask="url(#mountain-mask-hud)"
            />
          </svg>
          <span className="text-[8px] text-red-500 font-mono font-bold tracking-[0.2em] uppercase mt-0.5 group-hover:text-red-400">
            LEAVE
          </span>
        </button>

        {/* Right: State / Danger level indicators */}
        <div className="flex flex-col items-end gap-2">
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
      <div className="w-full flex justify-center items-center flex-1 my-4 z-10">
        {isPortalUnlocked ? (
          <div className="bg-emerald-950/90 border border-emerald-500 px-6 py-3 rounded-xl backdrop-blur-md shadow-2xl shadow-emerald-900/40 text-center animate-pulse max-w-sm pointer-events-auto">
            <h3 className="text-emerald-400 font-bold tracking-wider uppercase text-sm">EXIT PORTAL ONLINE</h3>
            <p className="text-white text-xs mt-1">All fuses gathered! Locate the glowing green escape portal quickly!</p>
          </div>
        ) : playerStats.fusesCollected === 0 ? (
          <div className="bg-black/60 border border-white/5 px-4 py-2 rounded-full backdrop-blur-sm text-center max-w-xs animate-fade-in">
            <p className="text-gray-300 text-xs font-medium">Find 3 fuses hidden in the dark sectors.</p>
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
