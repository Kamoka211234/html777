
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSystemItem } from '../types';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown, File, Plus, Trash, Edit, Copy, Clipboard, Link, Edit2, AlertTriangle, Upload, Move, X, Check, Workflow, Database } from 'lucide-react';
import { playSound } from '../utils/sound';
import { processFileImport } from '../utils/fileImporter';
import { translations } from '../utils/translations';
import { createRipple } from '../utils/ripple';

interface FileExplorerProps {
  files: FileSystemItem[];
  activeFileId: string | null;
  onFileClick: (id: string) => void;
  onFolderClick: (id: string) => void;
  onNewFile: (parentId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
  onCopy: (id: string) => void;
  onPaste: (parentId: string) => void;
  onCopyPath: (id: string) => void;
  canPaste: boolean;
  onImportFiles?: (files: File[], parentId: string) => void;
  onMove?: (sourceIds: string[], targetFolderId: string) => void;
  onDeleteMultiple?: (ids: string[]) => void;
  onTriggerImport?: () => void;
  onClearStorage?: () => void;
  language: string;
  onInject?: (sourceId: string, targetId: string) => void;
}

const ContextMenu = ({ x, y, options, onClose }: any) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState({ top: y, left: x, opacity: 0 });
    const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const screenHeight = window.innerHeight;
            const screenWidth = window.innerWidth;
            
            let newTop = y;
            let newLeft = x;

            // Flip vertically if not enough space
            if (y + rect.height > screenHeight - 20) {
                newTop = y - rect.height;
            }

            // Flip horizontally if not enough space
            if (x + rect.width > screenWidth - 20) {
                newLeft = x - rect.width;
            }

