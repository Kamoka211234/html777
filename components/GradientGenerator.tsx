
import React, { useState, useRef } from 'react';
import { Play, Pause, Copy, Trash2, Code, Shuffle } from 'lucide-react';
import { playSound } from '../utils/sound';

const GRADIENT_PRESETS = [
    { name: "Hyper", colors: [{p:0, c:"#EC4899"}, {p:100, c:"#8B5CF6"}], type: 'linear', angle: 45 },
    { name: "Oceanic", colors: [{p:0, c:"#06b6d4"}, {p:100, c:"#3b82f6"}], type: 'linear', angle: 135 },
    { name: "Peach", colors: [{p:0, c:"#FFD6A5"}, {p:100, c:"#FA8072"}], type: 'linear', angle: 90 },
    { name: "Mint", colors: [{p:0, c:"#a8ff78"}, {p:100, c:"#78ffd6"}], type: 'linear', angle: 0 },
    { name: "Dusk", colors: [{p:0, c:"#2c3e50"}, {p:100, c:"#fd746c"}], type: 'linear', angle: 180 },
    { name: "Cotton", colors: [{p:0, c:"#FBC2EB"}, {p:100, c:"#A6C1EE"}], type: 'linear', angle: 120 },
    { name: "Gotham", colors: [{p:0, c:"#2C3E50"}, {p:100, c:"#000000"}], type: 'linear', angle: 135 },
    { name: "Sunset", colors: [{p:0, c:"#FF7E5F"}, {p:100, c:"#FEB47B"}], type: 'linear', angle: 90 },
    { name: "Mojito", colors: [{p:0, c:"#1D976C"}, {p:100, c:"#93F9B9"}], type: 'linear', angle: 45 },
    { name: "Plasma", colors: [{p:0, c:"#8E2DE2"}, {p:100, c:"#4A00E0"}], type: 'linear', angle: 160 },
];

