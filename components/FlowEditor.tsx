
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, ArrowRight, Trash2, Box, Circle, Diamond, MousePointer2 } from 'lucide-react';
import { playSound } from '../utils/sound';
import Draggable from './Draggable';

interface Node {
    id: string;
    type: 'rect' | 'circle' | 'diamond';
    x: number;
    y: number;
    label: string;
    color: string;
}

interface Edge {
    id: string;
    source: string;
    target: string;
}

interface FlowData {
    nodes: Node[];
    edges: Edge[];
}

interface FlowEditorProps {
    content: string;
    onChange: (newContent: string) => void;
    theme: string;
}

const COLORS = ['#007acc', '#ea580c', '#16a34a', '#9333ea', '#db2777', '#ca8a04', '#4b5563'];

const FlowEditor: React.FC<FlowEditorProps> = ({ content, onChange, theme }) => {
    const [data, setData] = useState<FlowData>({ nodes: [], edges: [] });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ id: string, startX: number, startY: number } | null>(null);
    const panRef = useRef<{ startX: number, startY: number } | null>(null);

    // Initialize from content
    useEffect(() => {
        try {
            if (content && content.trim()) {
                const parsed = JSON.parse(content);
                if (parsed.nodes && parsed.edges) {
                    setData(parsed);
                }
            } else {
                setData({ nodes: [], edges: [] });
            }
        } catch (e) {
            console.error("Invalid Flow JSON", e);
        }
    }, []);

    // Save on change
    const updateData = (newData: FlowData) => {
        setData(newData);
        onChange(JSON.stringify(newData, null, 2));
    };

    const addNode = (type: 'rect' | 'circle' | 'diamond') => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNode: Node = {
            id,
            type,
            x: 100 - pan.x,
            y: 100 - pan.y,
            label: type === 'rect' ? 'Process' : type === 'circle' ? 'Start/End' : 'Decision',
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
        };
        updateData({ ...data, nodes: [...data.nodes, newNode] });
        playSound('pop');
    };

    const deleteSelected = () => {
        if (!selectedId) return;
        updateData({
            nodes: data.nodes.filter(n => n.id !== selectedId),
            edges: data.edges.filter(e => e.source !== selectedId && e.target !== selectedId)
        });
        setSelectedId(null);
        playSound('pop');
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (connectingNodeId) {
            if (connectingNodeId !== id) {
                // Create edge
                const edgeId = Math.random().toString(36).substr(2, 9);
                // Check if edge exists
                if (!data.edges.some(edge => edge.source === connectingNodeId && edge.target === id)) {
                    updateData({
                        ...data,
                        edges: [...data.edges, { id: edgeId, source: connectingNodeId, target: id }]
                    });
                    playSound('click');
                }
            }
            setConnectingNodeId(null);
            return;
        }
        
        setSelectedId(id);
        dragRef.current = { id, startX: e.clientX, startY: e.clientY };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.target === containerRef.current) {
            setSelectedId(null);
            setConnectingNodeId(null);
            panRef.current = { startX: e.clientX - pan.x, startY: e.clientY - pan.y };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragRef.current) {
            const dx = (e.clientX - dragRef.current.startX) / zoom;
            const dy = (e.clientY - dragRef.current.startY) / zoom;
            
            updateData({
                ...data,
                nodes: data.nodes.map(n => n.id === dragRef.current?.id ? { ...n, x: n.x + dx, y: n.y + dy } : n)
            });
            
            dragRef.current = { id: dragRef.current.id, startX: e.clientX, startY: e.clientY };
        } else if (panRef.current) {
            setPan({
                x: e.clientX - panRef.current.startX,
                y: e.clientY - panRef.current.startY
            });
        }
    };

    const handleMouseUp = () => {
        dragRef.current = null;
        panRef.current = null;
    };

    const updateLabel = (id: string, newLabel: string) => {
        updateData({
            ...data,
            nodes: data.nodes.map(n => n.id === id ? { ...n, label: newLabel } : n)
        });
    };

    const getNodeCenter = (node: Node) => {
        const w = 120; // Approx width
        const h = 60;  // Approx height
        return { x: node.x + w/2, y: node.y + h/2 };
    };

    const renderEdge = (edge: Edge) => {
        const src = data.nodes.find(n => n.id === edge.source);
        const tgt = data.nodes.find(n => n.id === edge.target);
        if (!src || !tgt) return null;

        const p1 = getNodeCenter(src);
        const p2 = getNodeCenter(tgt);

        // Calculate control points for Bezier curve
        const c1 = { x: p1.x, y: p1.y + 50 };
        const c2 = { x: p2.x, y: p2.y - 50 };

        const path = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;

        return (
            <g key={edge.id}>
                <path d={path} stroke="#555" strokeWidth="2" fill="none" />
                <path d={path} stroke="transparent" strokeWidth="10" fill="none" className="cursor-pointer hover:stroke-red-500/20" onClick={() => {
                    updateData({ ...data, edges: data.edges.filter(e => e.id !== edge.id) });
                    playSound('pop');
                }}/>
            </g>
        );
    };

    return (
        <div className="flex h-full flex-col bg-[#111] overflow-hidden select-none">
            {/* Toolbar */}
            <div className="h-10 bg-[#1e1e1e] border-b border-[#333] flex items-center px-4 justify-between z-10">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-wider">Flow Builder</span>
                    <button onClick={() => addNode('rect')} className="p-1.5 hover:bg-[#333] rounded text-gray-300" title="Process"><Box size={16}/></button>
                    <button onClick={() => addNode('circle')} className="p-1.5 hover:bg-[#333] rounded text-gray-300" title="Start/End"><Circle size={16}/></button>
                    <button onClick={() => addNode('diamond')} className="p-1.5 hover:bg-[#333] rounded text-gray-300" title="Decision"><Diamond size={16}/></button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="text-xs text-gray-500 hover:text-white px-2">Reset View</button>
                    {selectedId && <button onClick={deleteSelected} className="p-1.5 hover:bg-red-900/30 text-red-400 rounded"><Trash2 size={16}/></button>}
                </div>
            </div>

            {/* Canvas */}
            <div 
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-[url('https://transparenttextures.com/patterns/graphy.png')]"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: panRef.current ? 'grabbing' : 'default' }}
            >
                <div 
                    className="absolute inset-0 transition-transform duration-75 ease-out origin-top-left"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                >
                    {/* SVG Layer for Edges */}
                    <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none z-0">
                        {data.edges.map(renderEdge)}
                        {connectingNodeId && (
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#888" />
                                </marker>
                            </defs>
                        )}
                    </svg>

                    {/* Nodes */}
                    {data.nodes.map(node => (
                        <div
                            key={node.id}
                            className={`absolute flex items-center justify-center text-white text-xs font-medium shadow-lg cursor-grab active:cursor-grabbing group
                                ${node.type === 'circle' ? 'rounded-full w-24 h-24' : node.type === 'diamond' ? 'w-24 h-24 rotate-45' : 'w-32 h-16 rounded-lg'}
                                ${selectedId === node.id ? 'ring-2 ring-white' : ''}
                                ${connectingNodeId === node.id ? 'ring-2 ring-green-400' : ''}
                            `}
                            style={{ 
                                left: node.x, 
                                top: node.y, 
                                backgroundColor: node.color,
                                zIndex: 10
                            }}
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                        >
                            <div className={node.type === 'diamond' ? '-rotate-45' : ''}>
                                <input 
                                    value={node.label}
                                    onChange={(e) => updateLabel(node.id, e.target.value)}
                                    className="bg-transparent text-center w-full outline-none text-white font-bold select-text pointer-events-auto"
                                    onMouseDown={(e) => e.stopPropagation()} 
                                />
                            </div>
                            
                            {/* Connect Handle */}
                            <button 
                                className="absolute -right-3 w-5 h-5 bg-white rounded-full text-[#333] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 z-20 cursor-pointer"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setConnectingNodeId(node.id); 
                                    playSound('click'); 
                                }}
                                title="Connect"
                            >
                                <ArrowRight size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {connectingNodeId && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#007acc] text-white px-4 py-2 rounded-full text-xs shadow-xl animate-bounce">
                    Select another node to connect...
                </div>
            )}
        </div>
    );
};

export default FlowEditor;
