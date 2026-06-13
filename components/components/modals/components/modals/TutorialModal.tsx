import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PlayCircle, Info, Github, HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { playSound } from '../../utils/sound';

interface TutorialModalProps {
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'github'>('preview');

  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 ease-out">
        <div className="bg-[#252526] border border-[#454545] shadow-2xl rounded-xl w-[480px] p-[5px] animate-in zoom-in-95 duration-300 ease-out">
            <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-lg mb-2">
                <div className="flex items-center gap-2 text-gray-300 font-semibold text-sm">
                    <HelpCircle size={14} className="text-[#007acc]" />
                    <span>Kurdi Studio Interactive Help</span>
                </div>
                <button onClick={() => { playSound('click'); onClose(); }} className="hover:bg-[#444] p-1 rounded-lg text-gray-400">
                    <X size={14} />
                </button>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-[#3c3c3c] mx-2 gap-1 mb-2">
                <button 
                    onClick={() => { playSound('pop'); setActiveTab('preview'); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'preview' ? 'border-[#007acc] text-white bg-[#2d2d2d]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                >
                    <PlayCircle size={12} />
                    Live Preview Help
                </button>
                <button 
                    onClick={() => { playSound('pop'); setActiveTab('github'); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'github' ? 'border-[#007acc] text-white bg-[#2d2d2d]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                >
                    <Github size={12} />
                    GitHub Sync Guide
                </button>
            </div>
            
            <div className="px-5 py-4 min-h-[220px] flex flex-col justify-between">
                {activeTab === 'preview' ? (
                    <div className="animate-in fade-in duration-200 slide-in-from-right-4">
                        <div className="flex items-start gap-3">
                             <div className="bg-[#007acc]/10 p-2 rounded-full shrink-0">
                                <PlayCircle className="text-[#007acc]" size={24} />
                             </div>
                             <div>
                                 <h3 className="text-[#cccccc] font-bold text-sm mb-1">Manual Preview Updates</h3>
                                 <p className="text-gray-400 text-xs leading-relaxed">
                                    Because <b>Auto Save</b> is currently turned off, the preview will not update automatically as you type.
                                 </p>
                                 <ul className="list-disc list-inside text-gray-400 text-[11px] mt-2.5 space-y-1.5">
                                     <li>Press <kbd className="bg-[#333] px-1 py-0.5 rounded text-[#ccc] border border-[#444]">Ctrl + S</kbd> to save and update the preview.</li>
                                     <li>Press <kbd className="bg-[#333] px-1 py-0.5 rounded text-[#ccc] border border-[#444]">Ctrl + Enter</kbd> to update the preview without saving.</li>
                                     <li>Turn on <b>Auto Save</b> from the <b>File menu</b> or interface settings for instant hot updates.</li>
                                 </ul>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-200 slide-in-from-left-4">
                        <div className="flex items-start gap-3">
                             <div className="bg-neutral-800 p-2 rounded-full shrink-0">
                                <Github className="text-gray-300" size={24} />
                             </div>
                             <div>
                                 <h3 className="text-[#cccccc] font-bold text-sm mb-1">Connecting & Syncing GitHub</h3>
                                 <p className="text-gray-400 text-xs leading-relaxed">
                                    Kurdi Studio allows pulling public or private repositories directly into your live development workspace.
                                 </p>
                                 <ul className="list-disc list-inside text-gray-400 text-[11px] mt-2.5 space-y-1.5">
                                     <li>Open GitHub Sync using the top <b>GitHub icon</b> or the <b>File dropdown menu</b>.</li>
                                     <li>Enter the public URL or owner/repository name alongside the target branch.</li>
                                     <li>For private repositories, provide a <b>Personal Access Token</b> securely.</li>
                                     <li>Click <b>Pull Contents</b> to instantly unzip the repository inside your file explorer.</li>
                                 </ul>
                             </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 mt-6 border-t border-[#3c3c3c] pt-4">
                    {activeTab === 'preview' ? (
                        <button 
                            onClick={() => { playSound('click'); setActiveTab('github'); }}
                            className="flex-1 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold border border-[#444] transition-colors"
                        >
                            Next: GitHub Sync <ArrowRight size={12} />
                        </button>
                    ) : (
                        <button 
                            onClick={() => { playSound('click'); setActiveTab('preview'); }}
                            className="flex-1 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold border border-[#444] transition-colors"
                        >
                            <ArrowLeft size={12} /> Back to Preview
                        </button>
                    )}
                    
                    <button 
                        onClick={() => { playSound('click'); onClose(); }}
                        className="py-2 px-6 bg-[#007acc] hover:bg-[#005f9e] text-white rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    </motion.div>
  );
};

export default TutorialModal;
