
import React, { useState, useRef, useEffect } from 'react';
import { Minimize2, Monitor, ScanEye, MousePointer2, ExternalLink } from 'lucide-react';

interface FullscreenPreviewProps {
    src: string;
    onClose: () => void;
    onInspectElement: (data: { tagName: string, id: string, className: string, styles: any, attributes: any, rect: any }) => void;
    isVisible: boolean;
    isModalOpen?: boolean;
}

const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({ src, onClose, onInspectElement, isVisible, isModalOpen }) => {
    const [previewWidth, setPreviewWidth] = useState(100);
    const [inspectMode, setInspectMode] = useState(false);
    const [notification, setNotification] = useState<{x: number, y: number, data: any} | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Inspect Mode Logic
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !isLoaded) return;

        const HIGHLIGHT_ID = 'kamo-inspect-outline';
        const LABEL_ID = 'kamo-inspect-label';

        const doc = iframe.contentDocument;
        if (!doc || !doc.body) return;

        const removeHighlight = () => {
            const el = doc.getElementById(HIGHLIGHT_ID);
            if (el) el.remove();
            const lbl = doc.getElementById(LABEL_ID);
            if (lbl) lbl.remove();
        };

        const handleMouseOver = (e: MouseEvent) => {
            e.stopPropagation();
            
            const target = e.target as HTMLElement;
            if (!target || typeof target.getBoundingClientRect !== 'function') return;
            if (target.id === HIGHLIGHT_ID || target.id === LABEL_ID) return;
            if (target === doc.body || target === doc.documentElement) return;

            removeHighlight();

            const rect = target.getBoundingClientRect();
            const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
            const scrollLeft = doc.documentElement.scrollLeft || doc.body.scrollLeft;

            // Create Outline
            const outline = doc.createElement('div');
            outline.id = HIGHLIGHT_ID;
            Object.assign(outline.style, {
                position: 'absolute',
                top: (rect.top + scrollTop) + 'px',
                left: (rect.left + scrollLeft) + 'px',
                width: rect.width + 'px',
                height: rect.height + 'px',
                border: '2px solid #ea580c',
                backgroundColor: 'rgba(234, 88, 12, 0.1)',
                zIndex: '999990',
                pointerEvents: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.05s ease-out'
            });
            doc.body.appendChild(outline);

            // Create Label
            const label = doc.createElement('div');
            label.id = LABEL_ID;
            
            let name = target.tagName.toLowerCase();
            if (target.id) name += `#${target.id}`;
            if (target.className && typeof target.className === 'string') {
                const classes = target.className.split(' ').filter(c => c && c !== 'undefined').join('.');
                if (classes.length > 0) name += `.${classes}`;
            }
            
            label.textContent = `${name} | ${Math.round(rect.width)}x${Math.round(rect.height)}`;
            
            Object.assign(label.style, {
                position: 'absolute',
                top: (rect.top + scrollTop - 28) + 'px',
                left: (rect.left + scrollLeft) + 'px',
                backgroundColor: '#ea580c',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                zIndex: '999991',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.2)'
            });

            if (rect.top < 30) {
                label.style.top = (rect.bottom + scrollTop + 4) + 'px';
            }

            doc.body.appendChild(label);
        };

        const handleClick = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                
                const target = e.target as HTMLElement;
                if (!target || typeof target.getBoundingClientRect !== 'function') return;
                if (target === doc.body || target === doc.documentElement) return;
                
                // Calculate position relative to viewport
                const rect = target.getBoundingClientRect();
                const iframeRect = iframe.getBoundingClientRect();
                
                const notifX = iframeRect.left + rect.left + (rect.width / 2);
                const notifY = iframeRect.top + rect.bottom + 10;

                // Collect Computed Styles
                const computed = doc.defaultView?.getComputedStyle(target);
                const styles = computed ? {
                    width: computed.width,
                    height: computed.height,
                    padding: computed.padding,
                    margin: computed.margin,
                    border: computed.borderWidth,
                    color: computed.color,
                    backgroundColor: computed.backgroundColor,
                    fontSize: computed.fontSize,
                    fontFamily: computed.fontFamily,
                    display: computed.display,
                    position: computed.position,
                    zIndex: computed.zIndex
                } : {};

                // Collect Attributes
                const attributes: Record<string, string> = {};
                Array.from(target.attributes).forEach(attr => {
                    attributes[attr.name] = attr.value;
                });

                setNotification({
                    x: notifX,
                    y: notifY,
                    data: {
                        tagName: target.tagName.toLowerCase(),
                        id: target.id,
                        className: typeof target.className === 'string' ? target.className : '',
                        innerText: target.innerText,
                        innerHTML: target.innerHTML,
                        styles,
                        attributes,
                        rect: {
                            width: rect.width,
                            height: rect.height
                        }
                    }
                });
        };

        const handleMouseOut = () => {
            removeHighlight();
        };

        // Cleanup old listeners
        doc.body.removeEventListener('mouseover', handleMouseOver);
        doc.body.removeEventListener('mouseout', handleMouseOut);
        doc.body.removeEventListener('click', handleClick, true);

        if (inspectMode && !isModalOpen) {
            doc.body.addEventListener('mouseover', handleMouseOver);
            doc.body.addEventListener('mouseout', handleMouseOut);
            doc.body.addEventListener('click', handleClick, true); // Capture phase
            doc.body.style.cursor = 'crosshair';
        } else {
            removeHighlight();
            doc.body.style.cursor = '';
        }

        return () => {
            if (doc && doc.body) {
                doc.body.removeEventListener('mouseover', handleMouseOver);
                doc.body.removeEventListener('mouseout', handleMouseOut);
                doc.body.removeEventListener('click', handleClick, true);
                doc.body.style.cursor = '';
                removeHighlight();
            }
        };
    }, [inspectMode, isLoaded, src, isModalOpen]);

    if (!isVisible) return null;

    const handleWheel = (e: React.WheelEvent) => {
        setPreviewWidth(prev => {
            const delta = e.deltaY > 0 ? -2 : 2;
            let newWidth = prev + delta;
            if (newWidth < 25) newWidth = 25;
            if (newWidth > 100) newWidth = 100;
            return newWidth;
        });
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#0d0d0d] flex flex-col font-sans animate-in fade-in zoom-in-95 duration-300 ease-out">
            {/* Minimal Toolbar */}
            <div className="h-14 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-6 shadow-xl z-20">
                <div className="flex items-center gap-6 w-1/3">
                    <div className="flex items-center gap-2 text-gray-200 font-semibold select-none">
                        <Monitor className="text-[#007acc]" size={20} />
                        <span>Preview Mode</span>
                    </div>
                    
                    <div className="h-6 w-[1px] bg-[#333]" />

                    {/* Inspect Button */}
                    <button 
                        disabled={!isLoaded || !src}
                        onClick={() => {
                            const newValue = !inspectMode;
                            setInspectMode(newValue);
                            if (!newValue) setNotification(null);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-bold border ${
                            inspectMode 
                            ? 'bg-[#ea580c] border-[#ea580c] text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]' 
                            : 'bg-black border-[#333] text-gray-400 hover:text-white hover:border-gray-500'
                        } ${(!isLoaded || !src) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ScanEye size={16} />
                        {inspectMode ? 'INSPECT ON' : 'INSPECT'}
                    </button>
                </div>

                {/* Responsive Scrolling Div */}
                <div 
                    className="flex items-center justify-center h-full px-8 cursor-ew-resize group w-1/3"
                    onWheel={handleWheel}
                    title="Scroll to resize preview"
                >
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-xs text-gray-400 font-mono group-hover:text-[#007acc] transition-colors select-none">
                            Width: {previewWidth}%
                        </div>
                        <div className="w-32 h-1 bg-[#333] rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[#007acc] transition-all duration-75" 
                                style={{ width: `${previewWidth}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end w-1/3">
                    <button 
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#333] hover:bg-[#444] text-gray-300 rounded-lg transition-colors text-sm font-medium"
                    >
                        <Minimize2 size={16} /> Exit
                    </button>
                </div>
            </div>

            {/* Viewport Area */}
            <div 
                className="flex-1 w-full h-full bg-[#111] overflow-hidden relative flex items-center justify-center p-6 bg-[url('https://transparenttextures.com/patterns/cubes.png')]"
                onClick={() => setNotification(null)}
            >
                 <div 
                    style={{
                        width: `${previewWidth}%`,
                        height: '100%',
                        transition: 'width 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        borderRadius: '12px',
                    }}
                    className="bg-white relative origin-center backface-hidden border border-[#333] overflow-hidden"
                 >
                     <iframe 
                        ref={iframeRef}
                        title="preview-frame"
                        src={src || undefined}
                        onLoad={() => setIsLoaded(true)}
                        className="w-full h-full border-none bg-white"
                        style={{ pointerEvents: isModalOpen ? 'none' : 'auto' }}
                     />
                 </div>
            </div>

            {/* Notification Toast for Inspection */}
            {notification && (
                <div 
                    className="fixed z-[300] bg-[#1e1e1e] border border-[#ea580c] shadow-2xl rounded-lg p-3 flex flex-col gap-2 animate-in zoom-in-95 duration-200"
                    style={{ 
                        left: Math.min(window.innerWidth - 220, Math.max(20, notification.x - 100)),
                        top: Math.min(window.innerHeight - 100, notification.y) 
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-2 text-white font-bold text-xs border-b border-[#333] pb-2 mb-1">
                        <MousePointer2 size={12} className="text-[#ea580c]" />
                        <span>Inspect Element</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mb-2">
                         &lt;{notification.data.tagName}&gt;
                         {notification.data.id && <span className="text-blue-400"> #{notification.data.id}</span>}
                    </div>
                    <button 
                        onClick={() => {
                            onInspectElement(notification.data);
                            setNotification(null);
                        }}
                        className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                        <ExternalLink size={12} /> Edit Styles
                    </button>
                </div>
            )}
        </div>
    );
};

export default FullscreenPreview;
