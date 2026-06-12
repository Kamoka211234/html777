
import React, { useState, useEffect } from 'react';
import { Copy, Grid, Trash2, Plus, Minus, Layout } from 'lucide-react';
import { playSound } from '../utils/sound';

const TEMPLATES = [
    {
        id: 'simple',
        name: 'Minimal',
        css: `.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-family: sans-serif;
  font-size: 14px;
}
.custom-table th, .custom-table td {
  border-bottom: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}
.custom-table th {
  font-weight: 600;
  color: #333;
}`,
        previewBg: '#fff',
        previewColor: '#333'
    },
    {
        id: 'striped',
        name: 'Striped',
        css: `.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-family: sans-serif;
}
.custom-table th, .custom-table td {
  padding: 12px 15px;
  text-align: left;
}
.custom-table tr:nth-child(even) {
  background-color: #f3f3f3;
}
.custom-table th {
  background-color: #007acc;
  color: #ffffff;
}`,
        previewBg: '#fff',
        previewColor: '#333'
    },
    {
        id: 'bordered',
        name: 'Grid',
        css: `.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-family: sans-serif;
  border: 1px solid #ccc;
}
.custom-table th, .custom-table td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}
.custom-table th {
  background-color: #eee;
}`,
        previewBg: '#fff',
        previewColor: '#333'
    },
    {
        id: 'dark',
        name: 'Dark Mode',
        css: `.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-family: sans-serif;
  background-color: #1e1e1e;
  color: #e0e0e0;
}
.custom-table th, .custom-table td {
  border-bottom: 1px solid #333;
  padding: 12px;
  text-align: left;
}
.custom-table th {
  background-color: #252526;
  color: #007acc;
  font-weight: bold;
}`,
        previewBg: '#1e1e1e',
        previewColor: '#e0e0e0'
    },
    {
        id: 'neon',
        name: 'Neon Cyber',
        css: `.custom-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: 'Courier New', monospace;
  border: 1px solid #00ffcc;
  box-shadow: 0 0 10px rgba(0, 255, 204, 0.2);
  color: #00ffcc;
  background: #000;
}
.custom-table th, .custom-table td {
  padding: 15px;
  border-bottom: 1px solid rgba(0, 255, 204, 0.3);
  text-align: left;
}
.custom-table th {
  background: rgba(0, 255, 204, 0.1);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.custom-table tr:hover {
  background: rgba(0, 255, 204, 0.05);
}`,
        previewBg: '#000',
        previewColor: '#00ffcc'
    },
    {
        id: 'corporate',
        name: 'Corporate',
        css: `.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  background: #fff;
}
.custom-table th, .custom-table td {
  padding: 15px;
  background-color: rgba(255, 255, 255, 0.2);
  color: #333;
}
.custom-table th {
  text-align: left;
  background-color: #55608f;
  color: #fff;
}
.custom-table tbody tr:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
.custom-table tbody td {
  position: relative;
}
.custom-table tbody td:hover:before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -9999px;
  bottom: -9999px;
  background-color: rgba(255, 255, 255, 0.2);
  z-index: -1;
}`,
        previewBg: '#f0f0f0',
        previewColor: '#333'
    },
    {
        id: 'glass',
        name: 'Glassmorphism',
        css: `.custom-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 15px;
  font-family: sans-serif;
  color: #fff;
}
.custom-table thead tr {
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}
.custom-table th {
  padding: 20px;
  text-align: left;
}
.custom-table tbody tr {
  background-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  transition: transform 0.2s;
}
.custom-table tbody tr:hover {
  transform: scale(1.02);
  background-color: rgba(255, 255, 255, 0.1);
}
.custom-table td {
  padding: 20px;
}
.custom-table td:first-child {
  border-radius: 10px 0 0 10px;
}
.custom-table td:last-child {
  border-radius: 0 10px 10px 0;
}`,
        previewBg: '#333 url("https://transparenttextures.com/patterns/cubes.png")',
        previewColor: '#fff'
    },
    {
        id: 'gradient',
        name: 'Gradient',
        css: `.custom-table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
  border-radius: 10px;
  font-family: sans-serif;
}
.custom-table th, .custom-table td {
  padding: 15px;
  background-color: rgba(255,255,255,0.2);
  color: #fff;
}
.custom-table th {
  text-align: left;
}
.custom-table thead {
  background: linear-gradient(45deg, #49a09d, #5f2c82);
}
.custom-table tbody tr {
  background-color: rgba(255,255,255,0.3);
}
.custom-table tbody tr:hover {
  background-color: rgba(255,255,255,0.4);
}`,
        previewBg: '#222',
        previewColor: '#fff'
    }
];

