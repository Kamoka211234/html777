
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check } from 'lucide-react';
import Draggable from '../Draggable';

interface QuickEditModalProps {
  initialContent: string;
  title: string;
  onSave: (newContent: string) => void;
  onClose: () => void;
}

const QuickEditModal: React.FC<QuickEditModalProps> = ({ initialContent, title, onSave, onClose }) => {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  return (
    <Draggable handleSelector=".drag-handle" initialX={window.innerWidth / 2 - 300} initialY={window.innerHeight / 2 - 200}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="fixed z-[300] bg-[#1e1e1e] border border-[#007acc] shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl w-[600px] h-[400px] flex flex-col animate-in fade-in zoom-in-95 duration-200 ease-out">
          <div className="drag-handle flex items-center justify-between px-3 py-2 bg-[#252526] rounded-t-xl border-b border-[#333] cursor-move">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#007acc] uppercase">Quick Edit</span>
                <span className="text-sm font-mono text-gray-300 truncate max-w-[400px]">{title}</span>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => onSave(content)}
                    className="flex items-center gap-1 bg-[#007acc] hover:bg-[#005f9e] text-white px-2 py-1 rounded-lg text-xs"
                >
                    <Check size={12} /> Save
                </button>
                <button onClick={onClose} className="hover:bg-[#333] p-1 rounded-lg text-gray-400">
                    <X size={14} />
                </button>
            </div>
          </div>
          
          <div className="flex-1 p-[5px]">
            <textarea 
                className="w-full h-full bg-[#1e1e1e] text-[#cccccc] font-mono text-sm p-3 outline-none resize-none rounded-b-lg focus:bg-[#1a1a1a] transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                autoFocus
            />
          </div>
        </motion.div>
    </Draggable>
  );
};

export default QuickEditModal;
