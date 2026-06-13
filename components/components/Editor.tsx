import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { loader, OnMount } from '@monaco-editor/react';
import JSZip from 'jszip';
import { ConfigExplainer } from './ConfigExplainer';
import { Folder, File, Type, Music, Video as VideoIcon, Image as ImageIcon, ChevronRight, ChevronDown, Package, Sparkles, Volume2, VolumeX, Lock, FileText, Download, ExternalLink } from 'lucide-react';
import { formatCode } from '../utils/formatter';
import CodeMirror from '@uiw/react-codemirror';
import FontAction from './FontAction';
import IframeAction from './IframeAction';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { playSound } from '../utils/sound';

// Configure Monaco Loader
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });

interface EditorProps {
  content: string;
  language: string;
  onChange: (value: string | undefined) => void;
  searchTerm?: string;
  wordWrap: boolean;
  fontSize: number;
  isBinary?: boolean;
  mimeType?: string;
  fontFamily: string;
  lineHeight: number;
  tabSize: number;
  minimap: boolean;
  ligatures: boolean;
  theme: string;
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  smoothScrolling: boolean;
  bookmarks?: number[];
  onToggleBookmark?: (line: number) => void;
  scrollToLine?: number | null;
  onScrollHandled?: () => void;
  showLineNumbers?: boolean;
  showIndentGuides?: boolean;
  bracketPairColorization?: boolean;
  formatOnSave?: boolean;
  enableSounds?: boolean;
  onToggleSounds?: () => void;
  editorType: any; // Deprecated
  fileId?: string;
  fileName?: string;
  files?: Array<any>;
  onLog?: (log: any) => void;
  onNavigate?: (path: string) => void;
  testBoilerplate?: { content: string; offset: number; timestamp: number } | null;
  insertSnippet?: { content: string; timestamp: number } | null;
  onUnlockFile?: (fileId: string, decryptionKey: string) => void;
  settings?: any;
  hideMobileToolbar?: boolean;
  onChangeFontSize?: (size: number) => void;
}

// Sound effects class
class KeyboardSounds {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('click', () => this.initAudioContext(), { once: true });
    }
  }

  private initAudioContext() {
    if (!this.audioContext && this.enabled) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  playKeySound(char: string) {
    if (!this.enabled) return;
    try {
      this.initAudioContext();
      if (!this.audioContext) return;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      let frequency = 440;
      if (char.match(/[a-z]/i)) frequency = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88][(char.toLowerCase().charCodeAt(0) - 97) % 7];
      else if (char.match(/[0-9]/)) frequency = 523.25 + (parseInt(char) * 10);
      else if (char === ' ' || char === '\n') frequency = 200;
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (e) {}
  }

  playBackspaceSound() {
    if (!this.enabled) return;
    try {
      this.initAudioContext();
      if (!this.audioContext) return;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.08);
    } catch (e) {}
  }

  playEnterSound() {
    if (!this.enabled) return;
    try {
      this.initAudioContext();
      if (!this.audioContext) return;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.02);
      gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (e) {}
  }
}

// Zip Preview Helper
const ZipTreeItem: React.FC<{ node: any, depth: number }> = ({ node, depth }) => {
    const [isOpen, setIsOpen] = useState(false);
    if (node.type === 'file') {
        return (
            <div style={{ paddingLeft: depth * 16 + 12 }} className="flex items-center gap-2 py-1 text-xs text-gray-400 hover:bg-[#333] hover:text-gray-200 cursor-default rounded group">
                <File size={12} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">{node.name}</span>
            </div>
        );
    }
    return (
        <div>
            <div style={{ paddingLeft: depth * 16 + 8 }} className="flex items-center gap-1 py-1 text-xs text-gray-300 hover:bg-[#333] cursor-pointer rounded select-none group" onClick={() => setIsOpen(!isOpen)}>
                <span className="text-gray-500">{isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                <Folder size={12} className="text-[#dcb67a]" />
                <span className="truncate font-medium">{node.name}</span>
            </div>
            {isOpen && <div className="border-l border-[#333] ml-2">{node.children.map((child: any) => <ZipTreeItem key={child.path} node={child} depth={depth + 1} />)}</div>}
        </div>
    );
};

const decryptContent = (encryptedText: string, key: string): string => {
    if (!key) return encryptedText;
    try {
        const base64 = encryptedText.includes(',') ? encryptedText.split(',')[1] : encryptedText;
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        
        const decryptedBytes = new Uint8Array(bytes.length);
        const keyBytes = new TextEncoder().encode(key);
        for (let i = 0; i < bytes.length; i++) {
            decryptedBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        return new TextDecoder().decode(decryptedBytes);
    } catch (e) {
        throw new Error("Symmetric decryption failed. Check your password or format.");
    }
};

const encryptContent = (plainText: string, key: string): string => {
    if (!key) return plainText;
    const plainBytes = new TextEncoder().encode(plainText);
    const keyBytes = new TextEncoder().encode(key);
    const encryptedBytes = new Uint8Array(plainBytes.length);
    for (let i = 0; i < plainBytes.length; i++) {
        encryptedBytes[i] = plainBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    let binaryStr = '';
    for (let i = 0; i < encryptedBytes.length; i++) {
        binaryStr += String.fromCharCode(encryptedBytes[i]);
    }
    return btoa(binaryStr);
};

const viewStates = new Map<string, any>();
try {
    const rawStates = localStorage.getItem('monacoViewStates');
    if (rawStates) {
        const parsed = JSON.parse(rawStates);
        Object.keys(parsed).forEach(k => viewStates.set(k, parsed[k]));
    }
} catch (e) {}

const saveViewStateToStorage = () => {
    try {
        const toSave: Record<string, any> = {};
        viewStates.forEach((value, key) => {
            toSave[key] = value;
        });
        localStorage.setItem('monacoViewStates', JSON.stringify(toSave));
    } catch(e) {}
};

const addCustomBoilerplates = (context: string, suggestions: any[], range: any, monaco: any, model: any, position: any) => {
    try {
        let parsed: any[] = [];
        const localBoilerplates = localStorage.getItem('vs_custom_boilerplates');
        if (localBoilerplates) {
            try {
                parsed = JSON.parse(localBoilerplates);
            } catch (e) {
                parsed = [];
            }
        }
        
        if (!parsed || parsed.length === 0) {
            parsed = [
                {
                    id: 'default-fullcard',
                    name: 'Full Card (Tailwind)',
                    key: 'fullcard',
                    scope: 'html',
                    content: `<div class="max-w-[340px] rounded-[24px] overflow-hidden shadow-2xl border border-gray-100 bg-white hover:shadow-2xl hover:-translate-y-1 duration-300 transition-all transform">\n  <img class="w-full h-44 object-cover rounded-t-[24px]" src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=640" alt="Gradient Cover" referrerPolicy="no-referrer" />\n  <div class="p-5">\n    <div class="flex items-center gap-2 mb-2">\n      <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-wider">Featured</span>\n      <span class="text-[10px] text-gray-400 font-mono">5 min read</span>\n    </div>\n    <h3 class="text-lg font-bold text-gray-900 tracking-tight leading-snug">Beautiful Card Layout</h3>\n    <p class="mt-2 text-xs text-gray-500 leading-relaxed">This is a fully styled card boilerplate built using utility classes. You can place your custom text or interactive components here.</p>\n    <div class="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">\n      <div class="flex items-center gap-2">\n        <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>\n        <div>\n          <p class="text-[11px] font-semibold text-gray-800">Alex Rivers</p>\n          <p class="text-[9px] text-gray-400">Software Designer</p>\n        </div>\n      </div>\n      <button class="px-3.5 py-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 duration-150 rounded-lg shadow-md hover:shadow-lg">Explore</button>\n    </div>\n  </div>\n</div>`,
                    offset: 350
                },
                {
                    id: 'default-flexgrid',
                    name: 'Flex Grid (Tailwind)',
                    key: 'flexgrid',
                    scope: 'html',
                    content: `<div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-w-6xl mx-auto">\n  $0\n</div>`,
                    offset: 84
                }
            ];
            localStorage.setItem('vs_custom_boilerplates', JSON.stringify(parsed));
        }

        const matched = parsed.filter(b => b.scope === 'all' || b.scope === context);
        const lineContent = model.getLineContent(position.lineNumber);
        const textUntil = lineContent.substring(0, position.column);

        matched.forEach(cb => {
            const key = cb.key;
            const offset = typeof cb.offset === 'number' ? cb.offset : cb.content.length;
            
            // Escape standard $ prefix in parent content except our offset caret placeholder $0
            const before = cb.content.slice(0, offset).replace(/\$/g, '\\$');
            const after = cb.content.slice(offset).replace(/\$/g, '\\$');
            const insertTextSnippet = before + "$0" + after;

            const endsWithBang = textUntil.endsWith('!');
            const endsWithKey = textUntil.endsWith(key);
            const endsWithBangKey = textUntil.endsWith('!' + key);

            let startColumn = range.startColumn;
            let endColumn = range.endColumn;

            if (endsWithBangKey) {
                startColumn = position.column - (key.length + 1);
                endColumn = position.column;
            } else if (endsWithKey) {
                startColumn = position.column - key.length;
                endColumn = position.column;
            } else if (endsWithBang) {
                startColumn = position.column - 1;
                endColumn = position.column;
            }

            const customRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn,
                endColumn
            };

            // Add suggestion with "!" prefix
            suggestions.push({
                label: '!' + key,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: insertTextSnippet,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: customRange,
                detail: `Custom Snippet: ${cb.name}`,
                documentation: cb.content
            });

            // Add suggestion without "!" prefix
            suggestions.push({
                label: key,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: insertTextSnippet,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: customRange,
                detail: `Custom Snippet: ${cb.name}`,
                documentation: cb.content
            });
        });
    } catch (e) {
        console.error("Failed to parse custom boilerplates", e);
    }
};

const registerAllThemes = (monaco: any, settings: any) => {
    try {
        if (!monaco || !monaco.editor) return;
        // Dracula
        monaco.editor.defineTheme('dracula', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff79c6' },
                { token: 'identifier', foreground: 'f8f8f2' },
                { token: 'string', foreground: 'f1fa8c' },
                { token: 'number', foreground: 'bd93f9' },
                { token: 'type', foreground: '8be9fd' },
                { token: 'delimiter', foreground: 'f8f8f2' }
            ],
            colors: {
                'editor.background': '#282a36',
                'editor.foreground': '#f8f8f2',
                'editorCursor.foreground': '#f8f8f0',
                'editor.lineHighlightBackground': '#343746',
                'editorLineNumber.foreground': '#6272a4'
            }
        });

        // Nord
        monaco.editor.defineTheme('nord', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '4c566a', fontStyle: 'italic' },
                { token: 'keyword', foreground: '81a1c1' },
                { token: 'string', foreground: 'a3be8c' },
                { token: 'number', foreground: 'b48ead' },
                { token: 'type', foreground: '8fbcbb' },
                { token: 'delimiter', foreground: 'eceff4' }
            ],
            colors: {
                'editor.background': '#2e3440',
                'editor.foreground': '#d8dee9',
                'editorCursor.foreground': '#d8dee9',
                'editor.lineHighlightBackground': '#3b4252',
                'editorLineNumber.foreground': '#4c566a'
            }
        });

        // Monokai
        monaco.editor.defineTheme('monokai', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'f92672' },
                { token: 'string', foreground: 'e6db74' },
                { token: 'number', foreground: 'ae81ff' },
                { token: 'type', foreground: '66d9ef' },
                { token: 'delimiter', foreground: 'f8f8f2' }
            ],
            colors: {
                'editor.background': '#272822',
                'editor.foreground': '#f8f8f2',
                'editorCursor.foreground': '#f8f8f0',
                'editor.lineHighlightBackground': '#3e3d32',
                'editorLineNumber.foreground': '#75715e'
            }
        });

        // One Dark
        monaco.editor.defineTheme('onedark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c678dd' },
                { token: 'string', foreground: '98c379' },
                { token: 'number', foreground: 'd19a66' },
                { token: 'type', foreground: 'e5c07b' },
                { token: 'delimiter', foreground: 'abb2bf' }
            ],
            colors: {
                'editor.background': '#282c34',
                'editor.foreground': '#abb2bf',
                'editorCursor.foreground': '#528bff',
                'editor.lineHighlightBackground': '#2c313c',
                'editorLineNumber.foreground': '#4b5263'
            }
        });

        // Synthwave '84
        monaco.editor.defineTheme('synthwave', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '848bb3', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'fede5d' },
                { token: 'string', foreground: 'ff7edb' },
                { token: 'number', foreground: 'f97e72' },
                { token: 'type', foreground: '36f9f6' },
                { token: 'delimiter', foreground: 'b3b9d6' }
            ],
            colors: {
                'editor.background': '#262335',
                'editor.foreground': '#b3b9d6',
                'editorCursor.foreground': '#f92aad',
                'editor.lineHighlightBackground': '#2b273f',
                'editorLineNumber.foreground': '#848bb3'
            }
        });

        // Cyberpunk
        monaco.editor.defineTheme('cyberpunk', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '00ff00', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff0055' },
                { token: 'string', foreground: '00ffff' },
                { token: 'number', foreground: 'ffff00' },
                { token: 'type', foreground: 'ff00ff' },
                { token: 'delimiter', foreground: 'ffffff' }
            ],
            colors: {
                'editor.background': '#000000',
                'editor.foreground': '#00ffcc',
                'editorCursor.foreground': '#ff0055',
                'editor.lineHighlightBackground': '#111111',
                'editorLineNumber.foreground': '#00ff00'
            }
        });

        // Cobalt
        monaco.editor.defineTheme('cobalt', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '0088ff', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff9d00' },
                { token: 'string', foreground: '3ad900' },
                { token: 'number', foreground: 'ff6200' },
                { token: 'type', foreground: '80ffbb' },
                { token: 'delimiter', foreground: 'e1efff' }
            ],
            colors: {
                'editor.background': '#002240',
                'editor.foreground': '#ffffff',
                'editorCursor.foreground': '#ffee00',
                'editor.lineHighlightBackground': '#001a33',
                'editorLineNumber.foreground': '#0088ff'
            }
        });

        // GitHub Dark
        monaco.editor.defineTheme('github-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff7b72' },
                { token: 'string', foreground: 'a5d6ff' },
                { token: 'number', foreground: 'd2a8ff' },
                { token: 'type', foreground: 'ffa657' },
                { token: 'delimiter', foreground: 'c9d1d9' }
            ],
            colors: {
                'editor.background': '#0d1117',
                'editor.foreground': '#c9d1d9',
                'editorCursor.foreground': '#58a6ff',
                'editor.lineHighlightBackground': '#161b22',
                'editorLineNumber.foreground': '#484f58'
            }
        });

        // Custom Dynamic Theme
        if (settings) {
            monaco.editor.defineTheme('custom', {
                base: settings.customThemeBase || 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'comment', foreground: (settings.customThemeComments || '#6a9955').replace('#', ''), fontStyle: 'italic' },
                    { token: 'keyword', foreground: (settings.customThemeKeywords || '#569cd6').replace('#', '') },
                    { token: 'string', foreground: (settings.customThemeStrings || '#ce9178').replace('#', '') },
                    { token: 'number', foreground: (settings.customThemeNumbers || '#b5cea8').replace('#', '') },
                    { token: 'type', foreground: (settings.customThemeTypes || '#4ec9b0').replace('#', '') },
                    { token: 'delimiter', foreground: (settings.customThemeDelimiters || '#ffd700').replace('#', '') }
                ],
                colors: {
                    'editor.background': settings.customThemeBg || '#1e1e1e',
                    'editor.foreground': settings.customThemeFg || '#d4d4d4',
                    'editorCursor.foreground': settings.customThemeCursor || '#007acc',
                    'editor.lineHighlightBackground': settings.customThemeLineHighlight || '#2a2a2a',
                    'editorLineNumber.foreground': settings.customThemeComments || '#6a9955'
                }
            });
        }
    } catch(err) {
        console.error("registerAllThemes error", err);
    }
};

