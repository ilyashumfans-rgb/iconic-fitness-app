import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 4200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex gap-[8vw]">
        
        {/* Stat 1 */}
        <motion.div 
          className="flex flex-col items-center relative"
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="absolute -inset-10 bg-black/40 blur-2xl rounded-full -z-10" />
          <motion.h2 
            className="text-[12vw] font-display font-black text-brand-gradient leading-none"
            initial={{ scale: 0.8 }}
            animate={phase >= 2 ? { scale: 1 } : { scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            500+
          </motion.h2>
          <p className="text-[2.5vw] font-body font-semibold tracking-wide text-white uppercase mt-4">
            Premium Gyms
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div 
          className="w-[2px] h-[15vw] bg-white/20 self-center"
          initial={{ scaleY: 0 }}
          animate={phase >= 2 ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 0.8 }}
        />

        {/* Stat 2 */}
        <motion.div 
          className="flex flex-col items-center relative"
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="absolute -inset-10 bg-black/40 blur-2xl rounded-full -z-10" />
          <motion.h2 
            className="text-[12vw] font-display font-black text-white leading-none"
            initial={{ scale: 0.8 }}
            animate={phase >= 3 ? { scale: 1 } : { scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            8K+
          </motion.h2>
          <p className="text-[2.5vw] font-body font-semibold tracking-wide text-white uppercase mt-4">
            Classes / Month
          </p>
        </motion.div>

      </div>
    </motion.div>
  );
}