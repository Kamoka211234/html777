
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ExternalLink, PlayCircle, X } from 'lucide-react';
import { playSound } from '../../utils/sound';

interface RunWarningModalProps {
  onCancel: () => void;
  onContinue: () => void;
  onOpenNewTab: () => void;
}

const RunWarningModal: React.FC<RunWarningModalProps> = ({ onCancel, onContinue, onOpenNewTab }) => {
  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 ease-out">
        <div className="bg-[#252526] border border-[#454545] shadow-2xl rounded-xl w-[450px] p-[5px] animate-in zoom-in-95 duration-300 ease-out">
            <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-lg mb-2">
                <div className="flex items-center gap-2 text-gray-300 font-semibold text-sm">
                    <PlayCircle size={14} className="text-green-500" />
                    <span>Run Project</span>
                </div>
                <button onClick={onCancel} className="hover:bg-[#444] p-1 rounded-lg text-gray-400">
                    <X size={14} />
                </button>
            </div>
            
            <div className="px-5 py-4">
                <div className="flex items-start gap-3 mb-4">
                     <div className="bg-yellow-500/10 p-2 rounded-full">
                        <AlertTriangle className="text-yellow-500" size={24} />
                     </div>
                     <div>
                         <h3 className="text-[#cccccc] font-bold text-sm mb-1">Preview Limitations</h3>
                         <p className="text-gray-400 text-xs leading-relaxed">
                            The internal preview uses a sandbox. Some features like <b>Cookies</b>, <b>LocalStorage</b>, or <b>External Links</b> (Google, etc.) might be blocked by browser security policies.
                         </p>
                     </div>
                </div>
                <p className="text-gray-500 text-xs italic mb-4 text-center">
                    For the best experience, we recommend opening the project in a new tab.
                </p>

                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => { playSound('success'); onOpenNewTab(); onCancel(); }}
                        className="w-full py-2 bg-[#007acc] hover:bg-[#005f9e] text-white rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
                    >
                        <ExternalLink size={14} /> Open in New Tab (Recommended)
                    </button>
                    
                    <button 
                        onClick={() => { playSound('click'); onContinue(); }}
                        className="w-full py-2 bg-[#3e3e3e] hover:bg-[#4a4a4a] text-[#cccccc] rounded-lg text-xs transition-colors"
                    >
                        Continue in Preview Panel
                    </button>
                </div>
            </div>
        </div>
    </motion.div>
  );
};

export default RunWarningModal;
