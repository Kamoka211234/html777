
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, File, Folder, Edit2 } from 'lucide-react';
import { playSound } from '../../utils/sound';

interface CreateModalProps {
  type: 'file' | 'folder' | 'rename';
  initialValue?: string;
  parentId?: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}

const CreateModal: React.FC<CreateModalProps> = ({ type, initialValue = '', onSave, onClose }) => {
  const [name, setName] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(initialValue);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    playSound('success');
    onSave(name.trim());
    onClose();
  };

  const getTitle = () => {
      switch(type) {
          case 'file': return 'New File';
          case 'folder': return 'New Folder';
          case 'rename': return 'Rename';
      }
  };

  const getIcon = () => {
      switch(type) {
          case 'file': return File;
          case 'folder': return Folder;
          case 'rename': return Edit2;
      }
  };

  const Icon = getIcon();

  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-xl w-80 p-[5px]"
        >
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] rounded-lg mb-2">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
                    <Icon size={14} className="text-[var(--accent)]" />
                    <span>{getTitle()}</span>
                </div>
                <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg text-[var(--text-secondary)]">
                    <X size={14} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-2 pb-2">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === 'file' ? "e.g., index.html" : "e.g., components"}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] mb-3"
                />
                <div className="flex justify-end gap-2">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-white/10 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={!name.trim()}
                        className="px-3 py-1.5 text-xs bg-[var(--accent)] text-white hover:opacity-90 rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                        <Check size={12} /> {type === 'rename' ? 'Rename' : 'Create'}
                    </button>
                </div>
            </form>
        </motion.div>
    </motion.div>
  );
};

export default CreateModal;
