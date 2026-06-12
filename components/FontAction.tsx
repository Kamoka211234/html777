import React from 'react';
import { Type } from 'lucide-react';

export default function FontAction({ fileName, content }: { fileName: string, content: string }) {
    // Add custom font face rules dynamically
    const fontName = `PreviewFont_${fileName?.replace(/[^a-zA-Z0-9]/g, '')}`;
    const customStyle = `@font-face { font-family: '${fontName}'; src: url(${content}); }`;
    
    return (
        <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-300 w-full max-w-3xl">
            <style>{customStyle}</style>
            <div className="flex items-center gap-3 text-[#007acc] border-b border-[#333] pb-2">
                 <Type size={18} />
                 <h3 className="font-semibold">{fileName}</h3>
            </div>
            <div className="flex flex-col gap-6" style={{ fontFamily: `'${fontName}', sans-serif` }}>
                <div className="bg-[#1e1e1e] p-6 rounded-lg border border-[#333] hover:border-[#007acc]/50 transition-colors">
                    <p className="text-sm text-gray-500 mb-2 font-sans font-medium uppercase tracking-wider">English</p>
                    <p className="text-4xl text-white break-all leading-normal">
                        ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>
                        abcdefghijklmnopqrstuvwxyz<br/>
                        0123456789 !@#$%^&*()
                    </p>
                </div>
                <div className="bg-[#1e1e1e] p-6 rounded-lg border border-[#333] hover:border-[#007acc]/50 transition-colors">
                    <p className="text-sm text-gray-500 mb-2 font-sans font-medium uppercase tracking-wider">Kurdish Sorani</p>
                    <p className="text-4xl text-white break-all leading-normal" dir="rtl">
                        بژی کورد و کوردستان
                    </p>
                </div>
            </div>
        </div>
    );
}
