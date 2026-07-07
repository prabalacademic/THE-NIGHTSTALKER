import React, { useState, useRef, useEffect } from 'react';
import { Compass, Lightbulb, LightbulbOff, ArrowUp, LogOut } from 'lucide-react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onJump: () => void;
  flashlightOn: boolean;
  onToggleFlashlight: () => void;
  isHiding: boolean;
  onExitHiding?: () => void;
}

export default function VirtualJoystick({
  onMove,
  onJump,
  flashlightOn,
  onToggleFlashlight,
  isHiding,
  onExitHiding,
}: VirtualJoystickProps) {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch capability to conditionally adjust layout or styles
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isHiding) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      // Center of the joystick base
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      dragStartRef.current = { x: centerX, y: centerY };
      
      const dx = touch.clientX - centerX;
      const dy = touch.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxRadius = rect.width / 2;

      if (distance <= maxRadius) {
        setJoystickPos({ x: dx, y: dy });
        onMove({ x: dx / maxRadius, y: -dy / maxRadius });
      } else {
        const angle = Math.atan2(dy, dx);
        const clampedX = Math.cos(angle) * maxRadius;
        const clampedY = Math.sin(angle) * maxRadius;
        setJoystickPos({ x: clampedX, y: clampedY });
        onMove({ x: clampedX / maxRadius, y: -clampedY / maxRadius });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isHiding) return;
    setIsDragging(true);
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      // Center of the joystick base
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      dragStartRef.current = { x: centerX, y: centerY };
      
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxRadius = rect.width / 2;

      if (distance <= maxRadius) {
        setJoystickPos({ x: dx, y: dy });
        onMove({ x: dx / maxRadius, y: -dy / maxRadius });
      } else {
        const angle = Math.atan2(dy, dx);
        const clampedX = Math.cos(angle) * maxRadius;
        const clampedY = Math.sin(angle) * maxRadius;
        setJoystickPos({ x: clampedX, y: clampedY });
        onMove({ x: clampedX / maxRadius, y: -clampedY / maxRadius });
      }
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const rect = joystickRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = dragStartRef.current.x;
        const centerY = dragStartRef.current.y;
        
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = rect.width / 2;

        if (distance <= maxRadius) {
          setJoystickPos({ x: dx, y: dy });
          onMove({ x: dx / maxRadius, y: -dy / maxRadius });
        } else {
          const angle = Math.atan2(dy, dx);
          const clampedX = Math.cos(angle) * maxRadius;
          const clampedY = Math.sin(angle) * maxRadius;
          setJoystickPos({ x: clampedX, y: clampedY });
          onMove({ x: clampedX / maxRadius, y: -clampedY / maxRadius });
        }
      }
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
      setJoystickPos({ x: 0, y: 0 });
      onMove({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, onMove]);

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || isHiding) return;
    const touch = e.touches[0];
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = dragStartRef.current.x;
      const centerY = dragStartRef.current.y;
      
      const dx = touch.clientX - centerX;
      const dy = touch.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxRadius = rect.width / 2;

      if (distance <= maxRadius) {
        setJoystickPos({ x: dx, y: dy });
        // Inverse y for standard game axis (forward is positive)
        onMove({ x: dx / maxRadius, y: -dy / maxRadius });
      } else {
        const angle = Math.atan2(dy, dx);
        const clampedX = Math.cos(angle) * maxRadius;
        const clampedY = Math.sin(angle) * maxRadius;
        setJoystickPos({ x: clampedX, y: clampedY });
        onMove({ x: clampedX / maxRadius, y: -clampedY / maxRadius });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20">
      {/* Hiding Exit Overlay */}
      {isHiding && onExitHiding && (
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
          <button
            onClick={onExitHiding}
            id="btn-exit-hiding"
            className="flex items-center gap-2 bg-red-600/80 hover:bg-red-700 active:scale-95 text-white font-semibold px-6 py-3 rounded-full border border-red-500 shadow-lg shadow-red-900/40 backdrop-blur-sm pointer-events-auto transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>EXIT HIDING SPOT</span>
          </button>
          <p className="text-gray-400 text-xs mt-2 animate-pulse">You are safe, but the creature is still searching...</p>
        </div>
      )}

      {/* Touch UI: Virtual Joystick (Bottom Left) */}
      {!isHiding && (
        <div className="absolute bottom-8 left-8 w-32 h-32 flex items-center justify-center pointer-events-auto">
          <div
            ref={joystickRef}
            id="touch-joystick-base"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            className="relative w-28 h-28 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer select-none shadow-inner"
          >
            {/* Center pointer indicator */}
            <div className="absolute w-12 h-12 rounded-full border border-white/5 bg-transparent opacity-20 flex items-center justify-center">
              <Compass className="w-6 h-6 text-white" />
            </div>

            {/* Thumbstick Handle */}
            <div
              id="touch-joystick-thumb"
              style={{
                transform: `translate3d(${joystickPos.x}px, ${joystickPos.y}px, 0)`,
                transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
              className={`w-12 h-12 rounded-full border-2 border-white/60 bg-white/30 backdrop-blur-md shadow-lg flex items-center justify-center ${
                isDragging ? 'scale-110 border-white bg-white/50' : ''
              } transition-transform duration-100`}
            />
          </div>
        </div>
      )}

      {/* Touch UI: Jump Button and Flashlight (Bottom Right) */}
      <div className="absolute bottom-8 right-8 flex flex-col items-center gap-4 pointer-events-auto">
        {/* Flashlight Button */}
        <button
          onClick={onToggleFlashlight}
          id="btn-toggle-flashlight"
          className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm transition-all active:scale-90 shadow-md ${
            flashlightOn
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-400/50 shadow-yellow-500/10'
              : 'bg-black/40 text-gray-400'
          }`}
          title="Toggle Flashlight (F)"
        >
          {flashlightOn ? <Lightbulb className="w-5 h-5" /> : <LightbulbOff className="w-5 h-5" />}
        </button>

        {/* Jump Button */}
        {!isHiding && (
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onJump();
            }}
            onClick={(e) => {
              // Mouse click support for testing
              onJump();
            }}
            id="btn-jump"
            className="w-16 h-16 rounded-full border-2 border-white/30 bg-white/10 active:bg-white/40 active:border-white active:scale-90 flex items-center justify-center backdrop-blur-md shadow-xl transition-all select-none"
            title="Jump (Space)"
          >
            <div className="flex flex-col items-center justify-center text-white">
              <ArrowUp className="w-6 h-6 font-bold" />
              <span className="text-[9px] font-bold tracking-wider -mt-0.5">JUMP</span>
            </div>
          </button>
        )}
      </div>

      {/* Guide text for desktop players */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 font-mono tracking-wider hidden md:block">
        WASD/ARROWS to Move • SPACE to Jump • SHIFT to Sprint • F to Flashlight
      </div>
    </div>
  );
}
