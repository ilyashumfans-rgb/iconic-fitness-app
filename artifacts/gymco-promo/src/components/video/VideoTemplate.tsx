import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  reveal: 3500,
  headline: 4500,
  stats: 5000,
  features: 5500,
  close: 4500
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  reveal: Scene1,
  headline: Scene2,
  stats: Scene3,
  features: Scene4,
  close: Scene5
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#09090b]">
      
      {/* Background Media - Persistent Layer */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute inset-0"
          animate={{ opacity: sceneIndex === 1 || sceneIndex === 2 ? 0.4 : 0 }}
          transition={{ duration: 1.5 }}
        >
          <video 
            src={`${import.meta.env.BASE_URL}media/hero-gym.mp4`}
            className="w-full h-full object-cover"
            autoPlay muted loop playsInline
          />
        </motion.div>
        
        <motion.div 
          className="absolute inset-0"
          animate={{ opacity: sceneIndex === 3 ? 0.5 : 0 }}
          transition={{ duration: 1.5 }}
        >
          <video 
            src={`${import.meta.env.BASE_URL}media/hero.mp4`}
            className="w-full h-full object-cover"
            autoPlay muted loop playsInline
          />
        </motion.div>

        {/* Global Dark Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-[#09090b]/20 mix-blend-multiply" />
      </div>

      {/* Global Brand Accents - Persistent */}
      <motion.div 
        className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px] pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, var(--color-primary), transparent 70%)' }}
        animate={{ 
          x: ['-50%', '10%', '-20%', '50%', '0%'][sceneIndex],
          y: ['-50%', '-20%', '40%', '-10%', '-50%'][sceneIndex],
          scale: [1, 1.2, 0.8, 1.5, 1][sceneIndex],
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
      
    </div>
  );
}
