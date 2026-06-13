
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ExternalLink, Save, Check } from 'lucide-react';
import Draggable from '../Draggable';
import { CodeSymbol } from '../../utils/codeAnalysis';
import { playSound } from '../../utils/sound';
import Editor from '@monaco-editor/react';

interface SymbolDetailsModalProps {
  symbol: CodeSymbol;
  onClose: () => void;
  onNavigate: () => void;
  onSave: (newContent: string) => void;
}

const SymbolDetailsModal: React.FC<SymbolDetailsModalProps> = ({ symbol, onClose, onNavigate, onSave }) => {
  const [content, setContent] = useState(symbol.content);

  useEffect(() => {
      setContent(symbol.content);
  }, [symbol]);

  return (
    <Draggable handleSelector=".drag-handle" initialX={window.innerWidth / 2 - 250} initialY={window.innerHeight / 2 - 200}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#1e1e1e] border border-[#007acc] shadow-2xl rounded-xl w-[600px] h-[450px] flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out z-[90]">
            <div className="drag-handle flex items-center justify-between px-3 py-2 bg-[#252526] rounded-t-xl border-b border-[#333] cursor-move">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#007acc] uppercase">Symbol Editor</span>
                    <span className="text-sm font-mono text-gray-300 bg-[#333] px-2 py-0.5 rounded">{symbol.name}</span>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => { onSave(content); }}
                        className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                        title="Save Changes"
                    >
                        <Save size={12} /> Save
                    </button>
                     <button 
                        onClick={() => { playSound('click'); onNavigate(); }}
                        className="flex items-center gap-1 text-xs bg-[#007acc] hover:bg-[#005f9e] text-white px-2 py-1 rounded"
                        title="Go to Definition"
                    >
                        <ExternalLink size={12} /> Go to
                    </button>
                    <button onClick={() => { playSound('pop'); onClose(); }} className="hover:bg-[#333] p-1 rounded-lg text-gray-400">
                        <X size={14} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
                <Editor
                    height="100%"
                    language="javascript"
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        fontSize: 12,
                        scrollBeyondLastLine: false,
                        folding: false,
                        contextmenu: true
                    }}
                />
            </div>
            <div className="px-3 py-1 bg-[#252526] border-t border-[#333] text-[10px] text-gray-500 flex justify-between">
                <span>Ln {symbol.line + 1}</span>
                <span>{symbol.type.toUpperCase()}</span>
            </div>
        </motion.div>
    </Draggable>
  );
};

export default SymbolDetailsModal;
