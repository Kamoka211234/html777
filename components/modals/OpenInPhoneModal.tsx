import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone } from 'lucide-react';
import { ExtensionErrorBoundary } from '../ExtensionErrorBoundary';

interface Props {
  onClose: () => void;
}

const OpenInPhoneContent: React.FC<Props> = ({ onClose }) => {
  const currentUrl = window.location.href;

  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-sans" onClick={onClose}>
      <div 
        className="bg-[#252526] border border-[#333] rounded-lg w-[320px] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
          <div className="flex items-center gap-2 text-gray-200">
            <Smartphone size={16} className="text-[#007acc]" />
            <h2 className="text-sm font-semibold tracking-wide">Open in Phone</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center">
            <div className="bg-white p-3 rounded-lg shadow-inner mb-4">
                <QRCodeSVG value={currentUrl} size={150} level="M" />
            </div>
            
            <p className="text-gray-300 text-xs text-center mb-4 leading-relaxed">
                Scan this QR code with your mobile device's camera to seamlessly open this workspace on your phone.
            </p>
            
            <div className="w-full relative">
                <input 
                    type="text" 
                    readOnly 
                    value={currentUrl} 
                    className="w-full bg-[#1e1e1e] border border-[#333] text-gray-400 text-[10px] rounded px-3 py-2 outline-none font-mono text-center" 
                />
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export const OpenInPhoneModal: React.FC<Props> = (props) => (
    <ExtensionErrorBoundary extensionName="kamoh.open-in-phone">
        <OpenInPhoneContent {...props} />
    </ExtensionErrorBoundary>
);
