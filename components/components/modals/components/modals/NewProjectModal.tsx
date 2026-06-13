import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, Check, FolderOpen, Rocket, Zap, Sparkles, Coffee, Code2
} from 'lucide-react';
import { playSound } from '../../utils/sound';

interface NewProjectModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
  theme?: 'midnight' | 'cyberpunk' | 'glass' | 'high-contrast';
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onSave, onClose, theme = 'midnight' }) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState('');
  const [isValid, setIsValid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('');
      setIsValid(false);
    } else if (trimmed.length < 2) {
      setNameError('Project name must be at least 2 characters');
      setIsValid(false);
    } else if (trimmed.length > 50) {
      setNameError('Project name must be less than 50 characters');
      setIsValid(false);
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      setNameError('Only letters, numbers, spaces, hyphens and underscores allowed');
      setIsValid(false);
    } else {
      setNameError('');
      setIsValid(true);
    }
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setNameError('Project name is required');
      inputRef.current?.focus();
      return;
    }
    
    if (!isValid) return;
    
    setIsCreating(true);
    playSound('success');
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Just save, don't auto-launch
    onSave(trimmedName);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && name.trim()) {
      handleSubmit(e);
    }
  };

  const themeStyles = {
    midnight: {
      bg: 'bg-gradient-to-br from-[#0f0c29] via-[#1a1a3e] to-[#24243e]',
      surface: 'bg-[#1a1a2e]',
      border: 'border-purple-500/20',
      accent: '#5a67d8',
      accentLight: '#818cf8',
      text: 'text-gray-200',
      textSecondary: 'text-gray-400',
      inputBg: '#0f0f1e',
      inputBorder: 'border-purple-500/20',
      inputFocusBorder: '#5a67d8'
    },
    cyberpunk: {
      bg: 'bg-gradient-to-br from-[#0d0b1a] via-[#1a0b2e] to-[#2a0a4a]',
      surface: 'bg-[#1a0b2e]',
      border: 'border-[#ff00ff]/30',
      accent: '#ff00ff',
      accentLight: '#ff66ff',
      text: 'text-[#00ffff]',
      textSecondary: 'text-[#00cccc]/70',
      inputBg: '#0d0221',
      inputBorder: 'border-[#ff00ff]/30',
      inputFocusBorder: '#ff00ff'
    },
    glass: {
      bg: 'bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e1b4b]',
      surface: 'bg-white/10',
      border: 'border-white/20',
      accent: '#38bdf8',
      accentLight: '#7dd3fc',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      inputBg: 'rgba(255,255,255,0.05)',
      inputBorder: 'border-white/20',
      inputFocusBorder: '#38bdf8'
    },
    'high-contrast': {
      bg: 'bg-black',
      surface: 'bg-[#1f1f1f]',
      border: 'border-white/30',
      accent: '#ffff00',
      accentLight: '#ffff66',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      inputBg: '#000000',
      inputBorder: 'border-white/30',
      inputFocusBorder: '#ffff00'
    }
  };

  const styles = themeStyles[theme];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className={`max-w-md w-full ${styles.surface} rounded-2xl border ${styles.border} shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-20"
            style={{ 
              background: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})`,
              filter: 'blur(60px)'
            }}
          />
          
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br"
                style={{ backgroundImage: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})` }}
              >
                <Code2 size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, ${styles.text}, ${styles.accent})` }}>
                  New Project
                </h2>
                <p className={`text-xs ${styles.textSecondary} mt-0.5`}>
                  Give your workspace a name
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <X size={20} className={styles.textSecondary} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6">
            {/* Project Name Input - Clean & Improved */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <FolderOpen size={14} style={{ color: styles.accent }} />
                <span>Project Name</span>
              </label>
              
              <div className="relative">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., MyAwesomeApp"
                  className={`w-full ${styles.inputBg} border ${nameError ? 'border-red-500' : styles.inputBorder} rounded-xl px-4 py-3.5 text-base outline-none transition-all duration-200`}
                  style={{ 
                    color: styles.text,
                    paddingRight: isValid ? '40px' : '16px'
                  }}
                  autoComplete="off"
                  spellCheck="false"
                />
                
                {/* Success icon */}
                {isValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Error message */}
              {nameError && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 mt-2 flex items-center gap-1"
                >
                  <Zap size={10} /> {nameError}
                </motion.p>
              )}
              
              {/* Valid message */}
              {isValid && !nameError && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs mt-2 flex items-center gap-1"
                  style={{ color: styles.accent }}
                >
                  <Sparkles size={10} /> Name available — ready to create
                </motion.p>
              )}
              
              {/* Character counter */}
              <div className="flex justify-end mt-1">
                <span className={`text-[10px] ${name.length > 0 ? 'opacity-60' : 'opacity-30'}`}>
                  {name.length}/50
                </span>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-3 rounded-xl" style={{ background: `linear-gradient(90deg, ${styles.accent}08, transparent)` }}>
              <div className="flex items-start gap-2">
                <Coffee size={14} style={{ color: styles.accent }} />
                <div className="text-[11px] leading-relaxed opacity-70">
                  <span className="font-semibold" style={{ color: styles.accent }}>Note:</span> Your project will be created and added to the dashboard. You can open it anytime from there.
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`p-5 border-t ${styles.border} flex justify-end gap-3 bg-gradient-to-t from-black/20 to-transparent`}>
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm rounded-xl transition-all duration-200 font-medium hover:bg-white/10"
            >
              Cancel
            </button>
            <motion.button 
              type="submit"
              disabled={!isValid || isCreating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 text-sm rounded-xl flex items-center gap-2 font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-white bg-gradient-to-r"
              style={{ 
                backgroundImage: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})`,
                boxShadow: `0 4px 15px ${styles.accent}40`
              }}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket size={16} /> Create Project
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default NewProjectModal;