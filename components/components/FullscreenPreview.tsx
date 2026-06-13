import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Minimize2, Monitor, ScanEye, MousePointer2, ExternalLink, 
  Maximize2, RotateCcw, Code, Info, X, ZoomIn, ZoomOut,
  Move, Crosshair, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

interface FullscreenPreviewProps {
  src: string;
  onClose: () => void;
  onInspectElement: (data: { 
    tagName: string, 
    id: string, 
    className: string, 
    styles: any, 
    attributes: any, 
    rect: any,
    innerText?: string,
    innerHTML?: string
  }) => void;
  isVisible: boolean;
  isModalOpen?: boolean;
}

const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({ 
  src, onClose, onInspectElement, isVisible, isModalOpen 
}) => {
  const [previewWidth, setPreviewWidth] = useState(100);
  const [inspectMode, setInspectMode] = useState(false);
  const [notification, setNotification] = useState<{x: number, y: number, data: any} | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, width: 0 });
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeBarRef = useRef<HTMLDivElement>(null);

  // Reload iframe
  const handleReload = useCallback(() => {
    setIframeKey(Date.now());
    setIsLoaded(false);
    setInspectMode(false);
    setNotification(null);
  }, []);

  // Reset width
  const handleResetWidth = useCallback(() => {
    setPreviewWidth(100);
  }, []);

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, width: previewWidth });
  }, [previewWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = (e.clientX - dragStart.x) / (containerRef.current?.clientWidth || window.innerWidth) * 100;
      let newWidth = dragStart.width + delta;
      newWidth = Math.max(25, Math.min(100, newWidth));
      setPreviewWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Handle wheel resize (Ctrl + Scroll)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -2 : 2;
      let newWidth = previewWidth + delta;
      newWidth = Math.max(25, Math.min(100, newWidth));
      setPreviewWidth(newWidth);
    }
  }, [previewWidth]);

  // Inspect Mode Logic
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isLoaded) return;

    const HIGHLIGHT_ID = 'html777-inspect-outline';
    const LABEL_ID = 'html777-inspect-label';

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
      const iframeRect = iframe.getBoundingClientRect();

      // Create Outline
      const outline = doc.createElement('div');
      outline.id = HIGHLIGHT_ID;
      Object.assign(outline.style, {
        position: 'absolute',
        top: `${rect.top + scrollTop}px`,
        left: `${rect.left + scrollLeft}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: '2px solid #ea580c',
        backgroundColor: 'rgba(234, 88, 12, 0.15)',
        borderRadius: '4px',
        zIndex: '999990',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.1s ease-out',
        boxShadow: '0 0 0 1px rgba(234,88,12,0.3)'
      });
      doc.body.appendChild(outline);

      // Create Label
      const label = doc.createElement('div');
      label.id = LABEL_ID;
      
      let elementInfo = target.tagName.toLowerCase();
      if (target.id) elementInfo += `#${target.id}`;
      if (target.className && typeof target.className === 'string') {
        const classes = target.className.split(' ').filter(c => c && c !== 'undefined').slice(0, 2);
        if (classes.length > 0) elementInfo += `.${classes.join('.')}`;
      }
      
      label.textContent = `${elementInfo} | ${Math.round(rect.width)}×${Math.round(rect.height)}px`;
      
      Object.assign(label.style, {
        position: 'absolute',
        top: `${rect.top + scrollTop - 28}px`,
        left: `${rect.left + scrollLeft}px`,
        backgroundColor: '#ea580c',
        color: 'white',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: '600',
        zIndex: '999991',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.2)',
        letterSpacing: '0.3px'
      });

      if (rect.top < 30) {
        label.style.top = `${rect.bottom + scrollTop + 4}px`;
      }

      doc.body.appendChild(label);
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (!target || typeof target.getBoundingClientRect !== 'function') return;
      if (target === doc.body || target === doc.documentElement) return;
      
      const rect = target.getBoundingClientRect();
      const iframeRect = iframe.getBoundingClientRect();
      
      const notifX = iframeRect.left + rect.left + (rect.width / 2);
      const notifY = iframeRect.top + rect.bottom + 15;

      // Collect Computed Styles
      const computed = doc.defaultView?.getComputedStyle(target);
      const styles = computed ? {
        width: computed.width,
        height: computed.height,
        padding: computed.padding,
        margin: computed.margin,
        border: computed.border,
        borderRadius: computed.borderRadius,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        textAlign: computed.textAlign,
        display: computed.display,
        position: computed.position,
        top: computed.top,
        left: computed.left,
        right: computed.right,
        bottom: computed.bottom,
        zIndex: computed.zIndex,
        opacity: computed.opacity,
        transform: computed.transform,
        transition: computed.transition,
        boxShadow: computed.boxShadow
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
          innerText: target.innerText?.substring(0, 200),
          innerHTML: target.innerHTML?.substring(0, 500),
          styles,
          attributes,
          rect: {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          }
        }
      });
      
      // Small haptic feedback
      const outline = doc.getElementById(HIGHLIGHT_ID);
      if (outline) {
        outline.style.borderColor = '#22c55e';
        outline.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
        setTimeout(() => {
          if (outline) outline.style.borderColor = '#ea580c';
        }, 200);
      }
    };

    const handleMouseOut = () => {
      removeHighlight();
    };

    // Cleanup old listeners
    doc.body.removeEventListener('mouseover', handleMouseOver);
    doc.body.removeEventListener('mouseout', handleMouseOut);
    doc.body.removeEventListener('click', handleClick, true);

    if (inspectMode && !isModalOpen && isLoaded) {
      doc.body.addEventListener('mouseover', handleMouseOver);
      doc.body.addEventListener('mouseout', handleMouseOut);
      doc.body.addEventListener('click', handleClick, true);
      doc.body.style.cursor = 'crosshair';
      
      // Add inspect mode indicator
      const indicator = doc.createElement('div');
      indicator.id = 'inspect-mode-indicator';
      indicator.textContent = '🔍 Inspect Mode Active • Click any element';
      Object.assign(indicator.style, {
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        backgroundColor: '#ea580c',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: '600',
        zIndex: '999999',
        fontFamily: 'monospace',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        pointerEvents: 'none'
      });
      doc.body.appendChild(indicator);
    } else {
      removeHighlight();
      doc.body.style.cursor = '';
      const indicator = doc.getElementById('inspect-mode-indicator');
      if (indicator) indicator.remove();
    }

    return () => {
      if (doc && doc.body) {
        doc.body.removeEventListener('mouseover', handleMouseOver);
        doc.body.removeEventListener('mouseout', handleMouseOut);
        doc.body.removeEventListener('click', handleClick, true);
        doc.body.style.cursor = '';
        removeHighlight();
        const indicator = doc.getElementById('inspect-mode-indicator');
        if (indicator) indicator.remove();
      }
    };
  }, [inspectMode, isLoaded, src, isModalOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      
      if (e.key === 'Escape') {
        if (inspectMode) {
          setInspectMode(false);
          setNotification(null);
        } else {
          onClose();
        }
      }
      if (e.key === 'f' && e.ctrlKey) {
        e.preventDefault();
        handleReload();
      }
      if (e.key === '+' && e.ctrlKey) {
        e.preventDefault();
        setPreviewWidth(prev => Math.min(100, prev + 5));
      }
      if (e.key === '-' && e.ctrlKey) {
        e.preventDefault();
        setPreviewWidth(prev => Math.max(25, prev - 5));
      }
      if (e.key === '0' && e.ctrlKey) {
        e.preventDefault();
        handleResetWidth();
      }
      if (e.key === 'i' && e.ctrlKey) {
        e.preventDefault();
        if (isLoaded && src) {
          setInspectMode(prev => !prev);
          if (!inspectMode) setNotification(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, inspectMode, isLoaded, src, onClose, handleReload, handleResetWidth]);

  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col font-sans"
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="h-12 bg-[#1a1a2e] border-b border-[#2a2a3e] flex items-center justify-between px-5 shadow-xl z-20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-r from-[#ea580c] to-[#f97316] flex items-center justify-center">
              <Monitor size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-200">Live Preview</span>
          </div>
          
          <div className="h-5 w-px bg-[#2a2a3e]" />

          {/* Inspect Button */}
          <button 
            disabled={!isLoaded || !src}
            onClick={() => {
              const newValue = !inspectMode;
              setInspectMode(newValue);
              if (!newValue) setNotification(null);
            }}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all text-xs font-semibold ${
              inspectMode 
                ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/30' 
                : 'bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e]'
            } ${(!isLoaded || !src) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ScanEye size={14} />
            {inspectMode ? 'Inspect Mode ON' : 'Inspect Element'}
          </button>

          {/* Reload Button */}
          <button 
            onClick={handleReload}
            className="p-1.5 rounded-lg bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
            title="Reload (Ctrl+F)"
          >
            <RefreshCw size={14} className={!isLoaded ? 'animate-spin' : ''} />
          </button>

          {/* Info Button */}
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-1.5 rounded-lg bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
          >
            <Info size={14} />
          </button>
        </div>

        {/* Width Control */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500 font-mono">Width</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPreviewWidth(prev => Math.max(25, prev - 5))}
              className="p-1 rounded bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
            >
              <ZoomOut size={12} />
            </button>
            <div 
              ref={resizeBarRef}
              className="w-32 h-1.5 bg-[#2a2a3e] rounded-full overflow-hidden cursor-ew-resize relative group"
              onMouseDown={handleResizeStart}
            >
              <div 
                className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316] transition-all duration-75 rounded-full"
                style={{ width: `${previewWidth}%` }}
              />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#ea580c] rounded-full opacity-0 group-hover:opacity-100 transition-all"
                style={{ left: `calc(${previewWidth}% - 6px)` }}
              />
            </div>
            <button 
              onClick={() => setPreviewWidth(prev => Math.min(100, prev + 5))}
              className="p-1 rounded bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
            >
              <ZoomIn size={12} />
            </button>
            <button 
              onClick={handleResetWidth}
              className="p-1 rounded bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
              title="Reset Width (Ctrl+0)"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          <span className="text-[10px] text-gray-400 font-mono w-10">{Math.round(previewWidth)}%</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Presets */}
          <div className="flex gap-1">
            <button 
              onClick={() => setPreviewWidth(100)}
              className="px-2 py-1 text-[9px] rounded bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
            >
              Desktop
            </button>
            <button 
              onClick={() => setPreviewWidth(75)}
              className="px-2 py-1 text-[9px] rounded bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
            >
              Laptop
            </button>
            <button 
              onClick={() => setPreviewWidth(48)}
              className="px-2 py-1 text-[9px] rounded bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
            >
              Tablet
            </button>
            <button 
              onClick={() => setPreviewWidth(32)}
              className="px-2 py-1 text-[9px] rounded bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-all"
            >
              Mobile
            </button>
          </div>
          
          <div className="h-5 w-px bg-[#2a2a3e] mx-1" />
          
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a3e] hover:bg-[#ef4444] text-gray-300 hover:text-white rounded-lg transition-all text-xs font-medium"
          >
            <Minimize2 size={12} /> Exit
          </button>
        </div>
      </div>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-14 left-4 z-30 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-3 shadow-2xl max-w-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-200">Preview Controls</span>
              <button onClick={() => setShowInfo(false)} className="p-0.5 rounded hover:bg-[#2a2a3e]">
                <X size={12} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-1.5 text-[10px] text-gray-400">
              <div className="flex justify-between"><span>Ctrl + Scroll</span><span>Resize preview</span></div>
              <div className="flex justify-between"><span>Ctrl + F</span><span>Reload page</span></div>
              <div className="flex justify-between"><span>Ctrl + I</span><span>Toggle inspect mode</span></div>
              <div className="flex justify-between"><span>Ctrl + 0</span><span>Reset width</span></div>
              <div className="flex justify-between"><span>Escape</span><span>Exit preview / cancel inspect</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewport Area */}
      <div 
        ref={containerRef}
        className="flex-1 w-full bg-[#111] overflow-hidden relative flex items-center justify-center p-5"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(234,88,12,0.05) 0%, transparent 50%)' }}
        onClick={() => setNotification(null)}
      >
        <motion.div 
          animate={{ width: `${previewWidth}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{ height: 'calc(100% - 20px)' }}
          className="bg-white relative origin-center shadow-2xl rounded-xl overflow-hidden border border-[#2a2a3e]"
        >
          <iframe 
            key={iframeKey}
            ref={iframeRef}
            title="preview-frame"
            src={src || undefined}
            onLoad={() => setIsLoaded(true)}
            className="w-full h-full border-none bg-white"
            style={{ pointerEvents: isModalOpen ? 'none' : 'auto' }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          />
          
          {/* Loading Overlay */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500 font-mono">Loading preview...</span>
            </div>
          )}
        </motion.div>
        
        {/* Resize Handle */}
        <div 
          className="absolute bottom-1/2 right-1 translate-y-1/2 w-1 h-20 bg-gradient-to-r from-[#ea580c] to-transparent rounded-full cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
          style={{ right: `calc(${100 - previewWidth}% - 5px)` }}
          onMouseDown={handleResizeStart}
        />
      </div>

      {/* Inspection Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[300] bg-[#1e1e2e] border-l-4 border-[#ea580c] shadow-2xl rounded-lg p-3 flex flex-col gap-2 min-w-[260px] max-w-sm"
            style={{ 
              left: Math.min(window.innerWidth - 280, Math.max(20, notification.x - 130)),
              top: Math.min(window.innerHeight - 120, notification.y) 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-white font-semibold text-xs border-b border-[#2a2a3e] pb-2">
              <Crosshair size={12} className="text-[#ea580c]" />
              <span>Element Inspector</span>
            </div>
            <div className="text-[11px] font-mono">
              <span className="text-[#ea580c]">&lt;{notification.data.tagName}</span>
              {notification.data.id && <span className="text-blue-400"> id="{notification.data.id}"</span>}
              {notification.data.className && <span className="text-green-400"> class="{notification.data.className}"</span>}
              <span className="text-[#ea580c]">&gt;</span>
            </div>
            <div className="text-[10px] text-gray-500">
              {Math.round(notification.data.rect.width)} × {Math.round(notification.data.rect.height)}px
            </div>
            <button 
              onClick={() => {
                onInspectElement(notification.data);
                setNotification(null);
                setInspectMode(false);
              }}
              className="mt-1 bg-[#ea580c] hover:bg-[#c2410c] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <ExternalLink size={12} /> Edit Styles in Editor
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FullscreenPreview;