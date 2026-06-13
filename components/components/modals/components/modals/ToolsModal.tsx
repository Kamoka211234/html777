
import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Upload, Image as ImageIcon, Palette, Zap, ArrowRight, Save, Edit3, Grid, FileText, Code, Hash, Smartphone, Calculator, Clock, Type, Scissors, Link, Eye, RefreshCw, Box, Lock, Terminal, List, Table, Video, Workflow, Move, Brush, Eraser, Clipboard, Trash2, Folder, Play, Pause, RotateCcw, Share2, Plus, Minus, Download, Layers, Monitor, ChevronRight, ChevronDown } from 'lucide-react';
import { playSound } from '../../utils/sound';
import { FileSystemItem } from '../../types';
import GradientGenerator from '../GradientGenerator';
import ButtonGenerator from '../ButtonGenerator';
import TableGenerator from '../TableGenerator';
import ReactTranspilerTool from '../ReactTranspilerTool';

interface ToolModalProps {
  type: string;
  onClose: () => void;
  onSaveFile?: (file: File) => void;
  files?: FileSystemItem[];
  onTestBoilerplate?: (content: string, offset: number) => void;
}

const TOOL_CATEGORIES = {
    'Common': ['color', 'palette', 'base64', 'minifier', 'qrcode', 'uuid', 'image-editor', 'svg', 'paint', 'workflow', 'clipboard'],
    'Web': ['html', 'url', 'meta', 'useragent', 'http-codes', 'mime-types'],
    'CSS': ['shadow', 'units', 'border-radius', 'flexbox', 'grid', 'triangle', 'clip-path', 'cursor'],
    'Text & Lists': ['diff', 'case', 'lorem', 'word-count', 'text-binary', 'repeater', 'sort-list', 'remove-dupes'],
    'Dev': ['react-transpiler', 'keycode', 'json', 'jwt', 'regex', 'hash', 'sql', 'xml', 'curl', 'epoch', 'password', 'snippets', 'boilerplate-custom'],
    'Math': ['calculator', 'aspect-ratio', 'number-base'],
    'Misc': ['stopwatch', 'device-info', 'markdown']
};

const ALL_TOOLS = Object.values(TOOL_CATEGORIES).flat();

// --- Sub-components ---

