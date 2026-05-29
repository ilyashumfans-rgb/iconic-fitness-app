import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
          animate={phase >= 1 ? { scale: 1, opacity: 1, filter: 'blur(0px)' } : { scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-[20vw] h-auto mb-[4vh]"
        >
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="GYMCO Mark" className="w-full h-full drop-shadow-2xl" />
        </motion.div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-[30vw] h-auto"
        >
          <img src={`${import.meta.env.BASE_URL}media/gymco-logo.png`} alt="GYMCO Wordmark" className="w-full h-full brightness-0 invert opacity-90" />
        </motion.div>
      </div>

      <motion.div 
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-[#09090b]/40 backdrop-blur-sm" />
      </motion.div>
    </motion.div>
  );
}