
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Copy } from 'lucide-react';
import Draggable from '../Draggable';
import { playSound } from '../../utils/sound';

interface ColorPickerModalProps {
  onClose: () => void;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ onClose }) => {
  const [hex, setHex] = useState('#007acc');
  const [alpha, setAlpha] = useState(100);

  const getRgba = () => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
  };

  const getHex8 = () => {
      const a = Math.round((alpha / 100) * 255).toString(16).padStart(2, '0');
      return `${hex}${a}`;
  };

  const output = alpha === 100 ? hex : getRgba();

  const handleCopy = (txt: string) => {
      navigator.clipboard.writeText(txt);
      playSound('click');
      alert('Copied!');
  };

  return (
    <Draggable handleSelector=".drag-handle" initialX={window.innerWidth / 2 - 150} initialY={window.innerHeight / 2 - 150}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#252526] border border-[#007acc] shadow-2xl rounded-xl w-80 flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out z-[90]">
            <div className="drag-handle flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-t-xl border-b border-[#333] cursor-move">
                <span className="text-xs font-bold text-gray-300">Color Picker (Transparent)</span>
                <button onClick={onClose} className="hover:bg-[#333] p-1 rounded-lg text-gray-400">
                    <X size={14} />
                </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
                
                {/* Preview Box with Checkerboard background for transparency */}
                <div className="h-16 rounded-lg w-full relative overflow-hidden border border-[#444] bg-[url('https://transparenttextures.com/patterns/dark-matter.png')]">
                    <div 
                        className="absolute inset-0 transition-colors"
                        style={{ backgroundColor: output }}
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Color</span>
                        <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="w-8 h-8 bg-transparent cursor-pointer border-0 p-0"/>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>Opacity</span>
                            <span>{alpha}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={alpha} 
                            onChange={(e) => setAlpha(Number(e.target.value))} 
                            className="w-full accent-[#007acc] h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 font-mono">RGBA</span>
                        <button onClick={() => handleCopy(getRgba())} className="text-[#007acc] text-xs hover:underline">{getRgba()}</button>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 font-mono">Hex8</span>
                        <button onClick={() => handleCopy(getHex8())} className="text-[#007acc] text-xs hover:underline">{getHex8()}</button>
                    </div>
                </div>
            </div>
        </motion.div>
    </Draggable>
  );
};

export default ColorPickerModal;
