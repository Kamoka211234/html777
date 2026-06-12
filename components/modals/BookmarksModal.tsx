
import React from 'react';
import { motion } from 'motion/react';
import { X, Bookmark, FileCode, ArrowRight, Trash2 } from 'lucide-react';
import Draggable from '../Draggable';
import { playSound } from '../../utils/sound';
import { FileSystemItem } from '../../types';

interface BookmarksModalProps {
  bookmarks: Array<{fileId: string, line: number, content: string}>;
  onClose: () => void;
  onNavigate: (fileId: string, line: number) => void;
  onRemove: (fileId: string, line: number) => void;
  files: FileSystemItem[];
}

const BookmarksModal: React.FC<BookmarksModalProps> = ({ bookmarks, onClose, onNavigate, onRemove, files }) => {
  return (
    <Draggable handleSelector=".drag-handle" initialX={window.innerWidth - 320} initialY={80}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#252526] border border-[#007acc] shadow-2xl rounded-xl w-80 max-h-[500px] flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out z-[85]">
            <div className="drag-handle flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-t-xl border-b border-[#333] cursor-move">
                <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Bookmark size={14} className="text-[#007acc]" /> 
                    Bookmarks
                </span>
                <button onClick={onClose} className="hover:bg-[#444] p-1 rounded-lg text-gray-400 transition-colors">
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {bookmarks.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-8">
                        No bookmarks yet.<br/>Right click editor or Ctrl+F2 to add.
                    </div>
                ) : (
                    bookmarks.map((bm, i) => {
                        const file = files.find(f => f.id === bm.fileId);
                        return (
                            <div 
                                key={i} 
                                className="bg-[#1e1e1e] p-2 rounded mb-2 border border-[#333] hover:border-[#007acc] group flex flex-col gap-1 transition-colors"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-[#007acc] font-bold flex items-center gap-1 truncate max-w-[150px]">
                                        <FileCode size={10}/> {file?.name || 'Unknown'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500">Ln {bm.line}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onRemove(bm.fileId, bm.line); playSound('pop'); }}
                                            className="p-1 hover:bg-red-900/50 text-gray-500 hover:text-red-400 rounded"
                                            title="Remove Bookmark"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => onNavigate(bm.fileId, bm.line)}
                                    className="text-xs text-gray-300 font-mono truncate border-l-2 border-[#444] pl-2 group-hover:border-[#007acc] cursor-pointer hover:text-white"
                                >
                                    {bm.content}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </motion.div>
    </Draggable>
  );
};

export default BookmarksModal;
