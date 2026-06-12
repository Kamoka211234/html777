import React, { useState } from 'react';

const Main: React.FC = () => {
  const [showTutorial, setShowTutorial] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showApp, setShowApp] = useState<boolean>(false);

  const handleGlowingClick = () => {
    setShowPreview(true);
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    setShowApp(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0f0f12]">
      {/* Main App - shown after tutorial */}
      {showApp && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-white text-2xl font-bold mb-4">Welcome to the App</h1>
            <p className="text-gray-400">You've completed the tutorial!</p>
          </div>
        </div>
      )}

      {/* Tutorial Modal - shows every time user visits */}
      {showTutorial && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
          <div className="relative max-w-md w-full bg-[#121214] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-center text-gray-200">
            
            {/* Header border - Kurdistan colors */}
            <div className="absolute top-0 left-0 right-0 h-1 flex">
              <div className="flex-1 bg-[#ee2e24]"></div>
              <div className="w-12 bg-[#fbba15]"></div>
              <div className="flex-1 bg-[#239e46]"></div>
            </div>

            {/* Tutorial Title */}
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
                Tutorial
              </span>
              <h1 className="text-xl font-bold text-white mt-2">
                How to use the editor
              </h1>
            </div>

            {/* Editor Simulation */}
            <div className="bg-[#18181b] border border-gray-800 rounded-lg p-4 my-5 text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] text-gray-500 ml-2">editor.tsx</span>
              </div>
              
              <div className="font-mono text-[11px] text-gray-300 space-y-1">
                <div><span className="text-amber-500">import</span> <span className="text-emerald-400">React</span> from <span className="text-yellow-400">'react'</span>;</div>
                <div><br /></div>
                <div><span className="text-purple-400">const</span> <span className="text-blue-400">App</span> = () =&gt; (</div>
                <div className="ml-4">
                  <div>&lt;<span className="text-pink-400">div</span>&gt;</div>
                  <div className="ml-4">Hello World</div>
                  <div>&lt;/<span className="text-pink-400">div</span>&gt;</div>
                </div>
                <div>);</div>
              </div>
            </div>

            {/* Preview Area - shows when button is clicked */}
            <div className="bg-[#18181b] border border-gray-800 rounded-lg p-4 mb-5">
              <div className="text-[10px] text-gray-500 mb-2">PREVIEW</div>
              <div className="min-h-[80px] flex items-center justify-center">
                {showPreview ? (
                  <div className="text-center text-white">
                    <div className="text-green-400 text-2xl mb-1">✓</div>
                    <p className="text-sm">Preview works!</p>
                    <p className="text-[10px] text-gray-400 mt-1">You clicked the button</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Click the glowing button below</p>
                )}
              </div>
            </div>

            {/* Glowing Flickering Button */}
            <button
              onClick={handleGlowingClick}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold uppercase tracking-wider py-2.5 rounded-xl text-sm transition duration-200 shadow-lg active:scale-[0.98] outline-none mb-3"
              style={{
                animation: 'pulse 1s ease-in-out infinite',
                boxShadow: '0 0 20px rgba(251, 186, 21, 0.6)',
              }}
            >
              ✨ CLICK ME ✨
            </button>

            {/* Continue button - shows after clicking glowing button */}
            {showPreview && (
              <button
                onClick={handleCloseTutorial}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase tracking-wider py-2.5 rounded-xl text-sm transition duration-200"
              >
                Continue to App →
              </button>
            )}

            {!showPreview && (
              <p className="text-[10px] text-gray-500 mt-2">
                Click the glowing button to see preview, then continue
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.02);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Main;