import React, { useState, useRef, useEffect } from 'react';

interface DraggableProps {
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  handleSelector?: string; // CSS selector for the drag handle, defaults to the whole element if not provided
}

const Draggable: React.FC<DraggableProps> = ({ children, initialX = 100, initialY = 100, handleSelector }) => {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      x: isMobile ? 12 : initialX,
      y: isMobile ? 50 : initialY
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialLeft: number; initialTop: number } | null>(null);

  // Keep position bounded to viewport so it doesn't leave the screen (especially on mobile!)
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const width = elementRef.current ? elementRef.current.offsetWidth : 300;
        const height = elementRef.current ? elementRef.current.offsetHeight : 300;
        const limitX = Math.max(0, window.innerWidth - width);
        const limitY = Math.max(0, window.innerHeight - height);
        return {
          x: limitX > 0 ? Math.max(0, Math.min(prev.x, limitX)) : 0,
          y: limitY > 0 ? Math.max(0, Math.min(prev.y, limitY)) : 40,
        };
      });
    };
    // Let any children layout render first
    const timer = setTimeout(handleResize, 150);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        
        const width = elementRef.current ? elementRef.current.offsetWidth : 300;
        const height = elementRef.current ? elementRef.current.offsetHeight : 300;
        
        const limitX = Math.max(0, window.innerWidth - width);
        const limitY = Math.max(0, window.innerHeight - height);
        
        setPosition({
          x: limitX > 0 ? Math.max(0, Math.min(dragRef.current.initialLeft + dx, limitX)) : 0,
          y: limitY > 0 ? Math.max(0, Math.min(dragRef.current.initialTop + dy, limitY)) : 0,
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && dragRef.current && e.touches.length > 0) {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - dragRef.current.startX;
        const dy = touch.clientY - dragRef.current.startY;
        
        const width = elementRef.current ? elementRef.current.offsetWidth : 300;
        const height = elementRef.current ? elementRef.current.offsetHeight : 300;
        
        const limitX = Math.max(0, window.innerWidth - width);
        const limitY = Math.max(0, window.innerHeight - height);
        
        setPosition({
          x: limitX > 0 ? Math.max(0, Math.min(dragRef.current.initialLeft + dx, limitX)) : 0,
          y: limitY > 0 ? Math.max(0, Math.min(dragRef.current.initialTop + dy, limitY)) : 0,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (clientX: number, clientY: number, target: HTMLElement) => {
    // If handleSelector is provided, only allow drag if target matches
    if (handleSelector) {
        if (!target.closest(handleSelector)) return;
    }

    setIsDragging(true);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialLeft: position.x,
      initialTop: position.y,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX, e.clientY, e.target as HTMLElement);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY, e.target as HTMLElement);
    }
  };

  return (
    <div
      ref={elementRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        transition: isDragging ? 'none' : 'box-shadow 0.2s, left 0.15s ease-out, top 0.15s ease-out',
      }}
      className={isDragging ? 'cursor-grabbing hover:shadow-2xl' : ''}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {children}
    </div>
  );
};

export default Draggable;