import React, { useState, useEffect, useRef, useCallback, useMemo, KeyboardEvent } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { createRipple } from '../utils/ripple';
import { db } from '../utils/db';
import { Project, FileSystemItem } from '../types';
import { 
  Package, Trash2, Copy, Edit3, File, UploadCloud, Code2, Search, 
  Plus, Database, LayoutGrid, List, Clock, Star, FolderOpen, Menu, 
  X, Archive, RefreshCw, HardDrive, Calendar, Tag, AlertCircle, 
  CheckCircle, FolderTree, ChevronRight, ChevronDown, Download, 
  Zap, Shield, Terminal, Cpu, Layers, Box, Sparkles, Globe, GitBranch,
  Info, Heart, MapPin, Award, Coffee, User, Calendar as CalendarIcon
} from 'lucide-react';
import { playSound } from '../utils/sound';
import Button from './Button';
import ConfirmModal from './modals/ConfirmModal';
import CreateModal from './modals/CreateModal';
import NewProjectModal from './modals/NewProjectModal';
import StorageManagerModal from './modals/StorageManagerModal';
import JSZip from 'jszip';
import { generateId } from '../constants';
import { translations } from '../utils/translations';
import { getTemplateFiles } from '../utils/templates';

interface DashboardProps {
  onOpenProject: (id: string) => void;
  theme: 'midnight' | 'cyberpunk' | 'glass' | 'high-contrast';
}

interface StorageInfo {
  used: number;
  total: number;
  percentage: number;
  formattedUsed: string;
  formattedTotal: string;
}

interface ProjectStats {
  totalSize: number;
  fileCount: number;
  languageDistribution: Map<string, number>;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number;
}

interface SortOption {
  field: 'name' | 'lastModified' | 'fileCount' | 'size';
  direction: 'asc' | 'desc';
}

