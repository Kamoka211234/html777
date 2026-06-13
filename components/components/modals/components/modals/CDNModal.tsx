
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Search, Link, Copy, Loader } from 'lucide-react';
import Draggable from '../Draggable';
import { playSound } from '../../utils/sound';

interface CDNModalProps {
  onClose: () => void;
  isOpen: boolean; // For preserving scroll state
}

const CDNModal: React.FC<CDNModalProps> = ({ onClose, isOpen }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollPos = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && listRef.current) {
        listRef.current.scrollTop = scrollPos.current;
    }
  }, [isOpen]);

  const searchCDN = async (term: string) => {
      if (!term) return;
      setLoading(true);
      try {
          const res = await fetch(`https://api.cdnjs.com/libraries?search=${term}&fields=filename,description&limit=20`);
          const data = await res.json();
          setResults(data.results);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      scrollPos.current = e.currentTarget.scrollTop;
  };

  const copyLink = (url: string) => {
      navigator.clipboard.writeText(`<script src="${url}"></script>`);
      playSound('click');
      alert("Script tag copied!");
  };

  if (!isOpen) return null;

  return (
    <Draggable handleSelector=".drag-handle" initialX={window.innerWidth - 420} initialY={100}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#252526] border border-[#454545] shadow-2xl rounded-xl w-96 h-[500px] flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out z-[85]">
            <div className="drag-handle flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-t-xl border-b border-[#3e3e3e] cursor-move">
                <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Link size={14} className="text-[#007acc]" /> 
                    CDN Libraries
                </span>
                <button onClick={onClose} className="hover:bg-[#444] p-1 rounded-lg text-gray-400 transition-colors">
                    <X size={14} />
                </button>
            </div>

            <div className="p-3 border-b border-[#3e3e3e]">
                <div className="flex items-center gap-2 bg-[#1e1e1e] rounded-lg p-1.5 border border-[#3e3e3e] focus-within:border-[#007acc]">
                    <Search size={14} className="text-gray-500" />
                    <input 
                        className="bg-transparent outline-none text-xs text-gray-300 w-full"
                        placeholder="Search libraries (e.g. jquery, react)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchCDN(query)}
                    />
                </div>
            </div>

            <div 
                ref={listRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-2 space-y-2"
            >
                {loading && <div className="flex justify-center p-4"><Loader className="animate-spin text-[#007acc]" /></div>}
                {!loading && results.length === 0 && <div className="text-center text-gray-500 text-xs mt-4">Search for libraries above.</div>}
                
                {results.map((lib: any, i) => (
                    <div key={i} className="bg-[#1e1e1e] p-2 rounded border border-[#333] hover:border-[#007acc] transition-colors">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-gray-200">{lib.name}</span>
                            <button 
                                onClick={() => copyLink(lib.latest)}
                                className="text-[#007acc] hover:text-white p-1 rounded"
                                title="Copy Script Tag"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate mt-1">{lib.latest}</p>
                    </div>
                ))}
            </div>
        </motion.div>
    </Draggable>
  );
};

export default CDNModal;
