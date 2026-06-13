
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Image as ImageIcon, Copy } from 'lucide-react';
import Draggable from '../Draggable';
import { playSound } from '../../utils/sound';

interface Base64ModalProps {
  onClose: () => void;
}

const Base64Modal: React.FC<Base64ModalProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [fileName, setFileName] = useState('');

  const handleCopy = (txt: string) => {
      navigator.clipboard.writeText(txt);
      playSound('click');
      alert('Copied!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setFileName(file.name);
          const reader = new FileReader();
          reader.onload = () => setInput(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  return (
    <Draggable handleSelector=".drag-handle" initialX={window.innerWidth / 2 - 200} initialY={window.innerHeight / 2 - 200}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#252526] border border-[#007acc] shadow-2xl rounded-xl w-[500px] h-[400px] flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out z-[90]">
            <div className="drag-handle flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-t-xl border-b border-[#333] cursor-move">
                <span className="text-xs font-bold text-gray-300">Image to Base64</span>
                <button onClick={onClose} className="hover:bg-[#333] p-1 rounded-lg text-gray-400">
                    <X size={14} />
                </button>
            </div>
            
            <div className="p-4 flex flex-col gap-3 h-full">
                 <label className="border-2 border-dashed border-[#3e3e3e] rounded-lg p-6 flex flex-col items-center cursor-pointer hover:bg-[#252526] transition-colors">
                    <Upload size={24} className="text-gray-400 mb-2"/>
                    <span className="text-xs text-gray-500">Upload Image</span>
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </label>
                
                {fileName && <div className="text-xs text-[#007acc] font-bold">Selected: {fileName}</div>}
                
                <div className="flex-1 relative">
                    <textarea 
                        value={input} 
                        readOnly 
                        placeholder="Base64 string will appear here..." 
                        className="w-full h-full bg-[#1e1e1e] text-gray-400 text-[10px] p-2 rounded outline-none resize-none font-mono border border-[#333]" 
                    />
                </div>
                
                <button disabled={!input} onClick={() => handleCopy(input)} className="bg-[#007acc] hover:bg-[#0063a5] text-white py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2">
                    <Copy size={14} /> Copy Base64
                </button>
            </div>
        </motion.div>
    </Draggable>
  );
};

export default Base64Modal;
