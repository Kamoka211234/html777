import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2, ChevronRight, ChevronDown, Copy } from 'lucide-react';
import { playSound } from '../utils/sound';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileSystemItem {
    id: string;
    name: string;
    content?: string;
    type: 'file' | 'folder';
    parentId?: string;
}

interface ConsoleProps {
    logs: Array<{ method: string; args: string[]; source?: string }>;
    onClear: () => void;
    onNavigate?: (fileName: string, line: number) => void;
    onHide?: () => void;
    files?: FileSystemItem[];
}

// ─── JSON Viewer ──────────────────────────────────────────────────────────────

const JsonViewer = ({ data }: { data: any }) => {
    const [expanded, setExpanded] = React.useState(false);
    if (data === null) return <span className='text-gray-500'>null</span>;
    if (data === undefined) return <span className='text-gray-500'>undefined</span>;
    if (typeof data !== 'object') {
        if (typeof data === 'string') return <span className='text-green-400'>"{data}"</span>;
        if (typeof data === 'number') return <span className='text-blue-400'>{data}</span>;
        if (typeof data === 'boolean') return <span className='text-purple-400'>{data ? 'true' : 'false'}</span>;
        return <span>{String(data)}</span>;
    }
    const isArray = Array.isArray(data);
    const keys = Object.keys(data);
    const summary = isArray ? `Array(${keys.length})` : `Object {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
    return (
        <div className='font-mono text-xs inline-block align-top'>
            <div className='flex items-center cursor-pointer hover:bg-[#333] rounded px-1 -ml-1 select-none' onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronDown size={12} className='mr-1 opacity-70' /> : <ChevronRight size={12} className='mr-1 opacity-70' />}
                <span className='text-gray-400 italic'>{summary}</span>
            </div>
            {expanded && (
                <div className='pl-4 border-l border-[#444] ml-1.5 mt-1'>
                    {keys.map(key => (
                        <div key={key} className='flex'>
                            {!isArray && <span className='text-purple-400 mr-2'>{key}:</span>}
                            <JsonViewer data={data[key]} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const LogArg: React.FC<{ arg: string }> = ({ arg }) => {
    if (typeof arg === 'string' && ((arg.startsWith('{') && arg.endsWith('}')) || (arg.startsWith('[') && arg.endsWith(']')))) {
        try { return <JsonViewer data={JSON.parse(arg)} />; } catch {}
    }
    return <span className='break-all whitespace-pre-wrap'>{arg}</span>;
};

// ─── Main Console ─────────────────────────────────────────────────────────────

const Console: React.FC<ConsoleProps> = ({ logs, onClear }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const filteredLogs = logs.filter(log => {
        // Suppress the in-browser Babel transformer warning
        const isBabelWarning = log.method === 'warn' && log.args.some(arg => 
            typeof arg === 'string' && arg.includes('You are using the in-browser Babel transformer')
        );
        return !isBabelWarning;
    });

    const handleCopyAll = () => {
        const text = filteredLogs.map(l => `[${l.method.toUpperCase()}] ${l.args.join(' ')}`).join('\n');
        navigator.clipboard.writeText(text);
        playSound('success');
    };

    return (
        <div className='absolute inset-0 bg-[#1e1e1e]/95 backdrop-blur-sm flex flex-col z-50 overflow-hidden'>
            <div className='flex-1 overflow-y-auto overflow-x-hidden font-mono text-xs min-h-0 flex flex-col custom-scrollbar'>

                {/* ── Toolbar ── */}
                <div className='sticky top-0 bg-[#1e1e1e] border-b border-[#333] z-10 flex items-center justify-between p-2 shadow-md'>
                    <span className="text-[#a0a0a0] font-mono font-bold text-[10px] tracking-wider uppercase flex items-center gap-1 select-none">
                        <Terminal size={11} className="text-[#007acc]" /> Terminal Logs
                    </span>

                    <div className='flex items-center gap-2'>
                        <button 
                            onClick={() => { playSound('click'); handleCopyAll(); }} 
                            className='bg-[#252526] hover:bg-[#333] border border-[#333] text-gray-400 hover:text-indigo-300 px-3 py-1.5 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-all font-bold' 
                            title='Copy all'
                        >
                            <Copy size={11} /><span>Copy All</span>
                        </button>
                        <button 
                            onClick={() => { playSound('click'); onClear(); }} 
                            className='bg-[#252526] hover:bg-[#333] border border-[#333] text-gray-400 hover:text-red-300 px-3 py-1.5 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-all font-bold' 
                            title='Delete all'
                        >
                            <Trash2 size={11} /><span>Delete All</span>
                        </button>
                    </div>
                </div>

                {/* ── Log entries ── */}
                <div className='p-2 space-y-1 flex-1'>
                    {filteredLogs.length === 0 ? (
                        <div className='text-gray-600 italic px-2'>No logs…</div>
                    ) : (
                        filteredLogs.map((log, i) => {
                            const isError = log.method === 'error';
                            const isWarn  = log.method === 'warn';

                            return (
                                <div
                                    key={i}
                                    className={`py-1.5 px-2 border-b border-[#2a2a2a] font-mono text-xs flex gap-2 items-start ${
                                        isError ? 'text-red-400 bg-red-950/10' :
                                        isWarn  ? 'text-yellow-400 bg-yellow-950/10' :
                                        'text-gray-300'
                                    }`}
                                >
                                    <span className="opacity-60 select-none text-[10px]">
                                        {isError ? '🔴' : isWarn ? '⚠️' : '🔹'}
                                    </span>
                                    <div className='flex-1 select-text break-all whitespace-pre-wrap leading-relaxed'>
                                        {log.args.map((arg, j) => <LogArg key={j} arg={arg} />)}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>
            </div>
        </div>
    );
};

export default Console;