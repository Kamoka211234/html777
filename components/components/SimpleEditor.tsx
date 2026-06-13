
import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { loader, OnMount } from '@monaco-editor/react';
import JSZip from 'jszip';
import { Folder, File, Type, Music, Video as VideoIcon, Image as ImageIcon, ChevronRight, ChevronDown, Package, Sparkles, Volume2, VolumeX, FileText, Download, ExternalLink } from 'lucide-react';
import FontAction from './FontAction';
import IframeAction from './IframeAction';

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
  editorType: 'monaco' | 'simple';
  showLineNumbers?: boolean;
  showIndentGuides?: boolean;
  bracketPairColorization?: boolean;
  formatOnSave?: boolean;
  enableSounds?: boolean;
  onToggleSounds?: () => void;
  fileName?: string;
  files?: Array<any>;
  fileId?: string;
  onLog?: (log: any) => void;
  onNavigate?: (path: string) => void;
}

// Fallback Text Area (Simple Mode)
const SimpleTextArea: React.FC<{ content: string; onChange: (val: string) => void; fontSize: number; fontFamily: string }> = ({ content, onChange, fontSize, fontFamily }) => {
    return (
        <textarea 
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full bg-[#1e1e1e] text-[#ccc] p-4 font-mono outline-none resize-none"
            style={{ fontSize: fontSize, fontFamily: fontFamily }}
            spellCheck={false}
        />
    );
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

            suggestions.push({
                label: '!' + key,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: insertTextSnippet,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: customRange,
                detail: `Custom Snippet: ${cb.name}`,
                documentation: cb.content
            });

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

// Zip Preview Helper (Kept minimal)
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

const CodeEditor: React.FC<EditorProps> = ({ 
    content, language, onChange, searchTerm, 
    wordWrap, fontSize, isBinary, mimeType,
    fontFamily, lineHeight, tabSize, minimap, ligatures, theme,
    cursorBlinking, cursorStyle, smoothScrolling, bookmarks = [], onToggleBookmark,
    scrollToLine, onScrollHandled,
    showLineNumbers = true, showIndentGuides = true, bracketPairColorization = true, formatOnSave = false,
    editorType, enableSounds = true, onToggleSounds, fileName, fileId, files, onLog, onNavigate
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
  const [zipTree, setZipTree] = useState<any[]>([]);
  const [isUnzipping, setIsUnzipping] = useState(false);

  useEffect(() => { keyboardSounds.current.setEnabled(enableSounds || false); }, [enableSounds]);

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
                  // ... zip processing logic kept brief for space ...
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
      if (editorRef.current && monacoRef.current) {
          if (searchTerm) {
              const matches = editorRef.current.getModel()?.findMatches(searchTerm, false, false, false, null, true) || [];
              const newDecorations = matches.map((match: any) => ({
                  range: match.range,
                  options: { inlineClassName: 'search-highlight', stickiness: 1 }
              }));
              searchDecorationsRef.current = editorRef.current.deltaDecorations(searchDecorationsRef.current, newDecorations);
              if (matches.length > 0) {
                  editorRef.current.revealLineInCenter(matches[0].range.startLineNumber);
              }
          } else {
              searchDecorationsRef.current = editorRef.current.deltaDecorations(searchDecorationsRef.current, []);
          }
      }
  }, [searchTerm, content]);

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

  const handleEditorDidMount: OnMount = (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

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
      `;
      document.head.appendChild(style);

      // Context detection helper
      const getContext = (model: any, position: any) => {
          const langId = model.getLanguageId();
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

      // Comprehensive Completion Provider
      const provider = monaco.languages.registerCompletionItemProvider(['html', 'javascript', 'typescript', 'css'], {
          triggerCharacters: ['.', '#', '<', '!', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
          provideCompletionItems: (model, position) => {
              const context = getContext(model, position);
              const word = model.getWordUntilPosition(position);
              const range = {
                  startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
                  startColumn: word.startColumn, endColumn: word.endColumn
              };
              const suggestions: any[] = [];

              if (context === 'html') {
                  const lineContent = model.getLineContent(position.lineNumber);
                  const textUntil = lineContent.substring(0, position.column);

                  // HTML 5 Boilerplate
                  if (word.word === '!') {
                      suggestions.push({
                          label: '!',
                          kind: monaco.languages.CompletionItemKind.Snippet,
                          insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>Document</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range,
                          detail: 'HTML5 Boilerplate'
                      });
                  }

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

                  // Standard Tags
                  const tags = ['div','span','p','a','img','button','input','form','table','ul','ol','li','h1','h2','h3','header','footer','nav','section','article','script','style','link','meta'];
                  tags.forEach(t => {
                      suggestions.push({
                          label: t,
                          kind: monaco.languages.CompletionItemKind.Class,
                          insertText: `<${t}>$0</${t}>`,
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range,
                          detail: `<${t}>`
                      });
                  });
              } 
              else if (context === 'css') {
                  const props = ['color','background','margin','padding','border','display','flex','grid','width','height','font-size','position','top','left','right','bottom','z-index'];
                  props.forEach(p => {
                      suggestions.push({
                          label: p,
                          kind: monaco.languages.CompletionItemKind.Property,
                          insertText: `${p}: $0;`,
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range
                      });
                  });
              }
              else if (context === 'javascript') {
                  const js = ['console.log','document.getElementById','document.querySelector','function','const','let','var','if','for','while','return','class','import','export'];
                  js.forEach(j => {
                      suggestions.push({
                          label: j,
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: j.includes('(') ? j : `${j} $0`,
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range
                      });
                  });

                  // Extract recent variables
                  const text = model.getValue();
                  const varRegex = /(?:const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g;
                  let matchVar;
                  const recentVars = new Set<string>();
                  while ((matchVar = varRegex.exec(text)) !== null) {
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

      const changeDisposable = editor.onDidChangeModelContent((e) => {
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

          // Trigger typed char animation
          if (change.text.length === 1) {
              const pos = editor.getPosition();
              if (pos) showTypedCharAnimation(change.text, pos);
          }
      });
      providerDisposables.current.push(changeDisposable);
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
              <div className="text-gray-500 flex flex-col items-center gap-4 animate-in fade-in">
                  <File size={32} />
                  <span>Binary File ({Math.round(content.length / 1024)} KB)</span>
              </div>
          );
      }

      return (
          <div className="h-full w-full bg-[#1e1e1e] flex items-center justify-center p-8 overflow-auto">
              {previewElement}
          </div>
      );
  }

  if (editorType === 'simple') {
      return <SimpleTextArea content={content} onChange={(val) => onChange(val)} fontSize={fontSize} fontFamily={fontFamily} />;
  }

  const getMonacoLanguage = (lang: string) => {
      if (lang === 'js' || lang === 'jsx') return 'javascript';
      if (lang === 'ts' || lang === 'tsx') return 'typescript';
      return lang === 'html' ? 'html' : lang === 'css' ? 'css' : 'plaintext';
  };

  const options: any = {
    minimap: { enabled: minimap },
    fontSize: fontSize,
    lineHeight: Math.round(fontSize * lineHeight),
    fontFamily: `'${fontFamily}', monospace`,
    wordWrap: wordWrap ? 'on' : 'off',
    theme: 'vs-dark',
    fontLigatures: ligatures,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 10 },
    lineNumbers: showLineNumbers ? 'on' : 'off',
    roundedSelection: false,
    cursorStyle: cursorStyle,
    cursorBlinking: cursorBlinking,
    smoothScrolling: true,
    tabSize: tabSize,
    suggest: { 
        showWords: true,
        showKeywords: true,
        showSnippets: true,
        quickSuggestions: true,
    },
    quickSuggestions: true,
    parameterHints: { enabled: true },
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoSurround: 'languageDefined',
    formatOnType: true,
    formatOnPaste: true,
    cursorSmoothCaretAnimation: 'on',
    renderIndentGuides: showIndentGuides,
    bracketPairColorization: { enabled: bracketPairColorization },
    formatOnSave: formatOnSave,
    hover: { enabled: true },
    colorDecorators: true,
  };

  return (
    <div className="h-full w-full relative">
      {onToggleSounds && (
        <button onClick={onToggleSounds} className="absolute top-2 right-2 z-10 p-2 bg-[#2d2d2d] rounded-lg hover:bg-[#3d3d3d] group">
          {enableSounds ? <Volume2 size={16} className="text-[#007acc]" /> : <VolumeX size={16} className="text-gray-400" />}
        </button>
      )}
      <Editor
        height="100%"
        language={getMonacoLanguage(language)}
        value={content}
        theme="vs-dark"
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={options}
        loading={<div className="text-gray-500 p-4 flex items-center gap-2"><Sparkles size={16} className="animate-pulse" /><span>Loading Visual Editor...</span></div>}
      />
    </div>
  );
};

export default CodeEditor;