const CodeEditor: React.FC<EditorProps> = ({ 
    content, language, onChange, searchTerm, 
    wordWrap, fontSize, isBinary, mimeType,
    fontFamily, lineHeight, tabSize, minimap, ligatures, theme,
    cursorBlinking, cursorStyle, smoothScrolling, bookmarks = [], onToggleBookmark,
    scrollToLine, onScrollHandled,
    showLineNumbers = true, showIndentGuides = true, bracketPairColorization = true, formatOnSave = false,
    enableSounds = true, onToggleSounds, fileId, fileName, files, onLog, onNavigate, testBoilerplate, insertSnippet, onUnlockFile,
    settings,
    editorType = 'monaco',
    hideMobileToolbar = false,
    onChangeFontSize
}) => {
  
  const isAutoClosing = useRef(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const searchDecorationsRef = useRef<string[]>([]);
  const providerDisposables = useRef<any[]>([]);
  const lastTypedChar = useRef<{char: string, position: any, timeout: any | null}>({ char: '', position: null, timeout: null });
  const keyboardSounds = useRef<KeyboardSounds>(new KeyboardSounds());
  const lastChangeWasDelete = useRef<boolean>(false);
  const pinchStartDist = useRef<number>(0);
  const pinchStartFontSize = useRef<number>(14);

  const handlePinchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartDist.current = dist;
      pinchStartFontSize.current = fontSize || 14;
    }
  };

  const handlePinchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length === 2 && pinchStartDist.current > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / pinchStartDist.current;
      
      let newSize = Math.round(pinchStartFontSize.current * factor);
      newSize = Math.max(8, Math.min(newSize, 48));
      
      if (newSize !== fontSize && onChangeFontSize) {
        onChangeFontSize(newSize);
      }
    }
  };

  const handlePinchEnd = () => {
    pinchStartDist.current = 0;
  };

  const [zipTree, setZipTree] = useState<any[]>([]);
  const [isUnzipping, setIsUnzipping] = useState(false);
  const [monacoMounted, setMonacoMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchSelectionActive, setTouchSelectionActive] = useState(false);

  const [selectModeActive, setSelectModeActive] = useState(false);
  const [textareaAnchor, setTextareaAnchor] = useState<number | null>(null);
  const [textareaActiveCursor, setTextareaActiveCursor] = useState<number | null>(null);
  const [monacoAnchor, setMonacoAnchor] = useState<{ lineNumber: number; column: number } | null>(null);
  const [monacoActiveCursor, setMonacoActiveCursor] = useState<{ lineNumber: number; column: number } | null>(null);

  const handleToolkeyAction = (action: string) => {
    playSound('click');
    const isSimpleOrTouch = editorType === 'simple' || touchSelectionActive;

    if (action === 'sel') {
      if (isSimpleOrTouch) {
        const ta = document.querySelector('textarea') as HTMLTextAreaElement;
        if (!ta) return;
        ta.focus();
        if (selectModeActive) {
          setSelectModeActive(false);
          setTextareaAnchor(null);
          setTextareaActiveCursor(null);
        } else {
          setSelectModeActive(true);
          const currentPos = ta.selectionStart || 0;
          setTextareaAnchor(currentPos);
          setTextareaActiveCursor(currentPos);
        }
      } else {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        if (selectModeActive) {
          setSelectModeActive(false);
          setMonacoAnchor(null);
          setMonacoActiveCursor(null);
        } else {
          setSelectModeActive(true);
          const position = editor.getPosition();
          if (position) {
            const anchor = { lineNumber: position.lineNumber, column: position.column };
            setMonacoAnchor(anchor);
            setMonacoActiveCursor(anchor);
          }
        }
      }
      return;
    }
    
    if (isSimpleOrTouch) {
      const ta = document.querySelector('textarea') as HTMLTextAreaElement;
      if (!ta) return;
      ta.focus();
      const start = ta.selectionStart || 0;
      const end = ta.selectionEnd || 0;
      const value = ta.value;

      if (action === 'left') {
        const prevCur = textareaActiveCursor !== null ? textareaActiveCursor : start;
        const newCur = Math.max(0, prevCur - 1);
        if (selectModeActive) {
          const anchor = textareaAnchor !== null ? textareaAnchor : start;
          setTextareaActiveCursor(newCur);
          setTextareaAnchor(anchor);
          ta.setSelectionRange(Math.min(anchor, newCur), Math.max(anchor, newCur));
        } else {
          ta.setSelectionRange(newCur, newCur);
          setTextareaActiveCursor(newCur);
        }
      } else if (action === 'right') {
        const prevCur = textareaActiveCursor !== null ? textareaActiveCursor : start;
        const newCur = Math.min(value.length, prevCur + 1);
        if (selectModeActive) {
          const anchor = textareaAnchor !== null ? textareaAnchor : start;
          setTextareaActiveCursor(newCur);
          setTextareaAnchor(anchor);
          ta.setSelectionRange(Math.min(anchor, newCur), Math.max(anchor, newCur));
        } else {
          ta.setSelectionRange(newCur, newCur);
          setTextareaActiveCursor(newCur);
        }
      } else if (action === 'all') {
        ta.setSelectionRange(0, value.length);
        setSelectModeActive(false);
        setTextareaAnchor(null);
        setTextareaActiveCursor(null);
      } else if (action === 'copy') {
        navigator.clipboard.writeText(value);
        playSound('success');
      } else {
        // Any other insertion action resets selection mode state
        setSelectModeActive(false);
        setTextareaAnchor(null);
        setTextareaActiveCursor(null);

        let textToInsert = action;
        let cursorOffset = action.length;
        if (action === '""') {
          textToInsert = '""';
          cursorOffset = 1;
        } else if (action === '()') {
          textToInsert = '()';
          cursorOffset = 1;
        } else if (action === '{}') {
          textToInsert = '{}';
          cursorOffset = 1;
        }
        
        const newValue = value.substring(0, start) + textToInsert + value.substring(end);
        if (isEncryptedFile) {
          handleDecryptedChange(newValue);
        } else {
          onChange(newValue);
        }
        
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(start + cursorOffset, start + cursorOffset);
        }, 50);
      }
    } else {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      
      if (action === 'left') {
        const position = editor.getPosition();
        if (position) {
          const prevCur = monacoActiveCursor || position;
          let newLn = prevCur.lineNumber;
          let newCol = prevCur.column;
          if (newCol > 1) {
            newCol = newCol - 1;
          } else if (newLn > 1) {
            newLn = newLn - 1;
            const model = editor.getModel();
            newCol = (model ? model.getLineContent(newLn).length : 0) + 1;
          }
          const newCur = { lineNumber: newLn, column: newCol };
          
          if (selectModeActive) {
            const anchor = monacoAnchor || position;
            setMonacoActiveCursor(newCur);
            setMonacoAnchor(anchor);
            if (anchor) {
              editor.setSelection(new monacoRef.current.Selection(
                anchor.lineNumber,
                anchor.column,
                newCur.lineNumber,
                newCur.column
              ));
            }
          } else {
            editor.setPosition(newCur);
            editor.revealPosition(newCur);
            setMonacoActiveCursor(newCur);
          }
        }
      } else if (action === 'right') {
        const position = editor.getPosition();
        if (position) {
          const prevCur = monacoActiveCursor || position;
          let newLn = prevCur.lineNumber;
          let newCol = prevCur.column;
          const model = editor.getModel();
          const lineLength = model ? model.getLineContent(newLn).length : 0;
          if (newCol <= lineLength) {
            newCol = newCol + 1;
          } else if (model && newLn < model.getLineCount()) {
            newLn = newLn + 1;
            newCol = 1;
          }
          const newCur = { lineNumber: newLn, column: newCol };
          
          if (selectModeActive) {
            const anchor = monacoAnchor || position;
            setMonacoActiveCursor(newCur);
            setMonacoAnchor(anchor);
            if (anchor) {
              editor.setSelection(new monacoRef.current.Selection(
                anchor.lineNumber,
                anchor.column,
                newCur.lineNumber,
                newCur.column
              ));
            }
          } else {
            editor.setPosition(newCur);
            editor.revealPosition(newCur);
            setMonacoActiveCursor(newCur);
          }
        }
      } else if (action === 'all') {
        const model = editor.getModel();
        if (model) {
          editor.setSelection(new monacoRef.current.Selection(1, 1, model.getLineCount() + 1, 100));
          setSelectModeActive(false);
          setMonacoAnchor(null);
          setMonacoActiveCursor(null);
        }
      } else if (action === 'copy') {
        const val = editor.getValue();
        navigator.clipboard.writeText(val);
        playSound('success');
      } else {
        // Any other insertion action resets selection mode state
        setSelectModeActive(false);
        setMonacoAnchor(null);
        setMonacoActiveCursor(null);

        let textToInsert = action;
        let cursorOffset = action.length;
        if (action === '""') {
          textToInsert = '""';
          cursorOffset = 1;
        } else if (action === '()') {
          textToInsert = '()';
          cursorOffset = 1;
        } else if (action === '{}') {
          textToInsert = '{}';
          cursorOffset = 1;
        }
        
        const selection = editor.getSelection();
        if (selection) {
          const range = new monacoRef.current.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          );
          
          const id = { major: 1, minor: 1 };
          const op = { identifier: id, range: range, text: textToInsert, forceMoveMarkers: true };
          editor.executeEdits("my-source", [op]);
          
          editor.setPosition({
            lineNumber: selection.startLineNumber,
            column: selection.startColumn + cursorOffset
          });
        }
      }
    }
  };

  useEffect(() => {
    const handleCheck = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleCheck();
    window.addEventListener('resize', handleCheck);
    return () => window.removeEventListener('resize', handleCheck);
  }, []);
  
  const imagePreviewDisposable = useRef<any>(null);
  
  const isInternalChange = useRef(false);
  const isTyping = useRef(false);
  const typingTimeoutRef = useRef<any>(null);

  // Symmetric Encryption (.enc support)
  const isEncryptedFile = fileName?.endsWith('.enc');
  const [decryptionKey, setDecryptionKey] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [decryptedValue, setDecryptedValue] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<boolean>(false);
  const decryptionKeyRef = useRef(decryptionKey);

  useEffect(() => {
    decryptionKeyRef.current = decryptionKey;
  }, [decryptionKey]);

  useEffect(() => {
    setIsUnlocked(false);
    setDecryptedValue(null);
    setDecryptionKey('');
    setDecryptError(null);
    setShowKey(false);
  }, [fileId]);

  useEffect(() => {
    if (monacoRef.current) {
        registerAllThemes(monacoRef.current, settings);
        if (theme) {
            monacoRef.current.editor.setTheme(theme);
        }
    }
  }, [theme, settings]);

  const handleDecrypt = () => {
    try {
      if (!content || content.trim() === '') {
        setDecryptedValue('');
        setIsUnlocked(true);
        setDecryptError(null);
        return;
      }
      const decrypted = decryptContent(content, decryptionKey);
      
      // Validation check for correct passkey (high-noise detection)
      let unprintableCount = 0;
      for (let i = 0; i < Math.min(100, decrypted.length); i++) {
        const code = decrypted.charCodeAt(i);
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
          unprintableCount++;
        }
      }
      if (unprintableCount > decrypted.length * 0.3 && decrypted.length > 5) {
        throw new Error("Potential incorrect password: decrypted content contains high binary noise.");
      }
      
      setDecryptedValue(decrypted);
      setIsUnlocked(true);
      setDecryptError(null);
      if (fileId) onUnlockFile?.(fileId, decryptionKey);
    } catch (e: any) {
      setDecryptError(e.message || "Decryption failed. Please make sure the key is correct.");
    }
  };

  const handleDecryptedChange = (value: string | undefined) => {
    if (value === undefined) {
      onChange?.(undefined);
      return;
    }
    setDecryptedValue(value);
    try {
      const encrypted = encryptContent(value, decryptionKeyRef.current);
      onChange?.(encrypted);
    } catch (e) {
      console.error("Encryption error: ", e);
    }
  };

  const getDecryptedLanguage = () => {
    if (!fileName) return 'plaintext';
    const parts = fileName.split('.');
    if (parts.length > 2 && parts[parts.length - 1] === 'enc') {
      return parts[parts.length - 2];
    }
    return 'plaintext';
  };

  const editorValue = isEncryptedFile ? (decryptedValue || '') : content;
  const editorLanguage = isEncryptedFile ? getDecryptedLanguage() : language;

  useEffect(() => { keyboardSounds.current.setEnabled(enableSounds || false); }, [enableSounds]);

  // Handle Media Previews (Image/Video/Audio/GIF)
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' | 'audio'; x: number; y: number } | null>(null);
  const mediaPreviewUrlRef = useRef<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringModalRef = useRef(false);
  
  useEffect(() => {
      if (!monacoRef.current || !monacoMounted || !editorRef.current) return;
      if (!settings?.installedExtensions?.includes('kamoh.image-preview')) {
          setMediaPreview(null);
          mediaPreviewUrlRef.current = null;
          return;
      }
      
      const editor = editorRef.current;
      const disposable = editor.onMouseMove((e: any) => {
          if (isHoveringModalRef.current) return;
          
          const scheduleHide = () => {
              if (!hideTimeoutRef.current) {
                  hideTimeoutRef.current = setTimeout(() => {
                      if (!isHoveringModalRef.current) {
                          setMediaPreview(null);
                          mediaPreviewUrlRef.current = null;
                      }
                      hideTimeoutRef.current = null;
                  }, 300);
              }
          };

          if (!e.target || !e.target.position) {
              scheduleHide();
              return;
          }
          const { lineNumber, column } = e.target.position;
          const model = editor.getModel();
          if (!model) return;
          const lineContent = model.getLineContent(lineNumber);
          
          let start = column - 1;
          let end = column - 1;
          while (start > 0 && /[^\s"'`<>]/.test(lineContent[start])) start--;
          while (end < lineContent.length && /[^\s"'`<>]/.test(lineContent[end])) end++;
          
          const hoveredText = lineContent.substring(start + 1, end);
          if (!hoveredText.match(/(https?:\/\/[^\s"'`<>]+)|([\w./-]+\.(?:png|jpe?g|gif|webp|svg|mp4|webm|mp3|wav|ogg))/i)) {
              scheduleHide();
              return;
          }
          const url = hoveredText;
          
          if (mediaPreviewUrlRef.current === url) {
              if (hideTimeoutRef.current) {
                  clearTimeout(hideTimeoutRef.current);
                  hideTimeoutRef.current = null;
              }
              return; 
          }
          
          let inTag = false;
          let tagName = '';
          for (let i = start; i >= 0; i--) {
              if (lineContent[i] === '>') break; 
              if (lineContent[i] === '<') {
                  const tagMatch = lineContent.substring(i + 1).match(/^([a-zA-Z0-9\-]+)/);
                  if (tagMatch) {
                      tagName = tagMatch[1].toLowerCase();
                      inTag = true;
                  }
                  break;
              }
          }
          
          if (inTag && !['img', 'video', 'audio', 'source', 'svg', 'image'].includes(tagName)) {
             scheduleHide();
             return;
          }
          
          let type: 'image' | 'video' | 'audio' = 'image';
          if (url.match(/\.(mp4|webm)$/i) || tagName === 'video') type = 'video';
          else if (url.match(/\.(mp3|wav|ogg)$/i) || tagName === 'audio') type = 'audio';
          
          if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
          }

          mediaPreviewUrlRef.current = url;
          setMediaPreview({
              url,
              type,
              x: e.event.posx + 20,
              y: e.event.posy + 20
          });
      });
      
      const leaveDisposable = editor.onMouseLeave(() => {
          if (!isHoveringModalRef.current) {
              setMediaPreview(null);
              mediaPreviewUrlRef.current = null;
          }
      });
      
      const scrollDisposable = editor.onDidScrollChange(() => {
          setMediaPreview(null);
          mediaPreviewUrlRef.current = null;
      });
      
      return () => {
          disposable.dispose();
          leaveDisposable.dispose();
          scrollDisposable.dispose();
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      };
  }, [settings?.installedExtensions, monacoMounted]);

  // Handle Binary/Zip Previews
  useEffect(() => {
      if (isBinary && (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed' || content?.startsWith('UEsDB'))) {
          const loadZip = async () => {
              setIsUnzipping(true);
              try {
                  const base64Data = content.split(',')[1] || content;
                  const zip = await JSZip.loadAsync(base64Data, { base64: true });
                  const root: any[] = [];
                  const files: any[] = [];
                  zip.forEach((relativePath, file) => files.push({ path: relativePath, dir: file.dir }));
                  
                  files.forEach(file => {
                      const parts = file.path.split('/').filter((p:string) => p);
                      let currentLevel = root;
                      parts.forEach((part:string, i:number) => {
                          const isLast = i === parts.length - 1;
                          const isDir = file.dir || !isLast;
                          let node = currentLevel.find(n => n.name === part);
                          if (!node) {
                              node = { name: part, path: parts.slice(0, i+1).join('/') + (isDir ? '/' : ''), type: isDir ? 'folder' : 'file', children: [] };
                              currentLevel.push(node);
                          }
                          if (isDir) { node.type = 'folder'; currentLevel = node.children; }
                      });
                  });
                  setZipTree(root);
              } catch (e) { console.error("Unzip error", e); setZipTree([]); } 
              finally { setIsUnzipping(false); }
          };
          loadZip();
      }
  }, [content, isBinary, mimeType]);

  // Handle Scroll To Line
  useEffect(() => {
      if (editorRef.current && scrollToLine && scrollToLine > 0) {
          editorRef.current.revealLineInCenter(scrollToLine);
          editorRef.current.setPosition({ lineNumber: scrollToLine, column: 1 });
          editorRef.current.focus();
          const decoration = { range: new monacoRef.current.Range(scrollToLine, 1, scrollToLine, 1), options: { isWholeLine: true, className: 'line-highlight-gentle' } };
          const ids = editorRef.current.deltaDecorations([], [decoration]);
          setTimeout(() => editorRef.current.deltaDecorations(ids, []), 800);
          if (onScrollHandled) onScrollHandled();
      }
  }, [scrollToLine]);

  // Update Bookmarks
  useEffect(() => {
      if (editorRef.current && monacoRef.current) {
          const newDecorations = bookmarks.map(line => ({
              range: new monacoRef.current.Range(line, 1, line, 1),
              options: { isWholeLine: true, linesDecorationsClassName: 'bookmarked-line-decoration' }
          }));
          decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
      }
  }, [bookmarks]);

  // Handle Search Term
  useEffect(() => {
      if (editorRef.current && monacoRef.current && searchTerm) {
          const matches = editorRef.current.getModel()?.findMatches(searchTerm, false, false, false, null, true) || [];
          if (matches.length > 0) {
              editorRef.current.revealLineInCenter(matches[0].range.startLineNumber);
          }
      }
  }, [searchTerm]);

  // Handle Search Highlights without scrolling
  useEffect(() => {
      if (editorRef.current && monacoRef.current) {
          if (searchTerm) {
              const matches = editorRef.current.getModel()?.findMatches(searchTerm, false, false, false, null, true) || [];
              const newDecorations = matches.map((match: any) => ({
                  range: match.range,
                  options: { inlineClassName: 'search-highlight', stickiness: 1 }
              }));
              searchDecorationsRef.current = editorRef.current.deltaDecorations(searchDecorationsRef.current, newDecorations);
          } else {
              searchDecorationsRef.current = editorRef.current.deltaDecorations(searchDecorationsRef.current, []);
          }
      }
  }, [searchTerm, content]);

  // Handle content updates without losing scroll position for external changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const model = editor.getModel();
      
      if (model && !isInternalChange.current && !isTyping.current) {
        if (model.getValue() !== content) {
          isInternalChange.current = true;
          
          const currentPosition = editor.getPosition();
          const currentScrollTop = editor.getScrollTop();
          
          model.setValue(content);
          
          if (currentPosition) {
            const lineCount = model.getLineCount();
            if (currentPosition.lineNumber <= lineCount) {
              editor.setPosition(currentPosition);
            }
          }
          editor.setScrollTop(currentScrollTop);
          
          setTimeout(() => {
            isInternalChange.current = false;
          }, 0);
        }
      }
    }
  }, [content]);

  // Handle Boilerplate Testing
  useEffect(() => {
    if (editorRef.current && monacoRef.current && testBoilerplate) {
      isInternalChange.current = true;
      const editor = editorRef.current;
      const model = editor.getModel();
      if (model) {
        model.setValue(testBoilerplate.content);
        // Position cursor exactly at index 'offset'
        const monacoPos = model.getPositionAt(testBoilerplate.offset);
        editor.setPosition(monacoPos);
        editor.focus();
      }
      setTimeout(() => {
        isInternalChange.current = false;
      }, 100);
    }
  }, [testBoilerplate]);

  // Handle Boilerplate Snippet Insertion at Cursor
  useEffect(() => {
    if (editorRef.current && monacoRef.current && insertSnippet) {
      isInternalChange.current = true;
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const range = selection 
        ? new monacoRef.current.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn)
        : new monacoRef.current.Range(1, 1, 1, 1);
      
      const text = insertSnippet.content;
      const op = {
        identifier: { major: 1, minor: 1 },
        range: range,
        text: text,
        forceMoveMarkers: true
      };
      
      editor.executeEdits("snippet-insert", [op]);
      editor.focus();
      
      setTimeout(() => {
        isInternalChange.current = false;
      }, 100);
    }
  }, [insertSnippet]);

  useEffect(() => {
      return () => {
          providerDisposables.current.forEach(d => d.dispose());
          providerDisposables.current = [];
      };
  }, []);

  const showTypedCharAnimation = useCallback((char: string, position: any) => {
      if (!editorRef.current || !monacoRef.current || char.trim() === '') return;
      
      const range = new monacoRef.current.Range(position.lineNumber, Math.max(1, position.column - 1), position.lineNumber, position.column);
      const decoration = { range, options: { inlineClassName: 'typed-char-highlight', stickiness: 1 } };
      
      // We don't track previous decorations for this because we want them to stack if typing fast
      const ids = editorRef.current.deltaDecorations([], [decoration]);
      setTimeout(() => editorRef.current.deltaDecorations(ids, []), 400);
  }, []);

  const isRestoringRef = useRef(false);
  const fileIdRef = useRef(fileId);
  const restoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTextRef = useRef<string>('');

  useEffect(() => {
      previousTextRef.current = editorValue || '';
  }, [fileId, editorValue]);

  useEffect(() => {
      fileIdRef.current = fileId;
      isRestoringRef.current = true;

      if (restoreTimeoutRef.current) clearTimeout(restoreTimeoutRef.current);

      if (editorRef.current && fileId) {
          const state = viewStates.get(fileId);
          if (state) {
              restoreTimeoutRef.current = setTimeout(() => {
                  if (editorRef.current && fileIdRef.current === fileId) {
                      editorRef.current.restoreViewState(state);
                      setTimeout(() => { isRestoringRef.current = false; }, 100);
                  } else {
                      isRestoringRef.current = false;
                  }
              }, 50);
          } else {
              isRestoringRef.current = false;
          }
      } else {
          isRestoringRef.current = false;
      }
  }, [fileId]);

  useEffect(() => {
      return () => {
          if (editorRef.current && fileIdRef.current) {
              viewStates.set(fileIdRef.current, editorRef.current.saveViewState());
              saveViewStateToStorage();
          }
      };
  }, []);

  // Native programmatical folding helpers
  const foldAtLine = (lineNumber: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentPosition = editor.getPosition();
    editor.setPosition({ lineNumber, column: 1 });
    editor.trigger('keyboard', 'editor.fold', null);
    if (currentPosition) {
        editor.setPosition(currentPosition);
    }
  };

  const foldStyleTags = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    
    const linesCount = model.getLineCount();
    const targetLines: number[] = [];
    
    for (let i = 1; i <= linesCount; i++) {
        const lineContent = model.getLineContent(i);
        if (/<style/i.test(lineContent)) {
            targetLines.push(i);
        }
    }
    targetLines.forEach(line => foldAtLine(line));
  };

  const foldScriptTags = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    
    const linesCount = model.getLineCount();
    const targetLines: number[] = [];
    
    for (let i = 1; i <= linesCount; i++) {
        const lineContent = model.getLineContent(i);
        if (/<script/i.test(lineContent)) {
            targetLines.push(i);
        }
    }
    targetLines.forEach(line => foldAtLine(line));
  };

  const foldCurlyBraces = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    
    const linesCount = model.getLineCount();
    let insideStyleOrScript = false;
    const targetLines: number[] = [];
    
    for (let i = 1; i <= linesCount; i++) {
        const lineContent = model.getLineContent(i);
        
        if (/<style/i.test(lineContent) || /<script/i.test(lineContent)) {
            insideStyleOrScript = true;
            continue;
        }
        if (/<\/style/i.test(lineContent) || /<\/script/i.test(lineContent)) {
            insideStyleOrScript = false;
            continue;
        }
        
        if (insideStyleOrScript && lineContent.includes('{')) {
            targetLines.push(i);
        }
    }
    
    targetLines.reverse().forEach(line => foldAtLine(line));
  };

  const foldCssSelectors = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    
    const linesCount = model.getLineCount();
    const targetLines: number[] = [];
    
    for (let i = 1; i <= linesCount; i++) {
        const lineContent = model.getLineContent(i);
        if (lineContent.includes('{')) {
            targetLines.push(i);
        }
    }
    targetLines.reverse().forEach(line => foldAtLine(line));
  };

  const foldJsFunctions = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    
    const linesCount = model.getLineCount();
    const targetLines: number[] = [];
    
    for (let i = 1; i <= linesCount; i++) {
        const lineContent = model.getLineContent(i);
        if (lineContent.includes('{')) {
            targetLines.push(i);
        }
    }
    targetLines.reverse().forEach(line => foldAtLine(line));
  };

  const unfoldAll = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.trigger('keyboard', 'editor.unfoldAll', null);
  };

  const getUnclosedTags = (text: string): string[] => {
      const tagRegex = /<([a-zA-Z0-9:-]+)(?:\s+[^>]*?)?>|<\/([a-zA-Z0-9:-]+)>/g;
      const openTags: string[] = [];
      let match;
      const selfClosingTags = new Set([
          'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
          'link', 'meta', 'param', 'source', 'track', 'wbr'
      ]);
      
      while ((match = tagRegex.exec(text)) !== null) {
          const openTagName = match[1];
          const closeTagName = match[2];
          
          if (openTagName) {
              const lower = openTagName.toLowerCase();
              if (!selfClosingTags.has(lower)) {
                  openTags.push(lower);
              }
          } else if (closeTagName) {
              const lower = closeTagName.toLowerCase();
              const index = openTags.lastIndexOf(lower);
              if (index !== -1) {
                  openTags.splice(index, 1);
              }
          }
      }
      return openTags;
  };

  const getUnclosedTagRanges = (text: string): Array<{ name: string, startLine: number, startCol: number, endLine: number, endCol: number }> => {
      const tagRegex = /<([a-zA-Z0-9:-]+)(?:\s+[^>]*?)?>|<\/([a-zA-Z0-9:-]+)>/g;
      const openTagsStack: Array<{ name: string, startLine: number, startCol: number, endLine: number, endCol: number }> = [];
      const lines = text.split('\n');
      
      const lineStarts: number[] = [];
      let currentIdx = 0;
      for (const line of lines) {
          lineStarts.push(currentIdx);
          currentIdx += line.length + 1; // +1 for '\n'
      }
      
      const selfClosingTags = new Set([
          'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
          'link', 'meta', 'param', 'source', 'track', 'wbr'
      ]);
      
      let match;
      while ((match = tagRegex.exec(text)) !== null) {
          const openTagName = match[1];
          const closeTagName = match[2];
          const matchIdx = match.index;
          const matchLength = match[0].length;
          
          const getLineCol = (index: number) => {
              let lineNum = 0;
              while (lineNum < lineStarts.length - 1 && lineStarts[lineNum + 1] <= index) {
                  lineNum++;
              }
              const col = index - lineStarts[lineNum] + 1;
              return { line: lineNum + 1, col };
          };
          
          if (openTagName) {
              const lowerName = openTagName.toLowerCase();
              if (!selfClosingTags.has(lowerName)) {
                  const startLoc = getLineCol(matchIdx);
                  const endLoc = getLineCol(matchIdx + matchLength);
                  openTagsStack.push({
                      name: lowerName,
                      startLine: startLoc.line,
                      startCol: startLoc.col,
                      endLine: endLoc.line,
                      endCol: endLoc.col
                  });
              }
          } else if (closeTagName) {
              const lowerName = closeTagName.toLowerCase();
              let foundIdx = -1;
              for (let i = openTagsStack.length - 1; i >= 0; i--) {
                  if (openTagsStack[i].name === lowerName) {
                      foundIdx = i;
                      break;
                  }
              }
              if (foundIdx !== -1) {
                  openTagsStack.splice(foundIdx, 1);
              }
          }
      }
      
      return openTagsStack;
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      registerAllThemes(monaco, settings);
      setMonacoMounted(true);

      if (fileIdRef.current) {
          const state = viewStates.get(fileIdRef.current);
          if (state) editor.restoreViewState(state);
      }

      let saveTimeout: NodeJS.Timeout;
      const saveState = () => {
          if (isRestoringRef.current) return;
          const targetFileId = fileIdRef.current;
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
              if (isRestoringRef.current) return;
              if (targetFileId === fileIdRef.current && editorRef.current) {
                  viewStates.set(targetFileId, editorRef.current.saveViewState());
                  saveViewStateToStorage();
              }
          }, 300);
      };

      editor.onDidChangeCursorPosition(saveState);
      editor.onDidScrollChange(saveState);

      const style = document.createElement('style');
      style.innerHTML = `
          @keyframes typePop {
              0% { background-color: rgba(255, 255, 0, 0.4); color: white; transform: scale(1.1); }
              100% { background-color: transparent; color: inherit; transform: scale(1); }
          }
          .typed-char-highlight { animation: typePop 0.4s ease-out forwards; }
          .bookmarked-line-decoration { background: #ff6b6b; width: 3px !important; margin-left: 2px; }
          .line-highlight-gentle { animation: typePop 0.8s ease-out; }
          .search-highlight { background-color: rgba(255, 255, 0, 0.4); }
          .editor-unclosed-tag-highlight { 
              background-color: rgba(239, 68, 68, 0.25) !important; 
              border-bottom: 2px dashed #ef4444 !important;
              border-radius: 2px;
          }
          .editor-tag-matching-pair-highlight {
              background-color: rgba(14, 165, 233, 0.35) !important;
              border-bottom: 2px solid #0ea5e9 !important;
              border-radius: 2px;
              color: #38bdf8 !important;
              font-weight: 500 !important;
              transition: all 0.15s ease-in-out;
          }
          .close-finder-widget-container {
              background-color: #ef4444 !important;
              color: white !important;
              padding: 4px 8px !important;
              border-radius: 4px !important;
              font-family: inherit !important;
              font-size: 10px !important;
              font-weight: bold !important;
              display: flex !important;
              align-items: center !important;
              gap: 6px !important;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
              pointer-events: auto !important;
              border: 1px solid #f87171 !important;
              white-space: nowrap !important;
              z-index: 1000 !important;
          }
          .close-finder-create-btn {
              background-color: white !important;
              color: #b91c1c !important;
              border: none !important;
              border-radius: 3px !important;
              padding: 2px 6px !important;
              font-weight: 800 !important;
              cursor: pointer !important;
              text-transform: uppercase !important;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
              transition: all 0.15s;
          }
          .close-finder-create-btn:hover {
              background-color: #fee2e2 !important;
              transform: scale(1.05);
          }
          /* Prevent Monaco suggest widget dropdown from taking full height of screen */
          .monaco-editor .suggest-widget {
              max-height: 300px !important;
              max-width: 450px !important;
              border: 1px solid #3c3c3c !important;
              border-radius: 6px !important;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6) !important;
          }
          .monaco-editor .suggest-widget .monaco-list {
              max-height: 290px !important;
          }
          .monaco-editor .suggest-widget .monaco-list .monaco-scrollable-element {
              max-height: 290px !important;
          }
      `;
      document.head.appendChild(style);

      // Register Prettier Formatting Providers
      if (!(window as any).__prettierFormattersRegistered) {
          (window as any).__prettierFormattersRegistered = true;
          const languages = ['html', 'javascript', 'typescript', 'css', 'json', 'scss', 'less', 'typescript-jsx', 'javascript-jsx'];
          languages.forEach(lang => {
              monaco.languages.registerDocumentFormattingEditProvider(lang, {
                  async provideDocumentFormattingEdits(model, options, token) {
                      try {
                          const originalText = model.getValue();
                          const formatted = await formatCode(originalText, lang);
                          return [
                              {
                                  range: model.getFullModelRange(),
                                  text: formatted
                              }
                          ];
                      } catch (err) {
                          console.error("Formatter failed for", lang, err);
                          return [];
                      }
                  }
              });
          });
      }

      // Auto-formatting on paste
      editor.onDidPaste((e) => {
          if (settings?.installedExtensions?.includes('kamoh.code-prettier')) {
              setTimeout(async () => {
                  try {
                      const model = editor.getModel();
                      if (!model) return;
                      const lang = model.getLanguageId();
                      const text = model.getValue();
                      const formatted = await formatCode(text, lang);
                      if (formatted && formatted !== text) {
                          const position = editor.getPosition();
                          editor.executeEdits('prettier-on-paste', [{
                              range: model.getFullModelRange(),
                              text: formatted
                          }]);
                          if (position) editor.setPosition(position);
                      }
                  } catch (err) {
                      console.warn("Auto-formatting on paste failed", err);
                  }
              }, 50);
          }
      });

      // Parse tags helper
      const parseDocTags = (text: string, model: any) => {
          const tagRegex = /<(\/)?([a-zA-Z0-9:-]+)(?:\s+[^>]*?)?(\/)?>/g;
          const tags: any[] = [];
          const selfClosingTags = new Set([
              'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
              'link', 'meta', 'param', 'source', 'track', 'wbr'
          ]);
          
          let match;
          while ((match = tagRegex.exec(text)) !== null) {
              const isClose = !!match[1];
              const name = match[2].toLowerCase();
              const isSelfClosing = !!match[3] || selfClosingTags.has(name);
              
              if (isSelfClosing) continue;
              
              const startPos = model.getPositionAt(match.index);
              const endPos = model.getPositionAt(match.index + match[0].length);
              
              tags.push({
                  name,
                  isOpen: !isClose,
                  start: match.index,
                  end: match.index + match[0].length,
                  range: {
                      startLineNumber: startPos.lineNumber,
                      startColumn: startPos.column,
                      endLineNumber: endPos.lineNumber,
                      endColumn: endPos.column
                  }
              });
          }
          
          const stack: any[] = [];
          for (const tag of tags) {
              if (tag.isOpen) {
                  stack.push(tag);
              } else {
                  let foundIdx = -1;
                  for (let i = stack.length - 1; i >= 0; i--) {
                      if (stack[i].name === tag.name && !stack[i].pair) {
                          foundIdx = i;
                          break;
                      }
                  }
                  if (foundIdx !== -1) {
                      const openTag = stack[foundIdx];
                      openTag.pair = tag;
                      tag.pair = openTag;
                  }
              }
          }
          return tags;
      };

      // Matched and unclosed tag pairing with Close Finder widget
      let tagMatchingDecorations: string[] = [];
      let lastActiveTag: any = null;
      let activeContentWidget: any = null;

      const removeContentWidget = () => {
          if (activeContentWidget) {
              try {
                  editor.removeContentWidget(activeContentWidget);
              } catch (err) {}
              activeContentWidget = null;
          }
      };

      const updateTagHighlightsAndWidget = (position: any) => {
          if (!editor) return;
          const model = editor.getModel();
          if (!model) return;

          const langId = model.getLanguageId();
          if (langId !== 'html') {
              tagMatchingDecorations = editor.deltaDecorations(tagMatchingDecorations, []);
              removeContentWidget();
              return;
          }

          try {
              const text = model.getValue();
              const offset = model.getOffsetAt(position);
              const tags = parseDocTags(text, model);
              
              // Find tag under cursor/offset
              const activeTag = tags.find(t => offset >= t.start && offset <= t.end);

              if (!activeTag) {
                  tagMatchingDecorations = editor.deltaDecorations(tagMatchingDecorations, []);
                  removeContentWidget();
                  lastActiveTag = null;
                  return;
              }

              if (lastActiveTag === activeTag) return;
              lastActiveTag = activeTag;

              const decorations: any[] = [];
              removeContentWidget();

              // If has matching pair, highlight both
              if (activeTag.pair) {
                  decorations.push({
                      range: new monaco.Range(activeTag.range.startLineNumber, activeTag.range.startColumn, activeTag.range.endLineNumber, activeTag.range.endColumn),
                      options: { className: 'editor-tag-matching-pair-highlight', isWholeLine: false, hoverMessage: { value: `🔗 Closely linked to </${activeTag.name}>` } }
                  });
                  decorations.push({
                      range: new monaco.Range(activeTag.pair.range.startLineNumber, activeTag.pair.range.startColumn, activeTag.pair.range.endLineNumber, activeTag.pair.range.endColumn),
                      options: { className: 'editor-tag-matching-pair-highlight', isWholeLine: false, hoverMessage: { value: `🔗 Closely linked to <${activeTag.name}>` } }
                  });
              } else {
                  // If unclosed tag, highlight as warning
                  decorations.push({
                      range: new monaco.Range(activeTag.range.startLineNumber, activeTag.range.startColumn, activeTag.range.endLineNumber, activeTag.range.endColumn),
                      options: { className: 'editor-unclosed-tag-highlight', isWholeLine: false }
                  });

                  // If it's an opening tag, show Close Finder warning/create button
                  if (activeTag.isOpen) {
                      const widgetDomNode = document.createElement('div');
                      widgetDomNode.className = 'close-finder-widget-container';
                      widgetDomNode.innerHTML = `
                          <span>⚠️ Unclosed &lt;${activeTag.name}&gt; tag! (Close Finder)</span>
                          <button class="close-finder-create-btn">&lt;create&gt;</button>
                      `;

                      const btn = widgetDomNode.querySelector('.close-finder-create-btn');
                      if (btn) {
                          btn.addEventListener('click', (ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();

                              const closeTagStr = `</${activeTag.name}>`;
                              const currentPos = editor.getPosition();
                              let insertRange;
                              if (currentPos) {
                                  insertRange = new monaco.Range(currentPos.lineNumber, currentPos.column, currentPos.lineNumber, currentPos.column);
                              } else {
                                  const lineLength = model.getLineLength(activeTag.range.endLineNumber);
                                  insertRange = new monaco.Range(activeTag.range.endLineNumber, lineLength + 1, activeTag.range.endLineNumber, lineLength + 1);
                              }

                              editor.executeEdits('close-finder-create', [{
                                  range: insertRange,
                                  text: closeTagStr
                              }]);
                              removeContentWidget();
                              setTimeout(() => {
                                  updateTagHighlightsAndWidget(editor.getPosition() || position);
                              }, 100);
                          });
                      }

                      const widgetId = 'close-finder-widget';
                      activeContentWidget = {
                          getId: () => widgetId,
                          getDomNode: () => widgetDomNode,
                          getPosition: () => ({
                              position: new monaco.Position(activeTag.range.endLineNumber, activeTag.range.endColumn + 2),
                              preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
                          })
                      };
                      editor.addContentWidget(activeContentWidget);
                  }
              }

              tagMatchingDecorations = editor.deltaDecorations(tagMatchingDecorations, decorations);

          } catch (e) {
              console.error("Tag matching highlight updater failed", e);
          }
      };

      editor.onDidChangeCursorPosition((e) => {
          updateTagHighlightsAndWidget(e.position);
      });

      editor.onMouseMove((e) => {
          if (e.target && e.target.position) {
              updateTagHighlightsAndWidget(e.target.position);
          }
      });

      // HTML/JSX Auto Rename Tag feature (client-side, robust on keystroke)
      interface ParsedTextTag {
          name: string;
          isOpen: boolean;
          start: number;
          end: number;
          nameStart: number;
          nameEnd: number;
          pair?: ParsedTextTag;
      }

      const parseDocTagsFromText = (text: string): ParsedTextTag[] => {
          const tagRegex = /<(\/)?([a-zA-Z0-9:-]+)(?:\s+[^>]*?)?(\/)?>/g;
          const tags: ParsedTextTag[] = [];
          const selfClosingTags = new Set([
              'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
              'link', 'meta', 'param', 'source', 'track', 'wbr'
          ]);
          
          let match;
          while ((match = tagRegex.exec(text)) !== null) {
              const isClose = !!match[1];
              const name = match[2];
              const isSelfClosing = !!match[3] || selfClosingTags.has(name.toLowerCase());
              
              if (isSelfClosing) continue;
              
              const start = match.index;
              const end = match.index + match[0].length;
              const nameStart = start + (isClose ? 2 : 1);
              const nameEnd = nameStart + name.length;
              
              tags.push({
                  name,
                  isOpen: !isClose,
                  start,
                  end,
                  nameStart,
                  nameEnd
              });
          }
          
          const stack: ParsedTextTag[] = [];
          for (const tag of tags) {
              if (tag.isOpen) {
                  stack.push(tag);
              } else {
                  let foundIdx = -1;
                  for (let i = stack.length - 1; i >= 0; i--) {
                      if (stack[i].name.toLowerCase() === tag.name.toLowerCase() && !stack[i].pair) {
                          foundIdx = i;
                          break;
                      }
                  }
                  if (foundIdx !== -1) {
                      const openTag = stack[foundIdx];
                      openTag.pair = tag;
                      tag.pair = openTag;
                      stack.splice(foundIdx, stack.length - foundIdx);
                  }
              }
          }
          return tags;
      };

      let isApplyingAutoRename = false;
      editor.onDidChangeModelContent((e) => {
          if (isApplyingAutoRename) return;
          
          const model = editor.getModel();
          if (!model) return;
          
          const langId = model.getLanguageId();
          if (langId !== 'html' && langId !== 'javascript' && langId !== 'typescript') {
              previousTextRef.current = model.getValue();
              return;
          }
          
          const previousText = previousTextRef.current;
          const currentText = model.getValue();
          
          if (!previousText) {
              previousTextRef.current = currentText;
              return;
          }
          
          if (e.changes.length !== 1) {
              previousTextRef.current = currentText;
              return;
          }
          
          const change = e.changes[0];
          const changeStart = change.rangeOffset;
          const changeEnd = change.rangeOffset + change.rangeLength;
          
          const prevTags = parseDocTagsFromText(previousText);
          const editedTag = prevTags.find(t => {
              return changeStart >= t.nameStart && changeEnd <= t.nameEnd;
          });
          
          if (editedTag && editedTag.pair) {
              const pairTag = editedTag.pair;
              const relativeStart = changeStart - editedTag.nameStart;
              const relativeEnd = changeEnd - editedTag.nameStart;
              const originalName = editedTag.name;
              const newTagName = originalName.slice(0, relativeStart) + change.text + originalName.slice(relativeEnd);
              
              if (/^[a-zA-Z0-9:-]*$/.test(newTagName)) {
                  let pairStartCurrent = pairTag.nameStart;
                  let pairEndCurrent = pairTag.nameEnd;
                  
                  if (pairTag.nameStart > changeStart) {
                      const delta = change.text.length - change.rangeLength;
                      pairStartCurrent += delta;
                      pairEndCurrent += delta;
                  }
                  
                  const rangeStartPos = model.getPositionAt(pairStartCurrent);
                  const rangeEndPos = model.getPositionAt(pairEndCurrent);
                  const replaceRange = new monaco.Range(
                      rangeStartPos.lineNumber,
                      rangeStartPos.column,
                      rangeEndPos.lineNumber,
                      rangeEndPos.column
                  );
                  
                  isApplyingAutoRename = true;
                  model.pushEditOperations(
                      editor.getSelections(),
                      [{
                          range: replaceRange,
                          text: newTagName,
                          forceMoveMarkers: true
                      }],
                      () => null
                  );
                  isApplyingAutoRename = false;
              }
          }
          
          previousTextRef.current = model.getValue();
      });

      // Setup dynamic decorations to highlight unclosed HTML tags
      let unclosedTagDecorations: string[] = [];
      const updateUnclosedTagDecorations = () => {
          if (!editor) return;
          const model = editor.getModel();
          if (!model) return;
          
          const langId = model.getLanguageId();
          if (langId !== 'html') {
              unclosedTagDecorations = editor.deltaDecorations(unclosedTagDecorations, []);
              return;
          }
          
          try {
              const text = model.getValue();
              const unclosedRanges = getUnclosedTagRanges(text);
              const decorations = unclosedRanges.map(tag => ({
                  range: new monaco.Range(tag.startLine, tag.startCol, tag.endLine, tag.endCol),
                  options: {
                      isWholeLine: false,
                      className: 'editor-unclosed-tag-highlight',
                      hoverMessage: { value: `⚠️ **Syntax Warning**: The tag \`<${tag.name}>\` has not been closed yet.` },
                      overviewRuler: {
                          color: '#ef4444',
                          position: monaco.editor.OverviewRulerLane.Right
                      }
                  }
              }));
              unclosedTagDecorations = editor.deltaDecorations(unclosedTagDecorations, decorations);
          } catch (e) {
              console.error(e);
          }
      };

      editor.onDidChangeModelContent(() => {
          updateUnclosedTagDecorations();
      });
      setTimeout(updateUnclosedTagDecorations, 600);

      // Context detection helper
      const getContext = (model: any, position: any) => {
          const langId = model.getLanguageId();
          if (langId === 'php') return 'php';
          if (langId === 'javascript' || langId === 'typescript') return 'javascript';
          if (langId === 'css') return 'css';

          const text = model.getValueInRange({startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column});
          if (text.lastIndexOf('<script') > text.lastIndexOf('</script')) return 'javascript';
          if (text.lastIndexOf('<style') > text.lastIndexOf('</style')) return 'css';
          
          const lineContent = model.getLineContent(position.lineNumber);
          const lineUntil = lineContent.substring(0, position.column);
          if (/style\s*=\s*"[^"]*$/.test(lineUntil)) return 'css';
          
          return 'html';
      };

      // Color Provider for HTML/JS (including named colors support)
      const colorProvider = monaco.languages.registerColorProvider(['html', 'javascript', 'typescript'], {
          provideDocumentColors: (model) => {
              const text = model.getValue();
              const colors: any[] = [];
              let match;
              
              // 1. Match hex colors (3 or 6 digits)
              const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
              while ((match = hexRegex.exec(text)) !== null) {
                  const startPos = model.getPositionAt(match.index);
                  const endPos = model.getPositionAt(match.index + match[0].length);
                  
                  let hex = match[1];
                  if (hex.length === 3) {
                      hex = hex.split('').map(c => c + c).join('');
                  }
                  
                  const r = parseInt(hex.substring(0, 2), 16) / 255;
                  const g = parseInt(hex.substring(2, 4), 16) / 255;
                  const b = parseInt(hex.substring(4, 6), 16) / 255;
                  
                  colors.push({
                      range: {
                          startLineNumber: startPos.lineNumber,
                          startColumn: startPos.column,
                          endLineNumber: endPos.lineNumber,
                          endColumn: endPos.column
                      },
                      color: { red: r, green: g, blue: b, alpha: 1 }
                  });
              }
              
              // 2. Match rgb/rgba
              const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/g;
              while ((match = rgbRegex.exec(text)) !== null) {
                  const startPos = model.getPositionAt(match.index);
                  const endPos = model.getPositionAt(match.index + match[0].length);
                  
                  colors.push({
                      range: {
                          startLineNumber: startPos.lineNumber,
                          startColumn: startPos.column,
                          endLineNumber: endPos.lineNumber,
                          endColumn: endPos.column
                      },
                      color: { 
                          red: parseInt(match[1]) / 255, 
                          green: parseInt(match[2]) / 255, 
                          blue: parseInt(match[3]) / 255, 
                          alpha: match[4] ? parseFloat(match[4]) : 1 
                      }
                  });
              }

              // 3. Match CSS named colors (e.g. red, gray, blue) when used in style tags or properties
              const namedColorsMap: Record<string, {r: number, g: number, b: number}> = {
                  black: { r: 0, g: 0, b: 0 },
                  silver: { r: 192, g: 192, b: 192 },
                  gray: { r: 128, g: 128, b: 128 },
                  grey: { r: 128, g: 128, b: 128 },
                  white: { r: 255, g: 255, b: 255 },
                  maroon: { r: 128, g: 0, b: 0 },
                  red: { r: 255, g: 0, b: 0 },
                  purple: { r: 128, g: 0, b: 128 },
                  fuchsia: { r: 255, g: 0, b: 255 },
                  green: { r: 0, g: 128, b: 0 },
                  lime: { r: 0, g: 255, b: 0 },
                  olive: { r: 128, g: 128, b: 0 },
                  yellow: { r: 255, g: 255, b: 0 },
                  navy: { r: 0, g: 0, b: 128 },
                  blue: { r: 0, g: 0, b: 255 },
                  teal: { r: 0, g: 128, b: 128 },
                  aqua: { r: 0, g: 255, b: 255 },
                  orange: { r: 255, g: 165, b: 0 },
                  pink: { r: 255, g: 192, b: 203 },
                  plum: { r: 221, g: 160, b: 221 },
                  tomato: { r: 255, g: 99, b: 71 },
                  violet: { r: 238, g: 130, b: 238 },
                  gold: { r: 255, g: 215, b: 0 },
                  brown: { r: 165, g: 42, b: 42 },
                  beige: { r: 245, g: 245, b: 220 },
                  coral: { r: 255, g: 127, b: 80 },
                  cyan: { r: 0, g: 255, b: 255 },
                  magenta: { r: 255, g: 0, b: 255 },
                  indigo: { r: 75, g: 0, b: 130 },
                  khaki: { r: 240, g: 230, b: 140 },
                  salmon: { r: 250, g: 128, b: 114 },
                  skyblue: { r: 135, g: 206, b: 235 },
                  turquoise: { r: 64, g: 224, b: 208 }
              };

              const namedColorRegex = /((?:color|background|border|outline|fill|stroke)(?:-[a-z]+)*\s*:\s*[^;}]*?)\b(black|silver|gray|grey|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|orange|pink|plum|tomato|violet|gold|brown|beige|coral|cyan|magenta|indigo|khaki|salmon|skyblue|turquoise)\b/gi;
              while ((match = namedColorRegex.exec(text)) !== null) {
                  const prefixLen = match[1].length;
                  const colorWord = match[2].toLowerCase();
                  const startPos = model.getPositionAt(match.index + prefixLen);
                  const endPos = model.getPositionAt(match.index + prefixLen + colorWord.length);
                  
                  const rgb = namedColorsMap[colorWord];
                  if (rgb) {
                      colors.push({
                          range: {
                              startLineNumber: startPos.lineNumber,
                              startColumn: startPos.column,
                              endLineNumber: endPos.lineNumber,
                              endColumn: endPos.column
                          },
                          color: { red: rgb.r / 255, green: rgb.g / 255, blue: rgb.b / 255, alpha: 1 }
                      });
                  }
              }
              
              return colors;
          },
          provideColorPresentations: (model, colorInfo) => {
              const color = colorInfo.color;
              const r = Math.round(color.red * 255);
              const g = Math.round(color.green * 255);
              const b = Math.round(color.blue * 255);
              const a = color.alpha;
              
              const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
              const rgba = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
              
              return [
                  { label: hex },
                  { label: rgba }
              ];
          }
      });
      providerDisposables.current.push(colorProvider);

      // Custom Folding Range Provider for HTML files to support brace blocks in script/style tags
      const htmlFoldingProvider = monaco.languages.registerFoldingRangeProvider('html', {
          provideFoldingRanges: (model) => {
              const text = model.getValue();
              const lines = text.split('\n');
              const stack: number[] = [];
              const ranges: any[] = [];

              for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  const cleanLine = line.replace(/\/\/.*|#.*/g, ''); // ignore single line comments

                  for (let charIndex = 0; charIndex < cleanLine.length; charIndex++) {
                      const char = cleanLine[charIndex];
                      if (char === '{') {
                          stack.push(i + 1); // 1-based index
                      } else if (char === '}') {
                          const startLine = stack.pop();
                          if (startLine && startLine < i + 1) {
                              ranges.push({
                                  start: startLine,
                                  end: i + 1,
                                  kind: monaco.languages.FoldingRangeKind.Region
                              });
                          }
                      }
                  }
              }
              return ranges;
          }
      });
      providerDisposables.current.push(htmlFoldingProvider);

       // Comprehensive Completion Provider
       const provider = monaco.languages.registerCompletionItemProvider(['html', 'javascript', 'typescript', 'css', 'php'], {
           triggerCharacters: ['.', '#', '<', '!', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '1'],
           provideCompletionItems: async (model, position) => {
               const context = getContext(model, position);
               const word = model.getWordUntilPosition(position);
               
               let startColumn = word.startColumn;
               const suggestions: any[] = [];

               const range = {

                   startLineNumber: position.lineNumber,

                   endLineNumber: position.lineNumber,

                   startColumn: word.startColumn,

                   endColumn: word.endColumn

               };

               if (context === 'html') {
                    const lineContent = model.getLineContent(position.lineNumber);
                    const textUntil = lineContent.substring(0, position.column);
                    
                    const hasLessThan = textUntil.endsWith('<') || /<[a-zA-Z0-9:-]*$/.test(textUntil);
                    const endsWithSlash = textUntil.endsWith('</') || /<\/[a-zA-Z0-9:-]*$/.test(textUntil);

                   // 1. HTML 5 Boilerplate (matches "!" exactly when typed as standalone)
                   if (textUntil.trim() === '!') {
                       suggestions.push({
                           label: '!',
                           kind: monaco.languages.CompletionItemKind.Snippet,
                           insertText: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    $0
</body>
</html>`,
                           insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                           range: {
                               startLineNumber: position.lineNumber,
                               endLineNumber: position.lineNumber,
                               startColumn: position.column - 1,
                               endColumn: position.column
                           },
                           detail: 'HTML5 Boilerplate'
                       });
                       // EXCLUSIVE RETURN: "only show ! in dropdown"
                       return { suggestions };
                   }

                   // 2. Clipboard Paste Shortcut (matches "1" exactly when typed as standalone)
                   // Check if '1' is typed and is either at start of line or preceded by space
                   const lastChar = textUntil.slice(-1);
                   const secondLastChar = textUntil.slice(-2, -1);
                   const isOneTyped = lastChar === '1' && (secondLastChar === '' || /\s/.test(secondLastChar) || secondLastChar === '>');

                   if (isOneTyped) {
                       try {
                           const clipboardText = await navigator.clipboard.readText();
                           if (clipboardText) {
                               suggestions.push({
                                   label: '1',
                                   kind: monaco.languages.CompletionItemKind.Text,
                                   insertText: clipboardText,
                                   range: {
                                       startLineNumber: position.lineNumber,
                                       endLineNumber: position.lineNumber,
                                       startColumn: position.column - 1,
                                       endColumn: position.column
                                   },
                                   detail: 'Paste Last Copied',
                                   documentation: 'Inserts content from clipboard: ' + clipboardText.substring(0, 50) + (clipboardText.length > 50 ? '...' : '')
                               });
                           }
                       } catch (e) {
                           // Ignore clipboard permission errors
                       }
                   }

                   // 3. Unclosed Tags Suggestions (HIGH PRIORITY)
                   const fullTextUpToCursor = model.getValueInRange({
                       startLineNumber: 1, startColumn: 1,
                       endLineNumber: position.lineNumber, endColumn: position.column
                   });
                   const unclosed = getUnclosedTags(fullTextUpToCursor);
                   
                   if (unclosed.length > 0) {
                       const uniqueUnclosed = Array.from(new Set(unclosed)).reverse();
                       uniqueUnclosed.forEach((t, index) => {
                           const label = `</${t}>`;
                           suggestions.push({
                               label,
                               kind: monaco.languages.CompletionItemKind.TypeParameter,
                               insertText: endsWithSlash ? `${t}>` : `</${t}>`,
                               range,
                               detail: `Close opened tag <${t}> (Recommended)`,
                               sortText: `0_0_${index.toString().padStart(3, '0')}` // Top priority
                           });
                       });
                   }

                   // Custom Snippets
                   const snippets = [
                       { l: 'link:css', i: '<link rel="stylesheet" href="${1:style.css}">', d: 'Link CSS' },
                       { l: 'script:src', i: '<script src="${1:script.js}"></script>', d: 'Script Src' },
                       { l: 'script', i: '<script>\n\t$0\n</script>', d: 'Inline Script' },
                       { l: 'style', i: '<style>\n\t$0\n</style>', d: 'Inline Style' }
                   ];

                   snippets.forEach(s => {
                       suggestions.push({
                           label: s.l,
                           kind: monaco.languages.CompletionItemKind.Snippet,
                           insertText: s.i,
                           insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                           range,
                           detail: s.d,
                           sortText: `1_snippet_${s.l}`
                       });
                   });

                    // Emmet-style .class and #id div suggestions (with special support for .here and #here)
                    const dotMatch = textUntil.match(/\.([a-zA-Z0-9_-]*)$/);
                    if (dotMatch) {
                        const typed = dotMatch[1];
                        const classNamesSuggest = ['here'];
                        if (typed && typed !== 'here') {
                            classNamesSuggest.unshift(typed);
                        }
                        
                        classNamesSuggest.forEach((className) => {
                            const dotRange = {
                                startLineNumber: position.lineNumber,
                                endLineNumber: position.lineNumber,
                                startColumn: position.column - dotMatch[0].length,
                                endColumn: position.column
                            };
                            suggestions.push({
                                label: `.${className}`,
                                kind: monaco.languages.CompletionItemKind.Snippet,
                                insertText: `<div class="${className}">$0</div>`,
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: dotRange,
                                detail: `Create div with class="${className}"`,
                                sortText: className === 'here' ? '0_emmet_dot_here' : '0_emmet_dot'
                            });
                        });
                    }

                    const hashMatch = textUntil.match(/#([a-zA-Z0-9_-]*)$/);
                    if (hashMatch) {
                        const typed = hashMatch[1];
                        const idsSuggest = ['here'];
                        if (typed && typed !== 'here') {
                            idsSuggest.unshift(typed);
                        }
                        
                        idsSuggest.forEach((idName) => {
                            const hashRange = {
                                startLineNumber: position.lineNumber,
                                endLineNumber: position.lineNumber,
                                startColumn: position.column - hashMatch[0].length,
                                endColumn: position.column
                            };
                            suggestions.push({
                                label: `#${idName}`,
                                kind: monaco.languages.CompletionItemKind.Snippet,
                                insertText: `<div id="${idName}">$0</div>`,
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: hashRange,
                                detail: `Create div with id="${idName}"`,
                                sortText: idName === 'here' ? '0_emmet_hash_here' : '0_emmet_hash'
                            });
                        });
                    }

                   // Standard Tags (If not typing '1' or '!')
                   if (!isOneTyped && textUntil.trim() !== '!') {
                       const tagsList = [
                           { label: 'div', detail: 'Blank box / Generic content segment container block' },
                           { label: 'span', detail: 'Generic inline text style container' },
                           { label: 'p', detail: 'Text block paragraph' },
                           { label: 'a', detail: 'Anchor hyperlink navigator link targeting URL' },
                           { label: 'img', detail: 'Embed vector or bitmap graphics images' },
                           { label: 'button', detail: 'Interactable state action trigger button' },
                           { label: 'input', detail: 'User text type form entry field' },
                           { label: 'form', detail: 'Group standard entry inputs' },
                           { label: 'table', detail: 'Tabular items grid row and column matrix' },
                           { label: 'tr', detail: 'Row elements grid context line' },
                           { label: 'td', detail: 'Standard cell details column container' },
                           { label: 'th', detail: 'Header cell key descriptor title text' },
                           { label: 'thead', detail: 'Grouping elements header table block' },
                           { label: 'tbody', detail: 'Grouping elements standard list information rows' },
                           { label: 'ul', detail: 'Unordered bullet items list container' },
                           { label: 'ol', detail: 'Ordered list sequence layout container' },
                           { label: 'li', detail: 'Item list element box' },
                           { label: 'h1', detail: 'Main visual title header' },
                           { label: 'h2', detail: 'Grouping section subtitle header' },
                           { label: 'h3', detail: 'Group card title text header' },
                           { label: 'h4', detail: 'Content topic subhead text header' },
                           { label: 'h5', detail: 'Small layout segment label header' },
                           { label: 'h6', detail: 'Minimum micro size section label' },
                           { label: 'header', detail: 'Header layout framing segment' },
                           { label: 'footer', detail: 'Footer terms and credit framing layout segment' },
                           { label: 'nav', detail: 'Website menu links navigator panel wrapper' },
                           { label: 'section', detail: 'Layout division of content pages' },
                           { label: 'article', detail: 'Independent blog or post content' },
                           { label: 'aside', detail: 'Context sidebar element wrapper widget' },
                           { label: 'main', detail: 'Page essential primary focus content element container' },
                           { label: 'video', detail: 'Embed media clips, stream video footage' },
                           { label: 'audio', detail: 'Play tracks, synthesizer loops backdrop audio' },
                           { label: 'canvas', detail: 'Render graphics dynamically, interactive custom drawing' },
                           { label: 'select', detail: 'Form drop-down option picker element' },
                           { label: 'option', detail: 'List item inside a choice picker list' },
                           { label: 'textarea', detail: 'Flow free multi-line text input scroll field' },
                           { label: 'label', detail: 'Label heading linked to interactive input' },
                           { label: 'iframe', detail: 'Embed target website or code runner context sandbox' },
                           { label: 'strong', detail: 'Apply thick visual emphasis to text segment' },
                           { label: 'em', detail: 'Apply italic slant visual emphasis' },
                           { label: 'b', detail: 'Stylist font bold inline' },
                           { label: 'i', detail: 'Slanted typography formatting style' },
                           { label: 'hr', detail: 'Divider dividing spacing line component' },
                           { label: 'br', detail: 'Break carriage line return force spacing element' },
                           { label: 'script', detail: 'Inline JavaScript or path resource inclusion element' },
                           { label: 'style', detail: 'Inline CSS properties styles design definitions' },
                           { label: 'meta', detail: 'Page indexing keywords responsive layouts configuration meta tag' },
                           { label: 'link', detail: 'Include external CSS styles, custom vectors link element' },
                           { label: 'head', detail: 'Document settings configuration declarations wrapping block' },
                           { label: 'body', detail: 'Interactive visible display page contents container block' }
                       ];
                       tagsList.forEach((t, index) => {
                           suggestions.push({
                               label: t.label,
                               kind: monaco.languages.CompletionItemKind.Class,
                               insertText: hasLessThan ? `${t.label}>$0</${t.label}>` : `<${t.label}>$0</${t.label}>`,
                               insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                               range,
                               detail: t.detail,
                               sortText: `2_html_${index.toString().padStart(3, '0')}`
                           });
                       });
                   }
               } 
               else if (context === 'css') {
                    const cssPropsList = [
                        { label: 'color', text: 'color: ${1:#ffffff};', detail: 'Text color color value' },
                        { label: 'background', text: 'background: ${1:#ffffff};', detail: 'Set background styling layout composite' },
                        { label: 'background-color', text: 'background-color: ${1:#ffffff};', detail: 'Background color hex rgb dynamic values' },
                        { label: 'background-image', text: 'background-image: url(\'$1\');', detail: 'Background design cover image' },
                        { label: 'background-size', text: 'background-size: ${1:cover};', detail: 'Background scaling proportions size' },
                        { label: 'background-position', text: 'background-position: ${1:center};', detail: 'Element background offset placement position' },
                        { label: 'background-repeat', text: 'background-repeat: ${1:no-repeat};', detail: 'Control background looping repeat style' },
                        { label: 'width', text: 'width: ${1:100%};', detail: 'Content display width size size limits' },
                        { label: 'height', text: 'height: ${1:100vh};', detail: 'Content display height visual limits' },
                        { label: 'min-width', text: 'min-width: ${1:300px};', detail: 'Content bottom viewport clamp bound size min' },
                        { label: 'min-height', text: 'min-height: ${1:100%};', detail: 'Content vertical dynamic viewport size' },
                        { label: 'max-width', text: 'max-width: ${1:1200px};', detail: 'Content upper sizing limits bounds clamp text spacing' },
                        { label: 'max-height', text: 'max-height: ${1:600px};', detail: 'Vertical visual scroll boundaries top constraint scale' },
                        { label: 'margin', text: 'margin: ${1:1rem};', detail: 'Side margins offset perimeter margin' },
                        { label: 'margin-top', text: 'margin-top: ${1:1rem};', detail: 'Top spacing element margin offset' },
                        { label: 'margin-bottom', text: 'margin-bottom: ${1:1rem};', detail: 'Bottom spacing element margin offset' },
                        { label: 'margin-left', text: 'margin-left: ${1:1rem};', detail: 'Left spacing margin offset' },
                        { label: 'margin-right', text: 'margin-right: ${1:1rem};', detail: 'Right spacing margin offset' },
                        { label: 'padding', text: 'padding: ${1:1rem};', detail: 'Page interior inner elements spacing gap' },
                        { label: 'padding-top', text: 'padding-top: ${1:1rem};', detail: 'Inner text top padding segment offset' },
                        { label: 'padding-bottom', text: 'padding-bottom: ${1:1rem};', detail: 'Inner text bottom padding spacing offset' },
                        { label: 'padding-left', text: 'padding-left: ${1:1rem};', detail: 'Inner padding left spacing spacing offset' },
                        { label: 'padding-right', text: 'padding-right: ${1:1rem};', detail: 'Inner padding right spacing spacing offset' },
                        { label: 'display', text: 'display: ${1:flex};', detail: 'Set element boxes display strategy flex block grid inline' },
                        { label: 'flex-direction', text: 'flex-direction: ${1:column};', detail: 'Set main axis flow direction items' },
                        { label: 'flex-wrap', text: 'flex-wrap: ${1:wrap};', detail: 'Specify wrap overflow items layout' },
                        { label: 'justify-content', text: 'justify-content: ${1:center};', detail: 'Coordinate display alignment across primary viewport axis' },
                        { label: 'align-items', text: 'align-items: ${1:center};', detail: 'Coordinate element grouping flow cross display elements layout' },
                        { label: 'align-content', text: 'align-content: ${1:space-between};', detail: 'Coordinate cross tracks margins space distribution' },
                        { label: 'flex-grow', text: 'flex-grow: ${1:1};', detail: 'Scale box contents elements grow ratio' },
                        { label: 'flex-shrink', text: 'flex-shrink: ${1:0};', detail: 'Prevent component resize shrink ratio' },
                        { label: 'flex-basis', text: 'flex-basis: ${1:auto};', detail: 'Item starting dimension flex scale basis' },
                        { label: 'grid-template-columns', text: 'grid-template-columns: repeat(${1:3}, 1fr);', detail: 'Grid grid layout tracks columns specification' },
                        { label: 'grid-template-rows', text: 'grid-template-rows: repeat(${1:3}, 1fr);', detail: 'Grid grid layout tracks rows specs' },
                        { label: 'gap', text: 'gap: ${1:1rem};', detail: 'Gaps spacing separation' },
                        { label: 'row-gap', text: 'row-gap: ${1:0.5rem};', detail: 'Gaps sizing horizontal' },
                        { label: 'column-gap', text: 'column-gap: ${1:0.5rem};', detail: 'Gaps sizing vertical columns spacer' },
                        { label: 'position', text: 'position: ${1:relative};', detail: 'Elements layout positioning model absolute static relative absolute sticky' },
                        { label: 'top', text: 'top: ${1:0};', detail: 'Coordinate offset top coordinates' },
                        { label: 'bottom', text: 'bottom: ${1:0};', detail: 'Coordinate offset bottom coordinates' },
                        { label: 'left', text: 'left: ${1:0};', detail: 'Coordinate offset left coordinates' },
                        { label: 'right', text: 'right: ${1:0};', detail: 'Coordinate offset right coordinates' },
                        { label: 'z-index', text: 'z-index: ${1:10};', detail: 'Layout priority coordinates visual overlay index stack depth' },
                        { label: 'border', text: 'border: ${1:1px solid #e2e8f0};', detail: 'Set border thickness, color style dynamic line' },
                        { label: 'border-width', text: 'border-width: ${1:1px};', detail: 'Border line sizing thickness' },
                        { label: 'border-style', text: 'border-style: ${1:solid};', detail: 'Border style layout line representation (solid/dashed/dotted)' },
                        { label: 'border-color', text: 'border-color: ${1:#ea580c};', detail: 'Border line colors' },
                        { label: 'border-radius', text: 'border-radius: ${1:0.5rem};', detail: 'Border curves round design corner' },
                        { label: 'box-shadow', text: 'box-shadow: ${1:0 10px 15px -3px rgba(0,0,0,0.1)};', detail: 'Visual shadow design depth box shader' },
                        { label: 'font-family', text: 'font-family: ${1:\'Inter\', sans-serif};', detail: 'Display font-families' },
                        { label: 'font-size', text: 'font-size: ${1:1rem};', detail: 'Main text size scale' },
                        { label: 'font-weight', text: 'font-weight: ${1:600};', detail: 'Text weight bold/semibold/light spacing' },
                        { label: 'line-height', text: 'line-height: ${1:1.5};', detail: 'Text rows separation height' },
                        { label: 'text-align', text: 'text-align: ${1:center};', detail: 'Flow alignment layout style format' },
                        { label: 'text-decoration', text: 'text-decoration: ${1:underline};', detail: 'Text decoration line style markup' },
                        { label: 'text-transform', text: 'text-transform: ${1:uppercase};', detail: 'Text capitalization uppercase/lowercase' },
                        { label: 'opacity', text: 'opacity: ${1:0.8};', detail: 'Element transparency' },
                        { label: 'cursor', text: 'cursor: ${1:pointer};', detail: 'Interaction cursor graphics changes' },
                        { label: 'transition', text: 'transition: ${1:all 0.2s ease-in-out};', detail: 'Animate smooth property transitions curves' },
                        { label: 'transform', text: 'transform: translate(${1:10px, 10px}) scale(${2:1.1});', detail: 'Translate and rotate elements transformations' },
                        { label: 'animation', text: 'animation: ${1:fadeIn} ${2:0.5s} ease-out forwards;', detail: 'Keyframe visual sequence animations trigger' },
                        { label: 'filter', text: 'filter: blur(${1:5px});', detail: 'Visual style filter enhancements blur contrast effects' },
                        { label: 'backdrop-filter', text: 'backdrop-filter: blur(${1:8px});', detail: 'Fuzzy background overlay glass blur effect elements layout font' },
                        { label: 'overflow', text: 'overflow: ${1:hidden};', detail: 'Hiding or clipping extra layout width content boundaries scroll' },
                        { label: 'overflow-x', text: 'overflow-x: ${1:auto};', detail: 'Horizontal clipping scroll policy coordinates' },
                        { label: 'overflow-y', text: 'overflow-y: ${1:auto};', detail: 'Vertical clipping scroll policy heights' }
                    ];
                    cssPropsList.forEach(p => {
                        suggestions.push({
                            label: p.label,
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: p.text,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range,
                            detail: p.detail
                        });
                    });
                   }
                else if (context === 'php') {
                  const phpSnippets = [
                      { label: 'php', text: '<?php\n$0\n?>', detail: 'PHP Tag Block' },
                      { label: 'echo', text: 'echo "$0";', detail: 'Echo Statement' },
                      { label: 'fore', text: 'foreach (\\$${1:array} as \\$${2:value}) {\n\t$0\n}', detail: 'Foreach Loop' },
                      { label: 'if', text: 'if ($1) {\n\t$0\n}', detail: 'If Statement' },
                      { label: 'ifelse', text: 'if ($1) {\n\t$2\n} else {\n\t$0\n}', detail: 'If Else Statement' },
                      { label: 'func', text: 'function ${1:name}($2) {\n\t$0\n}', detail: 'Function Statement' },
                      { label: 'pdo', text: '\\$${1:db} = new PDO(\'sqlite:\' . ${2:\'database.sqlite\'});', detail: 'PDO SQLite Connection' },
                      { label: 'query', text: '\\$${1:stmt} = \\$${2:db}->query("$3");\nwhile (\\$${4:row} = \\$${1:stmt}->fetch(PDO::FETCH_ASSOC)) {\n\t$0\n}', detail: 'PDO Query Statement' },
                      { label: 'exec', text: '\\$${1:db}->exec("$0");', detail: 'PDO Exec Statement' },
                      { label: 'json', text: 'header(\'Content-Type: application/json\');\necho json_encode($0);', detail: 'JSON Header & Encode' }
                  ];
                  phpSnippets.forEach(p => {
                      suggestions.push({
                          label: p.label,
                          kind: monaco.languages.CompletionItemKind.Snippet,
                          insertText: p.text,
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range,
                          detail: p.detail
                      });
                  });
                }
                else if (context === 'javascript') {
                  const js = [
                      { label: 'clg', text: 'console.log($0)', detail: 'Console Log' },
                      { label: 'fnc', text: 'function ${1:name}($2) {\n\t$0\n}', detail: 'Function' },
                      { label: 'afn', text: '($1) => {\n\t$0\n}', detail: 'Arrow Function' },
                      { label: 'ife', text: 'if ($1) {\n\t$0\n}', detail: 'If Statement' },
                      { label: 'ifee', text: 'if ($1) {\n\t$0\n} else {\n\t\n}', detail: 'If Else Statement' },
                      { label: 'fori', text: 'for (let i = 0; i < ${1:array}.length; i++) {\n\t$0\n}', detail: 'For Loop' },
                      { label: 'foreach', text: '${1:array}.forEach(${2:item} => {\n\t$0\n});', detail: 'For Each' },
                      { label: 'map', text: '${1:array}.map(${2:item} => {\n\t$0\n});', detail: 'Map' },
                      { label: 'filter', text: '${1:array}.filter(${2:item} => {\n\t$0\n});', detail: 'Filter' },
                      { label: 'prom', text: 'new Promise((resolve, reject) => {\n\t$0\n});', detail: 'Promise' },
                      { label: 'async', text: 'async function ${1:name}($2) {\n\t$0\n}', detail: 'Async Function' },
                      { label: 'try', text: 'try {\n\t$0\n} catch (error) {\n\tconsole.error(error);\n}', detail: 'Try Catch' },
                      { label: 'qs', text: 'document.querySelector(\'$0\')', detail: 'Query Selector' },
                      { label: 'qsa', text: 'document.querySelectorAll(\'$0\')', detail: 'Query Selector All' },
                      { label: 'gel', text: 'document.getElementById(\'$0\')', detail: 'Get Element' },
                      { label: 'cel', text: 'document.createElement(\'$0\')', detail: 'Create Element' },
                      { label: 'ael', text: 'addEventListener(\'${1:click}\', (e) => {\n\t$0\n})', detail: 'Add Event' },
                      { label: 'sto', text: 'setTimeout(() => {\n\t$0\n}, ${1:1000});', detail: 'Set Timeout' },
                      { label: 'si', text: 'setInterval(() => {\n\t$0\n}, ${1:1000});', detail: 'Set Interval' },
                      { label: 'fetch', text: 'fetch(\'$1\')\n\t.then(res => res.json())\n\t.then(data => {\n\t\t$0\n\t});', detail: 'Fetch API' },
                      // HTML within JS
                      { label: 'div', text: '<div class="$1">\n\t$0\n</div>', detail: 'Div Tag' },
                      { label: 'span', text: '<span class="$1">$0</span>', detail: 'Span Tag' },
                      { label: 'a', text: '<a href="$1">$0</a>', detail: 'Anchor Tag' },
                      { label: 'img', text: '<img src="$1" alt="$2" />', detail: 'Image Tag' },
                      { label: 'button', text: '<button>$0</button>', detail: 'Button Tag' },
                      { label: 'h1', text: '<h1>$0</h1>', detail: 'H1 Tag' },
                      { label: 'h2', text: '<h2>$0</h2>', detail: 'H2 Tag' },
                      { label: 'h3', text: '<h3>$0</h3>', detail: 'H3 Tag' },
                      { label: 'p', text: '<p>$0</p>', detail: 'Paragraph Tag' },
                      { label: 'ul', text: '<ul>\n\t<li>$0</li>\n</ul>', detail: 'Unordered List Tag' },
                      { label: 'li', text: '<li>$0</li>', detail: 'List Item Tag' },
                      { label: 'table', text: '<table>\n\t<tr>\n\t\t<td>$0</td>\n\t</tr>\n</table>', detail: 'Table Tag' },
                      { label: 'form', text: '<form>\n\t$0\n</form>', detail: 'Form Tag' },
                      { label: 'input', text: '<input type="${1:text}" placeholder="$2" />', detail: 'Input Tag' },
                      { label: 'style', text: 'style="$1"', detail: 'Style Attribute' },
                      { label: 'class', text: 'class="$1"', detail: 'Class Attribute' },
                      { label: 'id', text: 'id="$1"', detail: 'ID Attribute' },
                      { label: 'gid', text: 'document.getElementById(\'$0\')', detail: 'Get Element By ID' },
                      { label: 'ael', text: 'addEventListener(\'${1:click}\', (e) => {\n\t$0\n});', detail: 'Add Event Listener' },
                      { label: 'jsonp', text: 'JSON.parse($0)', detail: 'JSON Parse' },
                      { label: 'jsons', text: 'JSON.stringify($0)', detail: 'JSON Stringify' },
                      { label: 'st', text: 'setTimeout(() => {\n\t$0\n}, ${1:1000});', detail: 'Set Timeout' },
                      { label: 'si', text: 'setInterval(() => {\n\t$0\n}, ${1:1000});', detail: 'Set Interval' },
                  ];

                  js.forEach(j => {
                      suggestions.push({
                          label: j.label,
                          kind: monaco.languages.CompletionItemKind.Snippet,
                          insertText: j.text,
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range,
                          detail: j.detail
                      });
                  });

                  const keywords = ['const', 'let', 'var', 'return', 'export', 'import', 'from', 'class', 'extends', 'constructor', 'super', 'this', 'window', 'document', 'localStorage', 'sessionStorage', 'fetch', 'await', 'break', 'continue', 'default', 'case', 'switch', 'throw', 'new', 'typeof', 'instanceof'];
                  keywords.forEach(k => {
                      suggestions.push({
                          label: k,
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: k,
                          range
                      });
                  });

                  // Extract recent variables and logic
                  const text = model.getValue();
                  const varRegex = /(?:const|let|var|function|class|interface|type|async)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g;
                  let matchVar;
                  const recentVars = new Set<string>();
                  while ((matchVar = varRegex.exec(text)) !== null) {
                      if (matchVar[1] && matchVar[1] !== word.word) {
                          recentVars.add(matchVar[1]);
                      }
                  }

                  // Also catch arrow function names
                  const arrowVarRegex = /(?:const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(?:async\s*)?\(?.*?\)?\s*=>/g;
                  while ((matchVar = arrowVarRegex.exec(text)) !== null) {
                      if (matchVar[1] && matchVar[1] !== word.word) {
                          recentVars.add(matchVar[1]);
                      }
                  }

                  recentVars.forEach(v => {
                      suggestions.push({
                          label: v,
                          kind: monaco.languages.CompletionItemKind.Variable,
                          insertText: v,
                          range,
                          detail: 'Recent Variable',
                          sortText: '0' + v // Prioritize in the list
                      });
                  });
              }

              addCustomBoilerplates(context, suggestions, range, monaco, model, position);
              return { suggestions };
          }
      });
      providerDisposables.current.push(provider);
      
      // Custom Double Click Behavior: Select URLs and Class/ID attributes
      const mouseDownDisposable = editor.onMouseDown((e: any) => {
          if (e.event.detail === 2) { // Double click
              const position = e.target.position;
              if (!position) return;
              
              const model = editor.getModel();
              if (!model) return;
              const lineContent = model.getLineContent(position.lineNumber);
              const column = position.column;
              
              // 1. Check for URLs
              const urlRegex = /https?:\/\/[^\s"']+/g;
              let match;
              while ((match = urlRegex.exec(lineContent)) !== null) {
                  const startColumn = match.index + 1;
                  const endColumn = startColumn + match[0].length;
                  if (column >= startColumn && column <= endColumn) {
                      editor.setSelection(new monaco.Range(position.lineNumber, startColumn, position.lineNumber, endColumn));
                      e.event.preventDefault();
                      e.event.stopPropagation();
                      return;
                  }
              }

              // 2. Check for id/class/className attributes
              const attrRegex = /(?:class|id|className)\s*=\s*(["'])((?:(?!\1).)*)\1/g;
              while ((match = attrRegex.exec(lineContent)) !== null) {
                  const fullMatchStart = match.index + 1;
                  const quoteChar = match[1];
                  const value = match[2];
                  const valueStartColumn = fullMatchStart + match[0].indexOf(quoteChar) + 1;
                  const valueEndColumn = valueStartColumn + value.length;
                  
                  if (column >= fullMatchStart && column <= fullMatchStart + match[0].length) {
                      editor.setSelection(new monaco.Range(position.lineNumber, valueStartColumn, position.lineNumber, valueEndColumn));
                      e.event.preventDefault();
                      e.event.stopPropagation();
                      return;
                  }
              }

              // 3. Check for content between quotes or parentheses
              const pairs = [
                  { start: '"', end: '"' },
                  { start: "'", end: "'" },
                  { start: '(', end: ')' },
                  { start: '`', end: '`' },
                  { start: '[', end: ']' },
                  { start: '{', end: '}' }
              ];

              for (const pair of pairs) {
                  let startIdx = lineContent.lastIndexOf(pair.start, column - 1);
                  let endIdx = lineContent.indexOf(pair.end, column - 1);

                  if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
                      // Check if cursor is actually between them
                      if (column > startIdx && column <= endIdx + 1) {
                          // Select only the content INSIDE the delimiters
                          editor.setSelection(new monaco.Range(position.lineNumber, startIdx + 2, position.lineNumber, endIdx + 1));
                          e.event.preventDefault();
                          e.event.stopPropagation();
                          return;
                      }
                  }
              }
          }
      });
      providerDisposables.current.push(mouseDownDisposable);

      const changeDisposable = editor.onDidChangeModelContent((e) => {
          isTyping.current = true;
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
              isTyping.current = false;
          }, 300);

          // FIX: Skip if this is an internal change
          if (isInternalChange.current) return;
          
          const change = e.changes[0];
          if (!change) return;

          if (enableSounds) {
              if (change.text === '' || (change.rangeLength > 0 && change.text.length === 0)) {
                  if (!lastChangeWasDelete.current) { keyboardSounds.current.playBackspaceSound(); lastChangeWasDelete.current = true; }
              } else {
                  lastChangeWasDelete.current = false;
                  if (change.text === '\n') keyboardSounds.current.playEnterSound();
                  else if (change.text.length === 1) keyboardSounds.current.playKeySound(change.text);
              }
          }

          // Trigger visual feedback for typing
          if (change.text.length === 1 && !change.text.match(/\s/)) {
              const pos = editor.getPosition();
              if (pos) showTypedCharAnimation(change.text, pos);
          }
      });
      providerDisposables.current.push(changeDisposable);

      // Listen to Monaco validation markers to play standard syntax error bug sounds
      let lastErrorCount = 0;
      const markerDisposable = monaco.editor.onDidChangeMarkers((uris) => {
          const model = editor.getModel();
          if (model && uris.some(u => u.toString() === model.uri.toString())) {
              const markers = monaco.editor.getModelMarkers({ resource: model.uri });
              const currentErrorCount = markers.filter(m => m.severity === monaco.MarkerSeverity.Error).length;
              if (currentErrorCount > lastErrorCount && enableSounds) {
                  import('../utils/sound').then(({ playSound }) => {
                      playSound('bug');
                  });
              }
              lastErrorCount = currentErrorCount;
          }
      });
      providerDisposables.current.push(markerDisposable);
  };

  if (isBinary && content) {
      let previewElement = null;
      let fileInfo = `Binary File (${Math.round(content.length / 1024)} KB)`;

      if (mimeType?.startsWith('image/')) {
          previewElement = (
              <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                  <div className="bg-[url('https://transparenttextures.com/patterns/dark-matter.png')] p-4 rounded-lg border border-[#333] hover:border-[#007acc] transition-all duration-300">
                      <img src={content} alt="Preview" className="max-w-full max-h-[70vh] object-contain transition-transform duration-300 hover:scale-[1.02]" />
                  </div>
                  <div className="flex gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><ImageIcon size={12}/> Image Preview</span>
                  </div>
              </div>
          );
      } else if (mimeType === 'application/pdf' || mimeType?.includes('pdf') || (fileName && fileName.endsWith('.pdf'))) {
          previewElement = (
              <div className="flex flex-col items-center gap-6 max-w-md text-center p-6 bg-[#252526] rounded-xl border border-[#3e3e42] shadow-xl animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20 shadow-lg">
                      <FileText size={32} />
                  </div>
                  <div className="space-y-2">
                      <h3 className="text-base font-bold text-white tracking-wide">PDF Document</h3>
                      <p className="text-xs text-zinc-400 font-mono select-all break-all">{fileName || 'document.pdf'}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-2 font-sans">
                          Modern browsers block embedded PDF previews inside frames for security. You can safely save or open this document in a new tab.
                      </p>
                  </div>
                  <div className="flex gap-3 w-full mt-2">
                      <a 
                          href={content} 
                          download={fileName || 'document.pdf'}
                          className="flex-1 py-2 px-4 rounded bg-[#007acc] hover:bg-[#005f9e] font-semibold text-white shadow hover:scale-[1.02] cursor-pointer transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                      >
                          <Download size={14} /> Download PDF
                      </a>
                      <button 
                          onClick={() => {
                              const newTab = window.open();
                              if (newTab) {
                                  newTab.document.write(`<iframe src="${content}" width="100%" height="100%" style="border:none;"></iframe>`);
                              } else {
                                  const win = window.open(content, '_blank');
                                  if (!win) alert("Please allow popups to view files");
                              }
                          }}
                          className="flex-1 py-1.5 px-4 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] font-semibold text-white shadow hover:scale-[1.02] cursor-pointer transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2 border border-[#444]"
                      >
                          <ExternalLink size={14} /> Open
                      </button>
                  </div>
              </div>
          );
      } else if (mimeType?.includes('font') || fileName?.match(/\.(ttf|otf|woff|woff2)$/i)) {
          previewElement = <FontAction fileName={fileName || 'Font'} content={content || ''} />;
      } else if (mimeType?.includes('html') || fileName?.match(/\.(html|htm)$/i)) {
          previewElement = <IframeAction fileName={fileName || 'Iframe'} content={content || ''} files={files} fileId={fileId} onLog={onLog} onNavigate={onNavigate} />;
      } else {
          previewElement = (
              <div className="text-gray-500 flex flex-col items-center gap-4 animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-[#252526] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <File size={32} />
                  </div>
                  <span>{fileInfo}</span>
                  <span className="text-xs opacity-50">Cannot preview this binary format.</span>
              </div>
          );
      }

      return (
          <div className="h-full w-full bg-[#1e1e1e] flex items-center justify-center p-8 overflow-auto">
              {previewElement}
          </div>
      );
  }

  const getMonacoLanguage = (lang: string) => {
      const lower = (lang || '').toLowerCase();
      if (lower === 'js' || lower === 'jsx') return 'javascript';
      if (lower === 'ts' || lower === 'tsx') return 'typescript';
      if (lower === 'json') return 'json';
      if (lower === 'php') return 'php';
      return lower === 'html' ? 'html' : lower === 'css' ? 'css' : 'plaintext';
  };

  const getCodeMirrorLanguageExtension = (lang: string) => {
      const cleanLang = (lang || '').toLowerCase();
      if (cleanLang === 'javascript' || cleanLang === 'typescript' || cleanLang === 'js' || cleanLang === 'jsx' || cleanLang === 'ts' || cleanLang === 'tsx') {
          return [javascript({ jsx: true, typescript: cleanLang.includes('ts') })];
      }
      if (cleanLang === 'html') {
          return [html()];
      }
      if (cleanLang === 'css') {
          return [css()];
      }
      if (cleanLang === 'json') {
          return [json()];
      }
      return [];
  };

  const options: any = {
    minimap: { enabled: minimap },
    fontSize: fontSize,
    lineHeight: Math.round(fontSize * lineHeight),
    fontFamily: `"${fontFamily}", monospace`,
    wordWrap: wordWrap ? 'on' : 'off',
    theme: theme || 'vs-dark',
    fontLigatures: ligatures,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 10 },
    lineNumbers: showLineNumbers ? 'on' : 'off',
    roundedSelection: false,
    cursorStyle: cursorStyle,
    cursorBlinking: cursorBlinking,
    smoothScrolling: true,
    experimentalGpuAcceleration: 'on',
    tabSize: tabSize,
    // Graphic acceleration, GPU support and performance optimizations to handle lag on very long codes
    disableLayerHinting: false,
    useShadowDOM: true,
    experimentalCpuProfile: true,
    stopRenderingLineAfter: 5000,
    fastScrollSensitivity: 4,
    suggest: { 
        showWords: true,
        showKeywords: true,
        showSnippets: true,
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        quickSuggestions: true,
        snippetSuggestions: 'inline',
        maxVisibleSuggestions: 5
    },
    quickSuggestions: true,
    parameterHints: { enabled: true },
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoSurround: 'languageDefined',
    autoIndent: !!settings?.installedExtensions?.includes('kamoh.code-prettier') ? 'full' : 'keep',
    formatOnType: !!settings?.installedExtensions?.includes('kamoh.code-prettier'),
    formatOnPaste: !!settings?.installedExtensions?.includes('kamoh.code-prettier'),
    cursorSmoothCaretAnimation: 'on',
    renderIndentGuides: showIndentGuides,
    bracketPairColorization: { enabled: bracketPairColorization },
    formatOnSave: formatOnSave,
    hover: { enabled: true },
    colorDecorators: true,
    links: true,
    contextmenu: true,
    dragAndDrop: true,
    mouseWheelZoom: true,
    multiCursorModifier: 'alt',
    accessibilitySupport: 'on',
    showFoldingControls: 'always',
    folding: true,
    matchBrackets: 'always',
  };

  return (
    <div className="h-full w-full relative">
      {mediaPreview && (
          <div 
              className="fixed z-[300] bg-[#252526] border border-[#3e3e42] shadow-2xl rounded-lg p-2 max-w-[320px] max-h-[320px] flex items-center justify-center overflow-hidden pointer-events-auto"
              style={{
                  top: Math.min(mediaPreview.y, window.innerHeight - 340), 
                  left: Math.min(mediaPreview.x, window.innerWidth - 340)
              }}
              onMouseEnter={() => { isHoveringModalRef.current = true; }}
              onMouseLeave={() => { 
                isHoveringModalRef.current = false; 
                setMediaPreview(null);
                mediaPreviewUrlRef.current = null;
              }}
          >
              <div className="bg-black/50 rounded flex items-center justify-center w-full h-full relative group">
                  {mediaPreview.type === 'video' && (
                      <video 
                          src={mediaPreview.url} 
                          className="max-w-[300px] max-h-[250px] object-contain rounded"
                          autoPlay 
                          loop 
                          muted 
                          playsInline
                          onCanPlay={(e) => { e.currentTarget.playbackRate = 2.0; }}
                      />
                  )}
                  {mediaPreview.type === 'audio' && (
                      <audio 
                          src={mediaPreview.url} 
                          controls
                          className="w-[280px]"
                      />
                  )}
                  {mediaPreview.type === 'image' && (
                      <img 
                          src={mediaPreview.url} 
                          alt="Preview" 
                          className="max-w-[300px] max-h-[250px] object-contain rounded"
                      />
                  )}
                  <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {mediaPreview.type.toUpperCase()}
                  </div>
              </div>
          </div>
      )}
      
      {isEncryptedFile && !isUnlocked ? (
        <div className="absolute inset-0 bg-[#1e1e1e] flex items-center justify-center p-6 z-20">
          <div className="bg-[#252526] border border-[#3e3e42] hover:border-[#4f4f54] transition-colors rounded-xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center select-none">
            <div className="flex justify-center">
              <div className="relative p-4 bg-yellow-500/10 rounded-full border border-yellow-500/30 text-yellow-500 animate-pulse duration-1000">
                <Lock size={36} className="text-yellow-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-base font-bold text-gray-100 tracking-tight">Decryption Workspace Required</h2>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                The file <span className="font-mono text-yellow-400 bg-yellow-500/5 px-1.5 py-0.5 rounded border border-yellow-500/20">{fileName}</span> is symmetrically encrypted. Please enter your password key to open, view, and live-edit.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative flex items-center bg-[#1e1e1e] rounded-lg border border-[#3e3e42] focus-within:border-[#007acc] transition-all px-3 py-2">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="Enter secret decryption key..."
                  value={decryptionKey}
                  onChange={(e) => setDecryptionKey(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDecrypt(); }}
                  className="bg-transparent border-none outline-none text-[#cccccc] text-xs w-full font-mono placeholder:text-gray-600 focus:ring-0 text-left"
                  autoFocus
                />
                <button 
                  onClick={() => setShowKey(!showKey)}
                  className="text-gray-500 hover:text-white transition-opacity ml-1.5 p-0.5 rounded text-[10px] font-mono leading-none"
                  title={showKey ? "Hide key password" : "Show key password"}
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              
              {decryptError && (
                <p className="text-[11px] text-red-100 bg-red-900/20 border border-red-900/40 rounded-lg p-3 text-left leading-relaxed font-mono">
                  ⚠ {decryptError}
                </p>
              )}
            </div>

            <button
              onClick={handleDecrypt}
              className="w-full bg-[#007acc] hover:bg-[#0098ff] text-white font-semibold py-2.5 rounded-lg text-xs leading-relaxed transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg"
            >
              Decrypt & Open Workspace
            </button>
            <p className="text-[9px] text-gray-500 font-mono">
              ★ Workspace edits are auto-saved and re-encrypted secure-safely.
            </p>
          </div>
        </div>
      ) : (
        <>
          {isEncryptedFile && isUnlocked && (
            <div className="absolute top-2 right-12 z-20 flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold font-sans tracking-wide shadow-lg select-none animate-in fade-in duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Workspace Decrypted (.enc)</span>
              <button
                onClick={() => {
                  setIsUnlocked(false);
                  setDecryptedValue(null);
                  setDecryptionKey('');
                  setDecryptError(null);
                }}
                className="ml-1 px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 hover:text-white rounded border border-emerald-500/30 transition-all font-bold uppercase text-[9px]"
                title="Lock workspace and hide contents"
              >
                Lock
              </button>
            </div>
          )}

          {onToggleSounds && (
            <button
              onClick={onToggleSounds}
              className="absolute top-2 right-2 z-10 p-2 bg-[#2d2d2d] rounded-lg hover:bg-[#3d3d3d] transition-all duration-200 group"
              title={enableSounds ? "Disable keyboard sounds" : "Enable keyboard sounds"}
            >
              {enableSounds ? (
                <Volume2 size={16} className="text-[#007acc] group-hover:scale-110 transition-transform" />
              ) : (
                <VolumeX size={16} className="text-gray-400 group-hover:scale-110 transition-transform" />
              )}
            </button>
          )}
          
          <div className={`w-full h-full flex flex-col overflow-hidden relative ${isMobile && !hideMobileToolbar ? 'pb-[50px]' : ''}`} onTouchStart={handlePinchStart} onTouchMove={handlePinchMove} onTouchEnd={handlePinchEnd}>
            {isMobile && !hideMobileToolbar && (
              <div className="flex items-center justify-between gap-1 p-1 bg-[#252526] border-b border-[#3e3e42] z-10 relative select-none">
                <span className="text-[10px] text-gray-400 font-mono pl-1">Mobile Assist:</span>
                <button
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setTouchSelectionActive(!touchSelectionActive);
                  }}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                    touchSelectionActive 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-[#333] text-gray-300 hover:bg-[#444]'
                  }`}
                  title="Toggle native hand touch selection"
                >
                  ✋ {touchSelectionActive ? 'Monaco Mode' : 'Touch/Hand Select'}
                </button>
              </div>
            )}
            
            <div className="flex-1 w-full h-full flex flex-row overflow-hidden relative">
              <div className="flex-1 w-full h-full relative">
                {editorType === 'simple' || touchSelectionActive ? (
                  <textarea
                    className="w-full h-full p-4 bg-[#1e1e1e] text-[#cccccc] font-mono border-none outline-none resize-none custom-scrollbar"
                    style={{
                      fontFamily: `"${fontFamily}", monospace`,
                      fontSize: `${fontSize}px`,
                      lineHeight: lineHeight,
                    }}
                    value={editorValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isEncryptedFile) {
                        handleDecryptedChange(val);
                      } else {
                        onChange(val);
                      }
                    }}
                  />
                ) : editorType === 'codemirror' ? (
                  <div className="h-full w-full bg-[#1e1e1e] overflow-auto custom-scrollbar text-left text-xs">
                    <CodeMirror
                      value={editorValue}
                      height="100%"
                      theme={theme === 'vs' ? 'light' : 'dark'}
                      extensions={getCodeMirrorLanguageExtension(editorLanguage)}
                      onChange={(val) => {
                        if (isEncryptedFile) {
                          handleDecryptedChange(val);
                        } else {
                          onChange(val);
                        }
                      }}
                      style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: `"${fontFamily}", monospace`,
                      }}
                    />
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    path={fileName || fileId}
                    language={getMonacoLanguage(editorLanguage)}
                    value={editorValue}
                    theme={theme || 'vs-dark'}
                    onChange={isEncryptedFile ? handleDecryptedChange : onChange}
                    onMount={handleEditorDidMount}
                    options={options}
                    loading={
                      <div className="text-gray-500 p-4 flex items-center gap-2">
                        <Sparkles size={16} className="animate-pulse" />
                        <span>Loading Visual Editor...</span>
                      </div>
                    }
                  />
                )}
              </div>
            
            {(fileName && (
              fileName.endsWith('/package.json') || fileName === 'package.json' || 
              fileName.endsWith('/tsconfig.json') || fileName === 'tsconfig.json' || 
              fileName.endsWith('.env') || fileName === '.env' || 
              fileName.toLowerCase().endsWith('/dockerfile') || fileName.toLowerCase() === 'dockerfile'
            )) && (
               <ConfigExplainer fileName={fileName.split('/').pop()!} content={editorValue} />
            )}
            
            {isMobile && !hideMobileToolbar && (
              <div className="fixed bottom-0 left-0 w-full bg-[#141418] border-t border-[#3e3e4a] h-[50px] min-h-[50px] max-h-[50px] select-none z-[9999] flex items-center shadow-[0_-4px_16px_rgba(0,0,0,0.5)]">
                <div className="flex-1 flex flex-row items-center gap-1.5 px-3 overflow-x-auto whitespace-nowrap py-1.5 h-full custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('left')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-base font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('right')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-base font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('sel')}
                    className={`flex-shrink-0 h-[38px] px-3.5 rounded-md text-xs font-bold flex items-center justify-center transition-all border cursor-pointer shadow font-sans ${
                      selectModeActive 
                        ? 'bg-amber-600 text-white border-amber-600 animate-pulse' 
                        : 'bg-[#2d2d39] hover:bg-[#3d3d49] border-[#3e3e4a] text-gray-200'
                    }`}
                    title="Toggle Selection Mode (← / → to expand/shrink selection)"
                  >
                    Sel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('all')}
                    className="flex-shrink-0 h-[38px] px-3.5 bg-[#0a7bc2] hover:bg-[#1394e3] active:bg-[#065b90] text-white rounded-md text-xs font-bold flex items-center justify-center transition-all border border-[#065b90] cursor-pointer shadow uppercase font-sans"
                    title="Select All Code without Copying"
                  >
                    ALL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('copy')}
                    className="flex-shrink-0 h-[38px] px-3.5 bg-[#2ea043] hover:bg-[#3fb950] active:bg-[#238636] text-white rounded-md text-xs font-bold flex items-center justify-center transition-all border border-[#238636] cursor-pointer shadow font-sans"
                    title="Copy All Code"
                  >
                    cp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('""')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-sm font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow font-mono"
                  >
                    "
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('<')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-sm font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow font-mono"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('/')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-sm font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow font-mono"
                  >
                    /
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('>')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-sm font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow font-mono"
                  >
                    &gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('()')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-sm font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow font-mono"
                  >
                    ()
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('{}')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-sm font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow font-mono"
                  >
                    {"{}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolkeyAction('=')}
                    className="flex-shrink-0 h-[38px] min-w-[38px] bg-[#2d2d39] hover:bg-[#3d3d49] active:bg-[#007acc] text-gray-200 active:text-white rounded-md text-sm font-bold flex items-center justify-center transition-all border border-[#3e3e4a] cursor-pointer shadow font-mono"
                  >
                    =
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </div>
);
};

export default CodeEditor;