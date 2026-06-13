
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Box, Braces, Hash, Layers, Globe, FileText } from 'lucide-react';
import { CodeSymbol } from '../../utils/codeAnalysis';
import Draggable from '../Draggable';
import { playSound } from '../../utils/sound';
import { createSymbolWorker } from '../../utils/symbolWorker';
import { FileSystemItem } from '../../types';

interface SymbolModalProps {
  files: FileSystemItem[];
  currentSymbols: CodeSymbol[]; // From current file
  onClose: () => void;
  onSelect: (fileId: string, line: number) => void;
}

const SymbolModal: React.FC<SymbolModalProps> = ({ files, currentSymbols, onClose, onSelect }) => {
  const [filterType, setFilterType] = useState<'all' | 'function' | 'class' | 'selector'>('all');
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [allSymbols, setAllSymbols] = useState<any[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = createSymbolWorker();
    workerRef.current.onmessage = (e) => {
        setAllSymbols(e.data);
    };
    
    // Initial Scan
    workerRef.current.postMessage({ files, mode: 'parseAll' });
    
    // Realtime update interval
    const interval = setInterval(() => {
        workerRef.current?.postMessage({ files, mode: 'parseAll' });
    }, 2000);

    return () => { 
        clearInterval(interval);
        workerRef.current?.terminate(); 
    };
  }, [files]);

  const activeList = scope === 'current' ? currentSymbols.map(s => ({...s, fileId: null})) : allSymbols;

  const filteredSymbols = activeList.filter(s => {
      if (filterType === 'all') return true;
      if (filterType === 'selector') return s.type === 'id' || s.type === 'selector';
      return s.type === filterType;
  });

  const FilterButton = ({ type, label, icon: Icon }: any) => (
      <button 
        onClick={() => { playSound('click'); setFilterType(type); }}
        className={`px-2 py-1 text-xs rounded-lg border transition-all flex items-center gap-1
            ${filterType === type 
                ? 'bg-[#007acc] text-white border-[#007acc]' 
                : 'bg-transparent text-gray-400 border-[#3e3e3e] hover:border-gray-400'}
        `}
      >
          {Icon && <Icon size={10} />}
          {label}
      </button>
  );

  return (
    <Draggable handleSelector=".drag-handle">
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#252526] border border-[#454545] shadow-2xl rounded-xl w-96 max-h-[500px] flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out">
          <div className="drag-handle flex items-center justify-between p-3 border-b border-[#3e3e3e] cursor-move bg-[#2d2d2d] rounded-t-xl">
            <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Layers size={14} className="text-[#007acc]" /> 
                Symbols
            </span>
            <button onClick={() => { playSound('pop'); onClose(); }} className="hover:bg-[#444] p-1 rounded-lg text-gray-400 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="p-2 border-b border-[#3e3e3e] bg-[#1e1e1e] flex flex-col gap-2">
             <div className="flex bg-[#252526] rounded-lg p-1 border border-[#3e3e3e]">
                  <button 
                      onClick={() => { playSound('click'); setScope('current'); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs rounded-md transition-all ${scope === 'current' ? 'bg-[#37373d] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      <FileText size={12} /> Current File
                  </button>
                  <button 
                      onClick={() => { playSound('click'); setScope('all'); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs rounded-md transition-all ${scope === 'all' ? 'bg-[#37373d] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      <Globe size={12} /> All Files
                  </button>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <FilterButton type="all" label="All" />
                <FilterButton type="function" label="Funcs" icon={Braces} />
                <FilterButton type="class" label="Class" icon={Box} />
                <FilterButton type="selector" label="IDs/CSS" icon={Hash} />
              </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-1 min-h-[200px]">
            {filteredSymbols.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8 flex flex-col items-center">
                  <span className="opacity-50 mb-2">No symbols found</span>
              </div>
            ) : (
              filteredSymbols.map((sym, idx) => (
                <div 
                  key={idx}
                  onClick={() => { playSound('click'); onSelect(sym.fileId, sym.line); }}
                  className="flex flex-col px-3 py-2 hover:bg-[#37373d] hover:text-white cursor-pointer rounded-lg text-[#cccccc] text-sm group transition-colors border border-transparent hover:border-[#454545] mb-1"
                >
                  <div className="flex items-center gap-2">
                    {sym.type === 'class' && <Box size={14} className="text-orange-400" />}
                    {sym.type === 'function' && <Braces size={14} className="text-purple-400" />}
                    {(sym.type === 'id' || sym.type === 'selector') && <Hash size={14} className="text-blue-400" />}
                    <span className="font-mono font-bold">{sym.name}</span>
                    <span className="text-[10px] opacity-50 ml-auto group-hover:text-white bg-[#1e1e1e] px-1 rounded">Ln {sym.line + 1}</span>
                  </div>
                  {sym.fileName && (
                      <span className="text-[10px] text-gray-500 ml-6 group-hover:text-gray-300">{sym.fileName}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
    </Draggable>
  );
};

export default SymbolModal;
