import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Code, Play, Plus, Clipboard, Trash2, Scissors, Terminal, BookOpen, Layers } from 'lucide-react';
import { playSound } from '../../utils/sound';

interface BoilerplateModalProps {
  onClose: () => void;
  onTestBoilerplate: (content: string, offset: number) => void;
  onInsertSnippet: (content: string) => void;
}

export const BoilerplateModal: React.FC<BoilerplateModalProps> = ({ onClose, onTestBoilerplate, onInsertSnippet }) => {
  const [boilerplates, setBoilerplates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vs_custom_boilerplates');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'default-fullcard',
        name: 'Full Card (Tailwind)',
        key: 'fullcard',
        scope: 'html',
        content: `<div class="max-w-[340px] rounded-[24px] overflow-hidden shadow-2xl border border-gray-100 bg-white hover:shadow-2xl hover:-translate-y-1 duration-300 transition-all transform">
  <img class="w-full h-44 object-cover rounded-t-[24px]" src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=640" alt="Gradient Cover" referrerPolicy="no-referrer" />
  <div class="p-5">
    <div class="flex items-center gap-2 mb-2">
      <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-wider">Featured</span>
      <span class="text-[10px] text-gray-400 font-mono">5 min read</span>
    </div>
    <h3 class="text-lg font-bold text-gray-900 tracking-tight leading-snug">Beautiful Card Layout</h3>
    <p class="mt-2 text-xs text-gray-500 leading-relaxed">This is a fully styled card boilerplate built using utility classes. You can place your custom text or interactive components here.</p>
    <div class="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
        <div>
          <p class="text-[11px] font-semibold text-gray-800">Alex Rivers</p>
          <p class="text-[9px] text-gray-400">Software Designer</p>
        </div>
      </div>
      <button class="px-3.5 py-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 duration-150 rounded-lg shadow-md hover:shadow-lg">Explore</button>
    </div>
  </div>
</div>`,
        offset: 350
      },
      {
        id: 'default-flexgrid',
        name: 'Flex Grid (Tailwind)',
        key: 'flexgrid',
        scope: 'html',
        content: `<div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-w-6xl mx-auto">\n  $0\n</div>`,
        offset: 84
      }
    ];
  });

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [scope, setScope] = useState<'html' | 'css' | 'javascript' | 'all'>('html');
  const [content, setContent] = useState('');
  const [offset, setOffset] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('vs_custom_boilerplates', JSON.stringify(boilerplates));
  }, [boilerplates]);

  const add = () => {
    if (name && key && content) {
      const newBp = { id: Date.now().toString(), name, key, scope, content, offset };
      setBoilerplates([newBp, ...boilerplates]);
      setName('');
      setKey('');
      setContent('');
      setOffset(0);
      playSound('success');
    }
  };

  const deleteBp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoilerplates(boilerplates.filter(b => b.id !== id));
    playSound('pop');
  };

  const copyToClipboard = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playSound('success');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const renderPreview = (text: string, cursorIdx: number) => {
    const safeIdx = Math.min(Math.max(0, cursorIdx), text.length);
    const before = text.substring(0, safeIdx);
    const after = text.substring(safeIdx);
    return (
      <div className="relative font-mono text-xs bg-[#111] p-3 rounded-lg border border-[#2d2d2d] leading-relaxed select-text min-h-[100px] whitespace-pre-wrap break-all max-h-48 overflow-y-auto custom-scrollbar">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes preview-cursor-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          .preview-visual-cursor {
            animation: preview-cursor-blink 1s step-end infinite;
          }
        ` }} />
        <span className="text-gray-300">{before}</span>
        <span className="inline-block w-[2.5px] h-[14px] bg-indigo-400 align-middle mx-[0.5px] preview-visual-cursor" />
        <span className="text-gray-300">{after}</span>
      </div>
    );
  };

  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4 text-left">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#18181c] border border-[#2d2d2d] rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e1e24] border-b border-[#2d2d2d] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/15 rounded-xl border border-indigo-500/30">
              <Code size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Custom Boilerplates / Snippets</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Define trigger keywords to autogenerate structure instantly in the code editor</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-red-500/10 hover:text-red-400 p-2 rounded-xl text-gray-400 duration-150">
            <X size={18} />
          </button>
        </div>

        {/* Info Line */}
        <div className="bg-indigo-950/20 border-b border-indigo-500/10 px-6 py-2.5 text-xs text-indigo-200 flex items-center gap-2 select-none">
          <BookOpen size={13} className="text-indigo-400 flex-shrink-0" />
          <span>💡 PRO TIP: Just type <strong>fullcard</strong> or <strong>!fullcard</strong> inside any HTML/JS file, and press Tab / Enter to expand the snippet instantly!</span>
        </div>

        {/* Content Container (Grid) */}
        <div className="flex-1 flex flex-col md:flex-row h-full min-h-0">
          {/* Left Panel: Create Form */}
          <div className="w-full md:w-[42%] bg-[#1b1b20] border-r border-[#2d2d2d] p-6 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
            <h3 className="text-xs font-bold text-[#a5a5b1] uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-[#2d2d2d] pb-2">
              <Plus size={14} className="text-indigo-400" /> Save New Snippet
            </h3>
            
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Boilerplate Name</label>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Modern Testimonial Card" 
                  className="w-full bg-[#121215] p-2.5 rounded-xl border border-[#2d2d2d] text-xs text-white outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Trigger Keyword</label>
                  <input 
                    value={key} 
                    onChange={e => setKey(e.target.value)} 
                    placeholder="e.g. testcard" 
                    className="w-full bg-[#121215] p-2.5 rounded-xl border border-[#2d2d2d] text-xs text-white outline-none focus:border-indigo-500 transition-colors font-mono" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">File Scope</label>
                  <select 
                    value={scope} 
                    onChange={e => setScope(e.target.value as any)} 
                    className="w-full bg-[#121215] p-2.5 rounded-xl border border-[#2d2d2d] text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="javascript">JavaScript</option>
                    <option value="all">All Files</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cursor Offset Index ({offset})</label>
                  <span className="text-[9px] text-indigo-400">Position where editor starts focus</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={content.length} 
                  value={offset} 
                  onChange={e => setOffset(Number(e.target.value))} 
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#121215] rounded-full" 
                />
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col min-h-[140px]">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Code Content</label>
                <textarea 
                  value={content} 
                  onChange={e => { 
                    setContent(e.target.value); 
                    if (offset > e.target.value.length) setOffset(e.target.value.length); 
                  }} 
                  placeholder="Paste or write your HTML template snippet structure here..." 
                  className="w-full flex-1 bg-[#121215] p-3 rounded-xl text-xs font-mono border border-[#2d2d2d] text-white resize-none outline-none focus:border-indigo-500 transition-colors min-h-[100px] custom-scrollbar" 
                />
              </div>

              {content && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Insertion Cursor Preview</div>
                  {renderPreview(content, offset)}
                </div>
              )}
            </div>

            <button 
              onClick={add} 
              disabled={!name || !key || !content}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 font-bold text-xs select-none py-3 rounded-xl text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/10 cursor-pointer"
            >
              <Plus size={15} /> Save Custom Snippet
            </button>
          </div>

          {/* Right Panel: Saved snippets list */}
          <div className="flex-1 p-6 flex flex-col overflow-y-auto custom-scrollbar bg-[#141417]">
            <h3 className="text-xs font-bold text-[#a5a5b1] uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-[#2d2d2d] pb-2">
              <Layers size={14} className="text-emerald-400" /> Active Snippets Catalog
            </h3>

            {boilerplates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#2d2d2d] rounded-2xl bg-[#1b1b20]/30 mr-2">
                <Terminal size={32} className="text-gray-600 mb-3 animate-pulse" />
                <p className="text-xs text-gray-400">No active boilerplates found.</p>
                <p className="text-[10px] text-gray-500 mt-1">Use the left configuration panel to populate your list!</p>
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {boilerplates.map((bp) => (
                  <div 
                    key={bp.id} 
                    className="bg-[#1b1b20] border border-[#2d2d2d] hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-300 relative group flex flex-col shadow-md"
                  >
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white tracking-tight">{bp.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono font-bold">
                            Trigger: {bp.key}
                          </span>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase">
                            Scope: {bp.scope}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-nowrap shrink-0">
                        {/* Insert Button */}
                        <button
                          onClick={() => {
                            playSound('success');
                            onInsertSnippet(bp.content);
                          }}
                          className="px-2.5 py-1.5 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow shadow-indigo-500/10 flex items-center gap-1 cursor-pointer"
                          title="Paste this snippet code at the current active editor line"
                        >
                          <Plus size={11} /> Paste to Editor
                        </button>

                        {/* Test-Play (Overwrite) */}
                        <button 
                          onClick={() => {
                            playSound('success');
                            onTestBoilerplate(bp.content, bp.offset);
                          }} 
                          className="px-2.5 py-1.5 text-[10px] bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 rounded-lg hover:bg-emerald-900 duration-150 flex items-center gap-1 cursor-pointer"
                          title="Completely overwrite current editor to test offsets"
                        >
                          <Play size={10} /> Test-Play
                        </button>

                        {/* Copy Code */}
                        <button 
                          onClick={(e) => copyToClipboard(bp.content, bp.id, e)} 
                          className="p-1.5 text-gray-400 bg-[#25252b] hover:text-white rounded-lg transition-colors border border-[#303038]"
                          title="Copy whole code to system clipboard"
                        >
                          <Clipboard size={12} />
                        </button>

                        {/* Delete Button (Keep original custom ones safe if user wants, but can delete) */}
                        <button 
                          onClick={(e) => deleteBp(bp.id, e)} 
                          className="p-1.5 text-gray-500 hover:text-red-400 bg-[#25252b] rounded-lg transition-colors border border-[#303038]"
                          title="Delete boilerplate"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {copiedId === bp.id && (
                      <div className="absolute top-2 right-2 text-[10px] font-bold text-emerald-400 bg-[#121215] border border-emerald-500/20 px-2 py-0.5 rounded shadow animate-bounce">
                        Copied code!
                      </div>
                    )}

                    <div className="mt-3 relative">
                      {renderPreview(bp.content, bp.offset)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
