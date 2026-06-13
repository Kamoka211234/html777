import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProjectDashboard from './ProjectDashboard';
import App from './App';
import { playSound } from '../utils/sound';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Globe, MapPin, Code2, Heart, Coffee, 
  Star, Zap, Shield, Terminal, Database, Cloud, 
  Lock, Users, Award, Compass, Sun, Moon, 
  X, Check, ArrowRight, Github, Twitter, Linkedin
} from 'lucide-react';

interface MainProps {
  defaultTheme?: 'midnight' | 'cyberpunk' | 'glass' | 'high-contrast';
}

const Main: React.FC<MainProps> = ({ defaultTheme = 'midnight' }) => {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [theme, setTheme] = useState<'midnight' | 'cyberpunk' | 'glass' | 'high-contrast'>(defaultTheme);
  const [isClosing, setIsClosing] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss welcome modal after 5 seconds
  useEffect(() => {
    if (showWelcomeModal) {
      const timer = setTimeout(() => {
        handleDismissWelcome();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeModal]);

  // Glow animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowIntensity(prev => (prev + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const glowValue = Math.sin(glowIntensity) * 0.3 + 0.7;

  const handleOpenProject = useCallback((id: string) => {
    setCurrentProjectId(id);
    playSound('click');
  }, []);

  const handleCloseProject = useCallback(() => {
    setIsClosing(true);
    playSound('pop');
    setTimeout(() => {
      setCurrentProjectId(null);
      setIsClosing(false);
    }, 300);
  }, []);

  const handleDismissWelcome = useCallback(() => {
    setShowWelcomeModal(false);
    playSound('click');
  }, []);

  const handleThemeChange = useCallback((newTheme: typeof theme) => {
    setTheme(newTheme);
    playSound('click');
    localStorage.setItem('vs_theme', newTheme);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showWelcomeModal) {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        handleDismissWelcome();
      }
    }
  }, [showWelcomeModal, handleDismissWelcome]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Kurdistan flag colors
  const kurdistanColors = {
    red: '#EE2E24',
    yellow: '#FBBA15',
    green: '#239E46',
    white: '#FFFFFF'
  };

  const themeGradients = {
    midnight: 'from-[#0f0c29] via-[#1a1a3e] to-[#24243e]',
    cyberpunk: 'from-[#0d0b1a] via-[#1a0b2e] to-[#2a0a4a]',
    glass: 'from-[#1e293b] via-[#0f172a] to-[#1e1b4b]',
    'high-contrast': 'from-black via-[#1a1a1a] to-black'
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${themeGradients[theme]} opacity-90`} />
      
      {/* Animated particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-white/20 animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 5}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.1 + Math.random() * 0.3
            }}
          />
        ))}
      </div>

      {/* Primary IDE Container with animation */}
      <AnimatePresence mode="wait">
        {!currentProjectId ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative z-10 w-full h-full"
          >
            <ProjectDashboard 
              onOpenProject={handleOpenProject} 
              theme={theme}
            />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative z-10 w-full h-full"
          >
            <App 
              projectId={currentProjectId} 
              onCloseProject={handleCloseProject} 
              globalTheme={theme}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Switcher Button (only when no project open) */}
      {!currentProjectId && !showWelcomeModal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-5 right-5 z-50"
        >
          <div className="relative group">
            <button
              onClick={() => {
                const themes: typeof theme[] = ['midnight', 'cyberpunk', 'glass', 'high-contrast'];
                const currentIndex = themes.indexOf(theme);
                const nextTheme = themes[(currentIndex + 1) % themes.length];
                handleThemeChange(nextTheme);
              }}
              className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-110 active:scale-95"
            >
              {theme === 'midnight' && <Moon size={20} className="text-indigo-400" />}
              {theme === 'cyberpunk' && <Zap size={20} className="text-pink-500" />}
              {theme === 'glass' && <Sun size={20} className="text-yellow-400" />}
              {theme === 'high-contrast' && <Shield size={20} className="text-white" />}
            </button>
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black/80 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Switch Theme
            </div>
          </div>
        </motion.div>
      )}

      {/* Welcome Modal - Kurdistan Erbil Branding */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl select-none"
            onClick={handleDismissWelcome}
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400, delay: 0.1 }}
              className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: `linear-gradient(135deg, rgba(18,18,20,0.98), rgba(25,25,35,0.98))`,
                borderColor: `${kurdistanColors.yellow}40`,
                borderWidth: '1px'
              }}
            >
              {/* Kurdish Flag Header Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                <div className="flex-1" style={{ backgroundColor: kurdistanColors.red }} />
                <div className="w-14" style={{ backgroundColor: kurdistanColors.yellow }} />
                <div className="flex-1" style={{ backgroundColor: kurdistanColors.green }} />
              </div>

              {/* Glowing Kurdish Sun Emblem */}
              <div className="absolute top-20 right-4 opacity-5 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-32 h-32">
                  <circle cx="50" cy="50" r="16" fill={kurdistanColors.yellow} />
                  {Array.from({ length: 21 }).map((_, i) => {
                    const angle = (i * 360) / 21;
                    return (
                      <line
                        key={i}
                        x1="50"
                        y1="22"
                        x2="50"
                        y2="6"
                        stroke={kurdistanColors.yellow}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        transform={`rotate(${angle} 50 50)`}
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="p-6 text-center">
                {/* Logo Animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
                  className="mx-auto mb-5"
                >
                  <div className="relative w-20 h-20 mx-auto">
                    <div 
                      className="absolute inset-0 rounded-full opacity-20 animate-ping"
                      style={{ backgroundColor: kurdistanColors.yellow }}
                    />
                    <div 
                      className="relative w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${kurdistanColors.yellow}20, transparent)`,
                        boxShadow: `0 0 ${30 * glowValue}px ${kurdistanColors.yellow}40`
                      }}
                    >
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${kurdistanColors.yellow}, ${kurdistanColors.red})` }}>
                        <Code2 size={32} className="text-white" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Creator Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
                  style={{ backgroundColor: `${kurdistanColors.yellow}15`, border: `1px solid ${kurdistanColors.yellow}30` }}
                >
                  <Award size={12} style={{ color: kurdistanColors.yellow }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: kurdistanColors.yellow }}>
                    Workspace Creator
                  </span>
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold tracking-tight text-white mb-1"
                >
                  Kamyar Karzan Osman
                </motion.h1>

                {/* Location with Flag */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-2 mb-5"
                >
                  <MapPin size={14} style={{ color: kurdistanColors.red }} />
                  <span className="text-xs font-medium text-gray-400">Kurdistan - Erbil</span>
                  <div className="flex gap-0.5 ml-1">
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: kurdistanColors.red }} />
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: kurdistanColors.yellow }} />
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: kurdistanColors.green }} />
                  </div>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-2.5"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kurdistanColors.yellow}20` }}>
                      <Terminal size={12} style={{ color: kurdistanColors.yellow }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-white">esbuild-wasm Runtime</p>
                      <p className="text-[10px] text-gray-400">High-performance dynamic compiler with instant preview</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kurdistanColors.green}20` }}>
                      <Database size={12} style={{ color: kurdistanColors.green }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-white">IndexedDB Storage</p>
                      <p className="text-[10px] text-gray-400">Persistent local database with file system layer</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kurdistanColors.red}20` }}>
                      <Cloud size={12} style={{ color: kurdistanColors.red }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-white">PHP-WASM Virtual Server</p>
                      <p className="text-[10px] text-gray-400">Client-side PHP execution with SQLite support</p>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-3"
                >
                  <button
                    onClick={handleDismissWelcome}
                    className="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-200 active:scale-98 flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${kurdistanColors.yellow}, ${kurdistanColors.red})`,
                      color: '#000',
                      boxShadow: `0 4px 20px ${kurdistanColors.yellow}40`
                    }}
                  >
                    <Sparkles size={16} />
                    Start Coding
                    <ArrowRight size={14} />
                  </button>
                  
                  <button
                    onClick={() => setShowCredits(!showCredits)}
                    className="w-full py-2 rounded-lg text-[11px] font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10"
                  >
                    <Heart size={12} style={{ color: kurdistanColors.red }} />
                    About This Project
                  </button>
                </motion.div>

                {/* Credits Expandable */}
                <AnimatePresence>
                  {showCredits && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10 text-left"
                    >
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        HTML777 is a modern web-based IDE built with React, TypeScript, and Tailwind CSS. 
                        It features a fully client-side file system, real-time compilation, 
                        and support for multiple programming languages including HTML, CSS, JavaScript, 
                        TypeScript, React, and PHP through WebAssembly.
                      </p>
                      <div className="flex items-center justify-center gap-3 mt-3">
                        <a href="#" className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                          <Github size={12} />
                        </a>
                        <a href="#" className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                          <Twitter size={12} />
                        </a>
                        <a href="#" className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                          <Linkedin size={12} />
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Version and Year */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-[9px] text-gray-600 mt-4 font-mono"
                >
                  HTML777 v3.0.0 • Since 2023
                </motion.p>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismissWelcome}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={14} className="text-gray-400" />
              </button>

              {/* Animated border glow */}
              <div 
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 50px ${kurdistanColors.yellow}10`,
                  border: `1px solid ${kurdistanColors.yellow}20`
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator when closing project */}
      <AnimatePresence>
        {isClosing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-t-transparent rounded-full"
              style={{ borderColor: `${kurdistanColors.yellow} transparent transparent transparent` }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Main;