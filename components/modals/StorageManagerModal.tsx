
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HardDrive, Trash2, PieChart, RefreshCw } from 'lucide-react';
import { Project } from '../../types';
import { db } from '../../utils/db';
import { playSound } from '../../utils/sound';

interface StorageManagerModalProps {
  onClose: () => void;
  onProjectDeleted: () => void;
}

interface ProjectUsage extends Project {
    size: number;
}

interface LocalStorageItem {
    key: string;
    value: string;
    size: number;
}

const StorageManagerModal: React.FC<StorageManagerModalProps> = ({ onClose, onProjectDeleted }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectUsage[]>([]);
  const [lsItems, setLsItems] = useState<LocalStorageItem[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [quota, setQuota] = useState<{usage: number, quota: number} | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'localStorage'>('projects');

  useEffect(() => {
      loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      
      // Load Projects
      const projList = await db.getProjects();
      const usages: ProjectUsage[] = [];
      let total = 0;

      for (const p of projList) {
          const size = await db.calculateProjectSize(p.id);
          usages.push({ ...p, size });
          total += size;
      }
      setProjects(usages.sort((a,b) => b.size - a.size));

      // Load LocalStorage
      const items: LocalStorageItem[] = [];
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
              const value = localStorage.getItem(key) || '';
              const size = new Blob([key + value]).size;
              items.push({ key, value, size });
          }
      }
      setLsItems(items.sort((a,b) => b.size - a.size));

      setTotalSize(total);

      if (navigator.storage && navigator.storage.estimate) {
          try {
              const estimate = await navigator.storage.estimate();
              if (estimate.usage !== undefined && estimate.quota !== undefined) {
                  setQuota({ usage: estimate.usage, quota: estimate.quota });
              }
          } catch(e) { console.error(e); }
      }

      setLoading(false);
  };

  const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteProject = async (id: string) => {
      if (confirm("Are you sure you want to delete this project and its data?")) {
          await db.deleteProject(id);
          playSound('pop');
          onProjectDeleted();
          loadData();
      }
  };

  const handleDeleteLS = (key: string) => {
      if (confirm(`Delete localStorage item "${key}"?`)) {
          localStorage.removeItem(key);
          playSound('pop');
          loadData();
      }
  };

  const clearAll = async () => {
      if (confirm("DANGER: This will delete ALL projects and ALL settings! Are you absolutely sure?")) {
          for (const p of projects) {
              await db.deleteProject(p.id);
          }
          localStorage.clear();
          playSound('pop');
          onProjectDeleted();
          onClose();
          window.location.reload();
      }
  };

  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-2xl w-[800px] max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                    <div className="bg-[var(--accent)]/20 p-2 rounded-lg">
                        <HardDrive size={20} className="text-[var(--accent)]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">System Storage Manager</h2>
                        <p className="text-xs text-[var(--text-secondary)]">Manage all local data, projects, and settings.</p>
                    </div>
                </div>
                <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg text-[var(--text-secondary)] transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Stats Bar */}
            <div className="p-6 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                <div className="grid grid-cols-2 gap-8 mb-4">
                    <div>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Project Data</span>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">{formatSize(totalSize)}</div>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Browser Quota</span>
                        {quota && <div className="text-2xl font-bold text-[var(--text-primary)]">{formatSize(quota.usage)} / {formatSize(quota.quota)}</div>}
                    </div>
                </div>
                {quota && (
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-[var(--accent)] h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (quota.usage / quota.quota) * 100)}%` }} 
                        />
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-6">
                <button 
                    onClick={() => setActiveTab('projects')}
                    className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'projects' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Projects (IndexedDB)
                </button>
                <button 
                    onClick={() => setActiveTab('localStorage')}
                    className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'localStorage' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Settings (LocalStorage)
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0a0a0a]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw className="animate-spin text-[var(--accent)]" size={32} />
                        <span className="text-xs text-[var(--text-secondary)]">Analyzing storage...</span>
                    </div>
                ) : activeTab === 'projects' ? (
                    projects.length === 0 ? (
                        <div className="text-center text-[var(--text-secondary)] py-20">No projects using storage.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)]">
                                    <th className="pb-3 pl-2">Project Name</th>
                                    <th className="pb-3">Items</th>
                                    <th className="pb-3">Size</th>
                                    <th className="pb-3 text-right pr-2">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {projects.map(p => (
                                    <tr key={p.id} className="group hover:bg-white/5">
                                        <td className="py-4 pl-2">
                                            <div className="text-sm text-[var(--text-primary)] font-semibold">{p.name}</div>
                                            <div className="text-[10px] text-[var(--text-secondary)] font-mono">{p.id}</div>
                                        </td>
                                        <td className="py-4 text-xs text-[var(--text-secondary)]">{p.fileCount} files</td>
                                        <td className="py-4 text-xs font-mono text-[var(--accent)]">{formatSize(p.size)}</td>
                                        <td className="py-4 text-right pr-2">
                                            <button 
                                                onClick={() => handleDeleteProject(p.id)}
                                                className="text-[var(--text-secondary)] hover:text-red-400 p-2 hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete Project Data"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : (
                    lsItems.length === 0 ? (
                        <div className="text-center text-[var(--text-secondary)] py-20">No localStorage items found.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)]">
                                    <th className="pb-3 pl-2">Key</th>
                                    <th className="pb-3">Value Snippet</th>
                                    <th className="pb-3">Size</th>
                                    <th className="pb-3 text-right pr-2">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {lsItems.map(item => (
                                    <tr key={item.key} className="group hover:bg-white/5">
                                        <td className="py-4 pl-2">
                                            <div className="text-xs text-[var(--text-primary)] font-mono font-bold">{item.key}</div>
                                        </td>
                                        <td className="py-4">
                                            <div className="text-[10px] text-[var(--text-secondary)] font-mono truncate max-w-[250px]">
                                                {item.value.substring(0, 100)}{item.value.length > 100 ? '...' : ''}
                                            </div>
                                        </td>
                                        <td className="py-4 text-xs font-mono text-[var(--accent)]">{formatSize(item.size)}</td>
                                        <td className="py-4 text-right pr-2">
                                            <button 
                                                onClick={() => handleDeleteLS(item.key)}
                                                className="text-[var(--text-secondary)] hover:text-red-400 p-2 hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete Item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex justify-between items-center">
                <button onClick={loadData} className="text-xs text-[var(--accent)] flex items-center gap-1 hover:underline font-bold">
                    <RefreshCw size={12} /> REFRESH SYSTEM DATA
                </button>
                <button 
                    onClick={clearAll}
                    className="px-6 py-2 text-xs bg-red-900 text-white hover:bg-red-800 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-red-900/20"
                >
                    <Trash2 size={14} /> WIPE ALL DATA
                </button>
            </div>
        </div>
    </motion.div>
  );
};

export default StorageManagerModal;
