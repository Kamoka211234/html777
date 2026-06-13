
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Layout, Code, Wind, PenTool, Box, File, Check, ArrowRight, Calculator, ListTodo, Clock, CloudSun } from 'lucide-react';
import { TEMPLATES_INFO, ProjectTemplate } from '../../utils/templates';
import { playSound } from '../../utils/sound';

interface TemplateSearchModalProps {
  onSelect: (templateId: string, projectName: string) => void;
  onClose: () => void;
}

const TemplateSearchModal: React.FC<TemplateSearchModalProps> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES_INFO.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'layout': return <Layout size={24} />;
      case 'calculator': return <Calculator size={24} />;
      case 'list-todo': return <ListTodo size={24} />;
      case 'clock': return <Clock size={24} />;
      case 'cloud-sun': return <CloudSun size={24} />;
      default: return <File size={24} />;
    }
  };

  const handleTemplateSelect = (id: string) => {
    playSound('click');
    setSelectedTemplate(id);
    const template = TEMPLATES_INFO.find(t => t.id === id);
    setProjectName(`My ${template?.name || 'New Project'}`);
    setStep(2);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !selectedTemplate) return;
    playSound('success');
    onSelect(selectedTemplate, projectName.trim());
    onClose();
  };

  return (
    <motion.div 
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-2xl w-[800px] max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {step === 1 ? 'Choose a Template' : 'Project Details'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {step === 1 ? 'Start with a pre-configured boilerplate to save time.' : 'Give your new project a name.'}
            </p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-xl text-[var(--text-secondary)] transition-colors">
            <X size={24} />
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Search Bar */}
            <div className="px-8 py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                <input 
                  type="text"
                  placeholder="Search templates (e.g. React, Three.js...)"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl pl-12 pr-4 py-3 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div 
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className="group bg-[var(--bg-primary)] hover:bg-white/5 border border-[var(--border-color)] hover:border-[var(--accent)] p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 flex items-start gap-4"
                >
                  <div className="w-14 h-14 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300 shrink-0">
                    {getIcon(template.icon)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors">{template.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{template.desc}</p>
                  </div>
                  <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={20} className="text-[var(--accent)]" />
                  </div>
                </div>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="col-span-2 py-20 text-center text-[var(--text-secondary)]">
                  No templates found matching "{searchTerm}"
                </div>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate} className="p-8 flex flex-col gap-6">
            <div className="bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-color)] flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)]">
                    {getIcon(TEMPLATES_INFO.find(t => t.id === selectedTemplate)?.icon || 'file')}
                </div>
                <div>
                    <h4 className="font-bold text-[var(--text-primary)]">{TEMPLATES_INFO.find(t => t.id === selectedTemplate)?.name}</h4>
                    <p className="text-xs text-[var(--text-secondary)]">Selected Template</p>
                </div>
                <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="ml-auto text-xs text-[var(--accent)] hover:underline"
                >
                    Change Template
                </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 tracking-wider">Project Name</label>
              <input 
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-lg rounded-xl px-6 py-4 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-4 mt-4">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 rounded-xl transition-all font-medium"
              >
                Back
              </button>
              <button 
                type="submit"
                disabled={!projectName.trim()}
                className="px-8 py-3 bg-[var(--accent)] text-white hover:opacity-90 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
              >
                <Check size={20} /> Create Project
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
};

export default TemplateSearchModal;