const TableGenerator = () => {
    // Load state from localStorage or default
    const [rows, setRows] = useState(() => parseInt(localStorage.getItem('tg_rows') || '4'));
    const [cols, setCols] = useState(() => parseInt(localStorage.getItem('tg_cols') || '3'));
    const [selectedTemplateId, setSelectedTemplateId] = useState(() => localStorage.getItem('tg_template') || 'striped');
    const [viewCode, setViewCode] = useState<'html' | 'css'>('html');
    const [data, setData] = useState<string[][]>([]);

    const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

    // Save state changes
    useEffect(() => {
        localStorage.setItem('tg_rows', rows.toString());
        localStorage.setItem('tg_cols', cols.toString());
        localStorage.setItem('tg_template', selectedTemplateId);
    }, [rows, cols, selectedTemplateId]);

    // Initialize/Resize data grid
    useEffect(() => {
        setData(prev => {
            const newData = Array(rows).fill('').map((_, r) => 
                Array(cols).fill('').map((_, c) => {
                    // Preserve existing data if resizing
                    if (prev[r] && prev[r][c] !== undefined) return prev[r][c];
                    return r === 0 ? `Header ${c + 1}` : `Row ${r} Col ${c + 1}`;
                })
            );
            return newData;
        });
    }, [rows, cols]);

    const updateCell = (r: number, c: number, value: string) => {
        const newData = [...data];
        newData[r] = [...newData[r]];
        newData[r][c] = value;
        setData(newData);
    };

    const getHTML = () => {
        const rowsHtml = data.map((row, rIndex) => {
            const tag = rIndex === 0 ? 'th' : 'td';
            const cellsHtml = row.map(cell => `    <${tag}>${cell}</${tag}>`).join('\n');
            return `  <tr>\n${cellsHtml}\n  </tr>`;
        }).join('\n');

        return `<table class="custom-table">\n  <thead>\n${rowsHtml.split('</tr>')[0] + '</tr>'}\n  </thead>\n  <tbody>\n${rowsHtml.split('</tr>').slice(1).join('</tr>')}\n  </tbody>\n</table>`;
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        playSound('click');
        alert('Copied to clipboard!');
    };

    return (
        <div className="flex flex-col h-full text-[#cccccc] overflow-hidden bg-[#1e1e1e]">
            {/* Templates */}
            <div className="bg-[#111] border-b border-[#333] p-4 space-y-3 shrink-0">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Layout size={12}/> Templates</h3>
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                    {TEMPLATES.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => { playSound('click'); setSelectedTemplateId(t.id); }}
                            className={`
                                min-w-[90px] h-10 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all shrink-0
                                ${selectedTemplateId === t.id ? 'border-[#007acc] bg-[#007acc]/10 text-white' : 'border-[#333] hover:border-gray-500 text-gray-400'}
                            `}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview */}
            <div 
                className="h-64 overflow-auto p-4 relative flex items-start justify-center transition-colors duration-300 shrink-0"
                style={{ background: selectedTemplate.previewBg }}
            >
                <div className="w-full bg-transparent transition-all duration-300">
                    <style>{selectedTemplate.css}</style>
                    <table className="custom-table shadow-xl scale-[0.8] origin-top">
                        <thead>
                            <tr>
                                {data[0]?.map((cell, cIndex) => (
                                    <th key={cIndex}>{cell}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice(1, 4).map((row, rIndex) => (
                                <tr key={rIndex + 1}>
                                    {row.map((cell, cIndex) => (
                                        <td key={cIndex}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="absolute bottom-2 right-2 text-[10px] text-white/30 bg-black/50 px-2 py-1 rounded">Preview</div>
            </div>

            {/* Controls & Data */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                
                {/* Structure */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Grid size={12}/> Structure</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-xs text-gray-400 flex justify-between">Rows <span>{rows}</span></label>
                            <div className="flex items-center gap-2 bg-[#111] p-1 rounded-lg border border-[#333]">
                                <button onClick={() => setRows(Math.max(1, rows - 1))} className="p-1.5 hover:bg-[#333] rounded text-gray-400"><Minus size={12}/></button>
                                <input type="range" min="1" max="20" value={rows} onChange={e => setRows(Number(e.target.value))} className="flex-1 accent-[#007acc] h-1 bg-[#333] rounded-lg appearance-none"/>
                                <button onClick={() => setRows(Math.min(20, rows + 1))} className="p-1.5 hover:bg-[#333] rounded text-gray-400"><Plus size={12}/></button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs text-gray-400 flex justify-between">Cols <span>{cols}</span></label>
                            <div className="flex items-center gap-2 bg-[#111] p-1 rounded-lg border border-[#333]">
                                <button onClick={() => setCols(Math.max(1, cols - 1))} className="p-1.5 hover:bg-[#333] rounded text-gray-400"><Minus size={12}/></button>
                                <input type="range" min="1" max="10" value={cols} onChange={e => setCols(Number(e.target.value))} className="flex-1 accent-[#007acc] h-1 bg-[#333] rounded-lg appearance-none"/>
                                <button onClick={() => setCols(Math.min(10, cols + 1))} className="p-1.5 hover:bg-[#333] rounded text-gray-400"><Plus size={12}/></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Editor */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Edit Data</h3>
                    <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
                        <div className="max-h-64 overflow-auto custom-scrollbar">
                            <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 bg-[#252526] z-10">
                                    <tr>
                                        {data[0]?.map((cell, cIndex) => (
                                            <th key={cIndex} className="p-2 border border-[#333]">
                                                <input 
                                                    type="text" 
                                                    value={cell} 
                                                    onChange={(e) => updateCell(0, cIndex, e.target.value)}
                                                    className="bg-transparent border-none outline-none w-full text-center text-[#007acc] font-bold"
                                                />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slice(1).map((row, rIndex) => (
                                        <tr key={rIndex + 1}>
                                            {row.map((cell, cIndex) => (
                                                <td key={cIndex} className="p-1 border border-[#333]">
                                                    <input 
                                                        type="text" 
                                                        value={cell} 
                                                        onChange={(e) => updateCell(rIndex + 1, cIndex, e.target.value)}
                                                        className="bg-transparent border-none outline-none w-full px-2 py-1 text-gray-300"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Export */}
                <div className="space-y-4 pb-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Export Code</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setViewCode('html')} 
                                className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${viewCode === 'html' ? 'bg-[#007acc] text-white' : 'bg-[#111] text-gray-500 border border-[#333]'}`}
                            >
                                HTML
                            </button>
                            <button 
                                onClick={() => setViewCode('css')} 
                                className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${viewCode === 'css' ? 'bg-[#007acc] text-white' : 'bg-[#111] text-gray-500 border border-[#333]'}`}
                            >
                                CSS
                            </button>
                        </div>
                    </div>
                    <div className="bg-[#111] p-4 rounded-xl border border-[#333] relative group">
                        <textarea 
                            readOnly 
                            className="w-full h-48 bg-transparent text-[11px] font-mono text-gray-400 outline-none resize-none custom-scrollbar"
                            value={viewCode === 'html' ? getHTML() : selectedTemplate.css}
                        />
                        <button 
                            onClick={() => handleCopy(viewCode === 'html' ? getHTML() : selectedTemplate.css)} 
                            className="absolute top-2 right-2 p-2 bg-[#333] hover:bg-[#007acc] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                        >
                            <Copy size={14}/>
                        </button>
                    </div>
                    <button 
                        onClick={() => handleCopy(viewCode === 'html' ? getHTML() : selectedTemplate.css)}
                        className="w-full bg-[#007acc] hover:bg-[#005f9e] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                    >
                        <Copy size={16} /> Copy {viewCode.toUpperCase()} Code
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TableGenerator;
