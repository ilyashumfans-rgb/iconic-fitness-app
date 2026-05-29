import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#09090b]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
      >
        <img src={`${import.meta.env.BASE_URL}opengraph.jpg`} className="w-full h-full object-cover blur-sm" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
          className="w-[40vw] mb-[6vh]"
        >
          <img src={`${import.meta.env.BASE_URL}media/gymco-logo.png`} alt="GYMCO" className="w-full h-full brightness-0 invert" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="overflow-hidden"
        >
          <p className="text-[3vw] font-display font-bold text-brand-gradient tracking-wide uppercase">
            Your city. Your gym. One pass.
          </p>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="w-[20vw] h-[2px] brand-gradient mt-[4vh]"
        />
      </div>
    </motion.div>
  );
}