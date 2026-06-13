import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon } from 'lucide-react';
import { ExtensionErrorBoundary } from '../ExtensionErrorBoundary';

interface Props {
  onClose: () => void;
}

const ImagePreviewExampleContent: React.FC<Props> = ({ onClose }) => {
  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 font-sans" onClick={onClose}>
      <div 
        className="bg-[#252526] border border-[#333] rounded-lg w-[450px] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
          <div className="flex items-center gap-2 text-gray-200">
            <ImageIcon size={16} className="text-[#007acc]" />
            <h2 className="text-sm font-semibold tracking-wide">Image Preview extension</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center">
            <p className="text-gray-300 text-sm mb-4 leading-relaxed w-full">
                The <strong className="text-white">Image Preview</strong> extension is now active. Hover over any image URL or local path string in your editor to see it live!
            </p>

            <div className="bg-[#1e1e1e] p-4 rounded w-full border border-[#333] font-mono text-xs text-[#d4d4d4] relative group mb-2 border-l-4 border-l-[#007acc]">
                <span className="text-[#569cd6]">const</span> imageUrl = <span className="text-[#ce9178] border-b border-dashed border-[#ce9178] cursor-help">"https://picsum.photos/300/200"</span>;
                
                {/* Simulated Hover Tooltip */}
                <div className="absolute top-10 left-6 bg-[#252526] border border-[#454545] shadow-lg rounded overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="p-1 items-center justify-center flex bg-black/50">
                        <img src="https://picsum.photos/300/200" alt="Preview" className="w-full h-full object-contain max-w-[200px] max-h-[200px]" />
                    </div>
                </div>
            </div>
            
            <p className="text-gray-500 text-[11px] w-full text-center">
                Try hovering over the string above to see the effect! This will now work in any file powered by Monaco Editor.
            </p>
        </div>
      </div>
    </motion.div>
  );
};

export const ImagePreviewExampleModal: React.FC<Props> = (props) => (
    <ExtensionErrorBoundary extensionName="kamoh.image-preview">
        <ImagePreviewExampleContent {...props} />
    </ExtensionErrorBoundary>
);
