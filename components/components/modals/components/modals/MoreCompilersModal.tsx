import React, { useEffect } from 'react';
import Draggable from '../Draggable';
import { X, ExternalLink } from 'lucide-react';
import { createRipple } from '../../utils/ripple';

const MoreCompilersModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    return (
        <div className={`fixed inset-0 z-[99999] items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${isOpen ? 'flex' : 'hidden'}`}>
            <div className="bg-[#0b0c10] w-full h-full max-w-7xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-[var(--border-color)]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[#13141a]">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">More Compilers</span>
                        <div className="flex gap-2">
                           <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">OneCompiler</span>
                        </div>
                        <div className="corner-label" id="watermark" title="Hide" onClick={(e) => {
                            e.currentTarget.style.transition = "opacity 0.4s ease";
                            e.currentTarget.style.opacity = "0";
                            setTimeout(() => {
                                e.currentTarget.style.display = "none";
                            }, 400);
                        }}>
                            <div className="text-stage">
                                {/* Shown on normal view */}
                                <span className="default-text">powered by codecompiler</span>
                                {/* Shown on hover view */}
                                <span className="hover-text">using from html771</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 relative bg-[#0b0c10] overflow-hidden">
                    <style>{`
                        /* Force the browser window to remove all default white margins and scrollbars */
                        .compiler-container iframe {
                            width: 100%; height: 100%; border: none; display: block;
                        }
                        
                        /* 📌 SMALL, MINIMALIST TOP-RIGHT CORNER LABEL */
                        .corner-label {
                            position: absolute; top: 10px; right: 25px;
                            background-color: rgba(0, 0, 0, 0.7);
                            border: 1px solid rgba(58, 58, 58, 1.00); border-radius: 4px;
                            color: rgba(255, 255, 255, 0.65); font-size: 11px;
                            font-family: monospace; z-index: 10; cursor: pointer;
                            overflow: visible; white-space: nowrap; opacity: 0.7;
                            display: inline-block; height: 15px; padding: 5px 12px;
                            transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1); width: 135px;
                        }
                        
                        /* 🪄 THE SMOOTH SWAPPING TEXT EFFECT */
                        .text-stage { position: relative; width: 100%; height: 100%; }
                        .text-stage span {
                            position: absolute; top: 0; left: 0; display: inline-block; white-space: nowrap;
                            transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease;
                        }
                        
                        /* --- STATE 1: DEFAULT STATE --- */
                        .default-text { opacity: 1; transform: translateY(0); }
                        .corner-label:hover .default-text { opacity: 0; transform: translateY(15px); }
                        
                        /* --- STATE 2: HOVERED STATE --- */
                        .hover-text { opacity: 0; transform: translateY(-15px); }
                        .corner-label:hover .hover-text { opacity: 1; transform: translateY(0); }
                        
                        /* 🌟 MINIMALIST HOVER DROPDOWN */
                        .dropdown-menu {
                            display: none; position: absolute; top: 25px; right: 0;
                            background-color: rgba(0, 0, 0, 0.9);
                            border: 1px solid rgba(98, 0, 238, 0.4); border-radius: 4px;
                            padding: 4px 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.4);
                            opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
                        }
                        .corner-label:hover .dropdown-menu { display: block; opacity: 1; pointer-events: auto; }
                        .dropdown-item { color: rgba(255, 255, 255, 0.7); font-size: 10px; font-family: monospace; display: block; }
                    `}</style>
                    <div className="compiler-container w-full h-full relative">
                        {/* Smooth Swapping Branding Label */}
                        

                        {/* The Full Screen Embedded Compiler */}
                        <iframe id="oc-editor" className="embedded-compiler" src="https://onecompiler.com"></iframe>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MoreCompilersModal;
