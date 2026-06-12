
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { playSound } from '../../utils/sound';

interface NewProjectModalProps {
  onSave: (name: string, template: string) => void;
  onClose: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    playSound('success');
    // Defaulting to 'html5' template since selection was removed
    onSave(name.trim(), 'html5');
    onClose();
  };

  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-2xl w-[500px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Create New Project</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Start building your next idea.</p>
                </div>
                <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg text-[var(--text-secondary)] transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Name Input */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Project Name</label>
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Project"
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-xl px-4 py-3 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex justify-end gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 rounded-xl transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={!name.trim()}
                        className="px-6 py-2.5 text-sm bg-[var(--accent)] text-white hover:opacity-90 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                    >
                        <Check size={16} /> Create Project
                    </button>
                </div>
            </form>
        </div>
    </motion.div>
  );
};

export default NewProjectModal;
