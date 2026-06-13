
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Copy, RefreshCw, Zap, Clock, Trash2, Maximize2, Loader } from 'lucide-react';
import Draggable from '../Draggable';
import Editor from '@monaco-editor/react';
import { playSound } from '../../utils/sound';
import { createObfuscatorWorker } from '../../utils/obfuscatorWorker';
import { db } from '../../utils/db';
import { ObfuscationHistoryItem } from '../../types';

interface ObfuscatorModalProps {
  onClose: () => void;
}

const ObfuscatorModal: React.FC<ObfuscatorModalProps> = ({ onClose }) => {
  const [original, setOriginal] = useState('');
  const [obfuscated, setObfuscated] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ObfuscationHistoryItem[]>([]);
  const [viewingItem, setViewingItem] = useState<ObfuscationHistoryItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
      workerRef.current = createObfuscatorWorker();
      workerRef.current.onmessage = (e) => {
          setIsProcessing(false);
          if (e.data.success) {
              setObfuscated(e.data.result);
          } else {
              setObfuscated(`// Error: ${e.data.error}`);
          }
      };
      
      return () => {
          workerRef.current?.terminate();
      };
  }, []);

  useEffect(() => {
    // Debounced worker call
    const timer = setTimeout(() => {
        if (original.trim()) {
            setIsProcessing(true);
            workerRef.current?.postMessage(original);
        } else {
            setObfuscated('');
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [original]);

  useEffect(() => {
      if (showHistory) {
          loadHistory();
      }
  }, [showHistory]);

  const loadHistory = async () => {
      const h = await db.getObfuscationHistory();
      setHistory(h);
  };

  const saveCurrent = async () => {
      if (!original.trim()) return;
      await db.saveObfuscation(original, obfuscated);
      playSound('success');
      // Refresh history if open
      if (showHistory) loadHistory();
  };

  const clearHistory = async () => {
      if(confirm("Clear all obfuscation history? This might be laggy if you have thousands of records.")) {
          await db.clearObfuscationHistory();
          loadHistory();
          playSound('pop');
      }
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      playSound('click');
      alert("Copied to clipboard!");
  };

  return (
    <Draggable handleSelector=".drag-handle" initialX={100} initialY={50}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#1e1e1e] border border-[#007acc] shadow-2xl rounded-xl md:w-[800px] w-[95vw] md:h-[600px] h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out z-[90]">
            {/* Header */}
            <div className="drag-handle flex items-center justify-between px-3 py-2 bg-[#252526] rounded-t-xl border-b border-[#333] cursor-move">
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-yellow-400" />
                    <span className="text-xs md:text-sm font-bold text-gray-200">JS Obfuscator</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-1.5 rounded-lg text-[10px] md:text-xs flex items-center gap-1 transition-colors ${showHistory ? 'bg-[#007acc] text-white' : 'hover:bg-[#333] text-gray-400'}`}
                    >
                        <Clock size={12} /> <span className="hidden sm:inline">History</span>
                    </button>
                    <button onClick={onClose} className="hover:bg-[#333] p-1 rounded-lg text-gray-400">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {showHistory ? (
                    <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
                         <div className="p-2 border-b border-[#333] flex justify-between items-center">
                             <span className="text-xs text-gray-400">Saved Items ({history.length})</span>
                             <button onClick={clearHistory} className="text-xs text-red-400 flex items-center gap-1 hover:text-red-300">
                                 <Trash2 size={12} /> Clear All
                             </button>
                         </div>
                         <div className="flex-1 overflow-y-auto p-2">
                             {history.map(item => (
                                 <div key={item.id} className="bg-[#252526] p-3 rounded-lg mb-2 border border-[#333] hover:border-[#007acc] cursor-pointer" onClick={() => { setViewingItem(item); setShowHistory(false); setOriginal(item.original); }}>
                                     <div className="flex justify-between mb-1">
                                         <span className="text-[10px] text-[#007acc]">{new Date(item.timestamp).toLocaleString()}</span>
                                     </div>
                                     <div className="text-xs text-gray-400 font-mono truncate">
                                         {item.original.substring(0, 50)}...
                                     </div>
                                 </div>
                             ))}
                             {history.length === 0 && <div className="text-center text-gray-500 mt-10 text-xs">No history found.</div>}
                         </div>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row w-full h-full min-h-0">
                        {/* Input */}
                        <div className="flex-1 flex h-[48%] md:h-full flex-col border-b md:border-b-0 md:border-r border-[#333]">
                             <div className="h-7 bg-[#252526] flex items-center justify-between px-2">
                                 <span className="text-[10px] md:text-xs text-gray-400">Original JavaScript</span>
                                 <button onClick={() => setOriginal('')} className="p-1 hover:bg-[#333] rounded"><Trash2 size={12} className="text-gray-500" /></button>
                             </div>
                             <div className="flex-1 min-h-0">
                                 <Editor 
                                    height="100%"
                                    language="javascript"
                                    theme="vs-dark"
                                    value={original}
                                    onChange={(val) => setOriginal(val || '')}
                                    options={{ minimap: {enabled: false}, fontSize: 11, wordWrap: 'on' }}
                                 />
                             </div>
                        </div>
                        {/* Output */}
                        <div className="flex-1 flex h-[52%] md:h-full flex-col relative">
                             <div className="h-7 bg-[#252526] flex items-center justify-between px-2">
                                 <span className="text-[10px] md:text-xs text-gray-400">Obfuscated Output</span>
                                 <div className="flex gap-1">
                                    <button onClick={saveCurrent} title="Save to History" className="p-1 hover:bg-[#333] rounded text-[#007acc]"><Clock size={12} /></button>
                                    <button onClick={() => handleCopy(obfuscated)} title="Copy" className="p-1 hover:bg-[#333] rounded text-green-500"><Copy size={12} /></button>
                                 </div>
                             </div>
                             <div className="flex-1 min-h-0">
                                 <Editor 
                                    height="100%"
                                    language="javascript"
                                    theme="vs-dark"
                                    value={obfuscated}
                                    options={{ minimap: {enabled: false}, fontSize: 11, wordWrap: 'on', readOnly: true }}
                                 />
                             </div>
                             {isProcessing && (
                                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 animate-fade-in">
                                     <div className="bg-[#252526] px-4 py-2 rounded-full flex items-center gap-2 text-xs text-[#007acc] shadow-xl border border-[#333]">
                                         <Loader className="animate-spin" size={14} /> Processing...
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Modal for viewing history item specifically if needed, but we just load into editor above */}
            {viewingItem && (
                 <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[100]">
                     <div className="bg-[#252526] w-[90%] h-[90%] rounded-xl border border-[#007acc] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="h-10 border-b border-[#333] flex items-center justify-between px-3">
                             <span className="text-sm font-bold text-gray-200">History Viewer ({new Date(viewingItem.timestamp).toLocaleDateString()})</span>
                             <button onClick={() => setViewingItem(null)} className="text-gray-400 hover:text-white"><X size={16}/></button>
                        </div>
                        <div className="flex-1 flex">
                             <div className="flex-1 p-2 border-r border-[#333]">
                                 <div className="text-xs text-gray-500 mb-1">Original</div>
                                 <textarea className="w-full h-full bg-[#1e1e1e] text-gray-300 text-xs p-2 font-mono outline-none" readOnly value={viewingItem.original} />
                             </div>
                             <div className="flex-1 p-2">
                                 <div className="text-xs text-gray-500 mb-1 flex justify-between">
                                     <span>Obfuscated</span>
                                     <button onClick={() => handleCopy(viewingItem.obfuscated)} className="text-green-500 flex gap-1 items-center"><Copy size={10}/> Copy</button>
                                 </div>
                                 <textarea className="w-full h-full bg-[#1e1e1e] text-gray-300 text-xs p-2 font-mono outline-none" readOnly value={viewingItem.obfuscated} />
                             </div>
                        </div>
                     </div>
                 </div>
            )}
        </motion.div>
    </Draggable>
  );
};

export default ObfuscatorModal;
