
import React from 'react';
import { motion } from 'motion/react';
import { X, Keyboard } from 'lucide-react';
import Draggable from '../Draggable';
import { playSound } from '../../utils/sound';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
    { category: 'General', items: [
        { keys: ['Ctrl', 'S'], label: 'Save All' },
        { keys: ['Ctrl', 'Z'], label: 'Undo' },
        { keys: ['Ctrl', 'Y'], label: 'Redo' },
        { keys: ['Ctrl', 'F'], label: 'Find in File' },
    ]},
    { category: 'View', items: [
        { keys: ['Ctrl', 'B'], label: 'Toggle Sidebar' },
        { keys: ['Ctrl', '`'], label: 'Toggle Console' },
        { keys: ['Ctrl', 'K', 'Z'], label: 'Toggle Zen Mode' },
        { keys: ['Ctrl', '+'], label: 'Zoom In' },
        { keys: ['Ctrl', '-'], label: 'Zoom Out' },
    ]},
    { category: 'Editor', items: [
        { keys: ['Ctrl', 'Shift', 'O'], label: 'Go to Symbol' },
        { keys: ['Alt', 'Up/Down'], label: 'Move Line' },
        { keys: ['Ctrl', '/'], label: 'Toggle Comment' },
        { keys: ['Ctrl', 'Space'], label: 'Trigger Suggest' },
    ]}
];

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  return (
    <Draggable handleSelector=".drag-handle" initialX={window.innerWidth / 2 - 200} initialY={window.innerHeight / 2 - 250}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#252526] border border-[#007acc] shadow-2xl rounded-xl w-[500px] flex flex-col animate-in fade-in zoom-in-95 duration-200 z-[100]">
            <div className="drag-handle flex items-center justify-between px-4 py-3 bg-[#2d2d2d] rounded-t-xl border-b border-[#333] cursor-move">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <Keyboard size={16} className="text-[#007acc]" />
                    <span>Keyboard Shortcuts</span>
                </div>
                <button onClick={() => { playSound('pop'); onClose(); }} className="hover:bg-[#444] p-1.5 rounded-lg text-gray-400 transition-colors">
                    <X size={16} />
                </button>
            </div>
            
            <div className="p-4 max-h-[500px] overflow-y-auto">
                <div className="space-y-6">
                    {SHORTCUTS.map((section, idx) => (
                        <div key={idx}>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-[#333] pb-1">
                                {section.category}
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {section.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center group">
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{item.label}</span>
                                        <div className="flex gap-1">
                                            {item.keys.map((k, ki) => (
                                                <kbd key={ki} className="bg-[#333] border border-[#444] rounded px-2 py-0.5 text-xs font-mono text-gray-400 min-w-[24px] text-center shadow-sm">
                                                    {k}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-[#2d2d2d] px-4 py-2 rounded-b-xl border-t border-[#333] text-[10px] text-gray-500 text-center">
                Visual HTML5 Studio Shortcuts
            </div>
        </motion.div>
    </Draggable>
  );
};

export default ShortcutsModal;
