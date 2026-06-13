import React, { useState } from 'react';
import { Search, Download, Settings, Trash2, CheckCircle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { builtInExtensions } from '../extensions';

interface ExtensionsPanelProps {
    installedExtensions: string[];
    onToggleExtension: (id: string) => void;
}

export const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({ installedExtensions, onToggleExtension }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedExtId, setExpandedExtId] = useState<string | null>(null);

    const filteredExtensions = builtInExtensions.filter(ext => 
        ext.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        ext.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] text-xs font-sans overflow-hidden border-r border-[#333]">
            <div className="px-5 py-3 h-10 flex items-center shrink-0 uppercase tracking-wide text-[11px] font-semibold text-white/90">
                Extensions
            </div>
            
            <div className="px-4 pb-2 shrink-0">
                <div className="relative">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Extensions in Marketplace" 
                        className="w-full bg-[#3c3c3c] border border-transparent focus:border-[#007acc] text-white rounded-[3px] py-1 pl-7 pr-2 focus:outline-none transition-colors"
                    />
                    <Search className="absolute left-2 top-1.5 text-gray-400" size={12} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
                {filteredExtensions.map(ext => {
                    const isInstalled = installedExtensions.includes(ext.id);
                    const isExpanded = expandedExtId === ext.id;
                    return (
                        <div key={ext.id} className="flex flex-col px-4 py-3 hover:bg-[#2a2d2e] cursor-pointer group transition-colors" onClick={() => setExpandedExtId(isExpanded ? null : ext.id)}>
                            <div className="flex w-full">
                                <div className="w-10 h-10 shrink-0 mr-3 mt-0.5 rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center shadow-inner">
                                    <span className="text-sm font-bold text-indigo-400 font-mono select-none">{ext.name.substring(0,2).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-[13px] text-gray-200 truncate">{ext.name}</h3>
                                        {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                                    </div>
                                    <p className="text-[11px] leading-snug text-gray-400 mt-0.5 mb-1.5 line-clamp-2">{ext.description}</p>
                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                        <span>{ext.author} • v{ext.version}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onToggleExtension(ext.id); }}
                                            className={`px-3 py-1 rounded-[3px] font-medium transition-all ${isInstalled ? 'bg-transparent border border-[#007acc] text-[#007acc] hover:bg-[#007acc]/10' : 'bg-[#007acc] text-white border border-transparent hover:bg-[#005f9e]'}`}
                                        >
                                            {isInstalled ? 'Uninstall' : 'Install'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Expanded Area for Usage */}
                            {isExpanded && ext.usage && (
                                <div className="mt-3 bg-[#1e1e1e] p-2 rounded border border-[#333] flex items-start gap-2">
                                    <Info size={14} className="text-[#007acc] mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-gray-300 leading-relaxed m-0 p-0">
                                        {ext.usage}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredExtensions.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                        No extensions found.
                    </div>
                )}
            </div>
        </div>
    );
};