const ProjectDashboard: React.FC<DashboardProps> = ({ onOpenProject, theme }) => {
  // State declarations
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    used: 0,
    total: 50 * 1024 * 1024,
    percentage: 0,
    formattedUsed: '0 MB',
    formattedTotal: '50 MB'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'starred' | 'archived'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'lastModified', direction: 'desc' });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projectStats, setProjectStats] = useState<Map<string, ProjectStats>>(new Map());
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  
  // Modal States
  const [showCreate, setShowCreate] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, project: Project} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [renameData, setRenameData] = useState<Project | null>(null);
  const [showExportModal, setShowExportModal] = useState<Project | null>(null);
  
  const zipInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const lang = (localStorage.getItem('vs_language') || 'en') as keyof typeof translations;
  const t = translations[lang] || translations.en;
  const textDir = 'ltr';

  // Creator Info
  const creatorInfo = {
    name: 'Kamyar Karzan Osman',
    from: 'Erbil, Kurdistan',
    beganAt: '2023',
    role: 'Full Stack Developer',
    passion: 'Building Creative Web Solutions'
  };

  // Helper functions
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addNotification = (type: Notification['type'], message: string, duration = 3000) => {
    const id = generateId();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  const calculateTotalStorage = async (projectList: Project[]) => {
    let total = 0;
    for (const p of projectList) {
      total += await db.calculateProjectSize(p.id);
    }
    const usedMB = total / (1024 * 1024);
    setStorageInfo({
      used: total,
      total: 50 * 1024 * 1024,
      percentage: Math.min((total / (50 * 1024 * 1024)) * 100, 100),
      formattedUsed: `${usedMB.toFixed(2)} MB`,
      formattedTotal: '50 MB'
    });
    return total;
  };

  const loadProjectStats = async (project: Project) => {
    if (projectStats.has(project.id)) return;
    
    const files = await db.getProjectFiles(project.id);
    const langMap = new Map<string, number>();
    let totalSize = 0;
    let fileCount = 0;
    
    const processItems = (items: FileSystemItem[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          fileCount++;
          if (item.content) {
            totalSize += new Blob([item.content]).size;
          }
          const ext = item.name.split('.').pop()?.toLowerCase() || 'unknown';
          langMap.set(ext, (langMap.get(ext) || 0) + 1);
        }
        if (item.type === 'folder' && item.children) {
          processItems(item.children);
        }
      }
    };
    
    processItems(files);
    
    setProjectStats(prev => new Map(prev).set(project.id, {
      totalSize,
      fileCount,
      languageDistribution: langMap
    }));
  };

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const list = await db.getProjects();
      const enrichedList = await Promise.all(list.map(async (project) => {
        const files = await db.getProjectFiles(project.id);
        const fileCount = files.filter(f => f.type === 'file').length;
        return { ...project, fileCount };
      }));
      
      enrichedList.sort((a, b) => {
        const aVal = a[sortOption.field];
        const bVal = b[sortOption.field];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOption.direction === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        return sortOption.direction === 'asc' 
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
      
      setProjects(enrichedList);
      await calculateTotalStorage(enrichedList);
      
      for (const project of enrichedList.slice(0, 5)) {
        await loadProjectStats(project);
      }
    } catch (e) {
      console.error(e);
      addNotification('error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [sortOption]);

  useEffect(() => {
    loadProjects();
    
    const handleGlobalClick = (e: MouseEvent) => {
      setContextMenu(null);
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        createRipple(e as any);
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowCreate(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setBulkActionMode(false);
        setSelectedProjectIds(new Set());
      }
    };
    
    window.addEventListener('mousedown', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown as any);
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [loadProjects]);

  const handleCreate = async (name: string, template: string) => {
    if (projects.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      addNotification('error', 'A project with this name already exists');
      return;
    }
    
    const files = getTemplateFiles(template);
    const id = await db.createProject(name, files);
    addNotification('success', `Project "${name}" created successfully`);
    await loadProjects();
    onOpenProject(id);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await db.deleteProject(deleteConfirm.id);
        setDeleteConfirm(null);
        await loadProjects();
        addNotification('success', `Project "${deleteConfirm.name}" deleted`);
        playSound('success');
      } catch (error) {
        console.error('Failed to delete project:', error);
        addNotification('error', 'Failed to delete project');
        playSound('pop');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjectIds.size === 0) return;
    
    try {
      for (const id of selectedProjectIds) {
        await db.deleteProject(id);
      }
      addNotification('success', `${selectedProjectIds.size} projects deleted`);
      setSelectedProjectIds(new Set());
      setBulkActionMode(false);
      setBulkDeleteConfirm(false);
      await loadProjects();
      playSound('success');
    } catch (error) {
      addNotification('error', 'Failed to delete some projects');
    }
  };

  const handleRename = async (newName: string) => {
    if (renameData) {
      if (projects.some(p => p.id !== renameData.id && p.name.toLowerCase() === newName.toLowerCase())) {
        addNotification('error', 'A project with this name already exists');
        return;
      }
      await db.renameProject(renameData.id, newName);
      setRenameData(null);
      await loadProjects();
      addNotification('success', `Project renamed to "${newName}"`);
      playSound('success');
    }
  };

  const handleDuplicate = async (project: Project) => {
    await db.duplicateProject(project.id);
    await loadProjects();
    addNotification('success', `Duplicated "${project.name}"`);
    playSound('success');
  };

  const handleExportProject = async (project: Project) => {
    try {
      const files = await db.getProjectFiles(project.id);
      const zip = new JSZip();
      
      const addFilesToZip = (items: FileSystemItem[], currentPath: string = '') => {
        for (const item of items) {
          const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
          if (item.type === 'folder') {
            if (item.children) {
              addFilesToZip(item.children, fullPath);
            }
          } else {
            if (item.isBinary && item.content) {
              const base64Data = item.content.split(',')[1];
              if (base64Data) {
                zip.file(fullPath, base64Data, { base64: true });
              }
            } else if (item.content) {
              zip.file(fullPath, item.content);
            }
          }
        }
      };
      
      const rootItems = files.filter(f => f.parentId === 'root');
      addFilesToZip(rootItems);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addNotification('success', `Exported "${project.name}" as ZIP`);
      setShowExportModal(null);
    } catch (error) {
      addNotification('error', 'Failed to export project');
    }
  };

  const handleZipImport = async (file: File) => {
    setImportProgress(0);
    try {
      const zip = await JSZip.loadAsync(file);
      let projectName = file.name.replace('.zip', '');
      
      let counter = 1;
      let finalName = projectName;
      while (projects.some(p => p.name === finalName)) {
        finalName = `${projectName}_${counter}`;
        counter++;
      }
      projectName = finalName;
      
      const newFiles: FileSystemItem[] = [
        { id: 'root', name: 'root', type: 'folder', parentId: null, depth: 0, isOpen: true }
      ];

      const folderMap = new Map<string, string>();
      folderMap.set('', 'root');

      const entries = Object.entries(zip.files);
      const totalEntries = entries.length;
      let processedEntries = 0;

      const processEntry = async (relativePath: string, entry: JSZip.JSZipObject) => {
        const parts = relativePath.split('/').filter(p => p);
        if (parts.length === 0) return;
        
        const fileName = parts.pop();
        if (!fileName) return;

        let currentParentId = 'root';
        let currentPath = '';
        
        for (const part of parts) {
          const pathKey = currentPath + part;
          if (!folderMap.has(pathKey)) {
            const newFolderId = generateId();
            const parentFile = newFiles.find(f => f.id === currentParentId);
            const parentDepth = parentFile ? parentFile.depth : 0;
            
            newFiles.push({
              id: newFolderId,
              name: part,
              type: 'folder',
              parentId: currentParentId,
              depth: parentDepth + 1,
              isOpen: false
            });
            folderMap.set(pathKey, newFolderId);
          }
          currentParentId = folderMap.get(pathKey)!;
          currentPath += part + '/';
        }

        if (!entry.dir) {
          const ext = fileName.split('.').pop()?.toLowerCase();
          const isBinary = ['png','jpg','jpeg','gif','mp4','mp3','ttf','woff','pdf','svg','wav','webp','ico','bmp'].includes(ext || '');
          
          let finalContent = '';
          let mimeType = 'text/plain';

          if (isBinary) {
            const blob = await entry.async('blob');
            const reader = new FileReader();
            finalContent = await new Promise((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            mimeType = blob.type || 'application/octet-stream';
          } else {
            finalContent = await entry.async('string');
          }

          const parentFile = newFiles.find(f => f.id === currentParentId);
          const parentDepth = parentFile ? parentFile.depth : 0;
          
          newFiles.push({
            id: generateId(),
            name: fileName,
            type: 'file',
            parentId: currentParentId,
            depth: parentDepth + 1,
            content: finalContent,
            isBinary: isBinary,
            mimeType: mimeType
          });
        }
        
        processedEntries++;
        setImportProgress((processedEntries / totalEntries) * 100);
      };

      for (const [path, entry] of entries) {
        await processEntry(path, entry);
      }

      const projectId = await db.createProject(projectName, newFiles);
      setImportProgress(null);
      addNotification('success', `Imported "${projectName}" successfully`);
      await loadProjects();
      playSound('success');
      onOpenProject(projectId);

    } catch (err) {
      console.error("Zip import failed", err);
      addNotification('error', 'Failed to import zip. Invalid archive.');
      setImportProgress(null);
    }
  };

  const handleZipImportClick = () => {
    zipInputRef.current?.click();
  };

  const handleZipInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleZipImport(e.target.files[0]);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files) as File[];
    const zipFile = files.find(f => f.name.endsWith('.zip'));
    
    if (zipFile) {
      await handleZipImport(zipFile);
    } else {
      addNotification('warning', 'Please drop a ZIP file to import a project');
    }
  };

  const toggleProjectSelection = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    playSound('click');
    const x = Math.min(e.clientX, window.innerWidth - 250);
    const y = Math.min(e.clientY, window.innerHeight - 400);
    setContextMenu({ x, y, project });
  };

  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeTab === 'recent') {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return matchesSearch && p.lastModified > oneWeekAgo;
      }
      if (activeTab === 'starred') {
        return matchesSearch && p.isStarred;
      }
      return matchesSearch;
    });
    
    filtered.sort((a, b) => {
      let aVal: any = a[sortOption.field];
      let bVal: any = b[sortOption.field];
      
      if (sortOption.field === 'size' && projectStats.has(a.id) && projectStats.has(b.id)) {
        aVal = projectStats.get(a.id)?.totalSize || 0;
        bVal = projectStats.get(b.id)?.totalSize || 0;
      }
      if (sortOption.field === 'fileCount' && projectStats.has(a.id) && projectStats.has(b.id)) {
        aVal = projectStats.get(a.id)?.fileCount || 0;
        bVal = projectStats.get(b.id)?.fileCount || 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOption.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOption.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [projects, searchTerm, activeTab, sortOption, projectStats]);

  const toggleStarProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStarred = !project.isStarred;
    await db.updateProject(project.id, { isStarred: newStarred });
    await loadProjects();
    addNotification('info', newStarred ? `Added "${project.name}" to starred` : `Removed "${project.name}" from starred`);
  };

  const getLanguageColor = (ext: string): string => {
    const colors: Record<string, string> = {
      js: '#f7df1e', ts: '#3178c6', jsx: '#61dafb', tsx: '#3178c6',
      html: '#e34c26', css: '#264de4', scss: '#c6538c', json: '#5e5e5e',
      py: '#3776ab', java: '#b07219', go: '#00add8', rs: '#dea584',
      cpp: '#f34b7d', c: '#555555', php: '#4f5d95', rb: '#cc342d',
      md: '#083fa1', txt: '#888888', unknown: '#666666'
    };
    return colors[ext] || colors.unknown;
  };

  // Beautiful gradient themes
  const gradientThemes = {
    midnight: {
      bgGradient: 'bg-gradient-to-br from-[#0f0c29] via-[#1a1a3e] to-[#24243e]',
      surface: 'bg-[#1a1a2e]/80 backdrop-blur-md',
      surfaceSolid: 'bg-[#16213e]',
      border: 'border-white/10',
      accent: '#5a67d8',
      accentLight: '#818cf8',
      accentGradient: 'from-[#667eea] to-[#764ba2]',
      text: 'text-gray-200',
      textSecondary: 'text-gray-400',
      cardHover: 'hover:border-purple-500/50'
    },
    cyberpunk: {
      bgGradient: 'bg-gradient-to-br from-[#0d0b1a] via-[#1a0b2e] to-[#2a0a4a]',
      surface: 'bg-[#1a0b2e]/80 backdrop-blur-md',
      surfaceSolid: 'bg-[#0d0221]',
      border: 'border-[#ff00ff]/20',
      accent: '#ff00ff',
      accentLight: '#ff66ff',
      accentGradient: 'from-[#ff00ff] to-[#00ffff]',
      text: 'text-[#00ffff]',
      textSecondary: 'text-[#00cccc]/70',
      cardHover: 'hover:border-[#ff00ff]'
    },
    glass: {
      bgGradient: 'bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e1b4b]',
      surface: 'bg-white/10 backdrop-blur-xl',
      surfaceSolid: 'bg-white/5',
      border: 'border-white/20',
      accent: '#38bdf8',
      accentLight: '#7dd3fc',
      accentGradient: 'from-[#38bdf8] to-[#818cf8]',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      cardHover: 'hover:border-blue-400/50'
    },
    'high-contrast': {
      bgGradient: 'bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]',
      surface: 'bg-[#1f1f1f] border-2 border-white/40',
      surfaceSolid: 'bg-[#1f1f1f]',
      border: 'border-white/30',
      accent: '#ffff00',
      accentLight: '#ffff66',
      accentGradient: 'from-[#ffff00] to-[#ffff66]',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      cardHover: 'hover:border-yellow-400'
    }
  };

  const styles = gradientThemes[theme];

  return (
    <div 
      ref={mainContainerRef}
      className={`h-screen w-full ${styles.bgGradient} ${styles.text} flex font-['Inter',system-ui,sans-serif] overflow-hidden relative`}
      dir={textDir}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap');
        
        * {
          scrollbar-width: thin;
          scrollbar-color: ${theme === 'high-contrast' ? '#ffffff60' : '#ffffff30'} transparent;
        }
        
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme === 'high-contrast' ? '#ffffff60' : '#ffffff30'};
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'high-contrast' ? '#ffffff90' : '#ffffff50'};
        }
        
        .ripple {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple-animation 0.6s linear;
          background-color: rgba(255, 255, 255, 0.2);
          pointer-events: none;
        }
        
        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .project-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .project-card:hover {
          transform: translateY(-3px);
        }
        
        .glow-effect {
          box-shadow: 0 0 20px rgba(90, 103, 216, 0.15);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Hidden file inputs */}
      <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleZipInputChange} />

      {/* Drop overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md border-4 border-dashed flex flex-col items-center justify-center pointer-events-none"
            style={{ borderColor: styles.accent }}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              <Archive size={72} className="mb-5" style={{ color: styles.accent }} />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: styles.accent }}>Import ZIP Archive</h2>
            <p className={`text-base ${styles.textSecondary}`}>Drop your project archive to create a new workspace</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Progress Overlay */}
      <AnimatePresence>
        {importProgress !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-6 right-6 z-[70] w-80"
          >
            <div className={`${styles.surfaceSolid} rounded-2xl p-4 shadow-2xl border ${styles.border} backdrop-blur-sm`}>
              <div className="flex items-center gap-3 mb-3">
                <RefreshCw size={18} className="animate-spin" style={{ color: styles.accent }} />
                <span className="text-sm font-medium">Importing project...</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-white/10">
                <motion.div 
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${styles.accent}, ${styles.accentLight})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${importProgress}%` }}
                />
              </div>
              <p className={`text-xs ${styles.textSecondary} mt-2`}>{Math.round(importProgress)}% complete</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Center */}
      <div className="fixed top-5 right-5 z-[80] space-y-2 max-w-sm">
        <AnimatePresence mode="popLayout">
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`${styles.surfaceSolid} rounded-xl p-3 flex items-center gap-3 min-w-[260px] shadow-xl border ${styles.border}`}
            >
              {notification.type === 'success' && <CheckCircle size={18} className="text-emerald-500" />}
              {notification.type === 'error' && <AlertCircle size={18} className="text-rose-500" />}
              {notification.type === 'warning' && <AlertCircle size={18} className="text-amber-500" />}
              {notification.type === 'info' && <div className="w-[18px] h-[18px] rounded-full" style={{ backgroundColor: styles.accent }} />}
              <span className="text-sm flex-1">{notification.message}</span>
              <button 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside 
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className={`fixed inset-y-0 left-0 z-[60] w-72 ${styles.surface} border-r ${styles.border} flex flex-col shrink-0 md:relative shadow-2xl`}
          >
            <div className={`p-5 flex items-center justify-between border-b ${styles.border}`}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-r float-animation"
                  style={{ backgroundImage: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})` }}
                >
                  <Code2 size={20} className="text-white" />
                </div>
                <div>
                  <span className="font-bold text-lg tracking-tight">HTML777</span>
                  <p className={`text-[10px] ${styles.textSecondary}`}>Code Workspace</p>
                </div>
              </div>
              <button className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setIsSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 py-6 overflow-y-auto px-3">
              <div className="mb-6 px-2">
                <button 
                  className="w-full py-2.5 rounded-xl font-semibold shadow-lg transition-all hover:shadow-xl flex items-center justify-center gap-2 bg-gradient-to-r"
                  style={{ backgroundImage: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})` }}
                  onClick={() => { setShowCreate(true); setIsSidebarOpen(false); }}
                >
                  <Plus size={18} className="text-white" />
                  <span className="text-white">New Project</span>
                </button>
              </div>

              <nav className="space-y-1">
                <button 
                  onClick={() => { setActiveTab('all'); setIsSidebarOpen(false); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm rounded-xl transition-all duration-200 ${
                    activeTab === 'all' 
                      ? `bg-gradient-to-r from-${styles.accent}/20 to-transparent border-l-2` 
                      : styles.textSecondary
                  }`}
                  style={activeTab === 'all' ? { borderLeftColor: styles.accent, background: `linear-gradient(90deg, ${styles.accent}15, transparent)` } : {}}
                >
                  <FolderOpen size={18} /> All Projects
                </button>
                <button 
                  onClick={() => { setActiveTab('recent'); setIsSidebarOpen(false); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm rounded-xl transition-all duration-200 ${
                    activeTab === 'recent' 
                      ? `bg-gradient-to-r from-${styles.accent}/20 to-transparent border-l-2` 
                      : styles.textSecondary
                  }`}
                  style={activeTab === 'recent' ? { borderLeftColor: styles.accent, background: `linear-gradient(90deg, ${styles.accent}15, transparent)` } : {}}
                >
                  <Clock size={18} /> Recent Updates
                </button>
                <button 
                  onClick={() => { setActiveTab('starred'); setIsSidebarOpen(false); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm rounded-xl transition-all duration-200 ${
                    activeTab === 'starred' 
                      ? `bg-gradient-to-r from-${styles.accent}/20 to-transparent border-l-2` 
                      : styles.textSecondary
                  }`}
                  style={activeTab === 'starred' ? { borderLeftColor: styles.accent, background: `linear-gradient(90deg, ${styles.accent}15, transparent)` } : {}}
                >
                  <Star size={18} /> Starred Projects
                </button>
              </nav>

              <div className="mt-8 px-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Storage</span>
                  <span className={`text-[10px] font-mono ${styles.textSecondary}`}>{storageInfo.formattedUsed} / {storageInfo.formattedTotal}</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden bg-white/10`}>
                  <motion.div 
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${styles.accent}, ${styles.accentLight})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <button 
                  onClick={() => { setShowStorage(true); setIsSidebarOpen(false); }}
                  className={`mt-4 w-full py-2 text-xs rounded-lg border ${styles.border} ${styles.textSecondary} hover:bg-white/5 transition-all duration-200 flex items-center justify-center gap-2`}
                >
                  <HardDrive size={14} /> Manage Storage
                </button>
              </div>

              <div className="mt-6 px-2">
                <div className={`p-3 rounded-xl border ${styles.border} bg-white/5`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={12} style={{ color: styles.accent }} />
                    <span className="text-[11px] font-semibold">Quick Actions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] opacity-70">
                    <span>⌘ + N : New</span>
                    <span>⌘ + F : Search</span>
                    <span>Drag ZIP : Import</span>
                    <span>Right-click : Menu</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-4 border-t ${styles.border} space-y-3`}>
              <button
                onClick={() => setShowAboutModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs rounded-lg hover:bg-white/10 transition-all duration-200"
              >
                <Info size={14} />
                <span>About HTML777</span>
              </button>
              <div className="flex items-center justify-between text-[10px] opacity-50">
                <span>v3.0.0</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Ready</span>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className={`h-16 border-b ${styles.border} flex items-center justify-between px-4 sm:px-6 ${styles.surface} sticky top-0 z-20`}>
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block w-80">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search projects..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full bg-white/5 border ${styles.border} rounded-xl py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-opacity-100 focus:ring-1`}
                  style={{ focusBorderColor: styles.accent }}
                />
              </div>
            </div>
            {bulkActionMode && (
              <div className="flex items-center gap-2 ml-2 animate-in fade-in">
                <span className="text-sm font-medium">{selectedProjectIds.size} selected</span>
                <button 
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => { setBulkActionMode(false); setSelectedProjectIds(new Set()); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex bg-white/5 p-1 rounded-xl border ${styles.border}`}>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? `bg-gradient-to-r` : styles.textSecondary}`}
                style={viewMode === 'grid' ? { backgroundImage: `linear-gradient(135deg, ${styles.accent}30, transparent)` } : {}}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? `bg-gradient-to-r` : styles.textSecondary}`}
                style={viewMode === 'list' ? { backgroundImage: `linear-gradient(135deg, ${styles.accent}30, transparent)` } : {}}
              >
                <List size={16} />
              </button>
              <button 
                onClick={() => setViewMode('compact')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? `bg-gradient-to-r` : styles.textSecondary}`}
                style={viewMode === 'compact' ? { backgroundImage: `linear-gradient(135deg, ${styles.accent}30, transparent)` } : {}}
              >
                <Layers size={16} />
              </button>
            </div>
            
            <button 
              onClick={() => setBulkActionMode(!bulkActionMode)}
              className={`p-2 rounded-xl border ${styles.border} transition-all ${bulkActionMode ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <CheckCircle size={16} />
            </button>
            
            <button 
              onClick={handleZipImportClick}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border ${styles.border} hover:bg-white/5 transition-all text-sm`}
            >
              <UploadCloud size={16} /> Import ZIP
            </button>
            
            <button 
              onClick={loadProjects}
              className={`p-2 rounded-xl border ${styles.border} hover:bg-white/5 transition-colors`}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Main content scroll area */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <div className="max-w-7xl mx-auto">
            {/* Welcome section with HTML777 branding */}
            <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-r flex items-center justify-center" style={{ backgroundImage: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})` }}>
                    <Code2 size={12} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r bg-clip-text text-transparent"
                    style={{ backgroundImage: `linear-gradient(135deg, ${styles.text}, ${styles.accent})` }}>
                    HTML777 Workspace
                  </h1>
                </div>
                <p className={`text-sm ${styles.textSecondary} mt-1`}>
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} • Last updated {new Date().toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${styles.textSecondary}`}>Sort by:</span>
                  <select 
                    value={`${sortOption.field}-${sortOption.direction}`}
                    onChange={(e) => {
                      const [field, direction] = e.target.value.split('-');
                      setSortOption({ field: field as any, direction: direction as any });
                    }}
                    className={`text-sm bg-white/5 border ${styles.border} rounded-lg px-3 py-1.5 outline-none cursor-pointer`}
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="lastModified-desc">Newest First</option>
                    <option value="lastModified-asc">Oldest First</option>
                    <option value="fileCount-desc">Most Files</option>
                    <option value="size-desc">Largest Size</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading state */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-5">
                <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${styles.accent} transparent transparent transparent` }} />
                <p className={`text-sm ${styles.textSecondary} animate-pulse`}>Loading workspace projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col items-center justify-center py-40 border-2 border-dashed ${styles.border} rounded-3xl bg-white/5`}
              >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-white/5 border ${styles.border}`}>
                  <FolderTree size={40} className="opacity-50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No projects found</h3>
                <p className={`text-sm ${styles.textSecondary} max-w-md text-center mb-8`}>
                  {searchTerm ? `No projects matching "${searchTerm}"` : "Get started by creating a new project or importing a ZIP file"}
                </p>
                {!searchTerm && (
                  <div className="flex gap-4 flex-wrap justify-center">
                    <button 
                      onClick={() => setShowCreate(true)}
                      className="px-6 py-2.5 rounded-xl font-semibold shadow-lg transition-all hover:shadow-xl text-white bg-gradient-to-r"
                      style={{ backgroundImage: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})` }}
                    >
                      Create New Project
                    </button>
                    <button 
                      onClick={handleZipImportClick}
                      className={`px-6 py-2.5 rounded-xl font-semibold border ${styles.border} transition-all hover:bg-white/5`}
                    >
                      Import ZIP Archive
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <LayoutGroup>
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    <AnimatePresence mode="popLayout">
                      {filteredProjects.map((project, index) => (
                        <motion.div
                          layout
                          key={project.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          onClick={() => !bulkActionMode && onOpenProject(project.id)}
                          onContextMenu={(e) => handleContextMenu(e, project)}
                          onMouseEnter={() => setHoveredProjectId(project.id)}
                          onMouseLeave={() => setHoveredProjectId(null)}
                          className={`project-card relative bg-white/5 border ${styles.border} rounded-2xl p-5 cursor-pointer transition-all duration-300 ${styles.cardHover}`}
                          style={hoveredProjectId === project.id && !bulkActionMode ? { borderColor: styles.accent, boxShadow: `0 10px 30px -10px ${styles.accent}40` } : {}}
                        >
                          {bulkActionMode && (
                            <div className="absolute top-3 left-3 z-10">
                              <div 
                                onClick={(e) => toggleProjectSelection(project.id, e)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedProjectIds.has(project.id) ? 'bg-opacity-100' : 'bg-transparent'}`}
                                style={{ borderColor: selectedProjectIds.has(project.id) ? styles.accent : '#666' }}
                              >
                                {selectedProjectIds.has(project.id) && <CheckCircle size={12} className="text-white" />}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between mb-4">
                            <div 
                              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 bg-gradient-to-br"
                              style={{ backgroundImage: `linear-gradient(135deg, ${styles.accent}30, ${styles.accent}10)` }}
                            >
                              <Package size={28} style={{ color: styles.accent }} />
                            </div>
                            <button 
                              onClick={(e) => toggleStarProject(project, e)}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <Star size={16} className={project.isStarred ? 'fill-current' : ''} style={{ color: project.isStarred ? '#fbbf24' : undefined }} />
                            </button>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base truncate mb-1">{project.name}</h3>
                            <div className={`flex items-center gap-2 text-xs ${styles.textSecondary}`}>
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {new Date(project.lastModified).toLocaleDateString()}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                              <span className="flex items-center gap-1">
                                <File size={12} /> {projectStats.get(project.id)?.fileCount || 0} files
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 pt-4 border-t border-white/10">
                            <div className="flex -space-x-1">
                              {Array.from(projectStats.get(project.id)?.languageDistribution?.entries() || [])
                                .slice(0, 4)
                                .map(([ext]) => (
                                  <div 
                                    key={ext}
                                    className="w-6 h-6 rounded-full border-2 border-white/10 flex items-center justify-center text-[9px] font-bold"
                                    style={{ backgroundColor: getLanguageColor(ext) }}
                                  >
                                    {ext.slice(0, 2)}
                                  </div>
                                ))}
                              {(projectStats.get(project.id)?.languageDistribution?.size || 0) > 4 && (
                                <div className={`w-6 h-6 rounded-full border-2 border-white/10 flex items-center justify-center text-[9px] font-bold bg-white/10`}>
                                  +{projectStats.get(project.id)!.languageDistribution.size - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {viewMode === 'list' && (
                  <div className={`rounded-2xl overflow-hidden border ${styles.border} bg-white/5`}>
                    <div className={`grid grid-cols-12 gap-4 px-5 py-3 border-b ${styles.border} text-xs font-medium uppercase tracking-wider ${styles.textSecondary}`}>
                      <div className="col-span-5 flex items-center gap-2">Project Name</div>
                      <div className="col-span-2">Language</div>
                      <div className="col-span-2">Files</div>
                      <div className="col-span-2">Last Modified</div>
                      <div className="col-span-1 text-right">Actions</div>
                    </div>
                    <AnimatePresence mode="popLayout">
                      {filteredProjects.map((project) => (
                        <motion.div
                          layout
                          key={project.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => !bulkActionMode && onOpenProject(project.id)}
                          onContextMenu={(e) => handleContextMenu(e, project)}
                          className={`grid grid-cols-12 gap-4 px-5 py-3 items-center cursor-pointer transition-all duration-200 hover:bg-white/5`}
                        >
                          <div className="col-span-5 flex items-center gap-3">
                            {bulkActionMode && (
                              <div 
                                onClick={(e) => toggleProjectSelection(project.id, e)}
                                className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${selectedProjectIds.has(project.id) ? 'bg-opacity-100' : 'bg-transparent'}`}
                                style={{ borderColor: selectedProjectIds.has(project.id) ? styles.accent : '#666' }}
                              >
                                {selectedProjectIds.has(project.id) && <CheckCircle size={10} className="text-white" />}
                              </div>
                            )}
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${styles.accent}20` }}>
                              <Package size={16} style={{ color: styles.accent }} />
                            </div>
                            <div>
                              <span className="font-medium">{project.name}</span>
                              {project.isStarred && <Star size={10} className="inline ml-2" style={{ color: '#fbbf24' }} />}
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center gap-1.5">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getLanguageColor([...projectStats.get(project.id)?.languageDistribution?.keys() || []][0] || 'unknown') }}
                            />
                            <span className="text-xs">{[...projectStats.get(project.id)?.languageDistribution?.keys() || []][0] || 'unknown'}</span>
                          </div>
                          <div className="col-span-2 text-xs">{projectStats.get(project.id)?.fileCount || 0}</div>
                          <div className="col-span-2 text-xs">{new Date(project.lastModified).toLocaleDateString()}</div>
                          <div className="col-span-1 flex justify-end gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleStarProject(project, e); }}
                              className="p-1.5 rounded hover:bg-white/10 transition-colors"
                            >
                              <Star size={14} className={project.isStarred ? 'fill-current' : ''} style={{ color: project.isStarred ? '#fbbf24' : undefined }} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setRenameData(project); }}
                              className="p-1.5 rounded hover:bg-white/10 transition-colors"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project); }}
                              className="p-1.5 rounded hover:bg-rose-500/20 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {viewMode === 'compact' && (
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {filteredProjects.map((project) => (
                        <motion.div
                          layout
                          key={project.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          onClick={() => !bulkActionMode && onOpenProject(project.id)}
                          onContextMenu={(e) => handleContextMenu(e, project)}
                          className={`flex items-center justify-between p-3 rounded-xl border ${styles.border} cursor-pointer transition-all duration-200 hover:bg-white/5`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {bulkActionMode && (
                              <div 
                                onClick={(e) => toggleProjectSelection(project.id, e)}
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${selectedProjectIds.has(project.id) ? 'bg-opacity-100' : 'bg-transparent'}`}
                                style={{ borderColor: selectedProjectIds.has(project.id) ? styles.accent : '#666' }}
                              >
                                {selectedProjectIds.has(project.id) && <CheckCircle size={10} className="text-white" />}
                              </div>
                            )}
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${styles.accent}20` }}>
                              <File size={14} style={{ color: styles.accent }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate">{project.name}</span>
                                {project.isStarred && <Star size={10} style={{ color: '#fbbf24' }} />}
                              </div>
                              <div className={`text-[10px] ${styles.textSecondary}`}>
                                {new Date(project.lastModified).toLocaleDateString()} • {projectStats.get(project.id)?.fileCount || 0} files
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(project); }}
                              className="p-1.5 rounded hover:bg-white/10 transition-colors"
                              title="Duplicate"
                            >
                              <Copy size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowExportModal(project); }}
                              className="p-1.5 rounded hover:bg-white/10 transition-colors"
                              title="Export"
                            >
                              <Download size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project); }}
                              className="p-1.5 rounded hover:bg-rose-500/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </LayoutGroup>
            )}
          </div>
        </main>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed ${styles.surfaceSolid} border ${styles.border} shadow-2xl rounded-2xl w-56 py-2 z-50 overflow-hidden`}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => { onOpenProject(contextMenu.project.id); setContextMenu(null); }} 
              className="w-full px-4 py-2.5 hover:bg-white/10 text-sm flex items-center gap-2.5 transition-colors"
            >
              <Package size={14} /> Open Project
            </button>
            <button 
              onClick={() => { handleDuplicate(contextMenu.project); setContextMenu(null); }} 
              className="w-full px-4 py-2.5 hover:bg-white/10 text-sm flex items-center gap-2.5 transition-colors"
            >
              <Copy size={14} /> Duplicate
            </button>
            <button 
              onClick={() => { setRenameData(contextMenu.project); setContextMenu(null); }} 
              className="w-full px-4 py-2.5 hover:bg-white/10 text-sm flex items-center gap-2.5 transition-colors"
            >
              <Edit3 size={14} /> Rename
            </button>
            <button 
              onClick={() => { toggleStarProject(contextMenu.project, {} as any); setContextMenu(null); }} 
              className="w-full px-4 py-2.5 hover:bg-white/10 text-sm flex items-center gap-2.5 transition-colors"
            >
              <Star size={14} /> {contextMenu.project.isStarred ? 'Remove from Starred' : 'Add to Starred'}
            </button>
            <button 
              onClick={() => { setShowExportModal(contextMenu.project); setContextMenu(null); }} 
              className="w-full px-4 py-2.5 hover:bg-white/10 text-sm flex items-center gap-2.5 transition-colors"
            >
              <Download size={14} /> Export as ZIP
            </button>
            <div className="h-px bg-white/10 my-1 mx-2" />
            <button 
              onClick={() => { setDeleteConfirm(contextMenu.project); setContextMenu(null); }} 
              className="w-full px-4 py-2.5 hover:bg-rose-500/20 text-rose-400 text-sm flex items-center gap-2.5 transition-colors"
            >
              <Trash2 size={14} /> Delete Permanently
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAboutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowAboutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`max-w-md w-full ${styles.surfaceSolid} rounded-2xl border ${styles.border} shadow-2xl overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-6 text-center border-b ${styles.border}`}>
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r flex items-center justify-center shadow-lg float-animation"
                  style={{ backgroundImage: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})` }}>
                  <Code2 size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">HTML777</h2>
                <p className={`text-sm ${styles.textSecondary} mt-1`}>Code Workspace Platform</p>
                <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: `${styles.accent}20`, color: styles.accent }}>
                  <Sparkles size={12} /> Version 3.0.0
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: `${styles.accent}10` }}>
                    <User size={18} style={{ color: styles.accent }} />
                    <div>
                      <p className="text-xs opacity-60">Created by</p>
                      <p className="font-semibold">{creatorInfo.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: `${styles.accent}10` }}>
                    <MapPin size={18} style={{ color: styles.accent }} />
                    <div>
                      <p className="text-xs opacity-60">From</p>
                      <p className="font-semibold">{creatorInfo.from}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: `${styles.accent}10` }}>
                    <CalendarIcon size={18} style={{ color: styles.accent }} />
                    <div>
                      <p className="text-xs opacity-60">Journey Began</p>
                      <p className="font-semibold">{creatorInfo.beganAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: `${styles.accent}10` }}>
                    <Award size={18} style={{ color: styles.accent }} />
                    <div>
                      <p className="text-xs opacity-60">Role</p>
                      <p className="font-semibold">{creatorInfo.role}</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t ${styles.border} text-center">
                  <p className="text-xs opacity-60 flex items-center justify-center gap-1">
                    <Heart size={12} style={{ color: styles.accent }} /> Built with passion for developers worldwide
                  </p>
                  <p className="text-[10px] opacity-40 mt-2">© 2023 - {new Date().getFullYear()} HTML777. All rights reserved.</p>
                </div>
              </div>
              
              <div className={`p-4 border-t ${styles.border} flex justify-end`}>
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="px-5 py-2 rounded-xl font-medium transition-all bg-gradient-to-r text-white"
                  style={{ backgroundImage: `linear-gradient(135deg, ${styles.accent}, ${styles.accentLight})` }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showCreate && (
        <NewProjectModal 
          onSave={handleCreate} 
          onClose={() => setShowCreate(false)} 
          theme={theme}
        />
      )}
      {showStorage && (
        <StorageManagerModal 
          onClose={() => setShowStorage(false)} 
          onProjectDeleted={loadProjects} 
          theme={theme}
        />
      )}
      {renameData && (
        <CreateModal 
          type="rename" 
          initialValue={renameData.name} 
          onSave={handleRename} 
          onClose={() => setRenameData(null)} 
          theme={theme}
        />
      )}
      {showExportModal && (
        <ConfirmModal 
          title="Export Project" 
          message={`Are you sure you want to export "${showExportModal.name}" as a ZIP archive?`}
          confirmText="Export"
          onConfirm={() => handleExportProject(showExportModal)}
          onCancel={() => setShowExportModal(null)}
          theme={theme}
        />
      )}
      {deleteConfirm && (
        <ConfirmModal 
          title="Delete Project" 
          message={`This will permanently delete "${deleteConfirm.name}" and all its files. This action cannot be undone.`}
          confirmText="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          theme={theme}
        />
      )}
      {bulkDeleteConfirm && (
        <ConfirmModal 
          title={`Delete ${selectedProjectIds.size} Projects`}
          message={`This will permanently delete ${selectedProjectIds.size} project${selectedProjectIds.size !== 1 ? 's' : ''} and all associated files. This action cannot be undone.`}
          confirmText="Delete All"
          confirmVariant="danger"
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteConfirm(false)}
          theme={theme}
        />
      )}
    </div>
  );
};

export default ProjectDashboard;