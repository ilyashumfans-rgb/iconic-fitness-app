import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2100),
      setTimeout(() => setPhase(4), 3000),
      setTimeout(() => setPhase(5), 4800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const beats = [
    { title: "QR-Code Walk-In", subtitle: "To any partnered gym" },
    { title: "Yoga to MMA", subtitle: "Endless variety of classes" },
    { title: "Bangalore-Wide", subtitle: "Always near you" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center px-[8vw] z-10"
      initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col gap-[6vh] w-full max-w-[60vw]">
        {beats.map((beat, i) => (
          <motion.div 
            key={i}
            className="flex items-start gap-[3vw]"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= i + 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <motion.div 
              className="w-[4vw] h-[4vw] rounded-full brand-gradient shrink-0 mt-[1vh] shadow-[0_0_30px_rgba(255,106,26,0.5)]"
              initial={{ scale: 0 }}
              animate={phase >= i + 1 ? { scale: 1 } : { scale: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
            />
            <div className="flex flex-col">
              <h3 className="text-[4.5vw] font-display font-bold text-white leading-tight">
                {beat.title}
              </h3>
              <p className="text-[2.2vw] font-body text-white/70">
                {beat.subtitle}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}