const GradientGenerator = () => {
    const [stops, setStops] = useState<{id: string, p: number, c: string}[]>([
        { id: '1', p: 0, c: '#EC4899' },
        { id: '2', p: 100, c: '#8B5CF6' }
    ]);
    const [type, setType] = useState<'linear' | 'radial' | 'conic'>('linear');
    const [angle, setAngle] = useState(135);
    const [activeStopId, setActiveStopId] = useState<string | null>('1');
    const [animType, setAnimType] = useState<'none' | 'shift' | 'pulse' | 'rotate'>('none');
    const [animDuration, setAnimDuration] = useState(3);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showTailwind, setShowTailwind] = useState(false);

    const trackRef = useRef<HTMLDivElement>(null);

    const activeStop = stops.find(s => s.id === activeStopId) || stops[0];

    // Handlers
    const addStop = (e: React.MouseEvent) => {
        if(!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const p = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
        const newId = Math.random().toString(36).substr(2, 5);
        // Interpolate color roughly (simple approach: take prev stop color)
        const newStops = [...stops, { id: newId, p, c: '#ffffff' }].sort((a,b) => a.p - b.p);
        setStops(newStops);
        setActiveStopId(newId);
    };

    const updateStop = (id: string, updates: Partial<{p: number, c: string}>) => {
        setStops(stops.map(s => s.id === id ? { ...s, ...updates } : s).sort((a,b) => a.p - b.p));
    };

    const deleteStop = (id: string) => {
        if(stops.length <= 2) return;
        setStops(stops.filter(s => s.id !== id));
        if(activeStopId === id) setActiveStopId(stops.find(s => s.id !== id)?.id || null);
    };

    const randomize = () => {
        const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        const numStops = 2 + Math.floor(Math.random() * 3);
        const newStops = [];
        for(let i=0; i<numStops; i++) {
            newStops.push({
                id: Math.random().toString(36).substr(2, 5),
                p: Math.floor((i / (numStops-1)) * 100),
                c: randomColor()
            });
        }
        setStops(newStops);
        setAngle(Math.floor(Math.random() * 360));
        playSound('pop');
    };

    const getGradientString = () => {
        const stopStr = stops.map(s => `${s.c} ${s.p}%`).join(', ');
        if(type === 'linear') return `linear-gradient(${angle}deg, ${stopStr})`;
        if(type === 'radial') return `radial-gradient(circle, ${stopStr})`;
        if(type === 'conic') return `conic-gradient(from ${angle}deg, ${stopStr})`;
        return '';
    };

    const getCSS = () => {
        const grad = getGradientString();
        let css = `background: ${grad};`;
        
        if (animType === 'shift') {
            css += `\nbackground-size: 200% 200%;\nanimation: gradient-shift ${animDuration}s ease infinite;`;
        } else if (animType === 'rotate') {
            css += `\nanimation: spin ${animDuration}s linear infinite;`;
        } else if (animType === 'pulse') {
            css += `\nanimation: pulse ${animDuration}s ease-in-out infinite;`;
        }
        return css;
    };

    const getKeyframes = () => {
        if(animType === 'shift') return `@keyframes gradient-shift { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }`;
        if(animType === 'rotate') return `@keyframes spin { 100% { transform: rotate(360deg); } }`;
        if(animType === 'pulse') return `@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }`;
        return '';
    };

    const getTailwind = () => {
        if (!showTailwind) return '';
        // Approximate arbitrary value
        const stopsStr = stops.map(s => `${s.c}_${s.p}%`).join(',');
        const arb = `bg-[${type}-gradient(${type==='linear' ? angle+'deg' : ''},${stopsStr})]`;
        return `<div class="${arb} ${animType !== 'none' ? `animate-${animType}` : ''}"></div>`;
    };

    return (
        <div className="flex flex-col h-full text-[#cccccc] overflow-hidden bg-[#1e1e1e]">
            {/* Live Preview */}
            <div className="h-48 p-4 flex items-center justify-center relative overflow-hidden bg-[url('https://transparenttextures.com/patterns/cubes.png')] shrink-0">
                <div 
                    className={`w-full h-full rounded-xl shadow-2xl transition-all duration-300 relative`}
                    style={{ 
                        background: getGradientString(),
                        backgroundSize: animType === 'shift' ? '200% 200%' : '100% 100%',
                        animation: isPlaying && animType !== 'none' ? `${animType === 'shift' ? 'gradient-shift' : animType === 'rotate' ? 'spin' : 'pulse'} ${animDuration}s ${animType === 'rotate' ? 'linear' : 'ease-in-out'} infinite` : 'none',
                    }}
                >
                    <style>{`
                        @keyframes gradient-shift { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.95); opacity: 0.9; } }
                    `}</style>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Stops Editor */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gradient Stops</h3>
                    <div className="relative h-8 select-none cursor-pointer group" ref={trackRef} onClick={addStop}>
                        <div 
                            className="absolute top-1/2 left-0 right-0 h-4 -mt-2 rounded-full border border-white/10 group-hover:border-white/30 transition-colors"
                            style={{ background: getGradientString() }}
                        />
                        {stops.map(stop => (
                            <div
                                key={stop.id}
                                className={`absolute top-1/2 w-5 h-5 -ml-2.5 -mt-2.5 border-2 rounded-full cursor-grab active:cursor-grabbing shadow-lg transition-transform hover:scale-110 z-10 ${activeStopId === stop.id ? 'border-white scale-125 ring-2 ring-[#007acc]' : 'border-gray-400'}`}
                                style={{ left: `${stop.p}%`, backgroundColor: stop.c }}
                                onClick={(e) => { e.stopPropagation(); setActiveStopId(stop.id); playSound('click'); }}
                                onDoubleClick={(e) => { e.stopPropagation(); deleteStop(stop.id); playSound('pop'); }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startP = stop.p;
                                    const rect = trackRef.current!.getBoundingClientRect();
                                    
                                    const move = (ev: MouseEvent) => {
                                        const diff = ev.clientX - startX;
                                        const deltaP = (diff / rect.width) * 100;
                                        let newP = Math.max(0, Math.min(100, startP + deltaP));
                                        updateStop(stop.id, { p: newP });
                                    };
                                    const up = () => {
                                        window.removeEventListener('mousemove', move);
                                        window.removeEventListener('mouseup', up);
                                    };
                                    window.addEventListener('mousemove', move);
                                    window.addEventListener('mouseup', up);
                                }}
                            />
                        ))}
                    </div>
                    
                    <div className="flex items-center justify-between bg-[#111] p-3 rounded-lg border border-[#333]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#444] relative">
                                <input 
                                    type="color" 
                                    value={activeStop.c} 
                                    onChange={(e) => updateStop(activeStop.id, { c: e.target.value })}
                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer border-0 p-0"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Color</span>
                                <span className="text-xs font-mono">{activeStop.c.toUpperCase()}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Position</span>
                                <div className="flex items-center gap-1 bg-[#333] rounded px-1 border border-[#444]">
                                    <input 
                                        type="number" 
                                        min="0" max="100" 
                                        value={Math.round(activeStop.p)} 
                                        onChange={(e) => updateStop(activeStop.id, { p: Number(e.target.value) })}
                                        className="w-10 bg-transparent text-white text-xs outline-none text-right"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </div>
                            </div>
                            <button onClick={() => deleteStop(activeStop.id)} className="p-2 bg-[#333] hover:bg-red-900/30 text-gray-300 hover:text-red-400 rounded transition-colors" title="Delete Stop">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Settings</h3>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="text-xs text-gray-400 block mb-3">Gradient Type</label>
                            <div className="flex bg-[#111] p-1 rounded border border-[#333]">
                                {['linear', 'radial', 'conic'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setType(t as any)}
                                        className={`flex-1 py-1.5 text-[10px] uppercase rounded transition-all ${type === t ? 'bg-[#007acc] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {type !== 'radial' && (
                            <div>
                                <label className="text-xs text-gray-400 block mb-3 flex justify-between">
                                    Angle <span>{angle}°</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" min="0" max="360" 
                                        value={angle} 
                                        onChange={(e) => setAngle(Number(e.target.value))}
                                        className="flex-1 accent-[#007acc] bg-[#333] h-1.5 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center relative bg-[#111] shrink-0">
                                        <div 
                                            className="w-full h-0.5 bg-[#007acc] absolute transition-transform" 
                                            style={{ transform: `rotate(${angle}deg)` }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Animation */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Animation</h3>
                        {animType !== 'none' && (
                            <button onClick={() => setIsPlaying(!isPlaying)} className={`p-1.5 rounded-lg ${isPlaying ? 'bg-[#007acc] text-white' : 'bg-[#333] text-gray-400'}`}>
                                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                        {['none', 'shift', 'pulse', 'rotate'].map(a => (
                            <button 
                                key={a}
                                onClick={() => { setAnimType(a as any); setIsPlaying(true); }}
                                className={`py-2 text-[10px] uppercase border rounded-lg transition-all ${animType === a ? 'border-[#007acc] bg-[#007acc]/10 text-[#007acc]' : 'border-[#333] bg-[#1e1e1e] text-gray-500 hover:border-gray-500'}`}
                            >
                                {a}
                            </button>
                        ))}
                    </div>

                    {animType !== 'none' && (
                        <div>
                            <label className="text-xs text-gray-400 block mb-3 flex justify-between">
                                Duration <span>{animDuration}s</span>
                            </label>
                            <input 
                                type="range" min="1" max="20" step="0.5"
                                value={animDuration} 
                                onChange={(e) => setAnimDuration(Number(e.target.value))}
                                className="w-full accent-[#007acc] bg-[#333] h-1.5 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    )}
                </div>

                {/* Presets */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Presets</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {GRADIENT_PRESETS.map((preset, i) => (
                            <button 
                                key={i}
                                onClick={() => {
                                    setStops(preset.colors.map((c, idx) => ({ id: idx.toString(), ...c })));
                                    setType(preset.type as any);
                                    setAngle(preset.angle);
                                    playSound('click');
                                }}
                                className="flex items-center gap-3 p-2 rounded-lg bg-[#111] border border-[#333] hover:border-[#007acc] transition-all group"
                            >
                                <div 
                                    className="w-8 h-8 rounded-lg border border-white/10 shrink-0" 
                                    style={{ background: `linear-gradient(135deg, ${preset.colors[0].c}, ${preset.colors[1].c})` }}
                                />
                                <span className="text-[10px] font-medium text-gray-400 group-hover:text-white truncate">{preset.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Export */}
                <div className="space-y-6 pb-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Export Code</h3>
                        <div className="flex bg-[#111] rounded-lg p-1 border border-[#333]">
                            <button onClick={() => setShowTailwind(false)} className={`px-3 py-1 text-[10px] rounded-md ${!showTailwind ? 'bg-[#333] text-white shadow' : 'text-gray-500'}`}>CSS</button>
                            <button onClick={() => setShowTailwind(true)} className={`px-3 py-1 text-[10px] rounded-md ${showTailwind ? 'bg-[#333] text-[#38bdf8] shadow' : 'text-gray-500'}`}>Tailwind</button>
                        </div>
                    </div>

                    <div className="bg-[#111] p-4 rounded-xl border border-[#333] relative group">
                        <textarea 
                            readOnly
                            value={showTailwind ? getTailwind() : (getCSS() + '\n\n' + getKeyframes())}
                            className="w-full h-32 bg-transparent text-[11px] font-mono text-gray-400 outline-none resize-none custom-scrollbar"
                        />
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(showTailwind ? getTailwind() : (getCSS() + '\n' + getKeyframes()));
                                playSound('success');
                            }}
                            className="absolute top-2 right-2 p-2 bg-[#333] hover:bg-[#007acc] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                        >
                            <Copy size={14} />
                        </button>
                    </div>

                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(showTailwind ? getTailwind() : (getCSS() + '\n' + getKeyframes()));
                            playSound('success');
                        }}
                        className="w-full bg-[#007acc] hover:bg-[#005f9e] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                    >
                        <Copy size={16} /> Copy Code
                    </button>
                    
                    <button onClick={randomize} className="w-full bg-[#333] hover:bg-[#444] text-gray-300 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                        <Shuffle size={16} /> Randomize Gradient
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GradientGenerator;
