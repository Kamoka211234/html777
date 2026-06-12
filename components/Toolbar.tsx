
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Save, FolderPlus, FilePlus, Download, 
  Settings, Undo, Redo, Search, Code, PlayCircle, Sidebar, Upload, Home, ExternalLink, Zap, Link,
  Type, Palette, Image as ImageIcon, AlignLeft, Grid, Bookmark, Maximize, HelpCircle, Keyboard, Globe,
  Camera, Disc, StopCircle, MousePointerClick, Table, Layers, Layout, Github, Smartphone
} from 'lucide-react';
import { ProjectSettings } from '../types';
import { playSound } from '../utils/sound';
import { translations } from '../utils/translations';
import { createRipple } from '../utils/ripple';
import Button from './Button';

interface ToolbarProps {
  onDownload: () => void;
  onSaveAll: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  onFindSymbol: () => void;
  settings: ProjectSettings;
  onSettingsChange: (newSettings: ProjectSettings) => void;
  onOpenSettings: () => void;
  toggleFullscreen: () => void;
  toggleSidebar: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSidebarOpen: boolean;
  onImport: () => void;
  onHome: () => void;
  onOpenNewTab: () => void;
  onRunClick: () => void;
  onOpenObfuscator: () => void;
  onOpenCDN: () => void;
  onFormat: () => void;
  onLorem: () => void;
  onColorPicker: () => void;
  onBase64: () => void;
  onOpenTool: (type: string) => void;
  onZenMode: () => void;
  onShortcuts: () => void;
  onOpenResources: () => void;
  onToggleCam: () => void;
  isCamActive: boolean;
  onToggleRecord: () => void;
  isRecording: boolean;
  onOpenGradient: () => void;
  onOpenButton: () => void;
  onOpenTable: () => void;
  onOpenBoxShadow: () => void;
  onOpenFlexbox: () => void;
  files: any[];
  isMobile?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onDownload, onSaveAll, onNewFile, onNewFolder,
  onUndo, onRedo, onFind, onFindSymbol,
  settings, onSettingsChange, onOpenSettings, toggleSidebar,
  canUndo, canRedo, isSidebarOpen, onImport, onHome, onOpenNewTab, onRunClick, onOpenObfuscator, onOpenCDN,
  onFormat, onLorem, onColorPicker, onBase64, onOpenTool, onZenMode, onShortcuts, onOpenResources,
  onToggleCam, isCamActive, onToggleRecord, isRecording, onOpenGradient, onOpenButton, onOpenTable,
  onOpenBoxShadow, onOpenFlexbox, files, isMobile = false
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  const t = translations[settings.language] || translations.en;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    playSound('click');
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const MenuItem = ({ label, shortcut, onClick, icon: Icon }: any) => (
    <button
      onClick={(e) => {
        e.stopPropagation(); 
        createRipple(e);
        playSound('click');
        onClick();
        setActiveMenu(null);
      }}
      className="w-full text-left px-3 py-1.5 hover:bg-[var(--accent)] hover:text-white flex items-center justify-between group text-xs rounded transition-colors relative overflow-hidden"
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={12} className="text-gray-400 group-hover:text-white" />}
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-[10px] text-gray-500 group-hover:text-white ml-6">{shortcut}</span>}
    </button>
  );

  return (
    <div ref={toolbarRef} className="h-8 flex items-center bg-[var(--bg-secondary)] select-none text-[var(--text-primary)] text-xs px-2 border-b border-[var(--border-color)]">
      {/* Icon Branding */}
      <div className="mr-3 flex items-center">
          <Code size={16} className="text-[var(--accent)]" />
      </div>

      {/* Menus */}
      <div className="flex">
        {/* File Menu */}
        <div className="relative">
          <button 
            className={`px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-[var(--hover-bg)] rounded-sm transition-all text-xs sm:text-sm ${activeMenu === 'file' ? 'bg-[var(--hover-bg)] shadow-inner' : ''}`}
            onClick={() => handleMenuClick('file')}
          >
            {t.file}
          </button>
          <AnimatePresence>
            {activeMenu === 'file' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute top-full left-0 mt-1 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-md p-1 z-[100] max-h-[85vh] overflow-y-auto custom-scrollbar" 
                onClick={e => e.stopPropagation()}
              >
                <MenuItem label={t.newFile} icon={FilePlus} onClick={onNewFile} />
                <MenuItem label={t.newFolder} icon={FolderPlus} onClick={onNewFolder} />
                <div className="h-[1px] bg-[var(--border-color)] my-1" />
                <MenuItem label={t.importAsset} icon={Upload} onClick={onImport} />
                <MenuItem label={t.saveAll} shortcut="Ctrl+S" icon={Save} onClick={onSaveAll} />
                <MenuItem label={`${t.autoSave}: ${settings.autoSave ? "On" : "Off"}`} icon={Settings} onClick={() => onSettingsChange({ ...settings, autoSave: !settings.autoSave })} />
                <MenuItem label={t.settings || 'Settings'} icon={Settings} onClick={onOpenSettings} />
                <div className="h-[1px] bg-[var(--border-color)] my-1" />
                <MenuItem label={t.downloadZip} icon={Download} onClick={onDownload} />
                <div className="h-[1px] bg-[var(--border-color)] my-1" />
                <MenuItem label={t.closeProject} icon={Home} onClick={onHome} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Edit Menu */}
        <div className="relative">
          <button 
            className={`px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-[var(--hover-bg)] rounded-sm transition-all text-xs sm:text-sm ${activeMenu === 'edit' ? 'bg-[var(--hover-bg)] shadow-inner' : ''}`}
            onClick={() => handleMenuClick('edit')}
          >
            {t.edit}
          </button>
          <AnimatePresence>
            {activeMenu === 'edit' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-md p-1 z-[100] max-h-[85vh] overflow-y-auto custom-scrollbar" 
                onClick={e => e.stopPropagation()}
              >
                <MenuItem label={t.undo} shortcut="Ctrl+Z" icon={Undo} onClick={onUndo} />
                <MenuItem label={t.redo} shortcut="Ctrl+Y" icon={Redo} onClick={onRedo} />
                <div className="h-[1px] bg-[var(--border-color)] my-1" />
                <MenuItem label={t.format} icon={AlignLeft} onClick={onFormat} />
                <MenuItem label={t.lorem} icon={Type} onClick={onLorem} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View Menu */}
        <div className="relative">
          <button 
            className={`px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-[var(--hover-bg)] rounded-sm transition-all text-xs sm:text-sm ${activeMenu === 'view' ? 'bg-[var(--hover-bg)] shadow-inner' : ''}`}
            onClick={() => handleMenuClick('view')}
          >
            {t.view}
          </button>
          <AnimatePresence>
            {activeMenu === 'view' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-md p-1 z-[100] max-h-[85vh] overflow-y-auto custom-scrollbar" 
                onClick={e => e.stopPropagation()}
              >
                <MenuItem label="Toggle Sidebar" shortcut="Ctrl+B" icon={Sidebar} onClick={toggleSidebar} />
                <MenuItem label={t.find} shortcut="Ctrl+F" icon={Search} onClick={onFind} />
                <MenuItem label={t.findSymbol} shortcut="Ctrl+Shift+O" icon={Code} onClick={onFindSymbol} />
                <MenuItem label={t.bookmarks} icon={Bookmark} onClick={() => onOpenTool('bookmarks')} />
                <div className="h-[1px] bg-[var(--border-color)] my-1" />
                <MenuItem label={t.zenMode} shortcut="Ctrl+K Z" icon={Maximize} onClick={onZenMode} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

         {/* Tools Menu */}
         <div className="relative">
          <button 
            className={`px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-[var(--hover-bg)] rounded-sm transition-all text-xs sm:text-sm ${activeMenu === 'tools' ? 'bg-[var(--hover-bg)] shadow-inner' : ''}`}
            onClick={() => handleMenuClick('tools')}
          >
            {t.tools}
          </button>
          <AnimatePresence>
            {activeMenu === 'tools' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute top-full left-0 mt-1 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-md p-1 z-[100] max-h-[85vh] overflow-y-auto custom-scrollbar" 
                onClick={e => e.stopPropagation()}
              >
                <MenuItem label="Gradient Color Maker" icon={Palette} onClick={onOpenGradient} />
                <MenuItem label="Box Shadow Generator" icon={Layers} onClick={onOpenBoxShadow} />
                <MenuItem label="Custom Boilerplates" icon={Code} onClick={() => onOpenTool('boilerplate-custom')} />
                <MenuItem label="Saved Snippets" icon={FilePlus} onClick={() => onOpenTool('snippets')} />
                <MenuItem label="Color / Palette Utilities" icon={Palette} onClick={() => onOpenTool('color')} />
                <MenuItem label="More Compilers" icon={ExternalLink} onClick={() => onOpenTool('more-compilers')} />
                <MenuItem label={t.resources} icon={Globe} onClick={onOpenResources} />
                <div className="h-[1px] bg-[var(--border-color)] my-1" />
                <MenuItem label={t.obfuscator} icon={Zap} onClick={onOpenObfuscator} />
                <MenuItem label={t.cdn} icon={Link} onClick={onOpenCDN} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Boilerplates Action Button */}
       

        {/* Help Menu */}
        <div className="relative">
          <button 
            className={`px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-[var(--hover-bg)] rounded-sm transition-all text-xs sm:text-sm ${activeMenu === 'help' ? 'bg-[var(--hover-bg)] shadow-inner' : ''}`}
            onClick={() => handleMenuClick('help')}
          >
            {t.help}
          </button>
          <AnimatePresence>
            {activeMenu === 'help' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-md p-1 z-[100] max-h-[85vh] overflow-y-auto custom-scrollbar" 
                onClick={e => e.stopPropagation()}
              >
                <MenuItem label={t.shortcuts} icon={Keyboard} onClick={onShortcuts} />
                <MenuItem label="About" icon={HelpCircle} onClick={() => alert("Visual HTML5 Studio v2.0")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Title */}
      <div className="flex-1 text-center text-[10px] text-[var(--text-secondary)] select-none">
          {settings.projectName} — Visual HTML5 Studio
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1">
          {/* Extension Quick Actions */}
          {(settings.installedExtensions || []).includes('kamoh.open-in-phone') && (
              <button 
                  onClick={() => { 
                      playSound('click'); 
                      try {
                          onOpenTool('open-in-phone');
                      } catch (e) {
                          console.error("Extension Error:", e);
                      }
                  }} 
                  className="p-1 rounded-sm text-[var(--accent)] hover:text-white hover:bg-[var(--hover-bg)]" 
                  title="Open In Phone"
              >
                  <Smartphone size={14} />
              </button>
          )}
          
          {!isMobile && (
            <>
              <div className={`w-[1px] h-4 bg-[var(--border-color)] mx-1`} />

              {/* Face Cam Toggle */}
              <button 
                onClick={() => { playSound('click'); onToggleCam(); }} 
                className={`p-1 rounded-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${isCamActive ? 'bg-[var(--hover-bg)] text-[var(--accent)]' : 'hover:bg-[var(--hover-bg)]'}`} 
                title="Toggle Face Cam"
              >
                  <Camera size={14} />
              </button>

              {/* Screen Record Toggle */}
              <button 
                onClick={() => { playSound('click'); onToggleRecord(); }} 
                className={`p-1 rounded-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${isRecording ? 'bg-red-900/30 text-red-500 animate-pulse' : 'hover:bg-[var(--hover-bg)]'}`} 
                title={isRecording ? "Stop Recording" : "Start Screen Recording"}
              >
                  {isRecording ? <StopCircle size={14} /> : <Disc size={14} />}
              </button>

            </>
          )}
          
          <div className={`w-[1px] h-4 bg-[var(--border-color)] mx-1`} />

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onOpenNewTab} 
            title={t.openNewTab}
          >
            <ExternalLink size={16} />
          </Button>

          <Button 
            variant="success" 
            size="sm" 
            onClick={onRunClick} 
            icon={PlayCircle}
            title={t.run}
            className="hidden sm:inline-flex"
          >
            {t.run}
          </Button>

          {/* Mobile visible run button */}
          <Button 
            variant="success" 
            size="icon" 
            onClick={onRunClick} 
            title={t.run}
            className="sm:hidden"
          >
            <PlayCircle size={18} />
          </Button>
      </div>
    </div>
  );
};

export default Toolbar;
