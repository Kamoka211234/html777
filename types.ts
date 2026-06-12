
export type FileType = 'file' | 'folder';

export interface FileSystemItem {
  id: string;
  name: string;
  type: FileType;
  parentId: string | null;
  content?: string; // Content for text, or Base64 DataURI for binary
  isBinary?: boolean;
  mimeType?: string;
  isOpen?: boolean; // Only for folders
  depth: number;
}

export interface Project {
  id: string;
  name: string;
  created: number;
  lastModified: number;
  fileCount: number;
}

export interface ProjectSettings {
  projectName: string;
  autoSave: boolean;
  saveOnFocusLost: boolean;
  theme: 'midnight' | 'cyberpunk' | 'glass' | 'high-contrast';
  editorTheme?: 'vs-dark' | 'vs' | 'hc-black';
  wordWrap: boolean;
  showPreview: boolean;
  showConsole: boolean;
  guiSize: 1 | 2 | 3;
  fontSize: number;
  language: 'en' | 'ckb' | 'kmr';
  // Audio/Visual
  enableSound: boolean;
  rippleColor: string;
  rippleSpeed: number;
  // Editor Fonts
  fontFamily: 'Fira Code' | 'Courier New' | 'Courier Prime' | 'Ubuntu Mono' | 'Consolas' | 'JetBrains Mono';
  lineHeight: number;
  tabSize: number;
  minimap: boolean;
  ligatures: boolean;
  // Editor Behavior
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  smoothScrolling: boolean;
  // New Settings
  editorType: 'monaco' | 'simple' | 'codemirror';
  vimMode: boolean;
  showLineNumbers: boolean;
  showIndentGuides: boolean;
  bracketPairColorization: boolean;
  formatOnSave: boolean;
  // System Cursor
  enableCustomCursor: boolean;
  customCursorType: 'system' | 'circle';
  customCursorSize: number;
  customCursorColor: 'black' | 'white' | 'blue' | 'red' | 'green' | 'yellow' | 'orange' | 'purple' | 'pink' | 'rainbow' | 'cyan' | 'gold' | 'teal' | 'lime' | 'indigo';
  rippleEnabled: boolean;
  // Additional Settings
  autoRefresh: boolean;
  refreshDelay: number;
  sidebarPosition: 'left' | 'right';
  showStatusBar: boolean;
  showActivityBar: boolean;
  autoSaveDelay: number;
  usePythonPreview?: boolean;
  pythonPreviewPort?: number;
  customThemeBase?: 'vs' | 'vs-dark' | 'hc-black';
  customThemeBg?: string;
  customThemeFg?: string;
  customThemeCursor?: string;
  customThemeLineHighlight?: string;
  customThemeKeywords?: string;
  customThemeComments?: string;
  customThemeStrings?: string;
  customThemeNumbers?: string;
  customThemeTypes?: string;
  customThemeDelimiters?: string;
  installedExtensions?: string[];
}

export interface EditorAction {
  type: 'undo' | 'redo' | 'find' | 'find-symbol' | 'format';
}

export interface ObfuscationHistoryItem {
    id: string;
    original: string;
    obfuscated: string;
    timestamp: number;
}

export interface TabGroup {
    id: string;
    name: string;
    fileIds: string[];
    color?: string;
    isCollapsed?: boolean;
}

export const THEMES: Record<string, Record<string, string>> = {
    'midnight': {
        '--bg-primary': '#0f0f0f',
        '--bg-secondary': '#141414',
        '--border-color': '#222222',
        '--text-primary': '#e0e0e0',
        '--text-secondary': '#888888',
        '--accent': '#ea580c',
        '--hover-bg': '#1a1a1a',
    },
    'cyberpunk': {
        '--bg-primary': '#0d0221',
        '--bg-secondary': '#1a0b2e',
        '--border-color': '#ff00ff',
        '--text-primary': '#00ffff',
        '--text-secondary': '#ff00ff',
        '--accent': '#ff00ff',
        '--hover-bg': '#240b36',
    },
    'glass': {
        '--bg-primary': 'rgba(15, 15, 15, 0.7)',
        '--bg-secondary': 'rgba(20, 20, 20, 0.5)',
        '--border-color': 'rgba(255, 255, 255, 0.1)',
        '--text-primary': '#ffffff',
        '--text-secondary': 'rgba(255, 255, 255, 0.6)',
        '--accent': '#007acc',
        '--hover-bg': 'rgba(255, 255, 255, 0.05)',
    },
    'high-contrast': {
        '--bg-primary': '#000000',
        '--bg-secondary': '#111111',
        '--border-color': '#ffffff',
        '--text-primary': '#ffffff',
        '--text-secondary': '#ffff00',
        '--accent': '#ffff00',
        '--hover-bg': '#333333',
    }
};
