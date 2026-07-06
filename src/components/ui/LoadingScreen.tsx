import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { settings } from "../../store-data/settings";

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const intervals = [
      setTimeout(() => setProgress(30), 200),
      setTimeout(() => setProgress(60), 600),
      setTimeout(() => setProgress(85), 1000),
      setTimeout(() => setProgress(100), 1400),
      setTimeout(() => setDone(true), 1700),
      setTimeout(() => onComplete(), 2200),
    ];
    return () => intervals.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!done ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
        >
          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full blur-3xl" />
          </div>

          <div className="relative flex flex-col items-center gap-8">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 border border-white/20 rounded-2xl flex items-center justify-center mb-2">
                <span className="text-2xl font-black tracking-tighter text-white">VB</span>
              </div>
              <span className="text-white font-bold text-2xl tracking-[0.3em] uppercase">
                {settings.storeName}
              </span>
              <span className="text-white/40 text-xs tracking-[0.4em] uppercase">
                {settings.storeSlogan}
              </span>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-48 flex flex-col items-center gap-3"
            >
              <div className="w-full h-px bg-white/10 overflow-hidden rounded-full">
                <motion.div
                  className="h-full bg-white rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <span className="text-white/30 text-xs font-mono">{progress}%</span>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
