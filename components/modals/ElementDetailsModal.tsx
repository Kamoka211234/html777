import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X, Palette, Hash, Copy, Check, 
    Info, MousePointer2, Terminal,
    Save, RotateCcw, Code
} from 'lucide-react';
import { FileSystemItem } from '../../types';
import { playSound } from '../../utils/sound';

interface ElementDetailsModalProps {
    data: {
        tagName: string;
        id: string;
        className: string;
        innerText: string;
        innerHTML: string;
        styles: any;
        attributes: any;
        rect: {
            width: number;
            height: number;
        };
    };
    files: FileSystemItem[];
    onClose: () => void;
    onNavigate: (fileId: string, line: number) => void;
    onUpdateFile: (fileId: string, content: string) => void;
}

const ElementDetailsModal: React.FC<ElementDetailsModalProps> = ({ data, files, onClose, onNavigate, onUpdateFile }) => {
    const [activeTab, setActiveTab] = useState<'styles' | 'attributes' | 'logic'>('styles');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [editedAttributes, setEditedAttributes] = useState<Record<string, string>>(() => {
        const attrs: Record<string, string> = {
            class: '',
            style: ''
        };
        // Populate existing attributes, with 'className' normalized to 'class'
        Object.entries(data.attributes).forEach(([k, v]) => {
            if (!k.startsWith('on')) {
                if (k === 'class' || k === 'className') {
                    attrs['class'] = v as string;
                } else {
                    attrs[k] = v as string;
                }
            }
        });
        return attrs;
    });

    const [editedHandlers, setEditedHandlers] = useState<Record<string, string>>(() => {
        const handlers: Record<string, string> = {};
        Object.entries(data.attributes).forEach(([k, v]) => {
            if (k.startsWith('on')) handlers[k] = v as string;
        });
        return handlers;
    });

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        playSound('click');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const parseInlineStyles = (styleStr: string) => {
        const styles: Record<string, string> = {};
        if (!styleStr) return styles;
        
        styleStr.split(';').forEach(rule => {
            const parts = rule.split(':');
            if (parts.length >= 2) {
                const property = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                if (property && value) {
                    const camelProperty = property.replace(/-./g, x => x[1].toUpperCase());
                    styles[camelProperty] = value;
                }
            }
        });
        return styles;
    };

    const handleClassToggle = (newClass: string) => {
        const currentClassVal = editedAttributes['class'] || '';
        let classes = currentClassVal.split(' ').map(c => c.trim()).filter(Boolean);
        
        const isOverlapping = (c1: string, c2: string) => {
            const categories = [
                ['p-', 'm-'],
                ['rounded-none', 'rounded-sm', 'rounded', 'rounded-lg', 'rounded-xl', 'rounded-full'],
                ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'],
                ['text-left', 'text-center', 'text-right', 'text-justify'],
                ['block', 'flex', 'inline-flex', 'grid', 'hidden'],
                ['bg-[#ea580c]', 'bg-zinc-900', 'bg-white', 'bg-zinc-500'],
                ['text-white', 'text-black', 'text-[#ea580c]', 'text-zinc-400']
            ];
            for (const cat of categories) {
                if (cat.length === 2 && cat[0].endsWith('-')) {
                    if (cat.some(p => c2.startsWith(p) && c1.startsWith(p))) return true;
                } else {
                    if (cat.includes(c1) && cat.includes(c2)) return true;
                }
            }
            return false;
        };

        if (classes.includes(newClass)) {
            classes = classes.filter(c => c !== newClass);
        } else {
            classes = classes.filter(c => !isOverlapping(c, newClass));
            classes.push(newClass);
        }
        
        setEditedAttributes(prev => ({
            ...prev,
            class: classes.join(' ')
        }));
        playSound('click');
    };

    const findPotentialSources = () => {
        const results: { fileId: string, fileName: string, line: number, snippet: string }[] = [];
        files.forEach(file => {
            if (file.type === 'file' && file.content && (file.name.endsWith('.html') || file.name.endsWith('.jsx') || file.name.endsWith('.tsx'))) {
                const lines = file.content.split('\n');
                lines.forEach((line, index) => {
                    const lowerLine = line.toLowerCase();
                    const hasTag = lowerLine.includes(`<${data.tagName}`);
                    const hasId = data.id && lowerLine.includes(`id="${data.id}"`);
                    const hasClass = data.className && data.className.split(' ').some(c => c && lowerLine.includes(c));
                    if (hasTag && (hasId || hasClass)) {
                        results.push({ fileId: file.id, fileName: file.name, line: index, snippet: line.trim() });
                    }
                });
            }
        });
        return results;
    };

    const handleSave = async () => {
        setIsSaving(true);
        const sources = findPotentialSources();
        const source = sources[0];
        if (source) {
            const file = files.find(f => f.id === source.fileId);
            if (file && file.content) {
                const lines = file.content.split('\n');
                let line = lines[source.line];
                
                const allNewAttrs = { ...editedAttributes, ...editedHandlers };
                
                Object.entries(allNewAttrs).forEach(([key, value]) => {
                    let targetKey = key;
                    const isReactFile = file.name.endsWith('.tsx') || file.name.endsWith('.jsx');
                    if (key === 'class' && isReactFile) {
                        targetKey = 'className';
                    } else if (key === 'className' && !isReactFile) {
                        targetKey = 'class';
                    }

                    const attrRegex = new RegExp(`${targetKey}="[^"]*"`);
                    if (line.match(attrRegex)) {
                        line = line.replace(attrRegex, `${targetKey}="${value}"`);
                    } else if (value) {
                        line = line.replace(new RegExp(`<${data.tagName}`), `<${data.tagName} ${targetKey}="${value}"`);
                    }
                });

                lines[source.line] = line;
                onUpdateFile(file.id, lines.join('\n'));
                playSound('success');
            }
        }
        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const findLogicReferences = () => {
        const results: { fileId: string, fileName: string, line: number, snippet: string }[] = [];
        const terms: string[] = [];
        if (data.id) terms.push(data.id);
        
        if (!data.id && data.className) {
            const commonPrefixes = ['flex', 'grid', 'w-', 'h-', 'p-', 'm-', 'text-', 'bg-', 'border-', 'rounded', 'items-', 'justify-', 'gap-'];
            data.className.split(' ').forEach(c => {
                const trimmed = c.trim();
                if (trimmed && !commonPrefixes.some(prefix => trimmed.startsWith(prefix))) {
                    terms.push(trimmed);
                }
            });
        }

        if (terms.length === 0) return [];

        files.forEach(file => {
            if (file.type === 'file' && file.content && (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.jsx') || file.name.endsWith('.html'))) {
                const lines = file.content.split('\n');
                lines.forEach((line, index) => {
                    const found = terms.some(term => line.includes(term));
                    if (found) {
                        const isLogic = /document\.|querySelector|getElementById|getElementsBy|addEventListener|onclick|onchange|oninput|onfocus|onblur/.test(line) ||
                                      terms.some(term => new RegExp(`['"\`]${term}['"\`]`).test(line)) ||
                                      terms.some(term => new RegExp(`\\.${term}\\b`).test(line));

                        if (isLogic && !results.some(r => r.fileId === file.id && r.line === index)) {
                            results.push({
                                fileId: file.id,
                                fileName: file.name,
                                line: index,
                                snippet: line.trim()
                            });
                        }
                    }
                });
            }
        });

        return results.sort((a, b) => {
            const aScore = /document|querySelector|getElementById/.test(a.snippet) ? 2 : 1;
            const bScore = /document|querySelector|getElementById/.test(b.snippet) ? 2 : 1;
            return bScore - aScore;
        }).slice(0, 10);
    };

    const logicRefs = findLogicReferences();

    return (
        <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e1e1e] w-full max-w-2xl rounded-xl shadow-2xl border border-[#333] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-[#252526] px-6 py-4 border-b border-[#333] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#ea580c]/20 flex items-center justify-center text-[#ea580c]">
                            <MousePointer2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                <span className="text-gray-400">&lt;</span>
                                {data.tagName}
                                <span className="text-gray-400">&gt;</span>
                                {data.id && <span className="text-[#007acc] text-sm font-mono">#{data.id}</span>}
                            </h2>
                            <p className="text-xs text-gray-500 font-mono truncate max-w-[300px]">
                                {editedAttributes['class'] || data.className || 'no classes'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-[#333] rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#333] bg-[#1e1e1e] overflow-x-auto no-scrollbar shrink-0">
                    {[
                        { id: 'styles', icon: Palette, label: 'CSS & Quick Styler' },
                        { id: 'attributes', icon: Hash, label: 'HTML Attributes' },
                        { id: 'logic', icon: Terminal, label: 'Logic Connections' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 min-w-[120px] py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all border-b-2 ${
                                activeTab === tab.id 
                                ? 'border-[#ea580c] text-[#ea580c] bg-[#ea580c]/5 font-bold' 
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#252526]'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                    {activeTab === 'styles' && (
                        <div className="space-y-6">
                            {/* Visual Styler Sandbox */}
                            <div className="border border-[#ea580c]/30 rounded-xl bg-[#2a1b14]/30 p-4 flex flex-col items-center justify-center relative overflow-hidden group select-none">
                                <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                                    <Palette size={11} className="animate-pulse text-[#ea580c]" />
                                    <span>Interactive Style Sandbox</span>
                                </div>
                                <div className="absolute top-2 right-3 text-[10px] text-gray-500 font-mono">
                                    &lt;{data.tagName}&gt;
                                </div>
                                <div className="py-6 flex items-center justify-center w-full min-h-[90px] text-center">
                                    <div 
                                        className={`px-5 py-2.5 transition-all text-center ${(editedAttributes['class'] || '')}`}
                                        style={parseInlineStyles(editedAttributes['style'] || '')}
                                    >
                                        {data.innerText || 'Preview element text'}
                                    </div>
                                </div>
                                <div className="w-full flex justify-end gap-2 border-t border-[#333]/50 pt-3">
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg shadow-[#ea580c]/25"
                                    >
                                        {isSaving ? <RotateCcw size={12} className="animate-spin" /> : <Save size={12} />}
                                        {isSaving ? 'Applying Changes...' : 'Save & Compile Styles'}
                                    </button>
                                </div>
                            </div>

                            {/* Preset Buttons Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Presets Column */}
                                <div className="bg-[#252526] rounded-xl p-4 border border-[#333] space-y-4">
                                    <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
                                        <Code size={12} className="text-[#ea580c]" /> Quick Tailwind Presets
                                    </h4>

                                    {/* Spacing presets */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">Padding</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['p-1', 'p-2', 'p-4', 'p-6', 'p-8'].map(cls => (
                                                <button
                                                    key={cls}
                                                    onClick={() => handleClassToggle(cls)}
                                                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                                                        (editedAttributes['class'] || '').split(' ').includes(cls)
                                                        ? 'bg-[#ea580c] text-white font-bold'
                                                        : 'bg-black/30 hover:bg-black/50 text-gray-400'
                                                    }`}
                                                >
                                                    {cls}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Rounding presets */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">Border Radius</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['rounded-none', 'rounded', 'rounded-lg', 'rounded-xl', 'rounded-full'].map(cls => (
                                                <button
                                                    key={cls}
                                                    onClick={() => handleClassToggle(cls)}
                                                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                                                        (editedAttributes['class'] || '').split(' ').includes(cls)
                                                        ? 'bg-[#ea580c] text-white font-bold'
                                                        : 'bg-black/30 hover:bg-black/50 text-gray-400'
                                                    }`}
                                                >
                                                    {cls}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Shadows presets */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">Shadow Effects</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'].map(cls => (
                                                <button
                                                    key={cls}
                                                    onClick={() => handleClassToggle(cls)}
                                                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                                                        (editedAttributes['class'] || '').split(' ').includes(cls)
                                                        ? 'bg-[#ea580c] text-white font-bold'
                                                        : 'bg-black/30 hover:bg-black/50 text-gray-400'
                                                    }`}
                                                >
                                                    {cls}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Alignments presets */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">Alignment</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['text-left', 'text-center', 'text-right'].map(cls => (
                                                <button
                                                    key={cls}
                                                    onClick={() => handleClassToggle(cls)}
                                                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                                                        (editedAttributes['class'] || '').split(' ').includes(cls)
                                                        ? 'bg-[#ea580c] text-white font-bold'
                                                        : 'bg-black/30 hover:bg-black/50 text-gray-400'
                                                    }`}
                                                >
                                                    {cls}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Display presets */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">Display Layout</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['block', 'flex', 'grid', 'hidden'].map(cls => (
                                                <button
                                                    key={cls}
                                                    onClick={() => handleClassToggle(cls)}
                                                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                                                        (editedAttributes['class'] || '').split(' ').includes(cls)
                                                        ? 'bg-[#ea580c] text-white font-bold'
                                                        : 'bg-black/30 hover:bg-black/50 text-gray-400'
                                                    }`}
                                                >
                                                    {cls}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Color presets */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">Presets & Colors</label>
                                        <div className="grid grid-cols-2 gap-1">
                                            {[
                                                { label: 'Primary BG', cls: 'bg-[#ea580c]' },
                                                { label: 'Dark BG', cls: 'bg-zinc-900' },
                                                { label: 'Light BG', cls: 'bg-white' },
                                                { label: 'Gray BG', cls: 'bg-zinc-500' },
                                                { label: 'White Text', cls: 'text-white' },
                                                { label: 'Black Text', cls: 'text-black' },
                                                { label: 'Orange Text', cls: 'text-[#ea580c]' },
                                                { label: 'Gray Text', cls: 'text-zinc-400' }
                                            ].map(item => (
                                                <button
                                                    key={item.label}
                                                    onClick={() => handleClassToggle(item.cls)}
                                                    className={`px-2 py-1 text-[10px] rounded transition-colors border border-transparent ${
                                                        (editedAttributes['class'] || '').split(' ').includes(item.cls)
                                                        ? 'bg-[#ea580c]/20 border-[#ea580c] text-white font-semibold'
                                                        : 'bg-black/30 hover:bg-black/50 text-gray-400'
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Text Areas */}
                                <div className="bg-[#252526] rounded-xl p-4 border border-[#333] flex flex-col gap-3">
                                    <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
                                        <Palette size={12} className="text-blue-400" /> Advanced Manual Editors
                                    </h4>

                                    {/* Tailwind string input */}
                                    <div className="flex-1 flex flex-col min-h-[100px]">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] text-gray-500">Tailwind Classes List</label>
                                            <button 
                                                onClick={() => {
                                                    setEditedAttributes(p => ({ ...p, class: '' }));
                                                    playSound('click');
                                                }}
                                                className="text-[9px] text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <textarea
                                            value={editedAttributes['class'] || ''}
                                            onChange={(e) => setEditedAttributes({ ...editedAttributes, class: e.target.value })}
                                            className="w-full flex-1 bg-black/40 border border-[#333] rounded p-2 text-gray-200 font-mono text-xs focus:border-[#ea580c] outline-none resize-none"
                                            placeholder="e.g. p-4 bg-zinc-900 text-white rounded-lg border border-zinc-700"
                                        />
                                    </div>

                                    {/* Inline CSS styles input */}
                                    <div className="flex-1 flex flex-col min-h-[100px]">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] text-gray-500">Raw Inline CSS Rule String</label>
                                            <button 
                                                onClick={() => {
                                                    setEditedAttributes(p => ({ ...p, style: '' }));
                                                    playSound('click');
                                                }}
                                                className="text-[9px] text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <textarea
                                            value={editedAttributes['style'] || ''}
                                            onChange={(e) => setEditedAttributes({ ...editedAttributes, style: e.target.value })}
                                            className="w-full flex-1 bg-black/40 border border-[#333] rounded p-2 text-yellow-400 font-mono text-xs focus:border-[#ea580c] outline-none resize-none"
                                            placeholder="e.g. color: red; font-size: 1.5rem; opacity: 0.9;"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Collapsible Computed Styles list */}
                            <div className="bg-[#252526] rounded-xl p-4 border border-[#333]">
                                <details className="group">
                                    <summary className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center justify-between cursor-pointer list-none select-none">
                                        <span className="flex items-center gap-1.5">
                                            <Palette size={12} className="text-zinc-500" /> Computed Read-Only Values ({Object.keys(data.styles).length})
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-500 transition-transform group-open:rotate-180">▼</span>
                                    </summary>
                                    <div className="grid grid-cols-2 gap-2 mt-4 animate-in fade-in duration-200 h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {Object.entries(data.styles).map(([key, value]) => (
                                            <div key={key} className="bg-black/20 p-2 rounded border border-[#333] group/item hover:border-[#444] transition-all flex flex-col justify-between">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold truncate max-w-[150px]">{key}</span>
                                                    <button 
                                                        onClick={() => handleCopy(value as string, key)}
                                                        className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-[#333] rounded text-gray-400 transition-all"
                                                    >
                                                        {copiedField === key ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                                                    </button>
                                                </div>
                                                <div className="text-xs text-gray-300 font-mono truncate" title={value as string}>
                                                    {value as string}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attributes' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                    <Hash size={16} className="text-[#ea580c]" />
                                    HTML Attribute Managers
                                </h3>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg shadow-[#ea580c]/20"
                                >
                                    {isSaving ? <RotateCcw size={14} className="animate-spin" /> : <Save size={14} />}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Editable DOM Content</h4>
                                <div className="bg-[#252526] p-3 rounded-lg border border-[#333] flex flex-col gap-2">
                                    <span className="text-[#007acc] font-mono text-xs">innerText</span>
                                    <textarea 
                                        defaultValue={data.innerText}
                                        onBlur={(e) => {
                                            if (e.target.value !== data.innerText) {
                                                const sources = findPotentialSources();
                                                const source = sources[0];
                                                if (source) {
                                                    const file = files.find(f => f.id === source.fileId);
                                                    if (file && file.content) {
                                                        let newContent = file.content;
                                                        if (newContent.includes(data.innerText)) {
                                                            newContent = newContent.replace(data.innerText, e.target.value);
                                                        } else {
                                                            const lines = newContent.split('\n');
                                                            if (lines[source.line].includes(data.innerText)) {
                                                                lines[source.line] = lines[source.line].replace(data.innerText, e.target.value);
                                                                newContent = lines.join('\n');
                                                            }
                                                        }
                                                        if (newContent !== file.content) {
                                                            onUpdateFile(file.id, newContent);
                                                            playSound('success');
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                        className="w-full bg-black/30 border border-[#333] rounded p-2 text-gray-300 font-mono text-xs focus:border-[#ea580c] outline-none min-h-[40px]"
                                    />
                                </div>
                                <div className="bg-[#252526] p-3 rounded-lg border border-[#333] flex flex-col gap-2">
                                    <span className="text-[#007acc] font-mono text-xs">innerHTML</span>
                                    <textarea 
                                        defaultValue={data.innerHTML}
                                        onBlur={(e) => {
                                            if (e.target.value !== data.innerHTML) {
                                                const sources = findPotentialSources();
                                                const source = sources[0];
                                                if (source) {
                                                    const file = files.find(f => f.id === source.fileId);
                                                    if (file && file.content) {
                                                        let newContent = file.content;
                                                        if (newContent.includes(data.innerHTML)) {
                                                            newContent = newContent.replace(data.innerHTML, e.target.value);
                                                        } else {
                                                            const lines = newContent.split('\n');
                                                            if (lines[source.line].includes(data.innerHTML)) {
                                                                lines[source.line] = lines[source.line].replace(data.innerHTML, e.target.value);
                                                                newContent = lines.join('\n');
                                                            }
                                                        }
                                                        if (newContent !== file.content) {
                                                            onUpdateFile(file.id, newContent);
                                                            playSound('success');
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                        className="w-full bg-black/30 border border-[#333] rounded p-2 text-gray-300 font-mono text-xs focus:border-[#ea580c] outline-none min-h-[60px]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Standard Key/Value Attributes</h4>
                                {Object.keys(editedAttributes).length > 0 ? (
                                    Object.entries(editedAttributes).map(([key, value]) => {
                                        if (key === 'class' || key === 'style') return null; // handled separately in styling sandbox
                                        return (
                                            <div key={key} className="bg-[#252526] p-3 rounded-lg border border-[#333] flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#007acc] font-mono text-xs">{key}</span>
                                                    <button 
                                                        onClick={() => handleCopy(value as string, key)}
                                                        className="p-1 hover:bg-[#333] rounded text-gray-400 transition-colors"
                                                    >
                                                        {copiedField === key ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                                <input 
                                                    type="text"
                                                    value={value as string}
                                                    onChange={(e) => setEditedAttributes({...editedAttributes, [key]: e.target.value})}
                                                    className="w-full bg-black/30 border border-[#333] rounded p-2 text-green-400 font-mono text-xs focus:border-[#ea580c] outline-none"
                                                />
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10 text-gray-500 italic">
                                        No active attributes found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'logic' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                    <Terminal size={16} className="text-purple-400" />
                                    Logic Reference Triggers
                                </h3>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg shadow-[#ea580c]/20"
                                >
                                    {isSaving ? <RotateCcw size={14} className="animate-spin" /> : <Save size={14} />}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">JavaScript References</h4>
                                <div className="space-y-2">
                                    {logicRefs.length > 0 ? (
                                        logicRefs.map((ref, idx) => (
                                            <div key={idx} className="bg-[#252526] p-3 rounded-lg border border-[#333] flex flex-col gap-2">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold text-gray-300 cursor-pointer hover:text-[#007acc] hover:underline" onClick={() => onNavigate(ref.fileId, ref.line)}>{ref.fileName}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono">Line {ref.line + 1}</span>
                                                </div>
                                                <textarea 
                                                    defaultValue={ref.snippet}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== ref.snippet) {
                                                            const file = files.find(f => f.id === ref.fileId);
                                                            if (file && file.content) {
                                                                const lines = file.content.split('\n');
                                                                lines[ref.line] = lines[ref.line].replace(ref.snippet, e.target.value);
                                                                onUpdateFile(file.id, lines.join('\n'));
                                                                playSound('success');
                                                            }
                                                        }
                                                    }}
                                                    className="w-full bg-black/30 border border-[#333] rounded p-2 text-purple-300 font-mono text-[10px] focus:border-purple-500 outline-none resize-y min-h-[40px]"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="bg-[#252526] p-4 rounded-lg border border-[#333] text-center text-gray-500 text-xs italic">
                                            No file logic references found for this element.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Inline Event Handlers</h4>
                                <div className="space-y-2">
                                    {Object.keys(editedHandlers).length > 0 ? (
                                        Object.entries(editedHandlers).map(([key, value]) => (
                                            <div key={key} className="bg-[#252526] p-3 rounded-lg border border-[#333] flex flex-col gap-2">
                                                <span className="text-xs font-bold text-green-400">{key}</span>
                                                <textarea 
                                                    value={value as string}
                                                    onChange={(e) => setEditedHandlers({...editedHandlers, [key]: e.target.value})}
                                                    className="w-full bg-black/30 border border-[#333] rounded p-2 text-gray-400 font-mono text-[10px] focus:border-[#ea580c] outline-none resize-none h-16"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-500 text-xs italic">
                                            No inline event actions configured.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-[#252526] px-6 py-4 border-t border-[#333] flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-gray-500 flex items-center gap-2">
                        <Info size={12} />
                        Double click any source ref element to navigate.
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        Close Inspector
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ElementDetailsModal;