            setStyle({ top: newTop, left: newLeft, opacity: 1 });
        }
    }, [x, y]);

    return (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed z-[9999] bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl py-1 rounded-xl w-48 p-[5px] origin-top-left transition-opacity duration-100"
        style={style as any}
        onClick={(e) => e.stopPropagation()} 
        onMouseLeave={() => setActiveSubmenu(null)}
    >
            {options.map((opt: any, i: number) => {
                if (opt.separator) {
                    return <div key={i} className="h-[1px] bg-[var(--border-color)] my-1 mx-2" />;
                }
                return (
                    <div 
                        key={i} 
                        className="relative"
                        onMouseEnter={() => {
                            if (!opt.disabled) setActiveSubmenu(i);
                            else setActiveSubmenu(null);
                        }}
                    >
                        <button
                            disabled={opt.disabled}
                            className={`w-full text-left px-4 py-1.5 flex items-center gap-2 text-sm rounded-lg mb-[2px] transition-colors relative overflow-hidden ${
                                opt.disabled 
                                ? 'opacity-50 cursor-not-allowed text-[var(--text-secondary)]' 
                                : 'text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white'
                            } ${opt.danger ? 'text-red-400 hover:bg-red-900/50' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!opt.disabled && !opt.submenu) {
                                    createRipple(e);
                                    playSound('click');
                                    opt.action();
                                    onClose();
                                }
                            }}
                        >
                            {opt.icon && <opt.icon size={14} className={opt.danger ? 'text-red-400' : 'text-[var(--text-secondary)]'} />}
                            <span className="flex-1">{opt.label}</span>
                            {opt.submenu && <ChevronRight size={12} className="opacity-50" />}
                        </button>

                        {/* Submenu */}
                        {opt.submenu && activeSubmenu === i && (
                            <div className="absolute left-full top-0 ml-1 bg-[#252526] border border-[#333] shadow-xl rounded-xl w-48 p-[5px] z-[10000]">
                                {opt.submenu.map((subOpt: any, j: number) => (
                                    <button
                                        key={j}
                                        disabled={subOpt.disabled}
                                        className={`w-full text-left px-4 py-1.5 flex items-center gap-2 text-sm rounded-lg mb-[2px] transition-colors ${
                                            subOpt.className ? subOpt.className : (
                                            subOpt.disabled 
                                            ? 'opacity-50 cursor-default text-[var(--text-secondary)]' 
                                            : 'text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white'
                                            )
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!subOpt.disabled) {
                                                playSound('click');
                                                subOpt.action();
                                                onClose();
                                            }
                                        }}
                                    >
                                        {subOpt.icon && <subOpt.icon size={14} className={subOpt.className ? 'text-inherit' : 'text-[var(--text-secondary)]'} />}
                                        {subOpt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
    </motion.div>
    );
};

const FileItem: React.FC<{
  item: FileSystemItem;
  files: FileSystemItem[];
  activeFileId: string | null;
  selectedIds: Set<string>;
  onFileClick: (id: string) => void;
  onFolderClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: FileSystemItem) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onCopyPath: (path: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onTouchStartSelect?: (id: string, x: number, y: number) => void;
  onTouchMoveSelect?: (clientX: number, clientY: number) => void;
  onTouchEndSelect?: () => void;
  isTouchSelecting?: boolean;
}> = ({ 
  item, files, activeFileId, selectedIds, onFileClick, onFolderClick, onContextMenu, onDrop, onCopyPath,
  onRename, onDelete, onCopy, onToggleSelect,
  onTouchStartSelect, onTouchMoveSelect, onTouchEndSelect, isTouchSelecting
}) => {
  const isFolder = item.type === 'folder';
  const isActive = item.id === activeFileId;
  const isSelected = selectedIds.has(item.id);
  const paddingLeft = `${item.depth * 12 + 10}px`;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSlid, setIsSlid] = useState(false);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = (e: any) => {
    if (e.button && e.button !== 0) return;
    cancelLongPress();
    
    const touch = e.touches ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    const rect = e.currentTarget?.getBoundingClientRect();
    const fallbackX = rect ? rect.left + rect.width / 2 : 100;
    const fallbackY = rect ? rect.top + rect.height / 2 : 100;

    longPressTimer.current = setTimeout(() => {
      playSound('success');
      const simulatedEvent = {
        clientX: clientX || fallbackX,
        clientY: clientY || fallbackY,
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onContextMenu(simulatedEvent as any, item);
      onToggleSelect(item.id);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startLongPress(e);
    if (e.touches && e.touches[0] && onTouchStartSelect) {
      const touch = e.touches[0];
      onTouchStartSelect(item.id, touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    cancelLongPress();
    if (onTouchEndSelect) {
      onTouchEndSelect();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    cancelLongPress();
    if (e.touches && e.touches[0] && onTouchMoveSelect) {
      const touch = e.touches[0];
      onTouchMoveSelect(touch.clientX, touch.clientY);
      
      if (isTouchSelecting && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startLongPress(e);
  };

  const handleMouseUp = () => {
    cancelLongPress();
  };

  const handleMouseMove = () => {
    cancelLongPress();
  };

  let Icon = File;
  if (isFolder) {
    Icon = item.isOpen ? FolderOpen : Folder;
  } else if (item.name.endsWith('.html') || item.name.endsWith('.css') || item.name.endsWith('.js') || item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
    Icon = FileCode;
  } else if (item.name.endsWith('.flow')) {
    Icon = Workflow;
  }

  const renderIcon = () => {
    if (isFolder) {
      return <Icon size={14} className="mr-2 transition-transform duration-200 text-[#dcb67a]" />;
    }
    if (item.name.endsWith('.tsx')) {
      return (
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" className="mr-2 w-[14px] h-[14px] shrink-0">
          <path fillRule="evenodd" clipRule="evenodd" d="M1 16H16V9H1V16Z" fill="#40B6E0" fillOpacity="0.7"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M7 1L3 5H7V1Z" fill="#9AA7B0" fillOpacity="0.8"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M8 1V6H3V8H13V1H8Z" fill="#9AA7B0" fillOpacity="0.8"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M3 11H1.5V10H5.5V11H4V15H3V11Z" fill="#231F20" fillOpacity="0.7"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M6.97277 11.5015C6.97277 11.1331 7.284 11 7.845 11C7.85033 11 8.23533 11 9 11V10C8.26267 10 7.88267 10 7.86 10C6.778 10 6 10.4592 6 11.45C6 12.3145 6.41956 12.6905 7.47125 12.9161C8.24159 13.0813 8.49616 13.2286 8.49616 13.548C8.49616 13.8674 8.13843 14 7.47125 14C7.46059 14 7.07017 14 6.3 14V15C7.0755 15 7.46592 15 7.47125 15C9.5 15 9.5 14 9.5 13.548C9.5 12.9161 9.02026 12.4207 8.15869 12.1469C7.29712 11.873 6.97277 11.87 6.97277 11.5015Z" fill="#231F20" fillOpacity="0.7"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M14.5 10L12.9 12.45L14.5 15H13.3L12.25 13.093L11.2 15H10L11.6 12.45L10 10H11.2L12.25 11.814L13.3 10H14.5Z" fill="#231F20" fillOpacity="0.7"/>
        </svg>
      );
    }
    if (item.name.endsWith('.ts')) {
      return (
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" className="mr-2 w-[14px] h-[14px] shrink-0">
          <path fillRule="evenodd" clipRule="evenodd" d="M1 16H16V9H1V16Z" fill="#40B6E0" fillOpacity="0.7"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M7 1L3 5H7V1Z" fill="#9AA7B0" fillOpacity="0.8"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M8 1V6H3V8H13V1H8Z" fill="#9AA7B0" fillOpacity="0.8"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M4 11H2.5V10H6.5V11H5V15H4V11Z" fill="#231F20" fillOpacity="0.7"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M7.97277 11.5015C7.97277 11.1331 8.284 11 8.845 11C8.85033 11 9.23533 11 10 11V10C9.26267 10 8.88267 10 8.86 10C7.778 10 7 10.4592 7 11.45C7 12.3145 7.41956 12.6905 8.47125 12.9161C9.24159 13.0813 9.49616 13.2286 9.49616 13.548C9.49616 13.8674 9.13843 14 8.47125 14C8.46059 14 8.07017 14 7.3 14V15C8.0755 15 8.46592 15 8.47125 15C10.5 15 10.5 14 10.5 13.548C10.5 12.9161 10.0203 12.4207 9.15869 12.1469C8.29712 11.873 7.97277 11.87 7.97277 11.5015Z" fill="#231F20" fillOpacity="0.7"/>
        </svg>
      );
    }
    if (item.name.endsWith('.php')) {
      return (
        <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className="mr-2 w-[14px] h-[14px] shrink-0">
          <path fill="url(#php-radial-a)" d="M0 64c0 18.593 28.654 33.667 64 33.667 35.346 0 64-15.074 64-33.667 0-18.593-28.655-33.667-64-33.667C28.654 30.333 0 45.407 0 64Z"/>
          <path fill="#777bb3" d="M64 95.167c33.965 0 61.5-13.955 61.5-31.167 0-17.214-27.535-31.167-61.5-31.167S2.5 46.786 2.5 64c0 17.212 27.535 31.167 61.5 31.167Z"/>
          <path d="M34.772 67.864c2.793 0 4.877-.515 6.196-1.53 1.306-1.006 2.207-2.747 2.68-5.175.44-2.27.272-3.854-.5-4.71-.788-.874-2.493-1.317-5.067-1.317h-4.464l-2.473 12.732zM20.173 83.547a.694.694 0 0 1-.68-.828l6.557-33.738a.695.695 0 0 1 .68-.561h14.134c4.442 0 7.748 1.206 9.827 3.585 2.088 2.39 2.734 5.734 1.917 9.935-.333 1.711-.905 3.3-1.7 4.724a15.818 15.818 0 0 1-3.128 3.92c-1.531 1.432-3.264 2.472-5.147 3.083-1.852.604-4.232.91-7.07.91h-5.724l-1.634 8.408a.695.695 0 0 1-.682.562z"/>
          <path fill="#fff" d="M34.19 55.826h3.891c3.107 0 4.186.682 4.553 1.089.607.674.723 2.097.331 4.112-.439 2.257-1.253 3.858-2.42 4.756-1.194.92-3.138 1.386-5.773 1.386h-2.786l2.205-11.342zm6.674-8.1H26.731a1.39 1.39 0 0 0-1.364 1.123L18.81 82.588a1.39 1.39 0 0 0 1.363 1.653h7.35a1.39 1.39 0 0 0 1.363-1.124l1.525-7.846h5.151c2.912 0 5.364-.318 7.287-.944 1.977-.642 3.796-1.731 5.406-3.237a16.522 16.522 0 0 0 3.259-4.087c.831-1.487 1.429-3.147 1.775-4.931.86-4.423.161-7.964-2.076-10.524-2.216-2.537-5.698-3.823-10.349-3.823zM30.301 68.557h4.471c2.963 0 5.17-.557 6.62-1.675 1.451-1.116 2.428-2.98 2.938-5.591.485-2.508.264-4.277-.665-5.308-.931-1.03-2.791-1.546-5.584-1.546h-5.036l-2.743 14.12m10.563-19.445c4.252 0 7.353 1.117 9.303 3.348 1.95 2.232 2.536 5.347 1.76 9.346-.322 1.648-.863 3.154-1.625 4.518-.764 1.366-1.76 2.614-2.991 3.747-1.468 1.373-3.097 2.352-4.892 2.935-1.794.584-4.08.875-6.857.875h-6.296l-1.743 8.97h-7.35l6.558-33.739h14.133"/><path d="M69.459 74.577a.694.694 0 0 1-.682-.827l2.9-14.928c.277-1.42.209-2.438-.19-2.87-.245-.263-.979-.704-3.15-.704h-5.256l-3.646 18.768a.695.695 0 0 1-.683.56h-7.29a.695.695 0 0 1-.683-.826l6.558-33.739a.695.695 0 0 1 .682-.561h7.29a.695.695 0 0 1 .683.826L64.41 48.42h5.653c4.307 0 7.227.758 8.928 2.321 1.733 1.593 2.275 4.14 1.608 7.573l-3.051 15.702a.695.695 0 0 1-.682.56h-7.407z"/><path fill="#fff" d="M65.31 38.755h-7.291a1.39 1.39 0 0 0-1.364 1.124l-6.557 33.738a1.39 1.39 0 0 0 1.363 1.654h7.291a1.39 1.39 0 0 0 1.364-1.124l3.537-18.205h4.682c2.168 0 2.624.463 2.641.484.132.14.305.795.019 2.264l-2.9 14.927a1.39 1.39 0 0 0 1.364 1.654h7.408a1.39 1.39 0 0 0 1.363-1.124l3.051-15.7c.715-3.686.103-6.45-1.82-8.217-1.836-1.686-4.91-2.505-9.398-2.505h-4.81l1.421-7.315a1.39 1.39 0 0 0-1.364-1.655zm0 1.39-1.743 8.968h6.496c4.087 0 6.907.714 8.457 2.14 1.553 1.426 2.017 3.735 1.398 6.93l-3.052 15.699h-7.407l2.901-14.928c.33-1.698.208-2.856-.365-3.474-.573-.617-1.793-.926-3.658-.926h-5.829l-3.756 19.327H51.46l6.558-33.739h7.292z"/><path d="M92.136 67.864c2.793 0 4.878-.515 6.198-1.53 1.304-1.006 2.206-2.747 2.679-5.175.44-2.27.273-3.854-.5-4.71-.788-.874-2.493-1.317-5.067-1.317h-4.463l-2.475 12.732zM77.54 83.547a.694.694 0 0 1-.682-.828l6.557-33.738a.695.695 0 0 1 .682-.561H98.23c4.442 0 7.748 1.206 9.826 3.585 2.089 2.39 2.734 5.734 1.917 9.935a15.878 15.878 0 0 1-1.699 4.724 15.838 15.838 0 0 1-3.128 3.92c-1.53 1.432-3.265 2.472-5.147 3.083-1.852.604-4.232.91-7.071.91h-5.723l-1.633 8.408a.695.695 0 0 1-.683.562z"/><path fill="#fff" d="M91.555 55.826h3.891c3.107 0 4.186.682 4.552 1.089.61.674.724 2.097.333 4.112-.44 2.257-1.254 3.858-2.421 4.756-1.195.92-3.139 1.386-5.773 1.386h-2.786l2.204-11.342zm6.674-8.1H84.096a1.39 1.39 0 0 0-1.363 1.123l-6.558 33.739a1.39 1.39 0 0 0 1.364 1.653h7.35a1.39 1.39 0 0 0 1.363-1.124l1.525-7.846h5.15c2.911 0 5.364-.318 7.286-.944 1.978-.642 3.797-1.731 5.408-3.238a16.52 16.52 0 0 0 3.258-4.086c.832-1.487 1.428-3.147 1.775-4.931.86-4.423.162-7.964-2.076-10.524-2.216-2.537-5.697-3.823-10.35-3.823zM87.666 68.557h4.47c2.964 0 5.17-.557 6.622-1.675 1.45-1.116 2.428-2.98 2.936-5.591.487-2.508.266-4.277-.665-5.308-.93-1.03-2.791-1.546-5.583-1.546h-5.035Zm10.563-19.445c4.251 0 7.354 1.117 9.303 3.348 1.95 2.232 2.537 5.347 1.759 9.346-.32 1.648-.862 3.154-1.624 4.518-.763 1.366-1.76 2.614-2.992 3.747-1.467 1.373-3.097 2.352-4.892 2.935-1.793.584-4.078.875-6.856.875h-6.295l-1.745 8.97h-7.35l6.558-33.739h14.133"/><defs><radialGradient id="php-radial-a" cx="0" cy="0" r="1" gradientTransform="matrix(84.04136 0 0 84.04136 38.426 42.169)" gradientUnits="userSpaceOnUse"><stop stopColor="#AEB2D5"/><stop offset=".3" stopColor="#AEB2D5"/><stop offset=".75" stopColor="#484C89"/><stop offset="1" stopColor="#484C89"/></radialGradient></defs></svg>
      );
    }
    if (item.name.endsWith('.html')) {
      return (
        <svg viewBox="0 0 452 520" className="mr-2 w-[14px] h-[14px] shrink-0">
          <path fill="#e34f26" d="M41 460L0 0h451l-41 460-185 52"/><path fill="#ef652a" d="M226 472l149-41 35-394H226"/><path fill="#ecedee" d="M226 208h-75l-5-58h80V94H84l15 171h127zm0 147l-64-17-4-45h-56l7 89 117 32z"/><path fill="#fff" d="M226 265h69l-7 73-62 17v59l115-32 16-174H226zm0-171v56h136l5-56z"/>
        </svg>
      );
    }
    if (item.name.endsWith('.css')) {
      return (
        <svg viewBox="0 0 512 512" className="mr-2 w-[14px] h-[14px] shrink-0">
          <path fill="#264de4" d="M71.357 460.819 30.272 0h451.456l-41.129 460.746L255.724 512z"/><path fill="#2965f1" d="m405.388 431.408 35.148-393.73H256v435.146z"/><path fill="#ebebeb" d="m124.46 208.59 5.065 56.517H256V208.59zm-5.041-57.875H256V94.197H114.281zM256 355.372l-.248.066-62.944-16.996-4.023-45.076h-56.736l7.919 88.741 115.772 32.14.26-.073z"/><path fill="#fff" d="M255.805 208.59v56.517H325.4l-6.56 73.299-63.035 17.013v58.8l115.864-32.112.85-9.549 13.28-148.792 1.38-15.176 10.203-114.393H255.805v56.518h79.639L330.3 208.59z"/>
        </svg>
      );
    }
    if (item.name.endsWith('.js') || item.name.endsWith('.jsx')) {
      return (
        <svg viewBox="0 0 1052 1052" className="mr-2 w-[14px] h-[14px] shrink-0">
          <path fill="#f0db4f" d="M0 0h1052v1052H0z"/><path d="M965.9 801.1c-7.7-48-39-88.3-131.7-125.9-32.2-14.8-68.1-25.399-78.8-49.8-3.8-14.2-4.3-22.2-1.9-30.8 6.9-27.9 40.2-36.6 66.6-28.6 17 5.7 33.1 18.801 42.8 39.7 45.4-29.399 45.3-29.2 77-49.399-11.6-18-17.8-26.301-25.4-34-27.3-30.5-64.5-46.2-124-45-10.3 1.3-20.699 2.699-31 4-29.699 7.5-58 23.1-74.6 44-49.8 56.5-35.6 155.399 25 196.1 59.7 44.8 147.4 55 158.6 96.9 10.9 51.3-37.699 67.899-86 62-35.6-7.4-55.399-25.5-76.8-58.4-39.399 22.8-39.399 22.8-79.899 46.1 9.6 21 19.699 30.5 35.8 48.7 76.2 77.3 266.899 73.5 301.1-43.5 1.399-4.001 10.6-30.801 3.199-72.101zm-394-317.6h-98.4c0 85-.399 169.4-.399 254.4 0 54.1 2.8 103.7-6 118.9-14.4 29.899-51.7 26.2-68.7 20.399-17.3-8.5-26.1-20.6-36.3-37.699-2.8-4.9-4.9-8.7-5.601-9-26.699 16.3-53.3 32.699-80 49 13.301 27.3 32.9 51 58 66.399 37.5 22.5 87.9 29.4 140.601 17.3 34.3-10 63.899-30.699 79.399-62.199 22.4-41.3 17.6-91.3 17.4-146.6.5-90.2 0-180.4 0-270.9z" fill="#323330"/>
        </svg>
      );
    }
    if (item.name.endsWith('.json')) {
      return (
        <svg viewBox="0 0 160 160" className="mr-2 w-[14px] h-[14px] shrink-0">
          <defs><linearGradient id="json__a"><stop offset="0"/><stop offset="1" stopColor="#fff"/></linearGradient><linearGradient xlinkHref="#json__a" id="json__c" x1="-553.27" x2="-666.12" y1="525.91" y2="413.05" gradientTransform="matrix(.99884 0 0 .9987 689.01 -388.84)" gradientUnits="userSpaceOnUse"/><linearGradient xlinkHref="#json__a" id="json__b" x1="-666.12" x2="-553.27" y1="413.04" y2="525.91" gradientTransform="matrix(.99884 0 0 .9987 689.01 -388.84)" gradientUnits="userSpaceOnUse"/></defs><g fillRule="evenodd" color="#000"><path fill="url(#json__b)" d="M79.865 119.1c35.398 48.255 70.04-13.469 69.989-50.587C149.794 24.627 105.313.099 79.836.099 38.944.099 0 33.895 0 80.135 0 131.531 44.64 160 79.836 160c-7.965-1.147-34.506-6.834-34.863-67.967-.24-41.347 13.488-57.866 34.805-50.599.477.177 23.514 9.265 23.514 38.951 0 29.56-23.427 38.715-23.427 38.715z"/><path fill="url(#json__c)" d="M79.823 41.401C56.433 33.339 27.78 52.617 27.78 91.23c0 63.048 46.721 68.77 52.384 68.77C121.056 160 160 126.204 160 79.964 160 28.568 115.36.099 80.164.099c9.748-1.35 52.541 10.55 52.541 69.037 0 38.141-31.953 58.905-52.735 50.033-.477-.177-23.514-9.264-23.514-38.951 0-29.56 23.367-38.818 23.367-38.818z"/></g>
        </svg>
      );
    }
    if (item.name.match(/\.(png|jpe?g|gif|webp|svg)$/i)) {
      return <img src={item.content} alt={item.name} className="mr-2 w-[16px] h-[16px] shrink-0 object-cover rounded-[3px] shadow-[0_0_2px_rgba(0,0,0,0.5)] bg-white/10" />;
    }
    if (item.name.match(/\.(mp4|webm)$/i)) {
      return <video src={item.content + "#t=0.1"} className="mr-2 w-[16px] h-[16px] shrink-0 object-cover rounded-[3px] shadow-[0_0_2px_rgba(0,0,0,0.5)] bg-black" disablePictureInPicture preload="metadata" />;
    }
    return <Icon size={14} className={`mr-2 transition-transform duration-200 shrink-0 ${item.name.endsWith('.flow') ? 'text-green-400' : 'text-[var(--accent)]'}`} />;
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFolder) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (isFolder) {
          onDrop(e, item.id);
      }
  };

  const handleDragStart = (e: React.DragEvent) => {
      e.stopPropagation(); 
      const dragIds = isSelected ? Array.from(selectedIds) : [item.id];
      e.dataTransfer.setData('kamo/internal-move', JSON.stringify(dragIds));
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
  };

  const activeStyles = isActive 
    ? 'bg-[var(--hover-bg)] text-[var(--text-primary)]' 
    : isSelected 
      ? 'bg-[#007acc]/20 text-white' 
      : 'text-[var(--text-primary)] hover:bg-[var(--bg-primary)]';

  return (
    <div 
      onMouseLeave={() => {
        if (isSlid) {
          setIsSlid(false);
        }
      }}
    >
      <div className="relative overflow-hidden group mb-[1px] rounded-lg">
      {/* Background Swipe Actions Container with folding stagger icons */}
      <motion.div 
        className="absolute right-0 top-0 bottom-0 flex items-center bg-[#15151b] rounded-r-lg px-2 gap-1.5 z-0 select-none border-l border-[#3a3a46]/50 shadow-[inset_1px_0_4px_rgba(0,0,0,0.5)] h-full overflow-hidden"
        initial={{ width: 0, opacity: 0 }}
        animate={{ 
          width: isSlid ? 155 : 0, 
          opacity: isSlid ? 1 : 0 
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      >
        <motion.button
          title="Rename"
          onClick={(e) => { e.stopPropagation(); onRename(item.id); setIsSlid(false); }}
          className="p-1 px-[7px] text-blue-400 bg-blue-500/10 hover:bg-blue-600 hover:text-white border border-blue-500/10 rounded-md transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 text-xs font-semibold h-[28px]"
          variants={{
            hidden: { scale: 0.5, opacity: 0 },
            visible: { scale: 1, opacity: 1 }
          }}
          initial="hidden"
          animate={isSlid ? "visible" : "hidden"}
          transition={{ delay: 0.05 }}
        >
          <Edit2 size={12} />
        </motion.button>
        <motion.button
          title="Duplicate"
          onClick={(e) => { e.stopPropagation(); onCopy(item.id); setIsSlid(false); }}
          className="p-1 px-[7px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/10 rounded-md transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 text-xs font-semibold h-[28px]"
          variants={{
            hidden: { scale: 0.5, opacity: 0 },
            visible: { scale: 1, opacity: 1 }
          }}
          initial="hidden"
          animate={isSlid ? "visible" : "hidden"}
          transition={{ delay: 0.1 }}
        >
          <Copy size={12} />
        </motion.button>
        <motion.button
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); setIsSlid(false); }}
          className="p-1 px-[7px] text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/10 rounded-md transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 text-xs font-semibold h-[28px]"
          variants={{
            hidden: { scale: 0.5, opacity: 0 },
            visible: { scale: 1, opacity: 1 }
          }}
          initial="hidden"
          animate={isSlid ? "visible" : "hidden"}
          transition={{ delay: 0.15 }}
        >
          <Trash size={12} />
        </motion.button>
        <motion.button
          title="Dropdown Menu"
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            // Trigger standard context menu
            const mouseEv = {
              clientX: rect.left,
              clientY: rect.bottom + 4,
              preventDefault: () => {},
              stopPropagation: () => {},
            };
            onContextMenu(mouseEv as any, item);
            setIsSlid(false);
          }}
          className="p-1 px-[10px] text-amber-400 bg-amber-500/10 hover:bg-amber-600 hover:text-white border border-amber-500/10 rounded-md transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 text-xs font-semibold h-[28px]"
          variants={{
            hidden: { rotate: 0, scale: 0.5, opacity: 0 },
            visible: { rotate: 90, scale: 1, opacity: 1 }
          }}
          initial="hidden"
          animate={isSlid ? "visible" : "hidden"}
          transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
        >
          <ChevronRight size={12} />
        </motion.button>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -155, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        onDragEnd={(event, info) => {
          if (info.offset.x < -35) {
            setIsSlid(true);
          } else if (info.offset.x > 30) {
            setIsSlid(false);
          } else {
            setIsSlid(info.offset.x < -15);
          }
        }}
        animate={{ x: isSlid ? -155 : 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        data-file-id={item.id}
        className={`
          flex items-center py-1.5 cursor-pointer select-none text-sm relative z-10 mx-[5px] rounded-lg transition-colors duration-150
          ${activeStyles}
          ${isDragOver ? 'bg-[var(--accent)] text-white' : ''}
        `}
        style={{ paddingLeft, backgroundColor: isSelected ? 'rgba(0,122,204,0.15)' : isActive ? 'var(--hover-bg)' : 'var(--bg-secondary)' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={(e) => {
            e.stopPropagation();
            if (isSlid) {
              setIsSlid(false);
              return;
            }
            playSound('click');
            if (selectedIds.size > 0) {
                onToggleSelect(item.id);
            } else {
                isFolder ? onFolderClick(item.id) : onFileClick(item.id);
            }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          playSound('success');
          onContextMenu(e, item);
          onToggleSelect(item.id);
        }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="mr-1 opacity-70">
          {isFolder && (
            item.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
          {!isFolder && <span className="w-3.5 inline-block" />} 
        </span>
        {renderIcon()}
        <span className="truncate flex-1 font-medium">{item.name}</span>
        {!isFolder && (
          <button
            title="Copy exact file path"
            onClick={(e) => {
              e.stopPropagation();
              const getFullPath = (id: string): string => {
                const file = files.find(f => f.id === id);
                if (!file) return '';
                if (file.parentId === 'root' || !file.parentId) return '/' + file.name;
                return getFullPath(file.parentId) + '/' + file.name;
              };
              onCopyPath(getFullPath(item.id));
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white hover:bg-[#333] rounded transition-all mr-2"
          >
            <Copy size={12} className="text-gray-400 hover:text-white" />
          </button>
        )}
      </motion.div>
    </div>
      
      {isFolder && item.isOpen && (
        <div className="animate-in slide-in-from-left-1 duration-150 fade-in">
          {files
            .filter(f => f.parentId === item.id)
            .sort((a, b) => {
                if (a.type !== 'folder' && b.type === 'folder') return -1;
                if (a.type === 'folder' && b.type !== 'folder') return 1;
                return a.name.localeCompare(b.name);
            })
            .map(child => (
              <FileItem
                key={child.id}
                item={child}
                files={files}
                activeFileId={activeFileId}
                selectedIds={selectedIds}
                onFileClick={onFileClick}
                onFolderClick={onFolderClick}
                onContextMenu={onContextMenu}
                onDrop={onDrop}
                onCopyPath={onCopyPath}
                onRename={onRename}
                onDelete={onDelete}
                onCopy={onCopy}
                onToggleSelect={onToggleSelect}
                onTouchStartSelect={onTouchStartSelect}
                onTouchMoveSelect={onTouchMoveSelect}
                onTouchEndSelect={onTouchEndSelect}
                isTouchSelecting={isTouchSelecting}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ 
    files, activeFileId, onFileClick, onFolderClick,
    onNewFile, onNewFolder, onDelete, onRename, onCopy, onPaste, onCopyPath, canPaste, 
    onImportFiles, onMove, onDeleteMultiple, onTriggerImport, onClearStorage, language, onInject
}) => {
  const rootFiles = files
    .filter(f => f.parentId === 'root')
    .sort((a, b) => {
        if (a.type !== 'folder' && b.type === 'folder') return -1;
        if (a.type === 'folder' && b.type !== 'folder') return 1;
        return a.name.localeCompare(b.name);
    });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, targetId: string | null, type: 'file' | 'folder' | 'bg' } | null>(null);
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  
  // Selection Logic
  const [selection, setSelection] = useState<{ start: { x: number, y: number }, current: { x: number, y: number } } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch Hand Selection Logic
  const [isTouchSelecting, setIsTouchSelecting] = useState(false);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const touchSelectionActive = useRef<boolean>(false);
  const touchSelectTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  const handleTouchStartSelect = (id: string, x: number, y: number) => {
    touchStartPos.current = { x, y };
    touchSelectionActive.current = false;
    lastSelectedIdRef.current = id;
    
    if (touchSelectTimer.current) {
      clearTimeout(touchSelectTimer.current);
    }
    
    touchSelectTimer.current = setTimeout(() => {
      touchSelectionActive.current = true;
      setIsTouchSelecting(true);
      playSound('success');
      handleToggleSelect(id);
    }, 280);
  };

  const handleTouchMoveSelect = (clientX: number, clientY: number) => {
    if (!touchStartPos.current) return;
    
    const dx = Math.abs(clientX - touchStartPos.current.x);
    const dy = Math.abs(clientY - touchStartPos.current.y);
    
    if (!touchSelectionActive.current && (dx > 12 || dy > 12)) {
      if (touchSelectTimer.current) {
        clearTimeout(touchSelectTimer.current);
        touchSelectTimer.current = null;
      }
    }
    
    if (touchSelectionActive.current) {
      const element = document.elementFromPoint(clientX, clientY);
      if (element) {
        const fileItemEl = element.closest('[data-file-id]');
        if (fileItemEl) {
          const fileId = fileItemEl.getAttribute('data-file-id');
          if (fileId && fileId !== lastSelectedIdRef.current) {
            lastSelectedIdRef.current = fileId;
            setSelectedIds(prev => {
              const next = new Set(prev);
              next.add(fileId);
              return next;
            });
            playSound('click');
          }
        }
      }
    }
  };

  const handleTouchEndSelect = () => {
    if (touchSelectTimer.current) {
      clearTimeout(touchSelectTimer.current);
      touchSelectTimer.current = null;
    }
    touchStartPos.current = null;
    touchSelectionActive.current = false;
    setIsTouchSelecting(false);
    lastSelectedIdRef.current = null;
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  useEffect(() => {
      const closeMenu = () => setContextMenu(null);
      document.addEventListener('click', closeMenu);
      return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
      if (activeFileId && containerRef.current) {
          const activeEl = containerRef.current.querySelector(`[data-file-id="${activeFileId}"]`);
          if (activeEl) {
              activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
      }
  }, [activeFileId]);

  const handleContextMenu = (e: React.MouseEvent, item: FileSystemItem | null) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          targetId: item ? item.id : null,
          type: item ? item.type : 'bg'
      });
  };

  const getMenuOptions = () => {
      if (!contextMenu) return [];
      
      let effectiveParentId = 'root';
      const targetItem = contextMenu.targetId ? files.find(f => f.id === contextMenu.targetId) : null;
      
      if (targetItem) {
          effectiveParentId = targetItem.type === 'folder' ? targetItem.id : (targetItem.parentId || 'root');
      }

      const createActions = [
          { label: t.newFile, icon: File, action: () => onNewFile(effectiveParentId) },
          { label: t.newFolder, icon: Folder, action: () => onNewFolder(effectiveParentId) },
      ];

      if (contextMenu.type === 'bg') {
        return [
            ...createActions,
            { separator: true },
            { label: t.paste, icon: Clipboard, disabled: !canPaste, action: () => onPaste('root') },
            { label: t.importAsset, icon: Upload, action: () => onTriggerImport && onTriggerImport() }
        ];
      }

      // Check for injection option
      let extraOptions: any[] = [];
      if (targetItem && (targetItem.name.endsWith('.css') || targetItem.name.endsWith('.js') || targetItem.name.endsWith('.ts') || targetItem.name.endsWith('.tsx'))) {
          const htmlFiles = files.filter(f => f.name.endsWith('.html'));
          
          if (htmlFiles.length > 0) {
              const getFullPath = (id: string): string => {
                  const file = files.find(f => f.id === id);
                  if (!file) return '';
                  if (file.parentId === 'root') return file.name;
                  return getFullPath(file.parentId) + '/' + file.name;
              };
              const targetFullPath = getFullPath(targetItem.id);

              const connectSubmenu = htmlFiles.map(htmlFile => {
                  // Check if the full path is in the HTML
                  const isConnected = htmlFile.content?.includes(targetFullPath);
                  return {
                      label: htmlFile.name,
                      icon: isConnected ? Check : Link,
                      className: isConnected ? 'text-green-400' : '',
                      disabled: false, // Always enabled to allow toggle/remove
                      action: () => onInject?.(targetItem.id, htmlFile.id)
                  };
              });

              extraOptions = [
                  { separator: true },
                  { 
                      label: "Connect to HTML", 
                      icon: Link, 
                      submenu: connectSubmenu
                  }
              ];
          }
      }

      return [
          ...createActions,
          { separator: true },
          { label: t.copy, icon: Copy, action: () => contextMenu.targetId && onCopy(contextMenu.targetId) },
          { label: t.paste, icon: Clipboard, disabled: !canPaste, action: () => onPaste(effectiveParentId) },
          { label: t.copyPath, icon: Link, action: () => {
              if (contextMenu.targetId) {
                  const getFullPath = (id: string): string => {
                      const file = files.find(f => f.id === id);
                      if (!file) return '';
                      if (file.parentId === 'root' || !file.parentId) return '/' + file.name;
                      return getFullPath(file.parentId) + '/' + file.name;
                  };
                  onCopyPath(getFullPath(contextMenu.targetId));
              }
          }},
          { separator: true },
          { label: t.rename, icon: Edit2, action: () => contextMenu.targetId && onRename(contextMenu.targetId) },
          { label: t.delete, icon: Trash, danger: true, action: () => contextMenu.targetId && onDelete(contextMenu.targetId) },
          ...extraOptions
      ];
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsRootDragOver(false);
      
      const internalData = e.dataTransfer.getData('kamo/internal-move');
      if (internalData && onMove) {
          try {
              const ids = JSON.parse(internalData);
              if (Array.isArray(ids)) {
                  onMove(ids, targetId);
                  setSelectedIds(new Set());
              }
          } catch (e) { console.error('Failed to parse move data', e); }
          return;
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onImportFiles) {
          const droppedFiles = Array.from(e.dataTransfer.files);
          onImportFiles(droppedFiles, targetId);
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      const y = e.clientY - rect.top + containerRef.current.scrollTop;
      
      setSelection({ start: { x, y }, current: { x, y } });
      
      if (!e.shiftKey && !e.ctrlKey) {
          setSelectedIds(new Set());
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!selection || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      const y = e.clientY - rect.top + containerRef.current.scrollTop;
      
      setSelection(prev => prev ? { ...prev, current: { x, y } } : null);
      
      const boxLeft = Math.min(selection.start.x, x);
      const boxTop = Math.min(selection.start.y, y);
      const boxRight = Math.max(selection.start.x, x);
      const boxBottom = Math.max(selection.start.y, y);

      const items = containerRef.current.querySelectorAll('[data-file-id]');
      const newSelected = new Set(e.shiftKey || e.ctrlKey ? selectedIds : []);

      items.forEach((el) => {
          const itemRect = el.getBoundingClientRect();
          const itemLeft = itemRect.left - rect.left + containerRef.current!.scrollLeft;
          const itemTop = itemRect.top - rect.top + containerRef.current!.scrollTop;
          
          if (
              itemLeft < boxRight &&
              itemLeft + itemRect.width > boxLeft &&
              itemTop < boxBottom &&
              itemTop + itemRect.height > boxTop
          ) {
              const id = el.getAttribute('data-file-id');
              if (id) newSelected.add(id);
          }
      });
      setSelectedIds(newSelected);
  };

  const handleMouseUp = () => {
      setSelection(null);
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const getSelectionStyle = () => {
      if (!selection) return {};
      const left = Math.min(selection.start.x, selection.current.x);
      const top = Math.min(selection.start.y, selection.current.y);
      const width = Math.abs(selection.current.x - selection.start.x);
      const height = Math.abs(selection.current.y - selection.start.y);
      return { left, top, width, height };
  };

  return (
    <div 
        ref={containerRef}
        className={`h-full overflow-y-auto relative pt-[5px] transition-colors outline-none ${isRootDragOver ? 'bg-[var(--accent)]/10' : ''} ${selection ? 'select-none cursor-crosshair' : ''}`}
        onContextMenu={(e) => handleContextMenu(e, null)}
        onDragOver={(e) => { e.preventDefault(); setIsRootDragOver(true); }}
        onDragLeave={() => setIsRootDragOver(false)}
        onDrop={(e) => handleDrop(e, 'root')}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div className="text-xs font-bold text-[var(--text-secondary)] px-4 pt-1.5 pb-[5px] ml-0 mt-0 uppercase tracking-wider flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)] z-10 select-none">
        <span className="flex items-center gap-1.5 shrink-0">
          <Workflow size={12} className="text-[var(--accent)]" />
          {t.explorer}
        </span>
        <div className="flex items-center gap-1 mt-[4px]" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => { playSound('click'); onNewFile('root'); }} 
            className="p-1 hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] rounded text-[var(--text-secondary)] transition-colors"
            title="New File"
          >
            <Plus size={13} />
          </button>
          <button 
            onClick={() => { playSound('click'); onNewFolder('root'); }} 
            className="p-1 hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] rounded text-[var(--text-secondary)] transition-colors"
            title="New Folder"
          >
            <Folder size={13} />
          </button>
          <button 
            onClick={() => { playSound('click'); onTriggerImport?.(); }} 
            className="p-1 hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] rounded text-[var(--text-secondary)] transition-colors"
            title={t.importAsset}
          >
            <Upload size={13} />
          </button>
          <div className="w-[1px] h-3 bg-[var(--border-color)] mx-0.5" />
          <button 
            onClick={() => { 
                playSound('click');
                onClearStorage?.();
            }} 
            className="p-1 hover:bg-red-950/40 hover:text-red-400 rounded text-red-500/80 transition-colors"
            title="Clear Preview Storage & Cookies"
          >
            <Database size={13} />
          </button>
        </div>
      </div>
      
      {selection && (
          <div 
            className="absolute bg-[#007acc]/20 border border-[#007acc] z-50 pointer-events-none"
            style={getSelectionStyle()}
          />
      )}

      <div className="pb-10">
        {rootFiles.map(file => (
          <FileItem
            key={file.id}
            item={file}
            files={files}
            activeFileId={activeFileId}
            selectedIds={selectedIds}
            onFileClick={onFileClick}
            onFolderClick={onFolderClick}
            onContextMenu={handleContextMenu}
            onDrop={handleDrop}
            onCopyPath={onCopyPath}
            onRename={onRename}
            onDelete={onDelete}
            onCopy={onCopy}
            onToggleSelect={handleToggleSelect}
            onTouchStartSelect={handleTouchStartSelect}
            onTouchMoveSelect={handleTouchMoveSelect}
            onTouchEndSelect={handleTouchEndSelect}
            isTouchSelecting={isTouchSelecting}
          />
        ))}
      </div>
      
      {rootFiles.length === 0 && (
          <div className="text-center mt-10 text-gray-500 text-xs pointer-events-none">
              {t.dragDrop}
          </div>
      )}

      {selectedIds.size > 0 && (
          <div 
            className="fixed bottom-4 left-4 z-[60] flex gap-2 animate-in slide-in-from-bottom-2 fade-in"
            onMouseDown={(e) => e.stopPropagation()}
          >
              <div className="bg-[#252526] border border-[#333] shadow-xl rounded-lg px-3 py-2 flex items-center gap-3">
                  <span className="text-xs text-white font-semibold">{selectedIds.size} {t.selected}</span>
                  <div className="h-4 w-[1px] bg-[#444]" />
                  <button 
                    onClick={() => { onDeleteMultiple?.(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1 rounded transition-colors"
                    title={t.deleteSelected}
                  >
                      <Trash size={14} />
                  </button>
                  <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="text-gray-400 hover:text-white p-1 rounded"
                    title={t.clearSelection}
                  >
                      <X size={14} />
                  </button>
              </div>
          </div>
      )}

      {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            options={getMenuOptions()} 
            onClose={() => setContextMenu(null)}
          />
      )}
    </div>
  );
};

export default FileExplorer;
