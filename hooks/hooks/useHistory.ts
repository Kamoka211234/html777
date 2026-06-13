import { useState, useCallback } from 'react';
import { FileSystemItem } from '../types';

export const useHistory = (initialFiles: FileSystemItem[]) => {
  const [history, setHistory] = useState<FileSystemItem[][]>([initialFiles]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pushState = useCallback((newFiles: FileSystemItem[]) => {
    // If we are not at the end, slice the history
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newFiles);
    
    // Limit history size to 50 steps to save memory
    if (newHistory.length > 50) {
        newHistory.shift();
    } else {
        setCurrentIndex(newHistory.length - 1);
    }
    setHistory(newHistory);
  }, [history, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [history, currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [history, currentIndex]);

  return {
    files: history[currentIndex],
    pushState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1
  };
};