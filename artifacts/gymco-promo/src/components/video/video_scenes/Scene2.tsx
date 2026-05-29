import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center px-[10vw] z-10"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-[70vw]">
        <motion.div 
          className="overflow-hidden mb-[2vh]"
        >
          <motion.p 
            className="text-[2vw] font-semibold text-brand-gradient uppercase tracking-widest font-body"
            initial={{ y: "100%" }}
            animate={phase >= 1 ? { y: "0%" } : { y: "100%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            Go to any gym
          </motion.p>
        </motion.div>

        <div className="overflow-hidden">
          <motion.h1 
            className="text-[8vw] leading-[0.9] font-display font-black text-white"
            initial={{ y: "100%", rotateZ: 5 }}
            animate={phase >= 2 ? { y: "0%", rotateZ: 0 } : { y: "100%", rotateZ: 5 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            One Membership.
          </motion.h1>
        </div>
        
        <div className="overflow-hidden mt-[1vh]">
          <motion.h1 
            className="text-[8vw] leading-[0.9] font-display font-black text-brand-gradient"
            initial={{ y: "100%", rotateZ: -5 }}
            animate={phase >= 3 ? { y: "0%", rotateZ: 0 } : { y: "100%", rotateZ: -5 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            Unlimited Gyms.
          </motion.h1>
        </div>
      </div>

      {/* Decorative vertical line */}
      <motion.div 
        className="absolute left-[8vw] top-[30vh] bottom-[30vh] w-[4px] brand-gradient rounded-full"
        initial={{ scaleY: 0 }}
        animate={phase >= 1 ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ originY: 0 }}
      />
    </motion.div>
  );
}