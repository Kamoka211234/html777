
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Toolbar from './Toolbar';
import FileExplorer from './FileExplorer';
import CodeEditor from './Editor';
import FlowEditor from './FlowEditor';
import FindModal from './modals/FindModal';
import SymbolModal from './modals/SymbolModal';
import SettingsModal from './modals/SettingsModal';
import CreateModal from './modals/CreateModal';
import ConfirmModal from './modals/ConfirmModal';
import SymbolDetailsModal from './modals/SymbolDetailsModal';
import RunWarningModal from './modals/RunWarningModal';
import ObfuscatorModal from './modals/ObfuscatorModal';
import CDNModal from './modals/CDNModal';
import ColorPickerModal from './modals/ColorPickerModal';
import Base64Modal from './modals/Base64Modal';
import BookmarksModal from './modals/BookmarksModal';
import ElementDetailsModal from './modals/ElementDetailsModal';
import ShortcutsModal from './modals/ShortcutsModal';
import ResourcesModal from './modals/ResourcesModal';
import ToolsModal from './modals/ToolsModal';
import { BoilerplateModal } from './modals/BoilerplateModal';
import { ExtensionsPanel } from './ExtensionsPanel';
import { OpenInPhoneModal } from './modals/OpenInPhoneModal';
import { ImagePreviewExampleModal } from './modals/ImagePreviewExampleModal';
import MoreCompilersModal from './modals/MoreCompilersModal';
import { ExtensionErrorBoundary } from './ExtensionErrorBoundary';
import TutorialModal from './modals/TutorialModal';
import Console from './Console';
import FullscreenPreview from './FullscreenPreview';
import Draggable from './Draggable';
import { FileSystemItem, ProjectSettings, TabGroup } from '../types';
import { generateId } from '../constants';
import { downloadProjectAsZip } from '../utils/projectManager';
import { createPreviewWorker } from '../utils/previewWorker';
import { createStatsWorker } from '../utils/statsWorker';
import { extractSymbols, CodeSymbol } from '../utils/codeAnalysis';
import { processFileImport } from '../utils/fileImporter';
import { db } from '../utils/db';
import { X, Play, Maximize2, RefreshCw, Lock, ExternalLink, Trash2, Database, ArrowLeft, ArrowRight, Files, Globe, Github, Search, Settings, Grid, Zap, ChevronRight, FileCode, File, Home, Terminal, Bookmark, Activity, Minimize2, Copy, Code2, Cpu, FolderPlus, FolderMinus, FolderOpen, Folder, ChevronDown, Palette, Package } from 'lucide-react';
import { playSound } from '../utils/sound';
import { translations } from '../utils/translations';
import { formatCode } from '../utils/formatter';
import { perfManager } from '../utils/performanceManager';

interface AppProps {
    projectId: string;
    onCloseProject: () => void;
}

const THEMES = {
    'vs-dark': {
        '--bg-primary': '#1e1e1e',
        '--bg-secondary': '#252526',
        '--border-color': '#333333',
        '--text-primary': '#cccccc',
        '--text-secondary': '#858585',
        '--accent': '#007acc',
        '--hover-bg': '#2a2d2e',
    }
};

const FPSCounter = React.memo(() => {
    const [fps, setFps] = useState(60);
    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const loop = () => {
            const now = performance.now();
            frameCount++;
            if (now - lastTime >= 1000) {
                setFps(Math.round((frameCount * 1000) / (now - lastTime)));
                frameCount = 0;
                lastTime = now;
            }
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <span className="flex items-center gap-1 font-mono text-[#00ff00]">
            <Activity size={10} /> {fps} FPS
        </span>
    );
});

const FaceCam = ({ onClose }: { onClose: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
            stream = s;
            if (videoRef.current) {
                videoRef.current.srcObject = s;
            }
        }).catch(e => {
            console.error("Camera access denied", e);
            onClose();
        });

        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, []);

    return (
        <Draggable initialX={window.innerWidth - 320} initialY={window.innerHeight - 260} handleSelector=".cam-handle">
            <div className="w-64 h-48 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-[#007acc] relative group z-[9999]">
                <div className="cam-handle absolute inset-0 cursor-move z-10" />
                <button 
                    onClick={onClose} 
                    className="absolute top-2 right-2 z-20 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X size={12} />
                </button>
                <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
            </div>
        </Draggable>
    );
};

