
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createRipple } from '../utils/ripple';
import { db } from '../utils/db';
import { Project, FileSystemItem } from '../types';
import { Package, Trash2, Copy, Edit3, File, UploadCloud, Code2, Search, Plus, Database, LayoutGrid, List, Clock, Star, FolderOpen, Menu, X } from 'lucide-react';
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

const ProjectDashboard: React.FC<DashboardProps> = ({ onOpenProject, theme }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [storageUsed, setStorageUsed] = useState<string>('...');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'starred'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modal States
  const [showCreate, setShowCreate] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, project: Project} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);
  const [renameData, setRenameData] = useState<Project | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const lang = (localStorage.getItem('vs_language') || 'en') as keyof typeof translations;
  const t = translations[lang] || translations.en;
  const textDir = 'ltr';

  useEffect(() => {
    loadProjects();
    const handleGlobalClick = (e: MouseEvent) => {
        setContextMenu(null);
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.closest('button')) {
            createRipple(e as any);
        }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const loadProjects = async () => {
      try {
          const list = await db.getProjects();
          // Sort by last modified by default
          list.sort((a, b) => b.lastModified - a.lastModified);
          setProjects(list);
          calculateTotalStorage(list);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const calculateTotalStorage = async (list: Project[]) => {
      let total = 0;
      for (const p of list) {
          total += await db.calculateProjectSize(p.id);
      }
      const mb = (total / (1024 * 1024)).toFixed(2);
      setStorageUsed(`${mb} MB`);
  };

  const handleCreate = async (name: string, template: string) => {
      if (projects.some(p => p.name.toLowerCase() === name.toLowerCase())) {
          alert("A project with this name already exists.");
          return;
      }
      
      const files = getTemplateFiles(template);
      const id = await db.createProject(name, files);
      onOpenProject(id);
  };

  const handleContextMenu = (e: React.MouseEvent, project: Project) => {
      e.preventDefault();
      e.stopPropagation();
      playSound('click');
      setContextMenu({ x: e.clientX, y: e.clientY, project });
  };

    const handleDelete = async () => {
        if (deleteConfirm) {
            try {
                await db.deleteProject(deleteConfirm.id);
                setDeleteConfirm(null);
                await loadProjects();
                playSound('success');
            } catch (error) {
                console.error('Failed to delete project:', error);
                playSound('pop');
            }
        }
    };

  const handleRename = async (newName: string) => {
      if (renameData) {
          if (projects.some(p => p.id !== renameData.id && p.name.toLowerCase() === newName.toLowerCase())) {
              alert("A project with this name already exists.");
              return;
          }
          await db.renameProject(renameData.id, newName);
          setRenameData(null);
          loadProjects();
          playSound('success');
      }
  };

  const handleDuplicate = async (project: Project) => {
      await db.duplicateProject(project.id);
      loadProjects();
      playSound('success');
  };

  const handleZipImportClick = () => {
      zipInputRef.current?.click();
  };

  const handleZipImport = async (file: File) => {
      setLoading(true);
      try {
        const zip = await JSZip.loadAsync(file);
        let projectName = file.name.replace('.zip', '');
        
        if (projects.some(p => p.name === projectName)) {
            projectName = projectName + '_' + generateId().substring(0,4);
        }
        
        const newFiles: FileSystemItem[] = [
            { id: 'root', name: 'root', type: 'folder', parentId: null, depth: 0, isOpen: true }
        ];

        const folderMap = new Map<string, string>();
        folderMap.set('', 'root');

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
                const isBinary = ['png','jpg','jpeg','gif','mp4','mp3','ttf','woff','pdf','svg','wav','webp'].includes(ext || '');
                
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
        };

        const promises = [];
        for (const path in zip.files) {
            promises.push(processEntry(path, zip.files[path]));
        }
        await Promise.all(promises);

        const projectId = await db.createProject(projectName, newFiles);
        
        playSound('success');
        onOpenProject(projectId);

      } catch (err) {
          console.error("Zip import failed", err);
          alert("Failed to import zip. Ensure it is a valid archive.");
      } finally {
          setLoading(false);
      }
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
          alert("Please drop a .zip file to import a project.");
      }
  };

  const filtered = projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeTab === 'recent') {
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          return matchesSearch && p.lastModified > oneWeekAgo;
      }
      return matchesSearch;
  });

  const themeColors = {
      'midnight': 'bg-[#0d0d0d] text-[#e0e0e0]',
      'cyberpunk': 'bg-[#0d0221] text-[#00ffff]',
      'glass': 'bg-[#1e293b] text-white',
      'high-contrast': 'bg-black text-white'
  };

  return (
    <div 
        className={`h-screen w-screen ${themeColors[theme]} flex font-sans overflow-hidden relative`} 
        dir={textDir}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
            '--bg-primary': theme === 'midnight' ? '#0f0f0f' : theme === 'cyberpunk' ? '#0d0221' : theme === 'glass' ? '#1e293b' : '#000000',
            '--bg-secondary': theme === 'midnight' ? '#141414' : theme === 'cyberpunk' ? '#1a0b2e' : theme === 'glass' ? 'rgba(30, 41, 59, 0.5)' : '#111111',
            '--border-color': theme === 'high-contrast' ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
            '--accent': theme === 'cyberpunk' ? '#ff00ff' : '#007acc',
            '--text-primary': '#ffffff',
            '--text-secondary': 'rgba(255, 255, 255, 0.6)',
        } as any}
    >
        <style>{`
            .sidebar-item.active {
                background: rgba(255, 255, 255, 0.05);
                color: var(--accent);
                border-right: 2px solid var(--accent);
            }
            .project-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
                border-color: var(--accent);
            }
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        `}</style>
        
        <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleZipInputChange} />
        
        <AnimatePresence>
            {isDragging && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-[#007acc]/20 backdrop-blur-sm border-4 border-dashed border-[#007acc] flex flex-col items-center justify-center pointer-events-none"
                >
                    <UploadCloud size={64} className="text-[#007acc] mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold text-white">Drop ZIP to Import Project</h2>
                    <p className="text-gray-400">Release to start importing</p>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
            {(isSidebarOpen || window.innerWidth >= 768) && (
                <motion.div 
                    initial={{ x: -256 }}
                    animate={{ x: 0 }}
                    exit={{ x: -256 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`fixed inset-y-0 left-0 z-[60] w-64 border-r border-[#333] bg-[#111] flex flex-col shrink-0 md:static ${isSidebarOpen ? 'block' : 'hidden md:flex'}`}
                >
                    <div className="p-6 flex items-center justify-between border-b border-[#333]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#007acc] rounded-lg flex items-center justify-center shadow-lg shadow-[#007acc]/20">
                                <Code2 size={18} className="text-white" />
                            </div>
                            <span className="font-bold text-lg tracking-tight text-white">Visual Studio</span>
                        </div>
                        <button className="md:hidden text-gray-400 p-1" onClick={() => setIsSidebarOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
                        <div className="px-4 mb-8">
                            <Button 
                                variant="primary" 
                                size="md" 
                                className="w-full" 
                                onClick={() => { setShowCreate(true); setIsSidebarOpen(false); }}
                                icon={Plus}
                            >
                                New Project
                            </Button>
                        </div>

                        <nav className="space-y-1">
                            <button 
                                onClick={() => { setActiveTab('all'); setIsSidebarOpen(false); }}
                                className={`w-full px-6 py-3 flex items-center gap-3 text-sm transition-colors sidebar-item ${activeTab === 'all' ? 'active' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                            >
                                <FolderOpen size={18} /> All Projects
                            </button>
                            <button 
                                onClick={() => { setActiveTab('recent'); setIsSidebarOpen(false); }}
                                className={`w-full px-6 py-3 flex items-center gap-3 text-sm transition-colors sidebar-item ${activeTab === 'recent' ? 'active' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                            >
                                <Clock size={18} /> Recent
                            </button>
                        </nav>

                        <div className="mt-10 px-6">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Storage</span>
                            <div className="mt-4 bg-[#1e1e1e] rounded-lg p-3 border border-[#333]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400 flex items-center gap-1"><Database size={10} /> Local DB</span>
                                    <span className="text-xs font-mono text-white">{storageUsed}</span>
                                </div>
                                <div className="w-full bg-[#333] h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#007acc] h-full" style={{ width: '45%' }}></div>
                                </div>
                                <button 
                                    onClick={() => { setShowStorage(true); setIsSidebarOpen(false); }}
                                    className="mt-3 w-full py-1.5 text-[10px] text-gray-400 hover:text-white hover:bg-[#333] rounded border border-[#333] transition-colors"
                                >
                                    Manage Storage
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-[#333] space-y-2">
                        <div className="flex items-center justify-between px-4 py-2 text-[10px] text-gray-600">
                            <span>v2.4.0</span>
                            <span className="flex items-center gap-1"><Star size={10} /> Pro</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
            />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
            {/* Header */}
            <header className="h-16 border-b border-[#333] flex items-center justify-between px-4 sm:px-8 bg-[#111]/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button 
                        className="md:hidden text-white p-2 hover:bg-[#333] rounded-lg"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex-1 max-w-xl hidden sm:block">
                        <div className="relative flex items-center group">
                            <Search size={16} className="absolute left-3 text-gray-500 group-focus-within:text-[#007acc] transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search projects..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#1e1e1e] border border-[#333] rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc]/50 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex bg-[#1e1e1e] p-1 rounded-lg border border-[#333]">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleZipImportClick}
                        icon={UploadCloud}
                        className="hidden xs:flex"
                    >
                        <span className="hidden sm:inline">Import ZIP</span>
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {activeTab === 'all' ? 'All Projects' : activeTab === 'recent' ? 'Recently Modified' : 'Starred Projects'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">{filtered.length} projects found</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <div className="w-10 h-10 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs text-gray-500 animate-pulse">Initializing workspace...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-32 border border-[#333] rounded-3xl bg-[#111]/50 border-dashed"
                        >
                            <div className="w-16 h-16 bg-[#1e1e1e] rounded-2xl flex items-center justify-center mb-6 border border-[#333]">
                                <FolderOpen size={32} className="text-gray-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">No projects found</h3>
                            <p className="text-sm text-gray-500 max-w-xs text-center mb-8">
                                {searchTerm ? `No projects matching "${searchTerm}"` : "Start by creating a new project or importing a ZIP file."}
                            </p>
                            {!searchTerm && (
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setShowCreate(true)}
                                        className="px-6 py-2 bg-[#007acc] hover:bg-[#0063a5] text-white rounded-lg font-semibold transition-all"
                                    >
                                        Create New
                                    </button>
                                    <button 
                                        onClick={handleZipImportClick}
                                        className="px-6 py-2 border border-[#333] hover:bg-[#1e1e1e] text-white rounded-lg font-semibold transition-all"
                                    >
                                        Import ZIP
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filtered.map((project, index) => (
                                    <motion.div 
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        key={project.id}
                                        onClick={(e) => { createRipple(e); playSound('click'); onOpenProject(project.id); }}
                                        onContextMenu={(e) => handleContextMenu(e, project)}
                                        className="project-card group bg-[#111] border border-[#333] rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-[#1e1e1e] border border-[#333] flex items-center justify-center group-hover:bg-[#007acc] group-hover:border-[#007acc] transition-all duration-300">
                                                <Package size={24} className="text-[#007acc] group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setRenameData(project); }}
                                                    className="p-1.5 hover:bg-[#333] rounded-lg text-gray-500 hover:text-white transition-colors"
                                                    title="Rename"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project); }}
                                                    className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-base truncate group-hover:text-[#007acc] transition-colors mb-1">{project.name}</h3>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(project.lastModified).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                                <span className="flex items-center gap-1"><File size={10} /> {project.fileCount} files</span>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-[#333] flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                {[1,2,3].map(i => (
                                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#111] bg-[#1e1e1e] flex items-center justify-center text-[8px] text-gray-500 font-bold">
                                                        {i === 1 ? 'JS' : i === 2 ? 'H' : 'C'}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-bold text-[#007acc] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                OPEN PROJECT →
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#1e1e1e] text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-[#333]">
                                    <tr>
                                        <th className="px-6 py-4">Project Name</th>
                                        <th className="px-6 py-4">Files</th>
                                        <th className="px-6 py-4">Last Modified</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#222]">
                                    {filtered.map((project) => (
                                        <tr 
                                            key={project.id} 
                                            onClick={() => onOpenProject(project.id)}
                                            className="hover:bg-white/5 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[#1e1e1e] flex items-center justify-center group-hover:bg-[#007acc] transition-colors">
                                                        <Package size={16} className="text-[#007acc] group-hover:text-white" />
                                                    </div>
                                                    <span className="font-semibold text-white">{project.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">{project.fileCount} items</td>
                                            <td className="px-6 py-4 text-gray-400">{new Date(project.lastModified).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setRenameData(project); }}
                                                        className="p-1.5 hover:bg-[#333] rounded text-gray-500 hover:text-white"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project); }}
                                                        className="p-1.5 hover:bg-red-900/30 rounded text-gray-500 hover:text-red-400"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>

        {/* Context Menu */}
        <AnimatePresence>
            {contextMenu && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="fixed bg-[#1e1e1e] border border-[#333] shadow-2xl rounded-xl w-48 py-1 z-50"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={() => { playSound('click'); onOpenProject(contextMenu.project.id); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#007acc] text-gray-300 hover:text-white text-sm flex items-center gap-2">
                        <Package size={14} /> {t.contextOpen}
                    </button>
                    <button onClick={() => { playSound('click'); handleDuplicate(contextMenu.project); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#007acc] text-gray-300 hover:text-white text-sm flex items-center gap-2">
                        <Copy size={14} /> {t.contextDuplicate}
                    </button>
                    <button onClick={() => { playSound('click'); setRenameData(contextMenu.project); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#007acc] text-gray-300 hover:text-white text-sm flex items-center gap-2">
                        <Edit3 size={14} /> {t.contextRename}
                    </button>
                    <div className="h-[1px] bg-[#333] my-1 mx-2" />
                    <button onClick={() => { playSound('click'); setDeleteConfirm(contextMenu.project); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-900/30 text-red-400 text-sm flex items-center gap-2">
                        <Trash2 size={14} /> {t.contextDelete}
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Modals */}
        {showCreate && <NewProjectModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
        {showStorage && <StorageManagerModal onClose={() => setShowStorage(false)} onProjectDeleted={loadProjects} />}
        {renameData && <CreateModal type="rename" initialValue={renameData.name} onSave={handleRename} onClose={() => setRenameData(null)} />}
        {deleteConfirm && <ConfirmModal title={t.deleteProjectTitle} message={`${t.deleteProjectMsg} "${deleteConfirm.name}"`} onConfirm={handleDelete} onCancel={() => setDeleteConfirm(null)} />}
    </div>
  );
};

export default ProjectDashboard;
