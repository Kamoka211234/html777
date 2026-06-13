import React, { useMemo, useEffect, useRef } from 'react';
import { Globe, RefreshCw, ExternalLink } from 'lucide-react';
import { FileSystemItem } from '../types';
import { bundleProject, generateStandaloneRunner } from '../utils/previewWorker';

interface IframeActionProps {
    fileName: string;
    content: string;
    files?: FileSystemItem[];
    fileId?: string;
    onLog?: (log: { method: string; args: string[]; source?: string }) => void;
    onNavigate?: (path: string) => void;
}

export default function IframeAction({ fileName, content, files = [], fileId, onLog, onNavigate }: IframeActionProps) {
    const iframeRef  = useRef<HTMLIFrameElement>(null);
    const prevBlobRef = useRef<string>('');

    const blobUrl = useMemo(() => {
        if (!content) return '';
        if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);

        const processed = generateStandaloneRunner(files, fileId || 'index.html');

        const blob = new Blob([processed], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        prevBlobRef.current = url;
        return url;
    }, [content, files, fileId, fileName]);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.source !== iframeRef.current?.contentWindow) return;
            
            if (e.data?.type === 'console' && onLog) {
                onLog({ method: e.data.method, args: e.data.args, source: e.data.source });
            } else if (e.data?.type === 'navigate') {
                if (e.data.path.startsWith('http') || e.data.path.startsWith('//')) {
                    window.open(e.data.path, '_blank');
                } else if (onNavigate) {
                    onNavigate(e.data.path);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onLog]);

    useEffect(() => () => { if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current); }, []);

    const handleRefresh     = () => { if (iframeRef.current && blobUrl) iframeRef.current.src = blobUrl; };
    const handleOpenExternal = () => { if (blobUrl) window.open(blobUrl, '_blank'); };

    return (
        <div className="flex flex-col h-full w-full bg-white">
            <div className="flex items-center gap-2 text-white bg-[#1e1e1e] px-3 py-2 border-b border-[#333] shrink-0">
                <Globe size={15} className="text-[var(--accent)] shrink-0" />
                <span className="font-semibold text-sm flex-1 truncate">{fileName}</span>
                <button onClick={handleRefresh}      title="Reload preview"   className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><RefreshCw   size={13} /></button>
                <button onClick={handleOpenExternal} title="Open in new tab"  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ExternalLink size={13} /></button>
            </div>

            {blobUrl ? (
                <iframe
                    ref={iframeRef}
                    src={blobUrl}
                    title={fileName}
                    className="w-full flex-1 border-none bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    No content to preview
                </div>
            )}
        </div>
    );
}