const FilePicker = ({ files, onSelect, onClose }: { files: FileSystemItem[], onSelect: (content: string, name: string) => void, onClose: () => void }) => {
    const images = files.filter(f => f.type === 'file' && f.isBinary && f.content && (f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.webp') || f.name.endsWith('.gif') || f.name.endsWith('.svg')));

    return (
        <div className="absolute inset-0 bg-[#252526] z-50 flex flex-col p-4 animate-in fade-in">
            <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-2">
                <span className="font-bold text-white flex items-center gap-2"><ImageIcon size={16}/> Select Image from Project</span>
                <button onClick={onClose}><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-4 content-start">
                {images.length === 0 ? <div className="col-span-4 text-center text-gray-500">No images found in project.</div> :
                images.map(img => (
                    <button key={img.id} onClick={() => onSelect(img.content!, img.name)} className="flex flex-col items-center gap-2 p-2 bg-[#1e1e1e] hover:bg-[#333] rounded border border-[#333]">
                        <img src={img.content || undefined} className="w-16 h-16 object-contain bg-[url('https://transparenttextures.com/patterns/dark-matter.png')]" />
                        <span className="text-[10px] truncate w-full text-center">{img.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const PaintTool = ({ onSave }: { onSave: (f: File) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(5);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const c = canvasRef.current;
        if(c) {
            c.width = 600;
            c.height = 400;
            const ctx = c.getContext('2d');
            if(ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0,0,600,400);
            }
        }
    }, []);

    const draw = (e: React.MouseEvent) => {
        if(!isDrawing || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if(!ctx) return;
        const rect = canvasRef.current.getBoundingClientRect();
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const startDraw = (e: React.MouseEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    return (
        <div className="flex flex-col gap-2 h-full items-center justify-center">
            <div className="flex gap-4 p-2 bg-[#111] rounded border border-[#333]">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                <input type="range" min="1" max="50" value={size} onChange={e => setSize(Number(e.target.value))} />
                <button onClick={() => {
                    const ctx = canvasRef.current?.getContext('2d');
                    if(ctx) { ctx.fillStyle='white'; ctx.fillRect(0,0,600,400); }
                }} className="text-xs bg-red-900/50 text-red-200 px-2 rounded">Clear</button>
            </div>
            <div className="border border-[#555] overflow-auto max-w-full max-h-full">
                <canvas 
                    ref={canvasRef} 
                    onMouseDown={startDraw} 
                    onMouseUp={() => { setIsDrawing(false); canvasRef.current?.getContext('2d')?.beginPath(); }}
                    onMouseMove={draw}
                    className="bg-white cursor-crosshair block"
                />
            </div>
            <button onClick={() => {
                canvasRef.current?.toBlob(blob => {
                    if(blob) onSave(new File([blob], "painting.png", {type: "image/png"}));
                });
            }} className="bg-[#007acc] text-white px-4 py-1 rounded text-xs">Save Image</button>
        </div>
    );
};

const WorkflowTool = () => {
    const [input, setInput] = useState('');
    const [steps, setSteps] = useState<string[]>([]);
    
    const transforms: Record<string, (s: string) => string> = {
        'Upper': s => s.toUpperCase(),
        'Lower': s => s.toLowerCase(),
        'Base64 Enc': s => btoa(s),
        'Base64 Dec': s => { try { return atob(s) } catch { return 'Error' } },
        'URI Enc': s => encodeURIComponent(s),
        'URI Dec': s => decodeURIComponent(s),
        'Reverse': s => s.split('').reverse().join(''),
        'Trim': s => s.trim(),
        'HTML Esc': s => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m))
    };

    const result = steps.reduce((acc, step) => transforms[step] ? transforms[step](acc) : acc, input);

    return (
        <div className="flex flex-col h-full gap-2">
            <div className="flex gap-2 h-full">
                <div className="w-1/3 flex flex-col gap-2 border-r border-[#333] pr-2 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400">Steps</h3>
                    <div className="grid grid-cols-2 gap-1">
                        {Object.keys(transforms).map(k => (
                            <button key={k} onClick={() => setSteps([...steps, k])} className="text-[10px] bg-[#333] hover:bg-[#444] py-1 rounded text-left px-2">{k}</button>
                        ))}
                    </div>
                    <div className="mt-4 border-t border-[#333] pt-2">
                        <h3 className="text-xs font-bold text-gray-400 mb-2">Pipeline</h3>
                        {steps.map((s, i) => (
                            <div key={i} className="flex justify-between text-xs bg-[#222] p-1 mb-1 rounded">
                                <span>{i+1}. {s}</span>
                                <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} className="text-red-400"><X size={10}/></button>
                            </div>
                        ))}
                        {steps.length > 0 && <button onClick={() => setSteps([])} className="text-xs text-red-400 mt-2 w-full text-center">Clear</button>}
                    </div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                    <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Input text..." className="flex-1 bg-[#1e1e1e] border border-[#333] p-2 text-xs font-mono resize-none rounded" />
                    <div className="text-center text-gray-500"><ArrowRight className="rotate-90 md:rotate-0" /></div>
                    <textarea readOnly value={result} placeholder="Result..." className="flex-1 bg-[#111] border border-[#333] p-2 text-xs font-mono text-green-400 resize-none rounded" />
                </div>
            </div>
        </div>
    );
};

const ClipboardManager = () => {
    const [history, setHistory] = useState<string[]>([]);
    const [pasteArea, setPasteArea] = useState('');

    const add = () => {
        if(pasteArea && !history.includes(pasteArea)) setHistory([pasteArea, ...history]);
        setPasteArea('');
    };

    const remove = (index: number) => {
        setHistory(history.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col h-full gap-2">
            <div className="flex gap-2">
                <input value={pasteArea} onChange={e => setPasteArea(e.target.value)} placeholder="Paste text to save..." className="flex-1 bg-[#1e1e1e] p-2 rounded text-xs border border-[#333]" />
                <button onClick={add} className="bg-[#007acc] px-4 rounded text-white text-xs">Save</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
                {history.map((item, i) => (
                    <div key={i} className="bg-[#222] p-2 rounded flex justify-between items-center group">
                        <span className="truncate text-xs font-mono w-3/4 text-gray-300">{item}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { navigator.clipboard.writeText(item); playSound('click'); }} className="text-[#007acc] hover:text-white text-xs" title="Copy"><Copy size={12}/></button>
                            <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300 text-xs" title="Delete"><Trash2 size={12}/></button>
                        </div>
                    </div>
                ))}
                {history.length === 0 && <div className="text-center text-gray-500 text-xs mt-10">Clipboard history empty</div>}
            </div>
        </div>
    );
};

const SnippetManager = () => {
    const [snippets, setSnippets] = useState<{name: string, code: string}[]>(() => {
        const saved = localStorage.getItem('dev_snippets');
        return saved ? JSON.parse(saved) : [];
    });
    const [name, setName] = useState('');
    const [code, setCode] = useState('');

    useEffect(() => {
        localStorage.setItem('dev_snippets', JSON.stringify(snippets));
    }, [snippets]);

    const add = () => {
        if(name && code) {
            setSnippets([{name, code}, ...snippets]);
            setName(''); setCode('');
            playSound('success');
        }
    };

    return (
        <div className="flex flex-col h-full gap-3">
            <div className="bg-[#252526] p-3 rounded-lg border border-[#333] space-y-2">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Snippet Name..." className="w-full bg-[#1e1e1e] p-2 rounded text-xs border border-[#333]" />
                <textarea value={code} onChange={e => setCode(e.target.value)} placeholder="Code snippet..." className="w-full h-24 bg-[#1e1e1e] p-2 rounded text-xs font-mono border border-[#333] resize-none" />
                <button onClick={add} className="w-full bg-[#007acc] py-1.5 rounded text-white text-xs font-bold flex items-center justify-center gap-2"><Plus size={14}/> Add Snippet</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {snippets.map((s, i) => (
                    <div key={i} className="bg-[#222] p-3 rounded-lg border border-[#333] group hover:border-[#007acc] transition-all">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-[#007acc]">{s.name}</span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { navigator.clipboard.writeText(s.code); playSound('click'); }} className="text-gray-400 hover:text-white"><Copy size={12}/></button>
                                <button onClick={() => setSnippets(snippets.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400"><Trash2 size={12}/></button>
                            </div>
                        </div>
                        <pre className="text-[10px] text-gray-500 font-mono truncate bg-[#111] p-1 rounded">{s.code}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BoilerplateCustomTool = ({ onTest }: { onTest?: (content: string, offset: number) => void }) => {
    const [boilerplates, setBoilerplates] = useState<any[]>(() => {
        const saved = localStorage.getItem('vs_custom_boilerplates');
        return saved ? JSON.parse(saved) : [];
    });
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [scope, setScope] = useState<'html' | 'css' | 'javascript' | 'all'>('html');
    const [content, setContent] = useState('');
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        localStorage.setItem('vs_custom_boilerplates', JSON.stringify(boilerplates));
    }, [boilerplates]);

    const add = () => {
        if (name && key && content) {
            setBoilerplates([{ id: Date.now().toString(), name, key, scope, content, offset }, ...boilerplates]);
            setName(''); setKey(''); setContent(''); setOffset(0);
            playSound('success');
        }
    };

    const deleteBp = (id: string) => {
        setBoilerplates(boilerplates.filter(b => b.id !== id));
        playSound('pop');
    };

    const renderPreview = (text: string, cursorIdx: number) => {
        const safeIdx = Math.min(Math.max(0, cursorIdx), text.length);
        const before = text.substring(0, safeIdx);
        const after = text.substring(safeIdx);
        return (
            <div className="relative font-mono text-xs bg-[#111] p-3 rounded-lg border border-[#333] leading-relaxed select-none min-h-[100px] whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
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
                <span className="inline-block w-[2.5px] h-[14px] bg-yellow-400 align-middle mx-[0.5px] preview-visual-cursor" />
                <span className="text-gray-300">{after}</span>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full gap-3 text-gray-200">
            <div className="bg-[#252526] p-3 rounded-lg border border-[#333] space-y-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Create Custom Boilerplate</div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 font-bold uppercase">Boilerplate Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Centered Box" className="w-full bg-[#1e1e1e] p-2 rounded text-xs border border-[#333] text-white outline-none focus:border-[#007acc]" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 font-bold uppercase">Trigger Keyword (Key)</label>
                        <input value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. cbox" className="w-full bg-[#1e1e1e] p-2 rounded text-xs border border-[#333] text-white outline-none focus:border-[#007acc]" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Scope</label>
                        <select value={scope} onChange={e => setScope(e.target.value as any)} className="w-full bg-[#1e1e1e] p-2 rounded text-xs border border-[#333] text-white outline-none focus:border-[#007acc]">
                            <option value="html">HTML only</option>
                            <option value="css">CSS only</option>
                            <option value="javascript">JavaScript only</option>
                            <option value="all">All File Types</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase flex justify-between items-center">
                            <span>Cursor Offset ({offset})</span>
                            <span className="text-[9px] text-blue-400 lowercase animate-pulse">adjust cursor index</span>
                        </label>
                        <input type="range" min="0" max={content.length} value={offset} onChange={e => setOffset(Number(e.target.value))} className="w-full accent-[#007acc]" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Code / Content</label>
                    <textarea value={content} onChange={e => { setContent(e.target.value); if(offset > e.target.value.length) setOffset(e.target.value.length); }} placeholder="Paste boilerplate snippet code here..." className="w-full h-20 bg-[#1e1e1e] p-2 rounded text-xs font-mono border border-[#333] text-white resize-none outline-none focus:border-[#007acc]" />
                </div>
                {content && (
                    <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase">Blinking Cursor Position Preview</div>
                        {renderPreview(content, offset)}
                    </div>
                )}
                <button onClick={add} className="w-full bg-[#007acc] hover:bg-[#0062a3] select-none py-1.5 rounded text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow hover:shadow-lg"><Plus size={14}/> Save custom boilerplate</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Saved Boilerplates</div>
                {boilerplates.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-4 italic">No custom boilerplates saved yet. Create one above!</div>
                ) : (
                    boilerplates.map((bp) => (
                        <div key={bp.id} className="bg-[#222] p-3 rounded-lg border border-[#333] group hover:border-[#007acc] transition-all relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-[#007acc]">{bp.name}</span>
                                    <span className="text-[10px] text-gray-500">Keyword: <span className="text-yellow-400 font-bold">!{bp.key}</span> or <span className="text-yellow-400 font-bold">{bp.key}</span> | Scope: {bp.scope}</span>
                                </div>
                                <div className="flex gap-2">
                                    {onTest && (
                                        <button 
                                            onClick={() => { playSound('success'); onTest(bp.content, bp.offset); }} 
                                            className="px-2 py-0.5 text-[10px] bg-green-950 text-green-300 font-bold border border-green-800 rounded hover:bg-green-900 duration-150 flex items-center gap-1 cursor-pointer"
                                            title="Clean current Editor and paste this snippet to test offsets!"
                                        >
                                            <Play size={10} /> Test-Play
                                        </button>
                                    )}
                                    <button onClick={() => deleteBp(bp.id)} className="text-gray-500 hover:text-red-400 duration-150" title="Delete boilerplate"><Trash2 size={12}/></button>
                                </div>
                            </div>
                            <div className="relative mt-1 animate-pulse hover:animate-none">
                                {renderPreview(bp.content, bp.offset)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const PaletteGenerator = () => {
    const [baseColor, setBaseColor] = useState('#007acc');
    const [palette, setPalette] = useState<string[]>([]);

    const generate = (type: string) => {
        const hexToHsl = (hex: string) => {
            let r = parseInt(hex.slice(1, 3), 16) / 255;
            let g = parseInt(hex.slice(3, 5), 16) / 255;
            let b = parseInt(hex.slice(5, 7), 16) / 255;
            let max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s, l = (max + min) / 2;
            if (max === min) h = s = 0;
            else {
                let d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return [h * 360, s * 100, l * 100];
        };

        const hslToHex = (h: number, s: number, l: number) => {
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100;
            const f = (n: number) => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        };

        const [h, s, l] = hexToHsl(baseColor);
        let colors = [];

        if (type === 'analogous') {
            colors = [
                hslToHex((h + 330) % 360, s, l),
                hslToHex((h + 345) % 360, s, l),
                baseColor,
                hslToHex((h + 15) % 360, s, l),
                hslToHex((h + 30) % 360, s, l)
            ];
        } else if (type === 'monochromatic') {
            colors = [
                hslToHex(h, s, Math.max(0, l - 30)),
                hslToHex(h, s, Math.max(0, l - 15)),
                baseColor,
                hslToHex(h, s, Math.min(100, l + 15)),
                hslToHex(h, s, Math.min(100, l + 30))
            ];
        } else if (type === 'complementary') {
            colors = [
                hslToHex(h, s, Math.max(0, l - 20)),
                baseColor,
                hslToHex((h + 180) % 360, s, l),
                hslToHex((h + 180) % 360, s, Math.max(0, l - 20))
            ];
        } else {
            colors = [
                hslToHex(h, s, l),
                hslToHex((h + 120) % 360, s, l),
                hslToHex((h + 240) % 360, s, l)
            ];
        }
        setPalette(colors);
        playSound('click');
    };

    useEffect(() => generate('analogous'), [baseColor]);

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-4 bg-[#252526] p-4 rounded-xl border border-[#333]">
                <input type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)} className="w-12 h-12 bg-transparent cursor-pointer" />
                <div className="flex-1">
                    <div className="text-xs font-bold text-gray-400 mb-1 uppercase">Base Color</div>
                    <div className="text-lg font-mono text-white">{baseColor}</div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {['analogous', 'monochromatic', 'complementary', 'triadic'].map(t => (
                    <button key={t} onClick={() => generate(t)} className="text-[10px] bg-[#333] hover:bg-[#444] py-1.5 rounded capitalize text-gray-300 transition-colors">{t}</button>
                ))}
            </div>
            <div className="flex-1 flex flex-col gap-2">
                {palette.map((c, i) => (
                    <div key={i} className="flex-1 rounded-lg flex items-center justify-between px-4 group transition-all" style={{ backgroundColor: c }}>
                        <span className="text-xs font-mono font-bold mix-blend-difference text-white opacity-0 group-hover:opacity-100 transition-opacity">{c}</span>
                        <button onClick={() => { navigator.clipboard.writeText(c); playSound('click'); }} className="p-1.5 bg-black/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40">
                            <Copy size={12} className="text-white mix-blend-difference" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Modal Component ---

const ToolsModal: React.FC<ToolModalProps> = ({ type, onClose, onSaveFile, files, onTestBoilerplate }) => {
  const [activeTool, setActiveTool] = useState(type && ALL_TOOLS.includes(type) ? type : 'color');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Universal State
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [input2, setInput2] = useState('');
  const [input3, setInput3] = useState('');
  const [input4, setInput4] = useState('');
  
  // Specialized State
  const [color, setColor] = useState('#007acc');
  const [fileName, setFileName] = useState('');
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  
  // Reset state on tool switch
  useEffect(() => {
      setInput(''); setOutput(''); setInput2(''); setInput3(''); setInput4('');
      setKeyInfo(null); setFileName(''); setShowPicker(false);
  }, [activeTool]);

  useEffect(() => {
      if (activeTool === 'keycode') {
          const handler = (e: KeyboardEvent) => {
              e.preventDefault();
              setKeyInfo({ key: e.key, code: e.code, keyCode: e.keyCode, which: e.which });
          };
          window.addEventListener('keydown', handler);
          return () => window.removeEventListener('keydown', handler);
      }
  }, [activeTool]);

  const handleCopy = (txt: string) => {
      navigator.clipboard.writeText(txt);
      playSound('click');
      alert('Copied!');
  };

  const handleDropFile = async (e: React.DragEvent) => {
      e.preventDefault();
      const fileId = e.dataTransfer.getData('text/plain');
      if (files && fileId) {
          const file = files.find(f => f.id === fileId);
          if (file && file.content) {
              setFileName(file.name);
              setInput(file.content);
              return;
          }
      }
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          setFileName(file.name);
          const reader = new FileReader();
          reader.onload = () => setInput(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setFileName(file.name);
          const reader = new FileReader();
          reader.onload = () => setInput(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleProjectSelect = (content: string, name: string) => {
      setInput(content);
      setFileName(name);
      setShowPicker(false);
  };

  const drawSVG = (type: string) => {
      if (type === 'rect') setOutput(output + `<rect x="10" y="10" width="50" height="50" fill="${color}" />\n`);
      if (type === 'circle') setOutput(output + `<circle cx="50" cy="50" r="25" fill="${color}" />\n`);
      if (type === 'path') setOutput(output + `<path d="M 10 10 L 50 50 L 90 10 Z" fill="${color}" />\n`);
  };

  const applyImageFilter = (filter: string) => {
      if (!canvasRef || !input) return;
      const ctx = canvasRef.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.src = input;
      img.onload = () => {
          canvasRef.width = img.width;
          canvasRef.height = img.height;
          ctx.filter = filter;
          ctx.drawImage(img, 0, 0);
          setInput(canvasRef.toDataURL());
      };
  };

  // Helper renderer
  const renderSimpleTextTool = (transform: (s: string) => string, placeholder = "Input...") => (
      <div className="flex flex-col h-full gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder} className="flex-1 bg-[#1e1e1e] border border-[#333] p-2 text-xs font-mono resize-none rounded" />
          <button onClick={() => { try { setOutput(transform(input)); } catch(e) { setOutput('Error'); } }} className="bg-[#007acc] text-white py-1 rounded text-xs">Convert</button>
          <textarea value={output} readOnly className="flex-1 bg-[#111] border border-[#333] p-2 text-xs font-mono text-green-400 resize-none rounded" />
      </div>
  );

  const renderToolContent = () => {
      switch(activeTool) {
          case 'react-transpiler': return <ReactTranspilerTool />;
          case 'gradient': return <GradientGenerator />;
          case 'table': return <TableGenerator />;
          case 'button': return <ButtonGenerator />;
          case 'workflow': return <WorkflowTool />;
          case 'paint': return <PaintTool onSave={f => onSaveFile?.(f)} />;
          case 'clipboard': return <ClipboardManager />;
          case 'snippets': return <SnippetManager />;
          case 'boilerplate-custom': return <BoilerplateCustomTool onTest={onTestBoilerplate} />;
          case 'palette': return <PaletteGenerator />;
          case 'color':
              return (
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-center">
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-16 bg-transparent cursor-pointer border-0"/>
                        <div>
                            <div className="text-white font-bold text-xl">{color}</div>
                            <div className="text-gray-400 text-sm">rgb({parseInt(color.substr(1,2),16)}, {parseInt(color.substr(3,2),16)}, {parseInt(color.substr(5,2),16)})</div>
                        </div>
                    </div>
                    <button onClick={() => handleCopy(color)} className="bg-[#007acc] text-white py-2 rounded text-sm">Copy Hex</button>
                </div>
              );
          case 'base64':
              return (
                  <div className="flex flex-col gap-3 h-full relative" onDragOver={e => e.preventDefault()} onDrop={handleDropFile}>
                     {showPicker && files && <FilePicker files={files} onSelect={handleProjectSelect} onClose={() => setShowPicker(false)} />}
                     <div className="flex gap-2">
                         <label className="flex-1 border-2 border-dashed border-[#3e3e3e] rounded-lg p-6 flex flex-col items-center cursor-pointer hover:bg-[#252526]">
                            <Upload size={24} className="text-gray-400 mb-2"/>
                            <span className="text-xs text-gray-500">Upload File</span>
                            <input type="file" className="hidden" onChange={handleFileChange} />
                        </label>
                        <button onClick={() => setShowPicker(true)} className="flex-1 border-2 border-dashed border-[#3e3e3e] rounded-lg p-6 flex flex-col items-center cursor-pointer hover:bg-[#252526]">
                            <Folder size={24} className="text-[#007acc] mb-2"/>
                            <span className="text-xs text-gray-500">Select from Project</span>
                        </button>
                     </div>
                    {fileName && <div className="text-xs text-gray-400">File: {fileName}</div>}
                    <textarea value={input} readOnly placeholder="Base64 string..." className="flex-1 bg-[#1e1e1e] text-gray-400 text-[10px] p-2 rounded outline-none resize-none font-mono" />
                    <button disabled={!input} onClick={() => handleCopy(input)} className="bg-[#007acc] text-white py-2 rounded text-xs disabled:opacity-50">Copy Base64</button>
                </div>
              );
          case 'minifier':
              return renderSimpleTextTool(s => s.replace(/\s+/g, ' ').replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1').trim(), "JS/CSS...");
          case 'qrcode':
              return (
                  <div className="flex flex-col h-full gap-4 items-center">
                      <input value={input} onChange={e => setInput(e.target.value)} placeholder="Text for QR..." className="w-full bg-[#1e1e1e] text-gray-300 p-2 rounded border border-[#333]" />
                      <div className="bg-white p-4 rounded">
                          {input ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(input)}`} alt="QR" /> : <div className="w-[150px] h-[150px] bg-gray-200 flex items-center justify-center text-black text-xs">Preview</div>}
                      </div>
                      <button onClick={async () => {
                          if(!input) return;
                          try {
                              const res = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(input)}`);
                              const blob = await res.blob();
                              onSaveFile?.(new File([blob], "qrcode.png", { type: "image/png" }));
                              alert("Saved!");
                          } catch(e) { alert("Failed to save (CORS)."); }
                      }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs flex items-center gap-2"><Save size={12}/> Save to Project</button>
                  </div>
              );
          case 'svg':
              return (
                  <div className="flex flex-col h-full gap-2">
                      <div className="flex gap-2">
                          <button onClick={() => drawSVG('rect')} className="bg-[#333] px-2 py-1 rounded text-xs text-white">Rect</button>
                          <button onClick={() => drawSVG('circle')} className="bg-[#333] px-2 py-1 rounded text-xs text-white">Circle</button>
                          <button onClick={() => drawSVG('path')} className="bg-[#333] px-2 py-1 rounded text-xs text-white">Path</button>
                          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-6 h-6 border-0 p-0 bg-transparent"/>
                      </div>
                      <div className="flex-1 bg-white rounded relative overflow-hidden flex items-center justify-center border border-gray-500">
                          <svg width="200" height="200" viewBox="0 0 100 100" dangerouslySetInnerHTML={{ __html: output }}></svg>
                      </div>
                      <textarea value={output} onChange={e => setOutput(e.target.value)} placeholder="SVG Code..." className="h-24 bg-[#1e1e1e] text-gray-300 text-xs p-2 rounded font-mono" />
                      <button onClick={() => onSaveFile?.(new File([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${output}</svg>`], "icon.svg", {type: "image/svg+xml"}))} className="bg-[#007acc] text-white py-1 rounded text-xs">Save SVG</button>
                  </div>
              );
          case 'image-editor':
              return (
                  <div className="flex flex-col h-full gap-2 relative" onDragOver={e => e.preventDefault()} onDrop={handleDropFile}>
                      {showPicker && files && <FilePicker files={files} onSelect={handleProjectSelect} onClose={() => setShowPicker(false)} />}
                      {!input ? (
                          <div className="flex-1 flex flex-col gap-4 items-center justify-center">
                              <label className="border-2 border-dashed border-[#3e3e3e] p-8 cursor-pointer hover:bg-[#252526] rounded">
                                  <span className="text-gray-500">Upload Image</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                              </label>
                              <button onClick={() => setShowPicker(true)} className="text-[#007acc] text-sm hover:underline">Select from Project</button>
                          </div>
                      ) : (
                          <>
                            <div className="flex-1 overflow-auto bg-[#111] flex items-center justify-center p-2 relative">
                                <img src={input || undefined} alt="edit" className="max-h-full max-w-full" />
                                <canvas ref={setCanvasRef} className="hidden" />
                                <button onClick={() => setInput('')} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded"><X size={12}/></button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {['grayscale(100%)', 'invert(100%)', 'sepia(100%)', 'blur(5px)', 'brightness(1.5)', 'contrast(200%)', 'hue-rotate(90deg)', 'saturate(200%)'].map(f => (
                                    <button key={f} onClick={() => applyImageFilter(f)} className="bg-[#333] text-white py-1 rounded text-[10px] truncate">{f.split('(')[0]}</button>
                                ))}
                            </div>
                            <button onClick={() => {
                                fetch(input).then(res => res.blob()).then(blob => onSaveFile?.(new File([blob], fileName || "edited.png", {type: blob.type})));
                                alert("Saved!");
                            }} className="bg-green-600 text-white py-1 rounded text-xs">Save to Project</button>
                          </>
                      )}
                  </div>
              );
          // Web
          case 'useragent': 
              return <div className="p-4 bg-[#1e1e1e] rounded text-gray-300 break-words text-sm font-mono">{navigator.userAgent}</div>;
          case 'http-codes':
              return (
                  <div className="flex flex-col h-full gap-2">
                      <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Search code..." className="bg-[#1e1e1e] p-2 rounded text-xs"/>
                      <div className="flex-1 overflow-y-auto space-y-1">
                          {[200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 502, 503].filter(c => c.toString().includes(input)).map(c => (
                              <div key={c} className="bg-[#222] p-2 rounded text-xs flex gap-2"><span className="font-bold text-[#007acc]">{c}</span> <span>Status Code</span></div>
                          ))}
                      </div>
                  </div>
              );
          case 'mime-types':
              return (
                  <div className="flex flex-col h-full gap-2">
                      <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Search ext..." className="bg-[#1e1e1e] p-2 rounded text-xs"/>
                      <div className="flex-1 overflow-y-auto space-y-1">
                          {Object.entries({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}).filter(([k]) => k.includes(input)).map(([k,v]) => (
                              <div key={k} className="bg-[#222] p-2 rounded text-xs flex justify-between"><span>{k}</span><span className="text-gray-400">{v}</span></div>
                          ))}
                      </div>
                  </div>
              );
          // CSS
          case 'shadow':
              return (
                   <div className="flex flex-col gap-2 h-full">
                       <div className="bg-white rounded h-24 flex items-center justify-center mb-2">
                           <div className="w-16 h-16 bg-[#007acc] rounded" style={{ boxShadow: output || '10px 10px 5px 0px rgba(0,0,0,0.75)' }}></div>
                       </div>
                       <div className="grid grid-cols-2 gap-2 text-xs">
                           <label>H <input type="range" min="-50" max="50" onChange={(e) => setInput(e.target.value)} /></label>
                           <label>V <input type="range" min="-50" max="50" onChange={(e) => setInput2(e.target.value)} /></label>
                           <label>Blur <input type="range" min="0" max="50" onChange={(e) => setInput3(e.target.value)} /></label>
                       </div>
                       <button onClick={() => setOutput(`${input||10}px ${input2||10}px ${input3||5}px 0px rgba(0,0,0,0.75)`)} className="bg-[#333] text-white py-1 rounded text-xs">Update</button>
                       <div className="flex items-center gap-2 bg-[#1e1e1e] p-2 rounded border border-[#333]">
                           <span className="text-[10px] font-mono text-gray-300 truncate flex-1">{output ? `box-shadow: ${output};` : 'box-shadow: 10px 10px 5px 0px rgba(0,0,0,0.75);'}</span>
                           <button onClick={() => handleCopy(`box-shadow: ${output || '10px 10px 5px 0px rgba(0,0,0,0.75)'};`)}><Copy size={12}/></button>
                       </div>
                   </div>
              );
          case 'border-radius':
              return (
                  <div className="flex flex-col gap-2 h-full">
                      <div className="bg-white rounded h-32 flex items-center justify-center mb-2">
                          <div className="w-32 h-32 bg-[#007acc] border-4 border-white" style={{ borderRadius: `${input||0}% ${input2||0}% ${input3||0}% ${input4||0}%` }}></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                          <label>TL <input type="range" value={input} onChange={e => setInput(e.target.value)} /></label>
                          <label>TR <input type="range" value={input2} onChange={e => setInput2(e.target.value)} /></label>
                          <label>BR <input type="range" value={input3} onChange={e => setInput3(e.target.value)} /></label>
                          <label>BL <input type="range" value={input4} onChange={e => setInput4(e.target.value)} /></label>
                      </div>
                      <div className="bg-[#1e1e1e] p-2 text-xs font-mono text-gray-300 mt-auto cursor-pointer" onClick={(e) => handleCopy(e.currentTarget.innerText)}>
                          border-radius: {input||0}% {input2||0}% {input3||0}% {input4||0}%;
                      </div>
                  </div>
              );
          case 'triangle':
              return (
                  <div className="flex flex-col gap-4 h-full items-center justify-center">
                      <div style={{ width:0, height:0, borderLeft:'25px solid transparent', borderRight:'25px solid transparent', borderBottom:`50px solid ${color}` }}></div>
                      <input type="color" value={color} onChange={e=>setColor(e.target.value)} />
                      <div className="bg-[#1e1e1e] p-2 text-[10px] font-mono text-gray-300 w-full" onClick={(e) => handleCopy(e.currentTarget.innerText)}>
                          width: 0; height: 0; border-left: 25px solid transparent; border-right: 25px solid transparent; border-bottom: 50px solid {color};
                      </div>
                  </div>
              );
          case 'flexbox':
              return (
                  <div className="flex flex-col h-full gap-2">
                      <div className="flex-1 bg-white rounded p-2 flex gap-2" style={{ justifyContent: input || 'flex-start', alignItems: input2 || 'stretch' }}>
                          <div className="w-8 h-8 bg-red-500">1</div>
                          <div className="w-8 h-12 bg-blue-500">2</div>
                          <div className="w-8 h-6 bg-green-500">3</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                          <select onChange={e=>setInput(e.target.value)} className="bg-[#333] text-white p-1"><option value="flex-start">Start</option><option value="center">Center</option><option value="space-between">Space Between</option></select>
                          <select onChange={e=>setInput2(e.target.value)} className="bg-[#333] text-white p-1"><option value="stretch">Stretch</option><option value="center">Center</option><option value="flex-end">End</option></select>
                      </div>
                  </div>
              );
          case 'cursor':
              return (
                  <div className="grid grid-cols-3 gap-2 overflow-y-auto">
                      {['pointer','wait','text','move','not-allowed','help','crosshair','grab'].map(c => (
                          <div key={c} className="bg-[#333] p-2 text-center text-xs text-white rounded hover:bg-[#444]" style={{cursor: c}}>{c}</div>
                      ))}
                  </div>
              );
          // Text
          case 'remove-dupes': return renderSimpleTextTool(s => [...new Set(s.split('\n'))].join('\n'), "List...");
          case 'sort-list': return renderSimpleTextTool(s => s.split('\n').sort().join('\n'), "List...");
          case 'repeater': return renderSimpleTextTool(s => s.repeat(parseInt(input2) || 1), "Text...");
          case 'text-binary': return renderSimpleTextTool(s => s.split('').map(c => c.charCodeAt(0).toString(2).padStart(8,'0')).join(' '), "Text...");
          // Dev
          case 'jwt': return renderSimpleTextTool(s => { try { return atob(s.split('.')[1]); } catch { return 'Invalid JWT'; } }, "JWT Token...");
          case 'sql': return renderSimpleTextTool(s => s.replace(/\s+/g, ' ').replace(/(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|INSERT|UPDATE|DELETE)/gi, '\n$1'), "SQL Query...");
          case 'xml': return renderSimpleTextTool(s => s.replace(/>\s*</g, '>\n<'), "XML...");
          case 'curl': return <div className="text-gray-500 text-center mt-10">Use Postman for complex requests.</div>;
          case 'epoch':
              return (
                  <div className="flex flex-col gap-4 pt-4">
                      <div className="text-center">
                          <div className="text-4xl text-[#007acc] font-mono mb-2">{Math.floor(Date.now() / 1000)}</div>
                          <div className="text-xs text-gray-500">Current Unix Timestamp</div>
                      </div>
                      <div className="border-t border-[#333] pt-4">
                          <input type="text" value={input} onChange={e => { setInput(e.target.value); setOutput(new Date(parseInt(e.target.value) * 1000).toLocaleString()); }} placeholder="Enter timestamp..." className="w-full bg-[#1e1e1e] p-2 text-xs rounded border border-[#333] mb-2"/>
                          <div className="text-sm text-green-400 text-center">{output}</div>
                      </div>
                  </div>
              );
          // Math
          case 'calculator':
              return (
                  <div className="flex flex-col h-full gap-2">
                      <div className="bg-[#1e1e1e] p-3 text-right text-2xl font-mono text-white rounded border border-[#333] mb-2">{input || '0'}</div>
                      <div className="grid grid-cols-4 gap-2 flex-1">
                          {['7','8','9','/', '4','5','6','*', '1','2','3','-', '0','.','=','+'].map(btn => (
                              <button key={btn} onClick={() => {
                                  if(btn === '=') { try { setInput(eval(input).toString()); } catch{ setInput('Error'); } }
                                  else if(input === 'Error') setInput(btn);
                                  else setInput(input + btn);
                              }} className="bg-[#333] hover:bg-[#444] rounded text-white font-bold">{btn}</button>
                          ))}
                          <button onClick={() => setInput('')} className="col-span-4 bg-red-900/50 text-red-300 py-1 rounded">Clear</button>
                      </div>
                  </div>
              );
          case 'number-base':
              return (
                  <div className="flex flex-col gap-2">
                      <input type="number" placeholder="Decimal" value={input} onChange={e => { setInput(e.target.value); setOutput(parseInt(e.target.value).toString(16)); setInput2(parseInt(e.target.value).toString(2)); }} className="bg-[#1e1e1e] p-2 rounded"/>
                      <div className="text-xs text-gray-400">Hex: {output}</div>
                      <div className="text-xs text-gray-400">Bin: {input2}</div>
                  </div>
              );
          case 'aspect-ratio':
              return (
                  <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-[10px] text-gray-500 uppercase font-bold">Width</label>
                              <input type="number" value={input} onChange={e => setInput(e.target.value)} className="w-full bg-[#1e1e1e] p-2 rounded text-xs border border-[#333]" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] text-gray-500 uppercase font-bold">Height</label>
                              <input type="number" value={input2} onChange={e => setInput2(e.target.value)} className="w-full bg-[#1e1e1e] p-2 rounded text-xs border border-[#333]" />
                          </div>
                      </div>
                      <div className="bg-[#111] p-4 rounded-xl border border-[#333] flex flex-col items-center justify-center gap-2">
                          <div className="text-2xl font-bold text-[#007acc]">
                              {input && input2 ? (parseFloat(input) / parseFloat(input2)).toFixed(2) : '0.00'}
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Aspect Ratio</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                          {[ '16:9', '4:3', '1:1', '21:9', '9:16' ].map(r => (
                              <button key={r} onClick={() => {
                                  const [w, h] = r.split(':').map(Number);
                                  if(input) setInput2((parseFloat(input) * (h/w)).toFixed(0));
                                  else if(input2) setInput((parseFloat(input2) * (w/h)).toFixed(0));
                              }} className="bg-[#333] hover:bg-[#444] py-1.5 rounded text-[10px] text-gray-300">{r}</button>
                          ))}
                      </div>
                  </div>
              );
          // Misc
          case 'stopwatch':
              return (
                  <div className="flex flex-col items-center justify-center h-full">
                      <div className="text-4xl font-mono mb-4">{output || '0.0'}s</div>
                      <div className="flex gap-2">
                          <button onClick={() => { const start = Date.now(); const i = setInterval(() => setOutput(((Date.now()-start)/1000).toFixed(1)), 100); setInput(i.toString()); }} className="bg-green-600 px-4 py-2 rounded text-white">Start</button>
                          <button onClick={() => clearInterval(parseInt(input))} className="bg-red-600 px-4 py-2 rounded text-white">Stop</button>
                      </div>
                  </div>
              );
          case 'markdown':
              return (
                  <div className="flex h-full gap-2">
                      <textarea value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-[#1e1e1e] p-2 text-xs" placeholder="# Hello" />
                      <div className="flex-1 bg-white text-black p-2 overflow-auto">
                          <h1 className="text-xl font-bold">{input.match(/^# (.*)/m)?.[1]}</h1>
                          <p>{input.replace(/^# (.*)/m, '')}</p>
                      </div>
                  </div>
              );
          // Fallbacks for remaining simple tools
          case 'html': return renderSimpleTextTool(s => s.replace(/[\u00A0-\u9999<>\&]/g, i => '&#'+i.charCodeAt(0)+';'), "Raw HTML...");
          case 'url': return renderSimpleTextTool(s => encodeURIComponent(s), "URL...");
          case 'case': return renderSimpleTextTool(s => s.toUpperCase(), "Text to Uppercase...");
          case 'regex':
              return (
                  <div className="flex flex-col h-full gap-3">
                      <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase font-bold">Regex Pattern</label>
                          <div className="flex gap-2">
                              <span className="text-gray-500 font-mono">/</span>
                              <input value={input2} onChange={e => setInput2(e.target.value)} placeholder="pattern..." className="flex-1 bg-[#1e1e1e] p-2 rounded text-xs font-mono border border-[#333]" />
                              <span className="text-gray-500 font-mono">/</span>
                              <input value={input3} onChange={e => setInput3(e.target.value)} placeholder="flags (g, i...)" className="w-20 bg-[#1e1e1e] p-2 rounded text-xs font-mono border border-[#333]" />
                          </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                          <label className="text-[10px] text-gray-500 uppercase font-bold">Test String</label>
                          <textarea value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-[#1e1e1e] p-2 text-xs font-mono rounded border border-[#333] resize-none" />
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                          <label className="text-[10px] text-gray-500 uppercase font-bold">Matches</label>
                          <div className="flex-1 bg-[#111] p-2 rounded border border-[#333] overflow-auto text-xs font-mono">
                              {(() => {
                                  try {
                                      if(!input2) return <span className="text-gray-600 italic">Enter a pattern...</span>;
                                      const re = new RegExp(input2, input3 || 'g');
                                      const matches = [...input.matchAll(re)];
                                      if(matches.length === 0) return <span className="text-red-500/50">No matches found.</span>;
                                      return matches.map((m, i) => (
                                          <div key={i} className="mb-1 pb-1 border-b border-[#222] last:border-0">
                                              <span className="text-blue-400">[{i}]</span> {m[0]}
                                          </div>
                                      ));
                                  } catch(e) {
                                      return <span className="text-red-500">Invalid Regex</span>;
                                  }
                              })()}
                          </div>
                      </div>
                  </div>
              );
          case 'json':
              return (
                  <div className="flex flex-col h-full gap-2">
                      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste JSON here..." className="flex-1 bg-[#1e1e1e] border border-[#333] p-2 text-xs font-mono resize-none rounded" />
                      <div className="flex gap-2">
                          <button onClick={() => { try { setOutput(JSON.stringify(JSON.parse(input), null, 2)); } catch(e) { setOutput('Invalid JSON: ' + (e as Error).message); } }} className="flex-1 bg-[#007acc] text-white py-1.5 rounded text-xs font-bold">Format</button>
                          <button onClick={() => { try { setOutput(JSON.stringify(JSON.parse(input))); } catch(e) { setOutput('Invalid JSON'); } }} className="flex-1 bg-[#333] text-white py-1.5 rounded text-xs font-bold">Minify</button>
                      </div>
                      <textarea value={output} readOnly placeholder="Result..." className="flex-1 bg-[#111] border border-[#333] p-2 text-xs font-mono text-green-400 resize-none rounded" />
                  </div>
              );
          case 'password': return <div className="p-4 text-center text-white font-mono select-all">{Array(16).fill(0).map(()=>"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*".charAt(Math.floor(Math.random()*70))).join('')}</div>;
          case 'units':
              return (
                  <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase font-bold">Pixels (px)</label>
                          <input type="number" value={input} onChange={e => { setInput(e.target.value); setOutput((parseFloat(e.target.value) / 16).toString()); }} className="w-full bg-[#1e1e1e] p-2 rounded text-xs border border-[#333]" />
                      </div>
                      <div className="text-center text-gray-500"><ArrowRight className="rotate-90 mx-auto" /></div>
                      <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase font-bold">REM (based on 16px)</label>
                          <input type="number" value={output} onChange={e => { setOutput(e.target.value); setInput((parseFloat(e.target.value) * 16).toString()); }} className="w-full bg-[#1e1e1e] p-2 rounded text-xs border border-[#333]" />
                      </div>
                      <div className="bg-[#111] p-3 rounded text-[10px] text-gray-500 italic">
                          Standard browser base is 16px. 1rem = 16px.
                      </div>
                  </div>
              );
          case 'device-info':
              return (
                  <div className="space-y-2 overflow-y-auto h-full pr-2 custom-scrollbar">
                      {[
                          { label: 'Screen Resolution', value: `${window.screen.width}x${window.screen.height}` },
                          { label: 'Viewport Size', value: `${window.innerWidth}x${window.innerHeight}` },
                          { label: 'Color Depth', value: `${window.screen.colorDepth}-bit` },
                          { label: 'Device Pixel Ratio', value: window.devicePixelRatio },
                          { label: 'Platform', value: (navigator as any).platform },
                          { label: 'Language', value: navigator.language },
                          { label: 'Online Status', value: navigator.onLine ? 'Online' : 'Offline' },
                          { label: 'Cookies Enabled', value: navigator.cookieEnabled ? 'Yes' : 'No' },
                          { label: 'Hardware Concurrency', value: navigator.hardwareConcurrency },
                          { label: 'Max Touch Points', value: navigator.maxTouchPoints }
                      ].map((item, i) => (
                          <div key={i} className="flex justify-between p-2 bg-[#222] rounded border border-[#333]">
                              <span className="text-[10px] text-gray-500 uppercase font-bold">{item.label}</span>
                              <span className="text-xs text-white font-mono">{item.value}</span>
                          </div>
                      ))}
                  </div>
              );
          
          default:
              return (
                  <div className="flex flex-col h-full items-center justify-center text-gray-500">
                      <div className="text-3xl mb-2"><Zap /></div>
                      <p>Tool {activeTool} is ready.</p>
                      <p className="text-xs mt-2 opacity-50">Select a tool from the sidebar.</p>
                  </div>
              );
      }
  };

  const filteredCategories = Object.entries(TOOL_CATEGORIES).reduce((acc, [cat, tools]) => {
      const filtered = tools.filter(t => t.includes(searchTerm.toLowerCase()));
      if (filtered.length > 0) acc[cat] = filtered;
      return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="bg-[#1e1e1e] h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#333]">
            <div className="flex items-center gap-2 text-white font-bold">
                <Grid size={18} className="text-[#007acc]" />
                <span className="text-xs uppercase tracking-wider">Dev Utilities</span>
            </div>
            <button onClick={onClose} className="hover:bg-[#333] p-1.5 rounded-lg text-gray-400">
                <X size={16} />
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - More compact for side panel */}
            <div className="w-40 bg-[#1a1a1a] border-r border-[#333] flex flex-col shrink-0">
                <div className="p-2 border-b border-[#333]">
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full bg-[#252526] border border-[#333] rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-[#007acc]"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                    {Object.entries(filteredCategories).map(([cat, tools]) => (
                        <div key={cat} className="mb-3">
                            <h3 className="text-[9px] uppercase font-bold text-gray-600 mb-1 px-2">{cat}</h3>
                            <div className="space-y-0.5">
                                {tools.map(tool => (
                                    <button
                                        key={tool}
                                        onClick={() => { playSound('click'); setActiveTool(tool); }}
                                        className={`w-full text-left px-2 py-1.5 rounded text-[10px] flex items-center gap-2 transition-colors ${activeTool === tool ? 'bg-[#007acc] text-white font-bold' : 'text-gray-500 hover:bg-[#2a2a2a] hover:text-gray-300'}`}
                                    >
                                        <span className="capitalize truncate">{tool.replace(/-/g, ' ')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-[#1e1e1e] overflow-y-auto custom-scrollbar flex flex-col relative">
                <div className="p-4 flex flex-col min-h-full">
                    <h2 className="text-xs font-bold text-white mb-4 capitalize flex items-center gap-2 pb-2 border-b border-[#333] tracking-wider">
                        {activeTool.replace(/-/g, ' ')}
                    </h2>
                    <div className="flex-1 relative">
                        {renderToolContent()}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ToolsModal;
