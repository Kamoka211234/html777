
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Search, Globe, FileText, ArrowRight } from 'lucide-react';
import Draggable from '../Draggable';
import { playSound } from '../../utils/sound';

interface FindModalProps {
  onClose: () => void;
  onSearch: (term: string, scope: 'current' | 'all', wholeWord: boolean) => void;
  results?: Array<{ fileId: string; fileName: string; line: number; content: string }>;
  onNavigate?: (fileId: string, line: number) => void;
}

const FindModal: React.FC<FindModalProps> = ({ onClose, onSearch, results, onNavigate }) => {
  const [term, setTerm] = useState('');
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [wholeWord, setWholeWord] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTerm(e.target.value);
    onSearch(e.target.value, scope, wholeWord);
  };

  const handleScopeChange = (newScope: 'current' | 'all') => {
    playSound('click');
    setScope(newScope);
    onSearch(term, newScope, wholeWord);
  };

  const toggleWholeWord = () => {
    playSound('click');
    const newValue = !wholeWord;
    setWholeWord(newValue);
    onSearch(term, scope, newValue);
  };

  return (
    <Draggable handleSelector=".drag-handle">
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#252526] border border-[#454545] shadow-2xl rounded-xl w-96 flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out">
          {/* Header */}
          <div className="drag-handle flex items-center justify-between p-3 border-b border-[#333] cursor-move rounded-t-xl bg-[#2d2d2d]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Find</span>
              <button onClick={() => { playSound('pop'); onClose(); }} className="hover:bg-[#444] p-1 rounded-lg text-gray-400 transition-colors">
                  <X size={14} />
              </button>
          </div>
          
          <div className="p-3 gap-3 flex flex-col">
              {/* Search Bar */}
              <div className="flex items-center gap-2 bg-[#1e1e1e] rounded-lg p-[5px] border border-[#3e3e3e] focus-within:border-[#007acc] transition-colors">
                <Search size={16} className="text-gray-400 ml-1" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder={scope === 'current' ? "Find in current file..." : "Find in all files..."}
                  className="bg-transparent border-none outline-none text-[#cccccc] text-sm w-full"
                  value={term}
                  onChange={handleChange}
                />
                <button 
                  onClick={toggleWholeWord}
                  title="Match Whole Word"
                  className={`p-1 rounded text-[10px] font-bold transition-colors ${wholeWord ? 'bg-[#007acc] text-white' : 'text-gray-500 hover:bg-[#333]'}`}
                >
                  Ab
                </button>
              </div>

              {/* Scope Toggle */}
              <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-[#3e3e3e]">
                  <button 
                      onClick={() => handleScopeChange('current')}
                      className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs rounded-md transition-all ${scope === 'current' ? 'bg-[#37373d] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      <FileText size={12} /> Current
                  </button>
                  <button 
                      onClick={() => handleScopeChange('all')}
                      className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs rounded-md transition-all ${scope === 'all' ? 'bg-[#37373d] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      <Globe size={12} /> Project
                  </button>
              </div>

              {/* Results List */}
              {results && (
                  <div className="max-h-60 overflow-y-auto mt-2 border-t border-[#333] pt-2">
                      {results.length === 0 ? (
                          <div className="text-xs text-gray-500 text-center py-4">No results found</div>
                      ) : (
                          results.map((res, i) => (
                              <div 
                                key={i} 
                                onClick={() => { playSound('click'); onNavigate?.(res.fileId, res.line); }}
                                className="group flex flex-col p-2 hover:bg-[#37373d] rounded-lg cursor-pointer mb-1 border border-transparent hover:border-[#454545]"
                              >
                                  <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-semibold text-[#007acc] flex items-center gap-1">
                                          <FileText size={10} /> {res.fileName}
                                      </span>
                                      <span className="text-[10px] text-gray-500">Ln {res.line + 1}</span>
                                  </div>
                                  <div className="text-xs text-gray-400 font-mono truncate pl-2 border-l-2 border-[#454545] group-hover:border-[#007acc]">
                                      {res.content.trim()}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              )}
          </div>
        </motion.div>
    </Draggable>
  );
};

export default FindModal;
