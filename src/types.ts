export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'WIN' | 'PAUSED' | 'CONTROLS_INFO' | 'THE_TRUTH' | 'THE_CHASED_ONE' | 'ENCOUNTER';

export interface GameSettings {
  volume: number; // 0 to 1
  sensitivity: number; // Mouse/touch look sensitivity
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  musicEnabled: boolean;
  soundEnabled: boolean;
}

export interface PlayerStats {
  stamina: number; // 0 to 100
  maxStamina: number;
  isSprinting: boolean;
  score: number;
  fusesCollected: number;
  totalFuses: number;
  flashlightOn: boolean;
  isInsideHidingSpot: boolean;
}

export type MonsterState = 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'SEARCH';

export interface MonsterStats {
  state: MonsterState;
  speed: number;
  distanceToPlayer: number;
}

export interface ObjectiveItem {
  id: string;
  x: number;
  z: number;
  collected: boolean;
  pulseOffset: number;
}

export interface HidingSpot {
  id: string;
  x: number;
  z: number;
  radius: number;
}