const decryptContentValue = (encryptedText: string, key: string): string => {
    if (!key) return encryptedText;
    try {
        const base64 = encryptedText.includes(',') ? encryptedText.split(',')[1] : encryptedText;
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        
        const decryptedBytes = new Uint8Array(bytes.length);
        const keyBytes = new TextEncoder().encode(key);
        for (let i = 0; i < bytes.length; i++) {
            decryptedBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        return new TextDecoder().decode(decryptedBytes);
    } catch (e) {
        return encryptedText;
    }
};

const getPreparedPreviewFiles = (filesList: FileSystemItem[], keys: Record<string, string>): FileSystemItem[] => {
    return filesList.map(f => {
        if (f.name.endsWith('.enc')) {
            const key = keys[f.id];
            if (key) {
                try {
                    const decrypted = decryptContentValue(f.content || '', key);
                    const strippedName = f.name.slice(0, -4); // strip .enc
                    return {
                        ...f,
                        name: strippedName,
                        content: decrypted
                    };
                } catch(e) {}
            }
        }
        return f;
    });
};

const App: React.FC<AppProps> = ({ projectId, onCloseProject }) => {
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const filesRef = useRef<FileSystemItem[]>([]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const [testBoilerplate, setTestBoilerplate] = useState<{ content: string; offset: number; timestamp: number } | null>(null);
  const [insertSnippet, setInsertSnippet] = useState<{ content: string; timestamp: number } | null>(null);
  const [fileKeys, setFileKeys] = useState<Record<string, string>>({});
  const fileKeysRef = useRef<Record<string, string>>({});
  useEffect(() => {
    fileKeysRef.current = fileKeys;
  }, [fileKeys]);

  const handleInsertSnippet = (content: string) => {
    setInsertSnippet({
      content,
      timestamp: Date.now()
    });
  };

  const handleUnlockFile = (fileId: string, key: string) => {
    setFileKeys(prev => ({
      ...prev,
      [fileId]: key
    }));
  };

  const handleTestBoilerplate = (content: string, offset: number) => {
    if (activeFileId) {
      handleDirectUpdate(activeFileId, content);
      setTestBoilerplate({
        content,
        offset,
        timestamp: Date.now()
      });
    }
  };

  const [history, setHistory] = useState<FileSystemItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(true);

  // Mobile responsiveness detectors
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pre-fetch and preheat heavy PHP Wasm files to make execution instantly fast!
  useEffect(() => {
    const preheatPhpWasm = async () => {
      try {
        const urls = [
          'https://cdn.jsdelivr.net/npm/php-wasm@0.0.12/PhpWeb.js',
          'https://cdn.jsdelivr.net/npm/php-wasm@0.0.12/php-web.js',
          'https://cdn.jsdelivr.net/npm/php-wasm@0.0.12/php-web.wasm'
        ];
        await Promise.all(urls.map(url => fetch(url, { mode: 'cors' }).catch(() => {})));
        console.log('🐘 PHP Assembly binaries preheated in the background successfully!');
      } catch (err) {
        // Silent catch to keep developer console pristine
      }
    };
    preheatPhpWasm();
  }, []);

  // Editor State
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openFiles, setOpenFiles] = useState<string[]>([]); // Tabs
  const [previewFileId, setPreviewFileId] = useState<string>(''); 
  const [previewHistory, setPreviewHistory] = useState<string[]>([]);
  const [previewHistoryIndex, setPreviewHistoryIndex] = useState(-1);
  const [previewUrlInput, setPreviewUrlInput] = useState('');
  const [bookmarks, setBookmarks] = useState<Array<{fileId: string, line: number, content: string}>>([]);
  const [editorScrollLine, setEditorScrollLine] = useState<number | null>(null);

  // Automatically scroll the tab into view if its list is too long
  useEffect(() => {
      if (activeFileId) {
          setTimeout(() => {
              const tabElement = document.getElementById(`tab-${activeFileId}`);
              if (tabElement) {
                  tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              }
          }, 100);
      }
  }, [activeFileId]);

  // UI State
  const [activeSidePanel, setActiveSidePanel] = useState<'explorer' | 'search' | 'tools' | 'extensions' | 'github' | null>('explorer');
  const [zenMode, setZenMode] = useState(false);
  const [settings, setSettings] = useState<ProjectSettings>(() => {
      const saved = localStorage.getItem('appSettings');
      let parsed = {};
      if (saved) {
          try { parsed = JSON.parse(saved); } catch(e) {}
      }
      return { 
          projectName: 'Loading...',
          autoSave: localStorage.getItem('vs_autoSave') === 'true', 
          saveOnFocusLost: true,
          theme: 'vs-dark',
          editorTheme: 'vs-dark',
          wordWrap: false,
          showPreview: true,
          showConsole: true,
          guiSize: 2,
          fontSize: 14,
          language: (localStorage.getItem('vs_language') as any) || 'en',
          enableSound: true,
          rippleColor: 'rgba(255, 255, 255, 0.4)',
          rippleSpeed: 0.6,
          fontFamily: 'Fira Code',
          lineHeight: 1.5,
          tabSize: 2,
          minimap: true,
          ligatures: true,
          cursorBlinking: 'blink',
          cursorStyle: 'line',
          smoothScrolling: true,
          enableCustomCursor: false,
          customCursorType: 'circle',
          customCursorSize: 1,
          customCursorColor: 'black',
          rippleEnabled: true,
          // New Settings
          editorType: 'monaco',
          vimMode: false,
          showLineNumbers: true,
          showIndentGuides: true,
          bracketPairColorization: true,
          formatOnSave: false,
          // Additional Settings
          autoRefresh: true,
          refreshDelay: 1000,
          sidebarPosition: 'left',
          showStatusBar: true,
          showActivityBar: true,
          autoSaveDelay: 2000,
          usePythonPreview: false,
          pythonPreviewPort: 5000,
          customThemeBase: 'vs-dark',
          customThemeBg: '#1e1e1e',
          customThemeFg: '#d4d4d4',
          customThemeCursor: '#007acc',
          customThemeLineHighlight: '#2a2a2a',
          customThemeComments: '#6a9955',
          customThemeKeywords: '#569cd6',
          customThemeStrings: '#ce9178',
          customThemeNumbers: '#b5cea8',
          customThemeTypes: '#4ec9b0',
          customThemeDelimiters: '#ffd700',
          ...parsed
      };
  });

  useEffect(() => {
      if (projectId && activeFileId) localStorage.setItem(`activeFileId_${projectId}`, activeFileId);
  }, [activeFileId, projectId]);

  useEffect(() => {
      if (projectId && openFiles.length) localStorage.setItem(`openFiles_${projectId}`, JSON.stringify(openFiles));
  }, [openFiles, projectId]);

  useEffect(() => {
      localStorage.setItem('appSettings', JSON.stringify({ ...settings, projectName: 'Untitled Project' }));
  }, [settings]);

  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [expandFullPreview, setExpandFullPreview] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Modals
  const [showFindModal, setShowFindModal] = useState(false);
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showObfuscator, setShowObfuscator] = useState(false);
  const [showCDN, setShowCDN] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBase64, setShowBase64] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showTools, setShowTools] = useState<string | null>(null);
  const [showBoilerplateModal, setShowBoilerplateModal] = useState(false);
  const [showClearStorageConfirm, setShowClearStorageConfirm] = useState(false);
  const [showOpenInPhone, setShowOpenInPhone] = useState(false);
  const [showMoreCompilers, setShowMoreCompilers] = useState(false);
  const [showImagePreviewExample, setShowImagePreviewExample] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);

  const [createModal, setCreateModal] = useState<{ visible: boolean; type: 'file' | 'folder' | 'rename'; parentId?: string | null; initialValue?: string }>({ visible: false, type: 'file' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<CodeSymbol | null>(null);
  const [clipboard, setClipboard] = useState<{ id: string; op: 'copy' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundSymbols, setFoundSymbols] = useState<CodeSymbol[]>([]);
  const [logs, setLogs] = useState<Array<{method: string, args: string[]}>>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<Array<{ fileId: string; fileName: string; line: number; content: string }>>([]);
  const [totalChars, setTotalChars] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  
  // Features
  const [showFaceCam, setShowFaceCam] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Tab Context Menu State
  const [tabContextMenu, setTabContextMenu] = useState<{x: number, y: number, fileId: string} | null>(null);
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
  const [showGroupModal, setShowGroupModal] = useState<{visible: boolean, fileId?: string, groupId?: string}>({visible: false});

  const workerRef = useRef<Worker | null>(null);
  const statsWorkerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updatePending = useRef(false);
  const lastUpdateRef = useRef<number>(0);
  const prevContentRef = useRef<string>('');
  const undoTimeoutRef = useRef<any>(null);
  const initialLoadDone = useRef(false);

  // --- Helpers ---
  const getFullPath = (fileId: string): string => {
      const activeList = filesRef.current || files;
      const file = activeList.find(f => f.id === fileId);
      if (!file) return '';
      if (file.parentId === 'root' || !file.parentId) return '/' + file.name;
      const getParentFullPath = (id: string): string => {
          const parent = activeList.find(f => f.id === id);
          if (!parent) return '';
          if (parent.parentId === 'root' || !parent.parentId) return '/' + parent.name;
          return getParentFullPath(parent.parentId) + '/' + parent.name;
      };
      return getParentFullPath(file.parentId) + '/' + file.name;
  };

  const getBreadcrumbs = (fileId: string) => {
      const file = files.find(f => f.id === fileId);
      if (!file) return [];
      const path = [];
      let current: FileSystemItem | undefined = file;
      while (current) {
          path.unshift(current);
          if (!current.parentId || current.parentId === 'root') break;
          current = files.find(f => f.id === current?.parentId);
      }
      return path;
  };

  const updatePreviewFile = (fileId: string, addToHistory = false) => {
      setPreviewFileId(fileId);
      setPreviewUrlInput(getFullPath(fileId));
      if (addToHistory) {
          const newHist = previewHistory.slice(0, previewHistoryIndex + 1);
          newHist.push(fileId);
          setPreviewHistory(newHist);
          setPreviewHistoryIndex(newHist.length - 1);
      }
  };

  const resolvePath = (currentFileId: string, path: string): FileSystemItem | null => {
      const activeList = filesRef.current || files;
      const currentFile = activeList.find(f => f.id === currentFileId);
      if (!currentFile) return null;
      let currentFolderId = path.startsWith('/') ? 'root' : currentFile.parentId;
      const parts = path.split('/').filter(p => p !== '' && p !== '.');
      for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (part === '..') {
              if (currentFolderId !== 'root' && currentFolderId) {
                  const parent = activeList.find(f => f.id === currentFolderId);
                  currentFolderId = parent ? parent.parentId : 'root';
              }
              continue;
          }
          const item = activeList.find(f => f.name === part && f.parentId === currentFolderId);
          if (!item) return null;
          if (i === parts.length - 1) return item;
          else { if (item.type !== 'folder') return null; currentFolderId = item.id; }
      }
      return null;
  };

  const handleInternalNavigation = (path: string) => {
      const [cleanPath] = path.split(/[?#]/);
      const target = resolvePath(previewFileId, cleanPath);
      if (target && target.type === 'file') {
          updatePreviewFile(target.id, true);
          setActiveFileId(target.id);
          if (!openFiles.includes(target.id)) setOpenFiles(prev => [...prev, target.id]);
          setPreviewUrlInput(path.startsWith('/') ? path : (getFullPath(previewFileId).replace(/[^\/]*$/, '') + path));
      } else {
          setLogs(prev => [...prev, { method: 'error', args: [`Navigation failed: ${path}`] }]);
      }
  };

  const updateFiles = (newFiles: FileSystemItem[], addToHistory = false) => {
      setFiles(newFiles);
      if (projectId) {
          db.saveProjectFiles(projectId, newFiles);
      }
      if (addToHistory) {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newFiles);
          if (newHistory.length > 30) newHistory.shift(); 
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
      }
  };

  const handleDirectUpdate = (fileId: string, newContent: string) => {
      const current = filesRef.current;
      const newFiles = current.map(f => f.id === fileId ? { ...f, content: newContent } : f);
      filesRef.current = newFiles;
      setFiles(newFiles);
      updateFiles(newFiles, true); 
  };

  const handleInject = (sourceId: string, targetId?: string) => {
      const currentFiles = filesRef.current;
      const source = currentFiles.find(f => f.id === sourceId);
      const target = currentFiles.find(f => f.id === (targetId || activeFileId));
      
      if (!source || !target || !target.content) return;
      if (!target.name.endsWith('.html')) return;

      let newContent = target.content;
      const sourcePath = getFullPath(source.id).replace(/^\//, ''); // Remove leading slash
      const isConnected = newContent.includes(sourcePath) || newContent.includes(source.name);
      
      if (isConnected) {
          // Disconnect Logic
          if (source.name.endsWith('.css')) {
              // Regex to remove <link ... href="style.css" ... >
              const escapedName = sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`<link[^>]+href=["']${escapedName}["'][^>]*>`, 'gi');
              newContent = newContent.replace(regex, '');
              
              // Also try with just the name in case it was connected the old way
              const escapedOldName = source.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regexOld = new RegExp(`<link[^>]+href=["']${escapedOldName}["'][^>]*>`, 'gi');
              newContent = newContent.replace(regexOld, '');
          } else {
              // Regex to remove <script ... src="script.js" ... ></script>
              const escapedName = sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`<script[^>]+src=["']${escapedName}["'][^>]*>\\s*</script>`, 'gi');
              newContent = newContent.replace(regex, '');
              
              const escapedOldName = source.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regexOld = new RegExp(`<script[^>]+src=["']${escapedOldName}["'][^>]*>\\s*</script>`, 'gi');
              newContent = newContent.replace(regexOld, '');
          }
          setLogs(prev => [...prev, { method: 'info', args: [`Disconnected ${sourcePath} from ${target.name}`] }]);
          playSound('pop');
      } else {
          // Connect Logic (Existing + Auto Head)
          let tag = '';
          if (source.name.endsWith('.css')) {
              tag = `<link rel="stylesheet" href="${sourcePath}">`;
              if (newContent.includes('</head>')) {
                  newContent = newContent.replace('</head>', `    ${tag}\n</head>`);
              } else if (newContent.includes('<html')) {
                  // No head, create it
                  if (newContent.includes('<body')) {
                      // Insert before body
                      newContent = newContent.replace(/<body/i, `<head>\n    ${tag}\n</head>\n<body`);
                  } else {
                      // Insert after html start
                      newContent = newContent.replace(/(<html[^>]*>)/i, `$1\n<head>\n    ${tag}\n</head>`);
                  }
              } else {
                  // Just prepend
                  newContent = `<head>\n    ${tag}\n</head>\n` + newContent;
              }
          } else {
              tag = `<script src="${sourcePath}"></script>`;
              if (newContent.includes('</body>')) {
                  newContent = newContent.replace('</body>', `    ${tag}\n</body>`);
              } else {
                  newContent += '\n' + tag;
              }
          }
          setLogs(prev => [...prev, { method: 'info', args: [`Connected ${sourcePath} to ${target.name}`] }]);
          playSound('success');
      }

      if (newContent !== target.content) {
          handleDirectUpdate(target.id, newContent);
      }
  };

  // --- Effects --- 
  useEffect(() => {
      document.documentElement.style.setProperty('--ripple-color', settings.rippleColor);
      document.documentElement.style.setProperty('--ripple-duration', `${settings.rippleSpeed}s`);
  }, [settings.rippleColor, settings.rippleSpeed]);

  useEffect(() => {
      localStorage.setItem('vs_sound_enabled', String(settings.enableSound));
      localStorage.setItem('vs_language', settings.language);
  }, [settings.enableSound, settings.language]);

  // Save Bookmarks to DB whenever they change
  useEffect(() => {
      if (projectId && !loading) {
          db.saveBookmarks(projectId, bookmarks);
      }
  }, [bookmarks, projectId, loading]);

  // Shortcut Handler
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
              e.preventDefault();
              setSettings(s => ({ ...s, fontSize: Math.min(s.fontSize + 1, 32) }));
          } else if (e.ctrlKey && e.key === '-') {
              e.preventDefault();
              setSettings(s => ({ ...s, fontSize: Math.max(s.fontSize - 1, 8) }));
          }
          else if (e.ctrlKey && e.key === 's') {
              e.preventDefault();
              if (files.length > 0) {
                  const saveFiles = async () => {
                      let filesToSave = [...files];
                      if (settings.formatOnSave && activeFileId) {
                          const activeFile = files.find(f => f.id === activeFileId);
                          if (activeFile && activeFile.content) {
                              try {
                                  const fileExtension = activeFile.name.split('.').pop() || 'html';
                                  const formatted = await formatCode(activeFile.content, fileExtension, settings.tabSize);
                                  if (formatted !== activeFile.content) {
                                      filesToSave = filesToSave.map(f => f.id === activeFileId ? { ...f, content: formatted } : f);
                                      setFiles(filesToSave);
                                  }
                              } catch (err) {
                                  console.error("Format on save failed", err);
                              }
                          }
                      }
                      db.saveProjectFiles(projectId, filesToSave);
                      workerRef.current?.postMessage({ files: filesToSave, activeFileId, previewFileId, clearData: false, cursorCSS: getCursorCSS() });
                      playSound('success');
                  };
                  saveFiles();
              }
          }
          else if (e.ctrlKey && e.key === 'Enter') {
              e.preventDefault();
              if (files.length > 0) {
                  workerRef.current?.postMessage({ files, activeFileId, previewFileId, clearData: false, cursorCSS: getCursorCSS() });
                  playSound('success');
              }
          }
          else if (e.ctrlKey && e.key === '`') {
              e.preventDefault();
              setSettings(s => ({ ...s, showConsole: !s.showConsole }));
          }
      };
      
      const handleGlobalClick = (e: MouseEvent) => {
          setTabContextMenu(null);
          playSound('click'); 
          
          if (settings.rippleEnabled) {
              const ripple = document.createElement('div');
              ripple.className = 'ripple';
              ripple.style.left = `${e.clientX}px`;
              ripple.style.top = `${e.clientY}px`;
              document.body.appendChild(ripple);
              setTimeout(() => ripple.remove(), settings.rippleSpeed * 1000);
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleGlobalClick);
      return () => { 
          window.removeEventListener('keydown', handleKeyDown); 
          document.removeEventListener('click', handleGlobalClick);
      };
  }, [files, projectId, settings.rippleSpeed, settings.rippleEnabled]);

  useEffect(() => {
    const handleBlur = () => { if (settings.saveOnFocusLost && files.length > 0) db.saveProjectFiles(projectId, files); };
    const handleVisibilityChange = () => {
        const visible = !document.hidden;
        setIsPageVisible(visible);
        if (visible && updatePending.current && workerRef.current) {
            workerRef.current.postMessage({ files, activeFileId, previewFileId, clearData: false, cursorCSS: getCursorCSS() });
            updatePending.current = false;
        }
    };
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { window.removeEventListener('blur', handleBlur); document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [settings.saveOnFocusLost, files, projectId, activeFileId, previewFileId, settings]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
        if (e.data && typeof e.data === 'object') {
            if (e.data.type === 'console') {
                const isBabelWarning = e.data.method === 'warn' && Array.isArray(e.data.args) && e.data.args.some((arg: any) => 
                    typeof arg === 'string' && arg.includes('You are using the in-browser Babel transformer')
                );
                if (!isBabelWarning) {
                    setLogs(prev => [...prev, { method: e.data.method, args: e.data.args }]);
                }
            }
            else if (e.data.type === 'navigate') handleInternalNavigation(e.data.path);
            else if (e.data.type === 'global-click') {
                if (settings.rippleEnabled) {
                    let iframeEl: HTMLIFrameElement | null = null;
                    document.querySelectorAll('iframe').forEach(ifr => {
                        if (e.source === ifr.contentWindow) {
                            iframeEl = ifr;
                        }
                    });
                    
                    let offsetLeft = 0;
                    let offsetTop = 0;
                    if (iframeEl) {
                        const rect = iframeEl.getBoundingClientRect();
                        offsetLeft = rect.left;
                        offsetTop = rect.top;
                    }
                    const ripple = document.createElement('div');
                    ripple.className = 'ripple';
                    ripple.style.left = `${e.data.x + offsetLeft}px`;
                    ripple.style.top = `${e.data.y + offsetTop}px`;
                    document.body.appendChild(ripple);
                    setTimeout(() => ripple.remove(), settings.rippleSpeed * 1000);
                }
            }
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [files, previewFileId, settings]); 

  useEffect(() => {
      localStorage.setItem('vs_autoSave', String(settings.autoSave));
  }, [settings.autoSave]);

  const getCursorCSS = () => {
    if (!settings.enableCustomCursor) {
        return '';
    }
    if (settings.customCursorType === 'circle') {
        return `
            body, html, *, a, button, select, [role="button"], input, textarea, .monaco-editor, .monaco-editor .view-lines {
                cursor: none !important;
            }
        `;
    }
    return '';
  };

  // Dynamic Custom Cursor Follower with buttery-smooth requestAnimationFrame lag-handling
  useEffect(() => {
    if (!settings.enableCustomCursor || settings.customCursorType !== 'circle') {
        return;
    }
    const cursorEl = document.createElement('div');
    cursorEl.id = 'dynamic-custom-cursor';
    cursorEl.style.position = 'fixed';
    cursorEl.style.pointerEvents = 'none';
    cursorEl.style.zIndex = '999999';
    cursorEl.style.borderRadius = '50%';
    cursorEl.style.transition = 'width 0.1s, height 0.1s, background-color 0.15s, border-color 0.15s, opacity 0.15s';
    
    const size = settings.customCursorSize * 15; // 15px to 75px
    cursorEl.style.width = `${size}px`;
    cursorEl.style.height = `${size}px`;
    
    if (settings.customCursorColor === 'black') {
        cursorEl.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        cursorEl.style.border = '2px solid rgba(255, 255, 255, 0.9)';
        cursorEl.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.6)';
    } else {
        // Custom color
        let color = settings.customCursorColor;
        if (color === 'rainbow') {
            cursorEl.style.background = 'linear-gradient(45deg, #ff0055, #ff9900, #33ff00, #0099ff, #bb00ff)';
            cursorEl.style.border = '1.5px solid rgba(255, 255, 255, 0.7)';
        } else {
            cursorEl.style.backgroundColor = color;
            cursorEl.style.opacity = '0.65';
            cursorEl.style.border = '2px solid rgba(255, 255, 255, 0.9)';
            cursorEl.style.boxShadow = `0 0 15px ${color}`;
        }
    }
    
    document.body.appendChild(cursorEl);
    
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currX = mouseX;
    let currY = mouseY;
    let frameId;
    let firstMove = true;
    
    const moveCursor = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (firstMove) {
            currX = mouseX;
            currY = mouseY;
            firstMove = false;
        }
    };
    
    const updatePosition = () => {
        currX += (mouseX - currX) * 0.28;
        currY += (mouseY - currY) * 0.28;
        cursorEl.style.left = '0px';
        cursorEl.style.top = '0px';
        cursorEl.style.transform = `translate3d(${currX}px, ${currY}px, 0) translate(-50%, -50%)`;
        
        frameId = requestAnimationFrame(updatePosition);
    };
    
    window.addEventListener('mousemove', moveCursor);
    frameId = requestAnimationFrame(updatePosition);
    
    return () => {
        window.removeEventListener('mousemove', moveCursor);
        cancelAnimationFrame(frameId);
        cursorEl.remove();
    };
  }, [settings.enableCustomCursor, settings.customCursorType, settings.customCursorSize, settings.customCursorColor]);

  useEffect(() => {
      const load = async () => {
          try {
              const projectFiles = await db.getProjectFiles(projectId);
              const savedBookmarks = await db.getBookmarks(projectId);
              const projects = await db.getProjects();
              const currentProj = projects.find(p => p.id === projectId);
              
              setFiles(projectFiles);
              setBookmarks(savedBookmarks);
              setHistory([projectFiles]);
              setHistoryIndex(0);
              const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
              setSettings(prev => ({ ...prev, projectName: currentProj?.name || 'Untitled Project', ...(Object.keys(appSettings).length ? appSettings : {}) }));
              
              const indexFile = projectFiles.find(f => f.name === 'index.html') || projectFiles.find(f => f.name === 'index.php');
              const initialFile = indexFile || projectFiles.find(f => f.type === 'file');
              
              const savedActiveFileId = localStorage.getItem(`activeFileId_${projectId}`);
              const savedOpenFilesRaw = localStorage.getItem(`openFiles_${projectId}`);
              let savedOpenFiles: string[] = [];
              try { if (savedOpenFilesRaw) savedOpenFiles = JSON.parse(savedOpenFilesRaw); } catch(e) {}
              
              if (savedActiveFileId && projectFiles.find(f => f.id === savedActiveFileId)) {
                  setActiveFileId(savedActiveFileId);
                  setOpenFiles(savedOpenFiles.length ? savedOpenFiles : [savedActiveFileId]);
                  const fff = projectFiles.find(f => f.id === savedActiveFileId);
                  if (fff && (fff.name.endsWith('.html') || fff.name.endsWith('.php') || fff.name.endsWith('.py'))) updatePreviewFile(fff.id, true);
              } else if (initialFile) {
                  setActiveFileId(initialFile.id);
                  setOpenFiles([initialFile.id]);
                  if (initialFile.name.endsWith('.html') || initialFile.name.endsWith('.php') || initialFile.name.endsWith('.py')) updatePreviewFile(initialFile.id, true);
              }
              
              if (localStorage.getItem('vs_autoSave') !== 'true') {
                  setShowTutorial(true);
              }
          } catch (e) { console.error("Failed to load project", e); } finally { setLoading(false); }
      };
      load();
  }, [projectId]);

  useEffect(() => {
      if (files.length > 0 && !loading && settings.autoSave) {
          const timer = setTimeout(async () => await db.saveProjectFiles(projectId, files), settings.autoSaveDelay || 1000);
          return () => clearTimeout(timer);
      }
  }, [files, projectId, loading, settings.autoSave, settings.autoSaveDelay]);

  useEffect(() => {
    const worker = createPreviewWorker();
    const origPost = worker.postMessage.bind(worker);
    worker.postMessage = (payload: any, options?: any) => {
        if (payload && payload.files) {
            payload.files = getPreparedPreviewFiles(payload.files, fileKeysRef.current);
        }
        return origPost(payload, options);
    };
    workerRef.current = worker;
    statsWorkerRef.current = createStatsWorker();
    statsWorkerRef.current.onmessage = (e) => setTotalChars(e.data);
    return () => { workerRef.current?.terminate(); statsWorkerRef.current?.terminate(); };
  }, []);

  useEffect(() => { if(statsWorkerRef.current && isPageVisible) statsWorkerRef.current.postMessage(files); }, [files, isPageVisible]);

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.onmessage = (e) => {
        if (e.data?.type === 'exportBundle') {
            window.open(URL.createObjectURL(new Blob([e.data.content], { type: 'text/html' })), '_blank');
        } else if (typeof e.data === 'string') {
            setPreviewSrc(URL.createObjectURL(new Blob([e.data], { type: 'text/html' })));
            if (isMobile) {
                setLogs(prev => [
                    ...prev,
                    { method: 'info', args: [`⚡ Live-reloading preview at ${new Date().toLocaleTimeString()}`] }
                ]);
            }
        }
    };
  }, [files, previewFileId, previewHistory, previewHistoryIndex, isMobile]); 

  useEffect(() => {
    if (files.length > 0) {
        if (!settings.autoSave && initialLoadDone.current) return;
        initialLoadDone.current = true;
        
        if (!isPageVisible) { 
            updatePending.current = true; 
            return; 
        }

        // Debounce preview updates
        const debounceTime = settings.refreshDelay || 150; 
        const timer = setTimeout(() => {
            const now = Date.now();
            // Throttle: Don't update more than once every 100ms (safety)
            if (now - lastUpdateRef.current < 100) return;
            
            if (settings.autoRefresh !== false) {
                if (settings.usePythonPreview) {
                    const prepared = getPreparedPreviewFiles(files, fileKeysRef.current).map(f => ({
                        ...f,
                        fullPath: getFullPath(f.id)
                    }));
                    fetch(`http://localhost:${settings.pythonPreviewPort || 5000}/api/preview/update`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ files: prepared })
                    })
                    .then(res => {
                        if (res.ok) {
                            const flaskUrl = `http://localhost:${settings.pythonPreviewPort || 5000}/?t=${Date.now()}`;
                            setPreviewSrc(flaskUrl);
                        } else {
                            console.error("Python Preview Server returned an error, falling back to client preview.");
                            workerRef.current?.postMessage({ 
                                files, 
                                activeFileId, 
                                previewFileId, 
                                clearData: false, 
                                cursorCSS: getCursorCSS() 
                            });
                        }
                    })
                    .catch(err => {
                        console.warn("Python Preview Server is not running. Start with `python app.py`. Falling back to client preview.", err);
                        workerRef.current?.postMessage({ 
                            files, 
                            activeFileId, 
                            previewFileId, 
                            clearData: false, 
                            cursorCSS: getCursorCSS() 
                        });
                    });
                } else {
                    workerRef.current?.postMessage({ 
                        files, 
                        activeFileId, 
                        previewFileId, 
                        clearData: false, 
                        cursorCSS: getCursorCSS() 
                    });
                }
            }
            lastUpdateRef.current = now;
            updatePending.current = false;
        }, debounceTime);
        
        return () => clearTimeout(timer);
    }
  }, [files, activeFileId, previewFileId, isPageVisible, settings.autoSave, settings.autoRefresh, settings.refreshDelay, settings.usePythonPreview, settings.pythonPreviewPort]);

  // --- Handlers ---
  const undo = () => { if (historyIndex > 0) { setHistoryIndex(prev => prev - 1); setFiles(history[historyIndex - 1]); playSound('click'); } };
  const redo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(prev => prev + 1); setFiles(history[historyIndex + 1]); playSound('click'); } };
  
  const handleFileChange = async (value: string | undefined) => { 
      await perfManager.handleLag();
      if (!activeFileId || value === undefined) return;
      
      const activeFile = files.find(f => f.id === activeFileId);
      if (!activeFile) return;

      const newFiles = files.map(f => f.id === activeFileId ? { ...f, content: value } : f);
      setFiles(newFiles); 

      // Fast CSS update
      if (activeFile.name.endsWith('.css') && settings.autoSave) {
          const iframe = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({
                  type: 'update-css',
                  fileName: activeFile.name,
                  content: value
              }, '*');
          }
      } else if (activeFile.name.endsWith('.html') && settings.autoSave) {
          // Detect if only style tag content changed
          const prev = prevContentRef.current;
          if (prev && prev !== value) {
              const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
              const prevStyles = [...prev.matchAll(styleRegex)].map(m => m[1]);
              const nextStyles = [...value.matchAll(styleRegex)].map(m => m[1]);
              
              const prevNoStyles = prev.replace(styleRegex, '__STYLE__');
              const nextNoStyles = value.replace(styleRegex, '__STYLE__');
              
              if (prevNoStyles === nextNoStyles && prevStyles.length === nextStyles.length) {
                  const iframe = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement;
                  if (iframe && iframe.contentWindow) {
                      nextStyles.forEach((style, i) => {
                          if (style !== prevStyles[i]) {
                              iframe.contentWindow?.postMessage({
                                  type: 'update-inline-style',
                                  index: i,
                                  content: style
                              }, '*');
                          }
                      });
                  }
              }
          }
      } else if (activeFile.name.endsWith('.php') && settings.autoSave) {
          const getFullPath = (file: any): string => {
              if (!file) return '';
              if (file.parentId === 'root' || !file.parentId) return '/' + file.name;
              const parent = newFiles.find(f => f.id === file.parentId);
              if (!parent) return '/' + file.name;
              return getFullPath(parent) + '/' + file.name;
          };

          const preparedFiles = newFiles.map(f => ({
              id: f.id, name: f.name, type: f.type, parentId: f.parentId, content: f.content, isBinary: f.isBinary,
              fullPath: getFullPath(f)
          }));

          const iframe = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({
                  type: 'update-php-project',
                  files: preparedFiles,
                  entryFile: {
                      id: activeFile.id, name: activeFile.name, type: activeFile.type, parentId: activeFile.parentId,
                      fullPath: getFullPath(activeFile)
                  }
              }, '*');
          }
      }

      prevContentRef.current = value;

      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
          updateFiles(newFiles, true); 
      }, 800);
  };
  
  // Persist tab groups
  useEffect(() => {
    const savedGroups = localStorage.getItem('vs_tab_groups');
    if (savedGroups) {
      try {
        setTabGroups(JSON.parse(savedGroups));
      } catch (e) {
        console.error('Failed to parse tab groups', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vs_tab_groups', JSON.stringify(tabGroups));
  }, [tabGroups]);

  const handleFileClick = (id: string) => { 
      setActiveFileId(id); 
      if (!openFiles.includes(id)) {
          setOpenFiles([...openFiles, id]);
      }
      const file = files.find(f => f.id === id); 
      if (file) {
          prevContentRef.current = file.content || '';
          if (file.name.endsWith('.html') || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.jsx') || file.name.endsWith('.php') || file.name.endsWith('.py')) {
              updatePreviewFile(id, true); 
              if (!settings.autoSave) {
                  workerRef.current?.postMessage({ files, activeFileId: id, previewFileId: id, clearData: false, cursorCSS: getCursorCSS() });
              }
          }
      }
      
      // Ensure tab is visible without resetting entire scroll
      setTimeout(() => {
          const tabEl = document.getElementById(`tab-${id}`);
          if (tabEl) {
              tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          }
      }, 50);
  };

  const handleTabClose = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newOpen = openFiles.filter(fid => fid !== id);
      setOpenFiles(newOpen);
      if (activeFileId === id) {
          if (newOpen.length > 0) {
              const newActiveId = newOpen[newOpen.length - 1];
              setActiveFileId(newActiveId);
              const file = files.find(f => f.id === newActiveId);
              if (file && (file.name.endsWith('.html') || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.jsx') || file.name.endsWith('.php') || file.name.endsWith('.py'))) {
                  updatePreviewFile(newActiveId, true);
                  if (!settings.autoSave) {
                      workerRef.current?.postMessage({ files, activeFileId: newActiveId, previewFileId: newActiveId, clearData: false, cursorCSS: getCursorCSS() });
                  }
              }
          }
          else setActiveFileId('');
      }
  };

  const handleToggleBookmark = (line: number) => {
      const existing = bookmarks.findIndex(b => b.fileId === activeFileId && b.line === line);
      const activeFile = files.find(f => f.id === activeFileId);
      if (activeFile && activeFile.content) {
          const lines = activeFile.content.split('\n');
          const content = lines[line - 1] || '';
          
          if (existing >= 0) {
              setBookmarks(prev => prev.filter((_, i) => i !== existing));
          } else {
              setBookmarks(prev => [...prev, { fileId: activeFileId, line, content: content.trim() || 'Empty Line' }]);
              playSound('pop');
          }
      }
  };

  const handleRemoveBookmark = (fileId: string, line: number) => {
      setBookmarks(prev => prev.filter(b => !(b.fileId === fileId && b.line === line)));
  };

  const navigateToBookmark = (fileId: string, line: number) => {
      setActiveFileId(fileId);
      if (!openFiles.includes(fileId)) setOpenFiles(prev => [...prev, fileId]);
      setEditorScrollLine(line);
  };

  const handleSaveSymbol = (newContent: string) => {
      if (selectedSymbol && selectedSymbol.fileId) {
          const file = files.find(f => f.id === selectedSymbol.fileId);
          if (file && file.content) {
              const newFileContent = file.content.replace(selectedSymbol.content, newContent);
              
              handleFileChange(newFileContent); 
              updateFiles(files.map(f => f.id === selectedSymbol.fileId ? { ...f, content: newFileContent } : f), true);
              
              setSelectedSymbol(null);
              playSound('success');
          }
      }
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };
  const handleDroppedFiles = async (droppedFiles: File[], parentId: string) => {
      setLoading(true);
      const newItems: FileSystemItem[] = [];
      let depth = 1;
      const parent = files.find(f => f.id === parentId);
      if (parent) depth = parent.depth + 1;
      else if (parentId === 'root') depth = 1;

      for (let i = 0; i < droppedFiles.length; i++) {
          const droppedFile = droppedFiles[i];
          try {
              if (droppedFile.name.endsWith('.json')) {
                  const text = await droppedFile.text();
                  try {
                      const parsed = JSON.parse(text);
                      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].name) {
                          updateFiles(parsed, true);
                          setLoading(false);
                          playSound('success');
                          return;
                      }
                  } catch (e) {
                      // fallback to standard import
                  }
              }
              newItems.push(await processFileImport(droppedFile, parentId, depth));
          } catch (err) {}
      }
      updateFiles([...files, ...newItems], true);
      setLoading(false);
      playSound('success');
  };
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          let parentId = 'root';
          const active = files.find(f => f.id === activeFileId);
          if (active) { if (active.type === 'folder') { parentId = active.id; } else if (active.parentId) { parentId = active.parentId; } }
          await handleDroppedFiles(Array.from(e.target.files), parentId);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };
  const handleFolderClick = (id: string) => { setFiles(files.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f)); };
  const handleDownload = () => downloadProjectAsZip(files);
  const handleSaveAll = async () => { 
      await db.saveProjectFiles(projectId, files); 
      workerRef.current?.postMessage({ files, activeFileId, previewFileId, clearData: false, cursorCSS: getCursorCSS() });
      playSound('success'); 
  };
  const openCreateModal = (type: 'file' | 'folder', parentId: string | null = null) => {
      let targetParentId = parentId;
      if (!targetParentId) { const active = files.find(f => f.id === activeFileId); targetParentId = active ? (active.type === 'folder' ? active.id : active.parentId) : 'root'; }
      setCreateModal({ visible: true, type, parentId: targetParentId });
  };
  const handleCreateSubmit = (rawName: string) => {
      const name = rawName.trim();
      if (!name) return;
      let targetFolderId = 'root';
      const isRename = createModal.type === 'rename';
      if (isRename) { const currentItem = files.find(f => f.id === createModal.parentId); if (currentItem && currentItem.parentId) targetFolderId = currentItem.parentId; } 
      else { if (createModal.parentId) targetFolderId = createModal.parentId; }
      const siblings = files.filter(f => f.parentId === targetFolderId);
      const isSameName = isRename && files.find(f => f.id === createModal.parentId)?.name === name;
      if (!isSameName && siblings.some(f => f.name.toLowerCase() === name.toLowerCase())) { alert("rename it doesn't supported"); return; }
      if (isRename) { if (!createModal.parentId) return; updateFiles(files.map(f => f.id === createModal.parentId ? { ...f, name } : f), true); } 
      else {
          let depth = 1;
          const parentFolder = files.find(f => f.id === targetFolderId);
          if (parentFolder) depth = parentFolder.depth + 1;
          
          let initialContent = '';
          if (createModal.type === 'file') {
              if (name.endsWith('.html')) initialContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>`;
              else if (name.endsWith('.css')) initialContent = `* {\n    box-sizing: border-box;\n    margin: 0;\n    padding: 0;\n}\n\nbody {\n    font-family: system-ui, sans-serif;\n}`;
              else if (name.endsWith('.js')) initialContent = `console.log('Hello World');`;
              else if (name.endsWith('.json')) initialContent = `{\n  "key": "value"\n}`;
              else if (name.endsWith('.tsx')) initialContent = `import React from 'react';\n\nconst App = () => {\n  return <div>Hello TSX</div>;\n};\n\nexport default App;`;
              else if (name.endsWith('.flow')) initialContent = `{"nodes":[],"edges":[]}`;
          }

          const newItem: FileSystemItem = { id: generateId(), name, type: createModal.type === 'file' ? 'file' : 'folder', parentId: targetFolderId, depth, content: initialContent, isOpen: createModal.type === 'folder' ? true : undefined };
          updateFiles([...files, newItem], true);
          if (newItem.type === 'file') {
              setActiveFileId(newItem.id);
              setOpenFiles([...openFiles, newItem.id]);
              if (newItem.name.endsWith('.html') || newItem.name.endsWith('.ts') || newItem.name.endsWith('.tsx') || newItem.name.endsWith('.jsx') || newItem.name.endsWith('.php') || newItem.name.endsWith('.py')) {
                  updatePreviewFile(newItem.id, true);
                  if (!settings.autoSave) {
                      workerRef.current?.postMessage({ files: [...files, newItem], activeFileId: newItem.id, previewFileId: newItem.id, clearData: false, cursorCSS: getCursorCSS() });
                  }
              }
          }
      }
  };
  const handleDeleteRequest = (id: string) => setDeleteId(id);
  const confirmDelete = () => {
      const getIdsToDelete = (itemId: string): string[] => { const children = files.filter(f => f.parentId === itemId); let ids = [itemId]; children.forEach(c => { ids = [...ids, ...getIdsToDelete(c.id)]; }); return ids; };
      const rootIds = deleteIds || (deleteId ? [deleteId] : []);
      let allIdsToDelete: string[] = [];
      rootIds.forEach(id => { allIdsToDelete = [...allIdsToDelete, ...getIdsToDelete(id)]; });
      allIdsToDelete = [...new Set(allIdsToDelete)];
      const newFiles = files.filter(f => !allIdsToDelete.includes(f.id));
      updateFiles(newFiles, true);
      setOpenFiles(openFiles.filter(id => !allIdsToDelete.includes(id)));
      if (allIdsToDelete.includes(activeFileId)) setActiveFileId('');
      setDeleteId(null); setDeleteIds(null); playSound('pop');
  };
  const handleMoveFiles = (sourceIds: string[], targetFolderId: string) => {
      const isInvalid = (sourceId: string) => { if (sourceId === targetFolderId) return true; let current = files.find(f => f.id === targetFolderId); while(current && current.parentId) { if (current.parentId === sourceId) return true; current = files.find(f => f.id === current.parentId); } return false; };
      const validSources = sourceIds.filter(id => !isInvalid(id));
      if (validSources.length === 0) return;
      let nextFiles = files.map(f => { if (validSources.includes(f.id)) return { ...f, parentId: targetFolderId }; return f; });
      const recalculate = (items: FileSystemItem[]) => { const getChildren = (pid: string | null) => items.filter(f => f.parentId === pid); const result: FileSystemItem[] = []; const traverse = (pid: string | null, depth: number) => { getChildren(pid).forEach(child => { result.push({ ...child, depth }); if (child.type === 'folder') traverse(child.id, depth + 1); }); }; const root = items.find(f => f.id === 'root'); if (root) result.push({ ...root, depth: 0 }); traverse('root', 1); return result; };
      updateFiles(recalculate(nextFiles), true); playSound('success');
  };
  const handleRename = (id: string) => { const file = files.find(f => f.id === id); if (file) setCreateModal({ visible: true, type: 'rename', parentId: id, initialValue: file.name }); };
  const handleCopy = (id: string) => setClipboard({ id, op: 'copy' });
  const handlePaste = (parentId: string) => {
      if (!clipboard) return;
      const original = files.find(f => f.id === clipboard.id);
      if (!original) return;
      const newId = generateId();
      const parent = files.find(f => f.id === parentId);
      const newDepth = parent ? parent.depth + 1 : 1;
      let newName = `copy_${original.name}`;
      const siblings = files.filter(f => f.parentId === parentId);
      let counter = 1;
      while (siblings.some(f => f.name === newName)) { newName = `copy_${counter}_${original.name}`; counter++; }
      if (original.type === 'file') updateFiles([...files, { ...original, id: newId, name: newName, parentId, depth: newDepth }], true);
  };
  const handleCopyPath = (path: string) => { 
      if (path) { 
          navigator.clipboard.writeText(path); 
          setLogs(prev => [...prev, { method: 'info', args: [`Path copied: ${path}`] }]);
          playSound('click');
      } 
  };

  // --- Tab Group Handlers ---
  const handleCreateTabGroup = (name: string, fileId?: string) => {
      const newGroup: TabGroup = {
          id: generateId(),
          name,
          fileIds: fileId ? [fileId] : [],
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          isCollapsed: false
      };
      setTabGroups(prev => [...prev, newGroup]);
      playSound('success');
  };

  const handleAddTabToGroup = (groupId: string, fileId: string) => {
      setTabGroups(prev => prev.map(g => {
          if (g.id === groupId) {
              if (g.fileIds.includes(fileId)) return g;
              return { ...g, fileIds: [...g.fileIds, fileId] };
          }
          // Remove from other groups if it was there
          return { ...g, fileIds: g.fileIds.filter(id => id !== fileId) };
      }));
      playSound('click');
  };

  const handleRemoveTabFromGroup = (fileId: string) => {
      setTabGroups(prev => prev.map(g => ({
          ...g,
          fileIds: g.fileIds.filter(id => id !== fileId)
      })));
  };

  const handleToggleGroupCollapse = (groupId: string) => {
      setTabGroups(prev => prev.map(g => g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g));
  };

  const handleDeleteGroup = (groupId: string) => {
      setTabGroups(prev => prev.filter(g => g.id !== groupId));
      playSound('pop');
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
      setTabGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g));
  };

  const handleFindSymbol = () => { playSound('pop'); const active = files.find(f => f.id === activeFileId); if (active && active.content && !active.isBinary) { const fileExt = active.name.split('.').pop() || 'js'; setFoundSymbols(extractSymbols(active.content, fileExt)); } else { setFoundSymbols([]); } setShowSymbolModal(true); };
  const handleSymbolSelect = (fileId: string, line: number) => { 
      const file = files.find(f => f.id === fileId); 
      if(file && file.content) { 
          const fileExt = file.name.split('.').pop() || 'js'; 
          const symbols = extractSymbols(file.content, fileExt); 
          const sym = symbols.find(s => s.line === line); 
          if (sym) { 
              setSelectedSymbol({ ...sym, fileId, fileName: file.name }); 
              setShowSymbolModal(false); 
              return; 
          } 
      } 
      if (fileId !== activeFileId) handleFileClick(fileId); 
      setEditorScrollLine(line + 1);
      setShowSymbolModal(false); 
  };
  const handleSearch = (term: string, scope: 'current' | 'all', wholeWord: boolean = false) => { 
      setSearchTerm(term); 
      if (!term.trim()) { 
          setGlobalSearchResults([]); 
          return; 
      } 
      const results: any[] = []; 
      const lowerTerm = term.toLowerCase(); 
      
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = wholeWord 
        ? new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i') 
        : null;

      files.forEach(f => { 
          if (f.type === 'file' && f.content && !f.isBinary) { 
              if (scope === 'current' && f.id !== activeFileId) return;
              f.content.split('\n').forEach((line, index) => { 
                  const isMatch = wholeWord 
                    ? regex?.test(line) 
                    : line.toLowerCase().includes(lowerTerm);

                  if (isMatch) {
                      results.push({ fileId: f.id, fileName: f.name, line: index, content: line }); 
                  }
              }); 
          } 
      }); 
      setGlobalSearchResults(results); 
  };
  const handlePreviewBack = () => { if (previewHistoryIndex > 0) { const newIndex = previewHistoryIndex - 1; setPreviewHistoryIndex(newIndex); setPreviewFileId(previewHistory[newIndex]); } };
  const handlePreviewForward = () => { if (previewHistoryIndex < previewHistory.length - 1) { const newIndex = previewHistoryIndex + 1; setPreviewHistoryIndex(newIndex); setPreviewFileId(previewHistory[newIndex]); } };
  const handleFormat = async () => { if(!activeFileId) return; const file = files.find(f => f.id === activeFileId); if(!file || !file.content) return; try { const ext = file.name.split('.').pop() || ''; const formatted = await formatCode(file.content, ext, settings.tabSize); handleFileChange(formatted); playSound('success'); } catch(e: any) { alert("Could not format file: " + (e.message || e)); } };
  const handleLorem = () => { if(!activeFileId) return; const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."; const file = files.find(f => f.id === activeFileId); if(file) handleFileChange((file.content || '') + '\n' + lorem); playSound('click'); };
  const handleOpenInNewTab = () => {
      workerRef.current?.postMessage({ files, activeFileId, previewFileId: previewFileId || activeFileId, clearData: false, mode: 'export' }); 
  };
  const handleInspectElement = (data: { tagName: string, id: string, className: string, innerText: string, innerHTML: string, styles: any, attributes: any, rect: any }) => {
      setInspectData(data);
      playSound('pop');
  };

  const handleToggleExtension = (extId: string) => {
      playSound('click');
      const isInstalled = (settings.installedExtensions || []).includes(extId);
      if (!isInstalled && extId === 'kamoh.image-preview') {
          setShowImagePreviewExample(true);
      }
      setSettings(prev => {
          const currentlyInstalled = prev.installedExtensions || [];
          const checkInstalled = currentlyInstalled.includes(extId);
          return { ...prev, installedExtensions: checkInstalled ? currentlyInstalled.filter(id => id !== extId) : [...currentlyInstalled, extId] };
      });
  };

  // Screen Recorder Logic
  const handleToggleRecord = async () => {
      if (isRecording && mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          return;
      }

      try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          const recorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'video/webm' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `recording-${Date.now()}.webm`;
              a.click();
              URL.revokeObjectURL(url);
              stream.getTracks().forEach(track => track.stop());
          };

          recorder.start();
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
      } catch (err) {
          console.error("Screen record failed", err);
          alert("Could not start recording.");
      }
  };

  const handleTabDragStart = (e: React.DragEvent, tabId: string) => {
      e.dataTransfer.setData('tab-id', tabId);
  };

  const handleTabDrop = (e: React.DragEvent, targetTabId: string) => {
      e.preventDefault();
      const draggedTabId = e.dataTransfer.getData('tab-id');
      if (!draggedTabId || draggedTabId === targetTabId) return;

      const newOpenFiles = [...openFiles];
      const fromIndex = newOpenFiles.indexOf(draggedTabId);
      const toIndex = newOpenFiles.indexOf(targetTabId);

      if (fromIndex !== -1 && toIndex !== -1) {
          newOpenFiles.splice(fromIndex, 1);
          newOpenFiles.splice(toIndex, 0, draggedTabId);
          setOpenFiles(newOpenFiles);
          playSound('click');
      }
  };

  const handleTabContextMenu = (e: React.MouseEvent, fileId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setTabContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  const handleCloseOthers = () => {
      if (tabContextMenu) {
          setOpenFiles([tabContextMenu.fileId]);
          setActiveFileId(tabContextMenu.fileId);
          const file = files.find(f => f.id === tabContextMenu.fileId);
          if (file && (file.name.endsWith('.html') || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.jsx') || file.name.endsWith('.php') || file.name.endsWith('.py'))) {
              updatePreviewFile(tabContextMenu.fileId, true);
              if (!settings.autoSave) {
                  workerRef.current?.postMessage({ files, activeFileId: tabContextMenu.fileId, previewFileId: tabContextMenu.fileId, clearData: false, cursorCSS: getCursorCSS() });
              }
          }
          setTabContextMenu(null);
      }
  };

  const handleCloseAll = () => {
      setOpenFiles([]);
      setActiveFileId('');
      setTabContextMenu(null);
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const fileExtension = activeFile?.name.split('.').pop() || 'html';
  const guiScale = settings.guiSize === 1 ? 0.85 : settings.guiSize === 3 ? 1.15 : 1;
  const currentTheme = THEMES['vs-dark'];
  const textDir = 'ltr';
  const t = translations[settings.language] || translations.en;

  const toggleSidePanel = (panel: 'explorer' | 'search' | 'tools' | 'extensions' | 'github') => {
      playSound('click');
      if (activeSidePanel === panel) setActiveSidePanel(null);
      else setActiveSidePanel(panel);
  };

  const ActivityBarItem = ({ icon: Icon, active, onClick, tooltip }: any) => (
      <button 
        onClick={onClick}
        title={tooltip}
        className={`p-3 transition-all duration-200 relative group ${active ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
      >
          <Icon size={24} strokeWidth={1.5} />
          {active && <div key="div" className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#007acc]" />}
      </button>
  );

  if (loading) return <div className="h-screen w-screen bg-[#1e1e1e] text-white flex items-center justify-center">Loading Project...</div>;

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-black">
        <div 
            className="flex flex-col h-full w-full max-w-[1920px] font-sans overflow-hidden transition-colors duration-300 animate-in fade-in duration-500 shadow-2xl"
            style={{ zoom: guiScale, ...currentTheme as React.CSSProperties, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', direction: textDir } as any} 
        >
      <style>{getCursorCSS()}</style>
      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileImport} />
      
      {/* Floating Face Cam */}
      {showFaceCam && <FaceCam onClose={() => { setShowFaceCam(false); }} />}

      {!zenMode && (
          <Toolbar 
            onDownload={handleDownload} onSaveAll={handleSaveAll} onNewFile={() => openCreateModal('file')} onNewFolder={() => openCreateModal('folder')}
            onUndo={undo} onRedo={redo} onFind={() => { playSound('pop'); setShowFindModal(true); }} onFindSymbol={handleFindSymbol}
            settings={settings} onSettingsChange={setSettings} onOpenSettings={() => { playSound('pop'); setShowSettingsModal(true); }}
            toggleFullscreen={() => setFullscreenPreview(true)} toggleSidebar={() => toggleSidePanel('explorer')}
            canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1} isSidebarOpen={!!activeSidePanel}
            onImport={handleImportClick} onHome={() => { playSound('click'); onCloseProject(); }} onOpenNewTab={handleOpenInNewTab}
            onRunClick={() => setShowRunModal(true)} onOpenObfuscator={() => setShowObfuscator(true)} onOpenCDN={() => setShowCDN(true)}
            onFormat={handleFormat} onLorem={handleLorem} 
            onColorPicker={() => setShowColorPicker(true)} 
            onBase64={() => setShowBase64(true)}
            onOpenTool={(type) => {
                if (type === 'boilerplate-custom') setShowBoilerplateModal(true);
                else if (type === 'bookmarks') setShowBookmarks(true);
                else if (type === 'open-in-phone') setShowOpenInPhone(true);
                else if (type === 'more-compilers') setShowMoreCompilers(true);
                else setActiveTool(type);
            }}
            onZenMode={() => setZenMode(true)}
            onShortcuts={() => setShowShortcuts(true)}
            onOpenResources={() => setShowResources(true)}
            // Cam & Rec
            onToggleCam={() => setShowFaceCam(!showFaceCam)}
            isCamActive={showFaceCam}
            onToggleRecord={handleToggleRecord}
            isRecording={isRecording}
            onOpenGradient={() => setActiveTool('gradient')}
            onOpenButton={() => setActiveTool('button')}
            onOpenBoxShadow={() => setActiveTool('shadow')}
            onOpenFlexbox={() => setActiveTool('flexbox')}
            onOpenTable={() => setActiveTool('table')}
            files={files}
            isMobile={isMobile}
          />
      )}

      <div className={`flex-1 flex overflow-hidden relative ${settings.sidebarPosition === 'right' ? 'flex-row-reverse' : ''}`}>
         {zenMode && (
             <button 
                onClick={() => setZenMode(false)}
                className="absolute top-2 right-2 z-50 bg-[#333] hover:bg-[#444] text-gray-400 p-2 rounded-full shadow-lg opacity-50 hover:opacity-100 transition-opacity"
                title="Exit Zen Mode (Esc)"
             >
                 <Minimize2 size={16} />
             </button>
         )}

         {!zenMode && settings.showActivityBar !== false && (
             <div className={`w-12 bg-[#252526] flex flex-col items-center z-20 ${settings.sidebarPosition === 'right' ? 'border-l' : 'border-r'} border-[#333]`}>
                 <ActivityBarItem icon={Files} active={activeSidePanel === 'explorer'} onClick={() => toggleSidePanel('explorer')} tooltip={t.explorer} />
                 <ActivityBarItem icon={Search} active={activeSidePanel === 'search'} onClick={() => { toggleSidePanel('search'); if(activeSidePanel !== 'search') setShowFindModal(true); }} tooltip={t.find} />
                 <ActivityBarItem icon={Package} active={activeSidePanel === 'extensions'} onClick={() => toggleSidePanel('extensions')} tooltip="Extensions" />
                 <ActivityBarItem icon={Zap} active={false} onClick={() => { playSound('click'); setShowObfuscator(true); }} tooltip={t.obfuscator} />
                 <ActivityBarItem icon={Bookmark} active={false} onClick={() => { playSound('click'); setShowBookmarks(true); }} tooltip={t.bookmarks} />
                 <div className="flex-1" />
             </div>
         )}

         <div className={`bg-[#252526] flex flex-col border-[#333] transition-all duration-300 ease-in-out ${settings.sidebarPosition === 'right' ? 'border-l' : 'border-r'} ${((activeSidePanel === 'explorer' || activeSidePanel === 'extensions') && !zenMode) ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
             <div className="flex-1 overflow-hidden h-full flex flex-col" dir="ltr">
                {activeSidePanel === 'explorer' && (
                   <FileExplorer 
                       files={files} activeFileId={activeFileId} onFileClick={handleFileClick} onFolderClick={handleFolderClick}
                       onNewFile={(pid) => openCreateModal('file', pid)} onNewFolder={(pid) => openCreateModal('folder', pid)}
                       onDelete={handleDeleteRequest} onRename={handleRename} onCopy={handleCopy} onPaste={handlePaste} onCopyPath={handleCopyPath}
                       canPaste={!!clipboard} onImportFiles={handleDroppedFiles} onMove={handleMoveFiles} onDeleteMultiple={setDeleteIds} onTriggerImport={handleImportClick}
                       language={settings.language}
                       onClearStorage={() => setShowClearStorageConfirm(true)}
                       onInject={handleInject}
                   />
                )}
                {activeSidePanel === 'extensions' && (
                   <ExtensionErrorBoundary extensionName="kamoh.extensions">
                       <ExtensionsPanel 
                           installedExtensions={settings.installedExtensions || []}
                           onToggleExtension={handleToggleExtension}
                       />
                   </ExtensionErrorBoundary>
                )}
             </div>
         </div>

         <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
             <div className="h-9 bg-[#252526] flex items-center overflow-x-auto select-none no-scrollbar" dir="ltr">
                {/* Render Groups */}
                {tabGroups.map(group => (
                    <div key={group.id} className="flex items-center h-full">
                        <div 
                            className="h-full px-2 flex items-center gap-1 border-r border-[#333] bg-[#2d2d2d] hover:bg-[#333] cursor-pointer group relative"
                            onClick={() => handleToggleGroupCollapse(group.id)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setTabContextMenu({ x: e.clientX, y: e.clientY, fileId: `group:${group.id}` });
                            }}
                        >
                            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: group.color }} />
                            {group.isCollapsed ? <ChevronRight size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight max-w-[60px] truncate">{group.name}</span>
                        </div>
                        
                        {!group.isCollapsed && (Array.from(new Set(group.fileIds)) as string[]).map(fid => {
                            const f = files.find(file => file.id === fid);
                            if (!f) return null;
                            const isActive = fid === activeFileId;
                            return (
                                <div 
                                    key={fid}
                                    id={`tab-${fid}`}
                                    draggable
                                    onDragStart={(e) => handleTabDragStart(e, fid)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleTabDrop(e, fid)}
                                    onContextMenu={(e) => handleTabContextMenu(e, fid)}
                                    onClick={() => { setActiveFileId(fid); playSound('click'); }}
                                    className={`
                                        h-full px-3 flex items-center gap-2 text-xs border-r border-[#333] min-w-[120px] max-w-[200px] cursor-pointer group relative
                                        ${isActive ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]' : 'bg-[#2d2d2d] text-[#888] hover:bg-[#2a2a2a]'}
                                    `}
                                    style={{ borderLeft: `2px solid ${group.color}` }}
                                >
                                    <span className="truncate flex-1">{f.name}</span>
                                    <X 
                                        size={14} 
                                        className={`p-0.5 rounded-sm hover:bg-[#444] hover:text-white ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
                                        onClick={(e) => handleTabClose(e, fid)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* Render Ungrouped Tabs */}
                {(Array.from(new Set(openFiles)) as string[]).filter(fid => !tabGroups.some(g => g.fileIds.includes(fid))).map(fid => {
                    const f = files.find(file => file.id === fid);
                    if (!f) return null;
                    const isActive = fid === activeFileId;
                    return (
                        <div 
                            key={fid}
                            id={`tab-${fid}`}
                            draggable
                            onDragStart={(e) => handleTabDragStart(e, fid)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleTabDrop(e, fid)}
                            onContextMenu={(e) => handleTabContextMenu(e, fid)}
                            onClick={() => { setActiveFileId(fid); playSound('click'); }}
                            className={`
                                h-full px-3 flex items-center gap-2 text-xs border-r border-[#333] min-w-[120px] max-w-[200px] cursor-pointer group relative
                                ${isActive ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]' : 'bg-[#2d2d2d] text-[#888] hover:bg-[#2a2a2a]'}
                            `}
                        >
                            <span className="truncate flex-1">{f.name}</span>
                            <X 
                                size={14} 
                                className={`p-0.5 rounded-sm hover:bg-[#444] hover:text-white ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
                                onClick={(e) => handleTabClose(e, fid)}
                            />
                        </div>
                    );
                })}
             </div>

             {!zenMode && activeFile && (
                 <div className="h-6 bg-[#1e1e1e] border-b border-[#333] flex items-center px-4 text-[10px] text-[#888] select-none" dir="ltr">
                     <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors"><Home size={10} /> {settings.projectName}</span>
                     {getBreadcrumbs(activeFileId).map((item, idx) => (
                         <React.Fragment key={item.id}>
                             <ChevronRight size={10} className="mx-1 opacity-50" />
                             <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
                                 {item.type === 'folder' ? (
                                     <span>{item.name}</span>
                                 ) : (
                                     <>
                                        {item.name.endsWith('css') || item.name.endsWith('js') || item.name.endsWith('html') ? <FileCode size={10} /> : <File size={10} />}
                                        {item.name}
                                     </>
                                 )}
                             </span>
                         </React.Fragment>
                     ))}
                 </div>
             )}

             <div className="flex-1 flex overflow-hidden relative">
                <div className={`flex-1 flex flex-col min-w-0 relative ${settings.showPreview ? 'border-r border-[#333]' : ''}`}>
                    {activeFile && activeFile.name.endsWith('.flow') ? (
                        <FlowEditor 
                            content={activeFile.content || ''} 
                            onChange={handleFileChange}
                            theme={settings.theme}
                        />
                    ) : activeFile ? (
                        <CodeEditor 
                            content={activeFile.content || ''} language={fileExtension} onChange={handleFileChange} searchTerm={searchTerm}
                            wordWrap={settings.wordWrap} fontSize={settings.fontSize} isBinary={activeFile.isBinary} mimeType={activeFile.mimeType}
                            fontFamily={settings.fontFamily} lineHeight={settings.lineHeight} tabSize={settings.tabSize}
                            minimap={settings.minimap} ligatures={settings.ligatures} theme={settings.editorTheme || 'vs-dark'}
                            cursorBlinking={settings.cursorBlinking} cursorStyle={settings.cursorStyle} smoothScrolling={settings.smoothScrolling}
                            bookmarks={bookmarks.filter(b => b.fileId === activeFileId).map(b => b.line)}
                            onToggleBookmark={handleToggleBookmark}
                            scrollToLine={editorScrollLine}
                            onScrollHandled={() => setEditorScrollLine(null)}
                            showLineNumbers={settings.showLineNumbers}
                            showIndentGuides={settings.showIndentGuides}
                            bracketPairColorization={settings.bracketPairColorization}
                            formatOnSave={settings.formatOnSave}
                            editorType={settings.editorType}
                            fileId={activeFileId}
                            fileName={activeFile.name}
                            files={files}
                            onLog={(log) => setLogs(prev => [...prev, log])}
                            onNavigate={handleInternalNavigation}
                            testBoilerplate={testBoilerplate}
                            insertSnippet={insertSnippet}
                            onUnlockFile={handleUnlockFile}
                            settings={settings}
                            hideMobileToolbar={showMobilePreview}
                            onChangeFontSize={(newSize: number) => setSettings(s => ({ ...s, fontSize: newSize }))}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-[#333] select-none bg-[#1e1e1e]">
                            <div className="text-center">
                                <div className="mb-4 text-6xl opacity-10"><Code2 size={80}/></div>
                                <div className="text-sm opacity-40 font-mono">VS HTML5 Studio</div>
                                <div className="text-xs opacity-30 mt-2">Open a file to start editing</div>
                                <div className="flex gap-4 justify-center mt-8 text-xs opacity-40">
                                    <span className="flex items-center gap-1 cursor-pointer hover:opacity-100" onClick={() => setShowFindModal(true)}><Search size={12}/> {t.find}</span>
                                    <span className="flex items-center gap-1 cursor-pointer hover:opacity-100" onClick={() => setShowMoreCompilers(true)}><ExternalLink size={12}/> More Compilers</span>
                                    <span className="flex items-center gap-1" title="Access tools from the sidebar"><Grid size={12}/> {t.tools}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {(!isMobile && settings.showPreview) && (
                    <div className={`${expandFullPreview ? 'absolute inset-0 z-50 w-full' : 'w-[40%]'} flex flex-col bg-white transition-all`} dir="ltr">
                        <div className="h-8 bg-[#f0f0f0] border-b border-[#ccc] flex items-center px-2 gap-2 select-none">
                            <div className="flex gap-1 text-gray-600">
                                <button onClick={handlePreviewBack} disabled={previewHistoryIndex<=0} className={`p-1 hover:bg-[#d0d0d0] rounded ${previewHistoryIndex<=0 ? 'opacity-30':''}`}><ArrowLeft size={14}/></button>
                                <button onClick={handlePreviewForward} disabled={previewHistoryIndex>=previewHistory.length-1} className={`p-1 hover:bg-[#d0d0d0] rounded ${previewHistoryIndex>=previewHistory.length-1 ? 'opacity-30':''}`}><ArrowRight size={14}/></button>
                                <button onClick={() => workerRef.current?.postMessage({ files, activeFileId, previewFileId, clearData: false, cursorCSS: getCursorCSS() })} className="p-1 hover:bg-[#d0d0d0] rounded" title="Refresh Preview"><RefreshCw size={12}/></button>
                            </div>
                            <div 
                                className="flex-1 bg-white border border-[#ccc] rounded h-5 flex items-center px-2 text-[10px] text-gray-500 shadow-inner truncate font-mono"
                            >
                                <Lock size={8} className="mr-1 text-green-600" />
                                {settings.projectName} - {previewUrlInput}
                            </div>
                            <div className="flex gap-1 text-gray-600 items-center">
                                <button 
                                    onClick={() => setSettings(s => ({...s, autoSave: !s.autoSave}))} 
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${settings.autoSave ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-200 text-gray-500 border border-gray-300 hover:bg-gray-300'}`} 
                                    title="Toggle Live Preview (Auto-run)"
                                >
                                    <Zap size={10} className={settings.autoSave ? 'fill-green-500' : ''} />
                                    LIVE
                                </button>
                                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
                                <div className="flex items-center gap-1 bg-gray-100 rounded px-1.5 py-0.5 border border-gray-300 shadow-sm">
                                    <button 
                                        onClick={() => setSettings(s => ({...s, showConsole: !s.showConsole}))} 
                                        className={`p-1 rounded flex items-center gap-1 duration-150 text-[10px] font-bold ${settings.showConsole ? 'bg-gray-300 text-gray-800 font-extrabold' : 'hover:bg-gray-200 text-gray-600'}`} 
                                        title="Toggle Console"
                                    >
                                        <Terminal size={11} className={logs.length > 0 ? "text-[#007acc]" : ""} />
                                        <span>console</span>
                                    </button>
                                    {logs.length > 0 && (
                                        <div className="flex items-center gap-0.5">
                                            <span className="w-[1px] h-3 bg-gray-300 mx-0.5"></span>
                                            {logs.filter(l => l.method === 'error').length > 0 && (
                                                <button 
                                                    onClick={() => setSettings(s => ({...s, showConsole: true}))} 
                                                    className="bg-red-100 hover:bg-red-200 text-red-700 font-extrabold text-[9px] px-1 rounded transition-colors"
                                                    title={`${logs.filter(l => l.method === 'error').length} Errors`}
                                                >
                                                    {logs.filter(l => l.method === 'error').length}
                                                </button>
                                            )}
                                            {logs.filter(l => l.method === 'warn').length > 0 && (
                                                <button 
                                                    onClick={() => setSettings(s => ({...s, showConsole: true}))} 
                                                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 font-extrabold text-[9px] px-1 rounded transition-colors"
                                                    title={`${logs.filter(l => l.method === 'warn').length} Warnings`}
                                                >
                                                    {logs.filter(l => l.method === 'warn').length}
                                                </button>
                                            )}
                                            {logs.filter(l => l.method === 'log' || l.method === 'info').length > 0 && (
                                                <button 
                                                    onClick={() => setSettings(s => ({...s, showConsole: true}))} 
                                                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-extrabold text-[9px] px-1 rounded transition-colors"
                                                    title={`${logs.filter(l => l.method === 'log' || l.method === 'info').length} Logs`}
                                                >
                                                    {logs.filter(l => l.method === 'log' || l.method === 'info').length}
                                                </button>
                                            )}
                                            <span className="w-[1px] h-3 bg-gray-300 mx-0.5"></span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setLogs([]); playSound('pop'); }}
                                                className="p-0.5 hover:text-red-600 hover:bg-red-50 text-gray-400 rounded transition-colors"
                                                title="Clear Logs"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
                                <button onClick={() => setFullscreenPreview(true)} className="p-1 hover:bg-[#d0d0d0] rounded text-gray-600" title="Fullscreen Preview"><Maximize2 size={12}/></button>
                                <button onClick={handleOpenInNewTab} className="p-1 hover:bg-[#d0d0d0] rounded" title="Open in New Tab"><ExternalLink size={12}/></button>
                            </div>
                        </div>
                        <div className="flex-1 relative flex flex-col min-h-0">
                            <div className={`flex-1 relative ${settings.showConsole ? 'h-1/2 sm:h-2/3' : 'h-full'}`}>
                                <iframe 
                                    title="preview" 
                                    src={previewSrc || undefined} 
                                    className="w-full h-full border-none absolute inset-0" 
                                />
                            </div>
                            {settings.showConsole && (
                                <div className="h-1/2 sm:h-1/3 relative border-t border-[#333]">
                                    <Console logs={logs} onClear={() => setLogs([])} onHide={() => setSettings(s => ({...s, showConsole: false}))} onNavigate={(fileName, line) => {
                                        const file = files.find(f => f.name === fileName);
                                        if (file) {
                                            handleFileClick(file.id);
                                            setEditorScrollLine(line);
                                        }
                                    }} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
             </div>
         </div>
      </div>
      
      {!zenMode && settings.showStatusBar !== false && !isMobile && (
          <div className="h-6 bg-[#007acc] text-white flex items-center px-3 text-[10px] justify-between select-none z-30">
              <div className="flex gap-4 items-center">
                  <span className="flex items-center gap-1"><Files size={10} /> {settings.projectName}</span>
                  <span className="flex items-center gap-1 opacity-80" title="Lines / Words / Chars"><Database size={10} /> {totalChars.toLocaleString()} chars</span>
                  <div className="h-3 w-[1px] bg-white/20 mx-1" />
                  <FPSCounter />
              </div>
              <div className="flex gap-4">
                 <span>{t.ln} {activeFile?.content?.split('\n').length || 1}, {t.col} 1</span>
                 <span>UTF-8</span>
                 <span>{t.spaces}: {settings.tabSize}</span>
                 <span>{settings.language.toUpperCase()}</span>
                 <span>{activeFile?.isBinary ? t.binary : t.text}</span>
              </div>
          </div>
      )}

      {tabContextMenu && (
          <div 
            className="fixed z-[100] bg-[#252526] border border-[#333] shadow-xl py-1 rounded-lg w-40 animate-in fade-in zoom-in-95 duration-200"
            style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
              <button 
                onClick={() => { playSound('click'); handleTabClose({ stopPropagation: () => {} } as any, tabContextMenu.fileId); setTabContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center gap-2 text-gray-300"
              >
                  <X size={12} /> {t.close}
              </button>
              <button 
                onClick={() => { playSound('click'); handleCloseOthers(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center gap-2 text-gray-300"
              >
                  <Minimize2 size={12} /> {t.closeOthers}
              </button>
              <button 
                onClick={() => { playSound('click'); handleCloseAll(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center gap-2 text-gray-300"
              >
                  <Trash2 size={12} /> {t.closeAll}
              </button>
              <div className="h-[1px] bg-[#333] my-1" />
              {tabContextMenu.fileId.startsWith('group:') ? (
                  <>
                    <button 
                        onClick={() => { playSound('click'); setShowGroupModal({ visible: true, groupId: tabContextMenu.fileId.replace('group:', '') }); setTabContextMenu(null); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center gap-2 text-gray-300"
                    >
                        <FileCode size={12} /> Rename Group
                    </button>
                    <button 
                        onClick={() => { playSound('click'); handleDeleteGroup(tabContextMenu.fileId.replace('group:', '')); setTabContextMenu(null); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-red-600 hover:text-white text-xs flex items-center gap-2 text-gray-300"
                    >
                        <Trash2 size={12} /> Delete Group
                    </button>
                  </>
              ) : (
                  <>
                    <button 
                        onClick={() => { playSound('click'); setShowGroupModal({ visible: true, fileId: tabContextMenu.fileId }); setTabContextMenu(null); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center gap-2 text-gray-300"
                    >
                        <FolderPlus size={12} /> New Group
                    </button>
                    {tabGroups.length > 0 && (
                        <div className="relative group/submenu">
                            <button className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center justify-between gap-2 text-gray-300">
                                <span className="flex items-center gap-2"><Grid size={12} /> Add to Group</span>
                                <ChevronRight size={10} />
                            </button>
                            <div className="absolute left-full top-0 hidden group-hover/submenu:block bg-[#252526] border border-[#333] shadow-xl py-1 rounded-lg w-40 animate-in fade-in zoom-in-95 duration-200">
                                {tabGroups.map(g => (
                                    <button 
                                        key={g.id}
                                        onClick={() => { handleAddTabToGroup(g.id, tabContextMenu.fileId); setTabContextMenu(null); }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center gap-2 text-gray-300"
                                    >
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {tabGroups.some(g => g.fileIds.includes(tabContextMenu.fileId)) && (
                        <button 
                            onClick={() => { playSound('click'); handleRemoveTabFromGroup(tabContextMenu.fileId); setTabContextMenu(null); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center gap-2 text-gray-300"
                        >
                            <FolderMinus size={12} /> Remove from Group
                        </button>
                    )}
                  </>
              )}
              <div className="h-[1px] bg-[#333] my-1" />
              <button 
                onClick={() => { 
                    playSound('click'); 
                    const getFullPath = (id: string): string => {
                        const file = files.find(f => f.id === id);
                        if (!file) return '';
                        if (file.parentId === 'root') return file.name;
                        return getFullPath(file.parentId) + '/' + file.name;
                    };
                    handleCopyPath(getFullPath(tabContextMenu.fileId)); 
                    setTabContextMenu(null); 
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-xs flex items-center gap-2 text-gray-300"
              >
                  <Copy size={12} /> {t.copyPath}
              </button>
          </div>
      )}

      <div style={{ display: fullscreenPreview ? 'block' : 'none' }}>
          <FullscreenPreview 
            src={previewSrc} 
            isVisible={fullscreenPreview}
            onClose={() => setFullscreenPreview(false)} 
            onInspectElement={handleInspectElement}
            isModalOpen={!!inspectData}
          />
      </div>
      
      <AnimatePresence>
      {showFindModal && <FindModal key="FindModal" onClose={() => { setShowFindModal(false); handleSearch('', 'current', false); }} onSearch={handleSearch} results={globalSearchResults} onNavigate={(fid, line) => { handleFileClick(fid); setEditorScrollLine(line + 1); }} />}
      {showSymbolModal && <SymbolModal key="SymbolModal" files={files} currentSymbols={foundSymbols} onClose={() => setShowSymbolModal(false)} onSelect={handleSymbolSelect} />}
      {showSettingsModal && <SettingsModal key="SettingsModal" settings={settings} onChange={setSettings} onClose={() => setShowSettingsModal(false)} />}
      {showObfuscator && <ObfuscatorModal key="ObfuscatorModal" onClose={() => setShowObfuscator(false)} />}
      {showCDN && <CDNModal key="CDNModal" isOpen={showCDN} onClose={() => setShowCDN(false)} />}
      {showColorPicker && <ColorPickerModal key="ColorPickerModal" onClose={() => setShowColorPicker(false)} />}
      {showBase64 && <Base64Modal key="Base64Modal" onClose={() => setShowBase64(false)} />}
      {showOpenInPhone && <OpenInPhoneModal key="OpenInPhoneModal" onClose={() => setShowOpenInPhone(false)} />}
      <MoreCompilersModal isOpen={showMoreCompilers} onClose={() => setShowMoreCompilers(false)} />
      {showImagePreviewExample && <ImagePreviewExampleModal key="ImagePreviewExampleModal" onClose={() => setShowImagePreviewExample(false)} />}
      {showBookmarks && <BookmarksModal key="BookmarksModal" bookmarks={bookmarks} onClose={() => setShowBookmarks(false)} onNavigate={navigateToBookmark} onRemove={handleRemoveBookmark} files={files} />}
      {showShortcuts && <ShortcutsModal key="ShortcutsModal" onClose={() => setShowShortcuts(false)} />}
      {showResources && <ResourcesModal key="ResourcesModal" onClose={() => setShowResources(false)} />}
      {showGroupModal.visible && (
          <CreateModal key="CreateGroupModal" 
            type={showGroupModal.groupId ? 'rename' : 'folder'} 
            initialValue={showGroupModal.groupId ? tabGroups.find(g => g.id === showGroupModal.groupId)?.name : 'New Group'} 
            onSave={(name) => {
                if (showGroupModal.groupId) {
                    handleRenameGroup(showGroupModal.groupId, name);
                } else {
                    handleCreateTabGroup(name, showGroupModal.fileId);
                }
                setShowGroupModal({ visible: false });
            }} 
            onClose={() => setShowGroupModal({ visible: false })} 
          />
      )}
      {createModal.visible && <CreateModal key="CreateModal" type={createModal.type} initialValue={createModal.initialValue} onSave={handleCreateSubmit} onClose={() => setCreateModal({ ...createModal, visible: false })} />}
      {(deleteId || deleteIds) && <ConfirmModal title={t.deleteProjectTitle} message={`${t.deleteProjectMsg} ${deleteIds ? deleteIds.length : 1} items?`} onConfirm={confirmDelete} onCancel={() => { setDeleteId(null); setDeleteIds(null); }} />}
      {selectedSymbol && <SymbolDetailsModal key="SymbolDetailsModal" symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} onNavigate={() => { if (selectedSymbol.fileId) handleFileClick(selectedSymbol.fileId); setEditorScrollLine(selectedSymbol.line + 1); setSelectedSymbol(null); }} onSave={handleSaveSymbol} />}
      {showRunModal && <RunWarningModal key="RunWarningModal" onCancel={() => setShowRunModal(false)} onContinue={() => { workerRef.current?.postMessage({ files, activeFileId, previewFileId, clearData: false, cursorCSS: getCursorCSS() }); setShowRunModal(false); }} onOpenNewTab={handleOpenInNewTab} />}
      {showBoilerplateModal && (
          <BoilerplateModal key="BoilerplateModal" 
              onClose={() => setShowBoilerplateModal(false)}
              onTestBoilerplate={(content, offset) => {
                  handleTestBoilerplate(content, offset);
                  setShowBoilerplateModal(false);
               }}
              onInsertSnippet={(content) => {
                  handleInsertSnippet(content);
                  setShowBoilerplateModal(false);
              }}
          />
      )}
      {/* Tool Sidebar (Fixed Right) */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-[450px] bg-[#1e1e1e] border-l border-[#333] z-[150] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${activeTool ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex-1 relative overflow-hidden">
            {activeTool && (
                <ToolsModal key="ToolsModal" 
                    type={activeTool} 
                    onClose={() => setActiveTool(null)} 
                    files={files}
                    onTestBoilerplate={handleTestBoilerplate}
                    onSaveFile={(f) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const content = reader.result as string;
                            const newFile: FileSystemItem = {
                                id: generateId(),
                                name: f.name,
                                type: 'file',
                                content,
                                parentId: 'root',
                                isBinary: f.type.startsWith('image/'),
                                depth: 0
                            };
                            setFiles(prev => [...prev, newFile]);
                            playSound('success');
                        };
                        if(f.type.startsWith('image/')) reader.readAsDataURL(f);
                        else reader.readAsText(f);
                    }}
                />
            )}
        </div>
      </div>

      {inspectData && (
          <ElementDetailsModal key="ElementDetailsModal" 
              data={inspectData} 
              files={files} 
              onClose={() => setInspectData(null)} 
              onNavigate={(fid, line) => { handleFileClick(fid); setEditorScrollLine(line + 1); }} 
              onUpdateFile={handleDirectUpdate} 
          />
      )}

       {showClearStorageConfirm && (
           <ConfirmModal key="ConfirmModal" 
               title="Clear Live Storage & Cookies" 
               message="Are you sure you want to clear all localstorage, sessionstorage, and cookies of the live preview frame? This will clean up the preview database context." 
               onConfirm={() => {
                   workerRef.current?.postMessage({ files, activeFileId, previewFileId, clearData: true, cursorCSS: getCursorCSS() });
                   setShowClearStorageConfirm(false);
                   setLogs(prev => [...prev, { method: 'info', args: ['🧹 Live Preview localStorage & cookies have been cleared!'] }]);
                   playSound('success');
               }} 
               onCancel={() => setShowClearStorageConfirm(false)} 
           />
       )}

      {showTutorial && <TutorialModal key="TutorialModal" onClose={() => setShowTutorial(false)} />}

      {isMobile && (
          <button 
              id="mobile-run-button" 
              className="mobile-run-fab" 
              onClick={() => {
                  setLogs([
                      { method: 'info', args: [`🚀 Mobile preview loaded! Waiting for developer output...`] }
                  ]);
                  workerRef.current?.postMessage({ files, activeFileId, previewFileId, clearData: false, cursorCSS: getCursorCSS() });
                  setShowMobilePreview(true);
                  playSound('success');
              }} 
              title="Run Code"
          >
              <Play size={22} fill="currentColor" className="ml-0.5 text-white" />
          </button>
      )}

      {isMobile && showMobilePreview && (
          <div className="mobile-preview-fullmodal" id="mobile-preview-modal-pane">
              <div className="mobile-preview-header">
                  <div className="flex items-center gap-2">
                      <button 
                          onClick={() => { setShowMobilePreview(false); playSound('click'); }}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-md transition-colors"
                      >
                          <X size={16} />
                      </button>
                      <span className="font-bold text-[#cccccc] text-xs">Run Preview</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                      <button 
                          onClick={() => {
                              setLogs([
                                  { method: 'info', args: [`🔄 Manual compilation initiated...`] }
                              ]);
                              workerRef.current?.postMessage({ files, activeFileId, previewFileId, clearData: false, cursorCSS: getCursorCSS() });
                              playSound('pop');
                          }}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-lg flex items-center gap-1 text-[10px] font-bold"
                          title="Refresh Compilation"
                      >
                          <RefreshCw size={11} />
                          <span>REFRESH</span>
                      </button>
                      <button 
                          onClick={handleOpenInNewTab}
                          className="px-2.5 py-1.5 bg-[#007acc] hover:bg-[#005f9e] text-white rounded-lg flex items-center gap-1 text-[10px] font-bold"
                      >
                          <ExternalLink size={11} />
                          <span>NEW TAB</span>
                      </button>
                  </div>
              </div>

              <div className="mobile-preview-iframe-wrapper">
                  <iframe 
                      title="mobile-preview" 
                      src={previewSrc || undefined} 
                      className="w-full h-full border-none absolute inset-0 bg-white" 
                  />
              </div>

              <div className="mobile-preview-console-container">
                  <div className="mobile-preview-console-header">
                      <span className="flex items-center gap-1 text-[9px] font-bold"><Terminal size={10} className="text-yellow-400" /> Console logs drawer</span>
                      <button 
                          onClick={() => setLogs([])}
                          className="text-[9px] font-extrabold hover:text-white text-zinc-500 uppercase transition-colors"
                      >
                          Clear
                      </button>
                  </div>
                  <div className="mobile-preview-console-lines">
                      {logs.length === 0 ? (
                          <span className="text-zinc-600 italic text-[9px] block">Console is empty. Standard script output and console.log messages display instantly here.</span>
                      ) : (
                          logs.map((log, idx) => (
                              <div key={idx} className={`mobile-console-line mobile-console-line-${log.method}`}>
                                  <span className="text-zinc-500 mr-2">&#62;</span>
                                  <span>
                                      {log.args.map((arg: any) => {
                                          if (typeof arg === 'object') {
                                              try { return JSON.stringify(arg); } catch(e) { return '[Object]'; }
                                          }
                                          return String(arg);
                                      }).join(' ')}
                                  </span>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
      </AnimatePresence>
        </div>
    </div>
  );
};

export default App;
