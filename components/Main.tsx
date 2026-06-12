import React, { useState, useEffect } from 'react';
import ProjectDashboard from './ProjectDashboard';
import App from './App';
import { playSound } from '../utils/sound';
import { Sparkles, Globe, MapPin, Code2 } from 'lucide-react';

const Main: React.FC = () => {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const theme = 'midnight';

  const handleDismissWelcome = () => {
    setShowWelcomeModal(false);
    try {
      playSound('click');
    } catch (e) {}
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Primary IDE Container */}
      {!currentProjectId ? (
        <ProjectDashboard onOpenProject={setCurrentProjectId} theme={theme} setTheme={() => {}} />
      ) : (
        <App 
          projectId={currentProjectId} 
          onCloseProject={() => setCurrentProjectId(null)} 
          globalTheme={theme}
        />
      )}

      {/* Persistent Initial Load Welcome Modal - Kurdistan Erbil branding */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-fade-in">
          <div className="relative max-w-md w-full bg-[#121214] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-center text-gray-200">
            
            {/* Header border representing Kurdistan colors: Red, Gold, Green */}
            <div className="absolute top-0 left-0 right-0 h-1 flex">
              <div className="flex-1 bg-[#ee2e24]"></div>
              <div className="w-12 bg-[#fbba15]"></div>
              <div className="flex-1 bg-[#239e46]"></div>
            </div>

            {/* Glowing Kurdistan gold-yellow solar emblem */}
            <div className="mx-auto my-4 w-18 h-18 rounded-full bg-[#fbba15]/10 border border-[#fbba15]/40 flex items-center justify-center relative animate-pulse shadow-[0_0_20px_rgba(251,186,21,0.2)]">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#fbba15] to-[#f59e0b] flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-10 h-10 text-white select-none">
                  <circle cx="50" cy="50" r="16" fill="currentColor" />
                  {/* Sun rays representing the standard Kurdish solar disc */}
                  {Array.from({ length: 21 }).map((_, i) => {
                    const angle = (i * 360) / 21;
                    return (
                      <line
                        key={i}
                        x1="50"
                        y1="22"
                        x2="50"
                        y2="6"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        transform={`rotate(${angle} 50 50)`}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/25">
                Workspace Creator Credits
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white mt-1">
                Built by Kamyar Karzan Osman
              </h1>
              <p className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1.5">
                <MapPin size={13} className="text-red-500 animate-bounce" />
                Kurdistan - Erbil
              </p>
            </div>

            <div className="bg-[#18181b] border border-gray-800 rounded-lg p-3.5 my-5 text-left text-[11px] leading-relaxed text-gray-400 space-y-2">
              <div className="flex items-start gap-2">
                <Code2 size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                <span>Integrated high-performance esbuild-wasm dynamic runtime compiler.</span>
              </div>
              <div className="flex items-start gap-2 col-span-2">
                <Globe size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Interactive, client-only php-wasm virtual server linking sqlite stores.</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                <span>Synchronized virtual file-system layer mapped directly with **IndexedDB**.</span>
              </div>
            </div>

            <button
              onClick={handleDismissWelcome}
              className="w-full bg-[#fbba15] hover:bg-[#d97706] text-black font-bold uppercase tracking-wider py-2.5 rounded-xl text-xs transition duration-200 shadow-lg shadow-amber-500/20 active:scale-[0.98] outline-none"
            >
              Start Coding WebApp
            </button>
            
            <p className="text-[10px] text-gray-500 mt-3 font-mono">
              Press key or click start to explore
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Main;