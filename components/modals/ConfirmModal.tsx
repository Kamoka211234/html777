
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { playSound } from '../../utils/sound';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-xl w-96 p-[5px]"
        >
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] rounded-lg mb-2">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
                    <AlertTriangle size={14} className="text-orange-400" />
                    <span>{title}</span>
                </div>
                <button onClick={onCancel} className="hover:bg-white/10 p-1 rounded-lg text-[var(--text-secondary)]">
                    <X size={14} />
                </button>
            </div>
            
            <div className="px-4 py-4 text-[var(--text-primary)] text-sm text-center">
                {message}
            </div>

            <div className="flex justify-center gap-3 pb-2">
                <button 
                    onClick={() => { playSound('click'); onCancel(); }}
                    className="px-4 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-white/10 rounded-lg border border-[var(--border-color)]"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => { playSound('success'); onConfirm(); }}
                    className="px-4 py-1.5 text-xs bg-red-600 text-white hover:bg-red-700 rounded-lg flex items-center gap-1 font-semibold"
                >
                    <Check size={12} /> Confirm
                </button>
            </div>
        </motion.div>
    </motion.div>
  );
};

export default ConfirmModal;
