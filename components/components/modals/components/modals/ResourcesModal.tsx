
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ExternalLink, Search, Globe, Palette, Box, Type, FileCode, Layout, Image as ImageIcon, Terminal, Cpu, Wand2 } from 'lucide-react';
import Draggable from '../Draggable';
import { playSound } from '../../utils/sound';

interface ResourcesModalProps {
  onClose: () => void;
}

const RESOURCES = [
    {
        category: 'UI & Components',
        icon: Layout,
        items: [
            { name: 'Uiverse.io', url: 'https://uiverse.io', desc: 'Open-source UI elements made with CSS & HTML.', featured: true },
            { name: 'Tailwind UI', url: 'https://tailwindui.com', desc: 'Official Tailwind CSS components.' },
            { name: 'HyperUI', url: 'https://www.hyperui.dev', desc: 'Free Tailwind CSS components.' },
            { name: 'Flowbite', url: 'https://flowbite.com', desc: 'Components built on top of Tailwind CSS.' },
            { name: 'DaisyUI', url: 'https://daisyui.com', desc: 'Component class names for Tailwind CSS.' },
        ]
    },
    {
        category: 'CSS Generators',
        icon: Palette,
        items: [
            { name: 'Realtime Colors', url: 'https://www.realtimecolors.com', desc: 'Visualize color palettes on a real site.', featured: true },
            { name: 'Neumorphism.io', url: 'https://neumorphism.io', desc: 'Soft UI CSS code generator.' },
            { name: 'CSS Grid Generator', url: 'https://cssgrid-generator.netlify.app', desc: 'Visual grid layout builder.' },
            { name: 'Animista', url: 'https://animista.net', desc: 'On-demand CSS animations library.' },
            { name: 'Fancy Border Radius', url: 'https://9elements.github.io/fancy-border-radius', desc: 'Organic shape generator.' },
            { name: 'Shadows Brumm', url: 'https://shadows.brumm.af', desc: 'Smooth layered box-shadows.' },
        ]
    },
    {
        category: 'Dev Utilities',
        icon: Terminal,
        items: [
            { name: 'Transform.tools', url: 'https://transform.tools', desc: 'Convert code between formats (SVG->JSX, JSON->TS).', featured: true },
            { name: 'Carbon', url: 'https://carbon.now.sh', desc: 'Create beautiful images of your source code.' },
            { name: 'JSON Crack', url: 'https://jsoncrack.com', desc: 'Visualize JSON data as graphs.' },
            { name: 'RegExr', url: 'https://regexr.com', desc: 'Learn, build, & test Regular Expressions.' },
            { name: 'GitExplorer', url: 'https://gitexplorer.com', desc: 'Find the right git commands.' },
        ]
    },
    {
        category: 'Icons & Assets',
        icon: ImageIcon,
        items: [
            { name: 'Lucide Icons', url: 'https://lucide.dev', desc: 'Beautiful & consistent icons (Used in this app).' },
            { name: 'Unsplash', url: 'https://unsplash.com', desc: 'The internet’s source for visuals.' },
            { name: 'Pexels', url: 'https://pexels.com', desc: 'Free stock photos and videos.' },
            { name: 'Undraw', url: 'https://undraw.co', desc: 'Open-source illustrations for any idea.' },
            { name: 'Svgl', url: 'https://svgl.app', desc: 'Library of SVG logos.' },
        ]
    },
    {
        category: 'Reference',
        icon: Globe,
        items: [
            { name: 'Can I Use', url: 'https://caniuse.com', desc: 'Browser support tables.' },
            { name: 'DevDocs', url: 'https://devdocs.io', desc: 'API documentation browser.' },
        ]
    }
];

const ResourcesModal: React.FC<ResourcesModalProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResources = RESOURCES.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          item.desc.toLowerCase().includes(searchTerm.toLowerCase())
      )
  })).filter(cat => cat.items.length > 0);

  return (
    <Draggable handleSelector=".drag-handle" initialX={window.innerWidth / 2 - 400} initialY={100}>
        <motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.15 }}
 className="bg-[#1e1e1e] border border-[#007acc] shadow-2xl rounded-xl w-[800px] h-[600px] flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out z-[95] overflow-hidden">
            {/* Header */}
            <div className="drag-handle flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#333] cursor-move">
                <div className="flex items-center gap-2">
                    <div className="bg-[#007acc]/20 p-1.5 rounded-lg">
                        <Wand2 size={16} className="text-[#007acc]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-200 leading-none">Developer Hub</h2>
                        <p className="text-[10px] text-gray-500 mt-0.5">Workflow tools & resources</p>
                    </div>
                </div>
                <button onClick={onClose} className="hover:bg-[#333] p-1.5 rounded-lg text-gray-400 transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-[#333] bg-[#1e1e1e]">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#007acc] transition-colors" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search for tools (e.g. uiverse, gradient, regex)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#252526] border border-[#333] text-gray-200 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-[#007acc] focus:shadow-[0_0_15px_rgba(0,122,204,0.1)] transition-all"
                        autoFocus
                    />
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#1a1a1a]">
                {filteredResources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="w-16 h-16 bg-[#252526] rounded-full flex items-center justify-center mb-4">
                            <Search size={32} className="opacity-20" />
                        </div>
                        <p>No resources found matching "{searchTerm}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {filteredResources.map((cat, idx) => (
                            <div key={idx} className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-[#007acc] font-bold text-xs uppercase tracking-wider pb-2 border-b border-[#333]/50">
                                    <cat.icon size={14} />
                                    {cat.category}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {cat.items.map((item, i) => (
                                        <a 
                                            key={i} 
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => playSound('click')}
                                            className={`
                                                group relative bg-[#252526] p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
                                                ${item.featured 
                                                    ? 'border-[#007acc]/30 hover:border-[#007acc] bg-gradient-to-br from-[#252526] to-[#007acc]/5' 
                                                    : 'border-[#333] hover:border-gray-500'}
                                            `}
                                        >
                                            {item.featured && (
                                                <div className="absolute -top-px -right-px bg-[#007acc] text-white text-[9px] px-2 py-0.5 rounded-bl-lg rounded-tr-lg font-bold shadow-sm">
                                                    FEATURED
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start gap-3">
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-200 group-hover:text-white mb-1 flex items-center gap-1.5">
                                                        {item.name}
                                                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                                                    </h3>
                                                    <p className="text-xs text-gray-500 group-hover:text-gray-400 leading-snug">{item.desc}</p>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 bg-[#252526] border-t border-[#333] text-[10px] text-gray-500 flex justify-between items-center">
                <span>Clicking a card opens the external tool in a new tab.</span>
                <span className="font-mono opacity-50">v2.1</span>
            </div>
        </motion.div>
    </Draggable>
  );
};

export default ResourcesModal;
