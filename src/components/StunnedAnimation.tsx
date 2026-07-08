import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface StunnedAnimationProps {
  onComplete: () => void;
}

export default function StunnedAnimation({ onComplete }: StunnedAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // Animation duration 3 seconds
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-4xl font-black text-amber-500 uppercase tracking-widest animate-pulse">
          CREATURE STUNNED
        </h2>
        <p className="text-white mt-4 font-mono text-sm uppercase tracking-wider">
          Temporary Speed Boost Active!
        </p>
      </motion.div>
    </motion.div>
  );
}
