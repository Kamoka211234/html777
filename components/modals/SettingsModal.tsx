
import React, { useState } from 'react';
import { X, Sliders, Palette, Globe, Monitor, Type, Trash2, MousePointer, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectSettings } from '../../types';
import { playSound } from '../../utils/sound';
import { translations } from '../../utils/translations';

interface SettingsModalProps {
  settings: ProjectSettings;
  onChange: (s: ProjectSettings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<'appearance' | 'editor' | 'system' | 'general' | 'preview' | 'themes'>('editor');
  
  const t = translations[settings.language] || translations.en;

  const update = (key: keyof ProjectSettings, value: any) => {
      onChange({ ...settings, [key]: value });
  };

  const handleClearData = (type: 'cookies' | 'cache') => {
      if (!confirm(`Are you sure you want to clear ${type}?`)) return;
      if (type === 'cookies') {
          document.cookie.split(";").forEach((c) => {
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
          alert("Cookies cleared.");
      } else {
          localStorage.clear();
          sessionStorage.clear();
          location.reload();
      }
      playSound('pop');
  };

  const Toggle = ({ label, value, onChange, description }: { label: string, value: boolean, onChange: (val: boolean) => void, description?: string }) => (
      <div 
        className="flex items-center justify-between py-2 border-b border-[#333] group hover:bg-[#2a2a2a] px-2 -mx-2 rounded transition-colors"
      >
          <div className="flex-1 pr-4">
            <span className="text-gray-300 text-sm">{label}</span>
            {description && <span className="text-xs text-gray-500 block mt-0.5">{description}</span>}
          </div>
          <div 
            onClick={() => { playSound('click'); onChange(!value); }}
            className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors p-0.5 ${value ? 'bg-[#007acc]' : 'bg-[#444]'}`}
          >
              <div 
                className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} 
              />
          </div>
      </div>
  );

  return (
    <motion.div 
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       transition={{ duration: 0.2 }}
       className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
        <div 
            className="bg-[#1e1e1e] border border-[#333] shadow-2xl rounded-lg flex flex-col w-[700px] h-[550px] overflow-hidden"
        >
            
            <div className="flex-1 flex overflow-hidden">
                
                {/* Sidebar */}
                <div className="w-48 bg-[#252526] border-r border-[#333] py-4 flex flex-col">
                    <div className="mb-6 px-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">{t.settings}</h2>
                    </div>

                    {[
                        { id: 'editor', label: t.catEditor, icon: Type },
                        { id: 'themes', label: 'Themes', icon: Palette },
                        { id: 'preview', label: 'Preview', icon: Monitor },
                        { id: 'system', label: t.catInterface, icon: MousePointer },
                        { id: 'general', label: t.catAdvanced, icon: Sliders },
                    ].map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { playSound('click'); setActiveCategory(cat.id as any); }}
                            className={`relative flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full group ${activeCategory === cat.id ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            {activeCategory === cat.id && (
                                <motion.div 
                                    layoutId="settings-active-tab" 
                                    className="absolute inset-0 bg-[#37373d] border-l-2 border-[#007acc] rounded-r z-0" 
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            {activeCategory !== cat.id && (
                                <div className="absolute inset-0 bg-[#2a2d2e] opacity-0 group-hover:opacity-100 transition-opacity z-0 border-l-2 border-transparent" />
                            )}
                            <cat.icon size={14} className="relative z-10" />
                            <span className="relative z-10 font-medium">{cat.label}</span>
                        </button>
                    ))}

                    <div className="mt-auto p-4">
                        <button 
                            onClick={() => handleClearData('cache')} 
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors"
                        >
                            <Trash2 size={12}/> {t.clearCache}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-[#1e1e1e] p-6 overflow-y-auto custom-scrollbar relative">
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 hover:bg-[#333] rounded"
                    >
                        <X size={16}/>
                    </button>
                    
                    <div className="max-w-md">
                        {/* Editor Tab */}
                        {activeCategory === 'editor' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-gray-200 mb-4">{t.catEditor}</h3>
                            
                            <div className="space-y-1">
                                <Toggle label={t.autoSave} value={settings.autoSave} onChange={v => update('autoSave', v)} description="Save changes automatically" />
                                <Toggle label="Format On Save" value={settings.formatOnSave || false} onChange={v => update('formatOnSave', v)} description="Auto-format code on save" />
                                <Toggle label="Vim Mode" value={settings.vimMode || false} onChange={v => update('vimMode', v)} description="Enable Vim keybindings" />
                                <Toggle label="Line Numbers" value={settings.showLineNumbers !== false} onChange={v => update('showLineNumbers', v)} />
                                <Toggle label="Indent Guides" value={settings.showIndentGuides !== false} onChange={v => update('showIndentGuides', v)} />
                                <Toggle label="Bracket Colorization" value={settings.bracketPairColorization !== false} onChange={v => update('bracketPairColorization', v)} />
                                <Toggle label={t.minimap} value={settings.minimap} onChange={v => update('minimap', v)} />
                                <Toggle label={t.ligatures} value={settings.ligatures} onChange={v => update('ligatures', v)} />
                                <Toggle label={t.wordWrap} value={settings.wordWrap} onChange={v => update('wordWrap', v)} />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-[#333]">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5">Editor Engine</label>
                                        <select 
                                            value={settings.editorType} 
                                            onChange={(e) => update('editorType', e.target.value)}
                                            className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-sm outline-none focus:border-[#007acc]"
                                        >
                                            <option value="monaco">Monaco (Pro)</option>
                                            <option value="codemirror">CodeMirror (Latest)</option>
                                            <option value="simple">Simple (Fast)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5">{t.fontFamily}</label>
                                        <select 
                                            value={settings.fontFamily} 
                                            onChange={(e) => update('fontFamily', e.target.value)}
                                            className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-sm outline-none focus:border-[#007acc]"
                                        >
                                            <option value="Fira Code">Fira Code</option>
                                            <option value="JetBrains Mono">JetBrains Mono</option>
                                            <option value="Courier Prime">Courier Prime</option>
                                            <option value="Consolas">Consolas</option>
                                            <option value="Ubuntu Mono">Ubuntu Mono</option>
                                            <option value="Courier New">Courier New</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5">Tab Size</label>
                                        <select 
                                            value={settings.tabSize} 
                                            onChange={(e) => update('tabSize', parseInt(e.target.value))}
                                            className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-sm outline-none focus:border-[#007acc]"
                                        >
                                            <option value="2">2 Spaces</option>
                                            <option value="4">4 Spaces</option>
                                            <option value="8">8 Spaces</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5">Editor Theme</label>
                                        <select 
                                            value={settings.editorTheme || 'vs-dark'} 
                                            onChange={(e) => update('editorTheme', e.target.value)}
                                            className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-sm outline-none focus:border-[#007acc]"
                                        >
                                            <option value="vs-dark">Monaco Dark (vs-dark)</option>
                                            <option value="vs">Monaco Light (vs)</option>
                                            <option value="hc-black">High Contrast Black</option>
                                            <option value="dracula">Dracula</option>
                                            <option value="nord">Nord Polar</option>
                                            <option value="monokai">Monokai Retro</option>
                                            <option value="onedark">One Dark</option>
                                            <option value="synthwave">Synthwave '84</option>
                                            <option value="cyberpunk">Cyberpunk Neon</option>
                                            <option value="cobalt">Cobalt Deep Blue</option>
                                            <option value="github-dark">GitHub Dark</option>
                                            <option value="custom">★ Custom Creator ★</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 pt-2">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-2 flex justify-between">
                                            {t.fontSize} <span>{settings.fontSize}px</span>
                                        </label>
                                        <input type="range" min="10" max="24" value={settings.fontSize} onChange={e => update('fontSize', parseInt(e.target.value))} className="w-full accent-[#007acc] h-1 bg-[#3c3c3c] rounded appearance-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-2 flex justify-between">
                                            Line Height <span>{settings.lineHeight}</span>
                                        </label>
                                        <input type="range" min="1" max="2" step="0.1" value={settings.lineHeight} onChange={e => update('lineHeight', parseFloat(e.target.value))} className="w-full accent-[#007acc] h-1 bg-[#3c3c3c] rounded appearance-none" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="text-xs text-gray-400 block mb-2 flex justify-between">
                                        Auto Save Delay <span>{settings.autoSaveDelay}ms</span>
                                    </label>
                                    <input type="range" min="500" max="5000" step="500" value={settings.autoSaveDelay} onChange={e => update('autoSaveDelay', parseInt(e.target.value))} className="w-full accent-[#007acc] h-1 bg-[#3c3c3c] rounded appearance-none" />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5">Cursor Style</label>
                                        <select 
                                            value={settings.cursorStyle} 
                                            onChange={(e) => update('cursorStyle', e.target.value)}
                                            className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-sm outline-none focus:border-[#007acc]"
                                        >
                                            <option value="line">Line</option>
                                            <option value="block">Block</option>
                                            <option value="underline">Underline</option>
                                            <option value="line-thin">Line Thin</option>
                                            <option value="block-outline">Block Outline</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5">Cursor Blinking</label>
                                        <select 
                                            value={settings.cursorBlinking} 
                                            onChange={(e) => update('cursorBlinking', e.target.value)}
                                            className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-sm outline-none focus:border-[#007acc]"
                                        >
                                            <option value="blink">Blink</option>
                                            <option value="smooth">Smooth</option>
                                            <option value="phase">Phase</option>
                                            <option value="expand">Expand</option>
                                            <option value="solid">Solid</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}

                        {/* Themes Customization Tab */}
                        {activeCategory === 'themes' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-200">Editor Themes</h3>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Select Code Theme</label>
                                    
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'vs-dark', name: 'Monaco Dark', bg: '#1e1e1e', fg: '#d4d4d4', accent: '#569cd6' },
                                            { id: 'vs', name: 'Monaco Light', bg: '#ffffff', fg: '#000000', accent: '#0000ff' },
                                            { id: 'hc-black', name: 'High Contrast', bg: '#000000', fg: '#ffffff', accent: '#00ffff' },
                                            { id: 'dracula', name: 'Dracula', bg: '#282a36', fg: '#f8f8f2', accent: '#ff79c6' },
                                            { id: 'nord', name: 'Nord Polar', bg: '#2e3440', fg: '#d8dee9', accent: '#81a1c1' },
                                            { id: 'monokai', name: 'Monokai Retro', bg: '#272822', fg: '#f8f8f2', accent: '#f92672' },
                                            { id: 'onedark', name: 'One Dark', bg: '#282c34', fg: '#abb2bf', accent: '#c678dd' },
                                            { id: 'synthwave', name: 'Synthwave \'84', bg: '#262335', fg: '#b3b9d6', accent: '#fede5d' },
                                            { id: 'cyberpunk', name: 'Cyberpunk Neon', bg: '#000000', fg: '#00ffcc', accent: '#ff0055' },
                                            { id: 'cobalt', name: 'Cobalt Blue', bg: '#002240', fg: '#ffffff', accent: '#ff9d00' },
                                            { id: 'github-dark', name: 'GitHub Dark', bg: '#0d1117', fg: '#c9d1d9', accent: '#ff7b72' },
                                            { id: 'custom', name: '★ Custom Creator', bg: settings.customThemeBg || '#1e1e1e', fg: settings.customThemeFg || '#d4d4d4', accent: settings.customThemeCursor || '#007acc' }
                                        ].map(themeItem => {
                                            const isSelected = (settings.editorTheme || 'vs-dark') === themeItem.id;
                                            return (
                                                <button
                                                    key={themeItem.id}
                                                    onClick={() => { playSound('success'); update('editorTheme', themeItem.id); }}
                                                    className={`p-3 rounded-lg border text-left flex flex-col justify-between h-20 relative transition-all duration-200 hover:scale-[1.02] ${isSelected ? 'bg-[#2d2d30] border-[#007acc] ring-1 ring-[#007acc]' : 'bg-[#252526] border-[#3c3c3c] hover:border-[#555]'}`}
                                                >
                                                    <span className="text-xs font-semibold text-gray-200">{themeItem.name}</span>
                                                    <div className="flex items-center justify-between w-full mt-2">
                                                        <div className="flex gap-1.5">
                                                            <span className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: themeItem.bg }} title="Background" />
                                                            <span className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: themeItem.fg }} title="Foreground" />
                                                            <span className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: themeItem.accent }} title="Accent" />
                                                        </div>
                                                        {isSelected && (
                                                            <span className="bg-[#007acc] text-white p-0.5 rounded-full">
                                                                <Check size={10} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[#333] space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custom Theme Parameters</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    playSound('click');
                                                    onChange({
                                                        ...settings,
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
                                                        customThemeDelimiters: '#ffd700'
                                                    });
                                                }}
                                                className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-2 py-1 rounded transition-colors"
                                            >
                                                Standard Reset
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    playSound('click');
                                                    onChange({
                                                        ...settings,
                                                        customThemeBase: 'vs-dark',
                                                        customThemeBg: '#0f172a',
                                                        customThemeFg: '#f8fafc',
                                                        customThemeCursor: '#38bdf8',
                                                        customThemeLineHighlight: '#1e293b',
                                                        customThemeComments: '#64748b',
                                                        customThemeKeywords: '#f43f5e',
                                                        customThemeStrings: '#10b981',
                                                        customThemeNumbers: '#f59e0b',
                                                        customThemeTypes: '#a855f7',
                                                        customThemeDelimiters: '#06b6d4'
                                                    });
                                                }}
                                                className="text-[10px] bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 font-medium px-2 py-1 rounded transition-colors"
                                            >
                                                Neon Horizon
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 bg-[#252526] p-4 rounded-lg border border-[#333]">
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-400 block mb-1.5">Monaco Base Environment Mode</label>
                                            <select 
                                                value={settings.customThemeBase || 'vs-dark'} 
                                                onChange={(e) => update('customThemeBase', e.target.value)}
                                                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-xs outline-none focus:border-[#007acc]"
                                            >
                                                <option value="vs-dark">Dark Base Environment (recommended)</option>
                                                <option value="vs">Light Base Environment</option>
                                                <option value="hc-black">High Contrast Base Environment</option>
                                            </select>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Editor Background</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeBg || '#1e1e1e'} onChange={e => update('customThemeBg', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeBg || '#1e1e1e'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Editor Foreground</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeFg || '#d4d4d4'} onChange={e => update('customThemeFg', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeFg || '#d4d4d4'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Caret / Cursor</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeCursor || '#007acc'} onChange={e => update('customThemeCursor', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeCursor || '#007acc'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Active Highlight</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeLineHighlight || '#2a2a2a'} onChange={e => update('customThemeLineHighlight', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeLineHighlight || '#2a2a2a'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Code Types</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeTypes || '#4ec9b0'} onChange={e => update('customThemeTypes', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeTypes || '#4ec9b0'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Keywords Color</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeKeywords || '#569cd6'} onChange={e => update('customThemeKeywords', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeKeywords || '#569cd6'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Comments Color</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeComments || '#6a9955'} onChange={e => update('customThemeComments', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeComments || '#6a9955'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Strings Color</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeStrings || '#ce9178'} onChange={e => update('customThemeStrings', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeStrings || '#ce9178'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Numbers Color</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeNumbers || '#b5cea8'} onChange={e => update('customThemeNumbers', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeNumbers || '#b5cea8'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-gray-300">Delimiters Color</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="color" value={settings.customThemeDelimiters || '#ffd700'} onChange={e => update('customThemeDelimiters', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[#333]" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{settings.customThemeDelimiters || '#ffd700'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Real-time Code Preview Block */}
                                    <div className="mt-3">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Live Custom Theme Preview</label>
                                        <div 
                                            className="font-mono text-xs rounded border border-[#333] overflow-hidden shadow-inner p-3 whitespace-pre relative"
                                            style={{ backgroundColor: settings.customThemeBg || '#1e1e1e', color: settings.customThemeFg || '#d4d4d4' }}
                                        >
                                            <div className="absolute top-0 bottom-0 left-0 w-1" style={{ backgroundColor: settings.customThemeCursor }} />
                                            <span style={{ color: settings.customThemeComments || '#6a9955' }}>{"// Live Preview Sandbox"}</span>{"\n"}
                                            <span style={{ color: settings.customThemeKeywords || '#569cd6' }}>const</span>{" "}
                                            <span>hello</span>{" "}
                                            <span style={{ color: settings.customThemeDelimiters || '#ffd700' }}>=</span>{" "}
                                            <span style={{ color: settings.customThemeStrings || '#ce9178' }}>{"\"world\""}</span>
                                            <span style={{ color: settings.customThemeDelimiters || '#ffd700' }}>;</span>{"\n"}
                                            <span style={{ color: settings.customThemeKeywords || '#569cd6' }}>function</span>{" "}
                                            <span style={{ color: settings.customThemeTypes || '#4ec9b0' }}>calcCount</span>
                                            <span style={{ color: settings.customThemeDelimiters || '#ffd700' }}>{"() {"}</span>{"\n"}
                                            {"  "}
                                            <span style={{ color: settings.customThemeKeywords || '#569cd6' }}>return</span>{" "}
                                            <span style={{ color: settings.customThemeNumbers || '#b5cea8' }}>42</span>
                                            <span style={{ color: settings.customThemeDelimiters || '#ffd700' }}>;</span>{"\n"}
                                            <span style={{ color: settings.customThemeDelimiters || '#ffd700' }}>{"}"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Preview Tab */}
                        {activeCategory === 'preview' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-gray-200 mb-4">Preview Settings</h3>
                                
                                <div className="space-y-1">
                                    <Toggle label="Auto Refresh" value={settings.autoRefresh} onChange={v => update('autoRefresh', v)} description="Refresh preview on changes" />
                                    <Toggle label="Show Console" value={settings.showConsole} onChange={v => update('showConsole', v)} description="Show console in preview" />
                                    <Toggle label="Python Flask Preview" value={!!settings.usePythonPreview} onChange={v => update('usePythonPreview', v)} description="Serve preview via local Python Flask server (resolves CORS and networking)" />
                                </div>

                                {settings.usePythonPreview && (
                                    <div className="space-y-4 pt-4 border-t border-[#333] animate-in fade-in duration-200">
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">
                                                Python Flask Port
                                            </label>
                                            <input 
                                                type="number" 
                                                value={settings.pythonPreviewPort || 5000} 
                                                onChange={e => update('pythonPreviewPort', parseInt(e.target.value) || 5000)} 
                                                className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-xs outline-none focus:border-[#007acc]" 
                                                placeholder="5000"
                                            />
                                            <span className="text-[10px] text-gray-500 block mt-1">
                                                Ensure python preview server is running on this port locally (e.g. `python app.py`)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 pt-4 border-t border-[#333]">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-2 flex justify-between">
                                            Refresh Delay <span>{settings.refreshDelay}ms</span>
                                        </label>
                                        <input type="range" min="200" max="3000" step="100" value={settings.refreshDelay} onChange={e => update('refreshDelay', parseInt(e.target.value))} className="w-full accent-[#007acc] h-1 bg-[#3c3c3c] rounded appearance-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeCategory === 'system' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-gray-200 mb-4">{t.catInterface}</h3>
                                
                                <div className="space-y-1">
                                    <Toggle label="Status Bar" value={settings.showStatusBar} onChange={v => update('showStatusBar', v)} />
                                    <Toggle label="Activity Bar" value={settings.showActivityBar} onChange={v => update('showActivityBar', v)} />
                                    <Toggle label={t.smoothScrolling} value={settings.smoothScrolling} onChange={v => update('smoothScrolling', v)} />
                                    <Toggle label="Click Ripple Effect" value={settings.rippleEnabled !== false} onChange={v => update('rippleEnabled', v)} description="Display wave ripple when clicking inside app" />
                                </div>

                                {settings.rippleEnabled !== false && (
                                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#333] pt-2 animate-in fade-in duration-200">
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Ripple Color</label>
                                            <input 
                                                type="text" 
                                                value={settings.rippleColor} 
                                                onChange={e => update('rippleColor', e.target.value)} 
                                                className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-xs outline-none focus:border-[#007acc]"
                                                placeholder="rgba(255,255,255,0.4)"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Duration: {settings.rippleSpeed}s</label>
                                            <input 
                                                type="range" 
                                                min="0.2" 
                                                max="2.0" 
                                                step="0.1" 
                                                value={settings.rippleSpeed} 
                                                onChange={e => update('rippleSpeed', parseFloat(e.target.value))} 
                                                className="w-full accent-[#007acc] h-1 bg-[#3c3c3c] rounded appearance-none mt-3"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 pt-4 border-t border-[#333]">
                                    <h4 className="text-sm font-medium text-gray-200 mb-1">Cursor & Pointer System</h4>
                                    
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5">Cursor Type</label>
                                        <select 
                                            value={settings.enableCustomCursor ? settings.customCursorType : 'system'} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'system') {
                                                    onChange({ ...settings, enableCustomCursor: false, customCursorType: 'system' });
                                                } else {
                                                    onChange({ ...settings, enableCustomCursor: true, customCursorType: val as any });
                                                }
                                            }}
                                            className="w-full bg-[#252526] border border-[#3c3c3c] text-gray-200 rounded p-1.5 text-sm outline-none focus:border-[#007acc]"
                                        >
                                            <option value="system">Standard System Default</option>
                                            <option value="circle">Custom Circle Follower</option>
                                        </select>
                                    </div>

                                    {settings.enableCustomCursor && settings.customCursorType === 'circle' && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200 p-3 bg-[#252526] rounded border border-[#2b2b2b]">
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Circle Size ({settings.customCursorSize})</label>
                                                <input 
                                                    type="range" 
                                                    min="1" 
                                                    max="5" 
                                                    value={settings.customCursorSize} 
                                                    onChange={e => update('customCursorSize', parseInt(e.target.value))} 
                                                    className="w-full accent-[#007acc] h-1 bg-[#3c3c3c] rounded appearance-none mt-2"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1.5">Circle Color / Glow</label>
                                                <select 
                                                    value={settings.customCursorColor} 
                                                    onChange={(e) => update('customCursorColor', e.target.value as any)}
                                                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-gray-200 rounded p-1 text-xs outline-none focus:border-[#007acc]"
                                                >
                                                    <option value="black">Classic Black</option>
                                                    <option value="white">Sleek White</option>
                                                    <option value="red">Red Glow</option>
                                                    <option value="blue">Blue Glow</option>
                                                    <option value="green">Green Glow</option>
                                                    <option value="purple">Purple Glow</option>
                                                    <option value="orange">Orange Glow</option>
                                                    <option value="cyan">Cyan Glow</option>
                                                    <option value="pink">Pink Glow</option>
                                                    <option value="rainbow">Rainbow Gradient</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-2">Sidebar Position</label>
                                        <div className="flex gap-2">
                                            {['left', 'right'].map(pos => (
                                                <button 
                                                    key={pos} 
                                                    onClick={() => update('sidebarPosition', pos)}
                                                    className={`flex-1 py-1.5 rounded text-sm transition-colors border ${settings.sidebarPosition === pos ? 'bg-[#007acc] border-[#007acc] text-white' : 'bg-[#252526] border-[#3c3c3c] text-gray-300 hover:bg-[#2a2d2e]'}`}
                                                >
                                                    {pos.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeCategory === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-gray-200 mb-4">{t.catAdvanced}</h3>
                                <div className="space-y-4">
                                    <button onClick={() => handleClearData('cookies')} className="w-full py-2 rounded bg-[#252526] text-gray-300 hover:bg-[#2a2d2e] border border-[#3c3c3c] transition-colors flex items-center justify-center gap-2 text-sm">
                                        <Trash2 size={14} /> {t.resetEnv}
                                    </button>
                                    <div className="pt-4 border-t border-[#333]">
                                        <label className="text-xs text-gray-400 block mb-2">{t.language}</label>
                                        <div className="flex gap-2">
                                            {['en', 'ckb', 'kmr'].map(lang => (
                                                <button 
                                                    key={lang} 
                                                    onClick={() => update('language', lang)}
                                                    className={`flex-1 py-1.5 rounded text-sm transition-colors border ${settings.language === lang ? 'bg-[#007acc] border-[#007acc] text-white' : 'bg-[#252526] border-[#3c3c3c] text-gray-300 hover:bg-[#2a2d2e]'}`}
                                                >
                                                    {lang === 'en' ? 'ENG' : lang === 'ckb' ? 'SOR' : 'KUR'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
  );
};

export default SettingsModal;
