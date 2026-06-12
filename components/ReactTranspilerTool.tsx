import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as esbuild from 'esbuild-wasm';
import { 
  Play, RotateCcw, Copy, Code, Eye, RefreshCw, AlertTriangle, CheckCircle, 
  BookOpen, Plus, Trash2, Database, FileCode, Terminal, HelpCircle, Download, FileJson
} from 'lucide-react';
import { playSound } from '../utils/sound';

// ----------------------------------------------------
// IndexedDB Virtual File System (VFS) Setup
// ----------------------------------------------------
const DB_NAME = 'wasm_playground_vfs_db';
const STORE_NAME = 'virtual_files';

export interface VFSFile {
  id: string; // unique filepath / string
  name: string;
  content: string; // text code content, or base64 data for SQLite files
  type: 'tsx' | 'php' | 'sqlite' | 'text';
  updatedAt: number;
}

function openVFSDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVFSFileToDB(file: VFSFile): Promise<void> {
  const db = await openVFSDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(file);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getVFSFilesFromDB(): Promise<VFSFile[]> {
  const db = await openVFSDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteVFSFileFromDB(id: string): Promise<void> {
  const db = await openVFSDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Default files template
const DEFAULT_FILES: VFSFile[] = [
  {
    id: 'counter.tsx',
    name: 'counter.tsx',
    type: 'tsx',
    content: `import React, { useState } from 'react';

export default function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div style={{ 
            fontFamily: 'sans-serif', 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)', 
            color: 'white', 
            padding: '40px 24px', 
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            maxWidth: '360px',
            margin: '20px auto'
        }}>
            <h2 style={{ margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>Dynamic TSX Counter</h2>
            <p style={{ opacity: 0.8, fontSize: '13px', margin: '0 0 25px 0' }}>Compiled via esbuild-wasm instantly</p>
            
            <div style={{ fontSize: '64px', fontWeight: 'bold', margin: '20px 0' }}>{count}</div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                    onClick={() => setCount(count - 1)}
                    style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                    - Decrement
                </button>
                <button 
                    onClick={() => setCount(0)}
                    style={{ padding: '10px 20px', background: 'white', color: '#1e3a8a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                    Reset
                </button>
                <button 
                    onClick={() => setCount(count + 1)}
                    style={{ padding: '10px 20px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                    + Increment
                </button>
            </div>
        </div>
    );
}`,
    updatedAt: Date.now()
  },
  {
    id: 'index.php',
    name: 'index.php',
    type: 'php',
    content: `<?php
echo "<div style='font-family: system-ui, sans-serif; padding: 20px; background: #fafafa; border-radius: 12px; border: 1px solid #eaeaea;'>";
echo "<h1 style='color: #4f46e5; margin-top: 0;'>🐘 PHP-WASM Server Live</h1>";
echo "<p>PHP Version: <b>" . phpversion() . "</b></p>";
echo "<p>System Time: <span style='color: #0d9488; font-family: monospace;'>" . date("Y-m-d H:i:s") . "</span></p>";

echo "<h3>✨ Server Architecture Context:</h3>";
echo "<ul>";
echo "  <li>Self-contained Emscripten WASM Virtual Machine</li>";
echo "  <li>No active backend required - runs 100% Client-Side</li>";
echo "  <li>Uses direct memory Blob bindings to avoid CORS limits</li>";
echo "</ul>";

echo "<h3>🔢 Loop execution trial:</h3>";
echo "<div style='display: flex; gap: 8px;'>";
for ($i = 1; $i <= 5; $i++) {
    echo "<span style='padding: 6px 12px; background: #e0e7ff; color: #4338ca; border-radius: 6px; font-weight: bold;'>Item $i</span>";
}
echo "</div>";
echo "</div>";
?>`,
    updatedAt: Date.now()
  },
  {
    id: 'guestbook.php',
    name: 'guestbook.php',
    type: 'php',
    content: `<?php
echo "<div style='font-family: sans-serif; padding: 20px; background: #111827; color: #f3f4f6; border-radius: 12px; border: 1px solid #374151;'>";
echo "<h1 style='color: #6366f1; margin-top:0;'>🚀 PHP-WASM + SQLite VFS Connection</h1>";
echo "<p style='font-size:12px; color: #9ca3af;'>Persisted inside IndexedDB. Try submitting the form below!</p>";

try {
    // Connect to SQLite Database from the VFS
    $db = new PDO('sqlite:database.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create Table if missing
    $db->exec("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, name TEXT, message TEXT, created_at DATETIME)");
    
    // Add initial seeds if empty
    $count = $db->query("SELECT COUNT(*) FROM messages")->fetchColumn();
    if ($count == 0) {
        $db->exec("INSERT INTO messages (name, message, created_at) VALUES ('Kamyar', 'Welcome to Erbil, Kurdistan!', '" . date("Y-m-d H:i:s") . "')");
        $db->exec("INSERT INTO messages (name, message, created_at) VALUES ('Osman', 'PHP & SQLite VFS compiled beautifully with web-assembly.', '" . date("Y-m-d H:i:s") . "')");
    }

    // Process new submission parameters matching our mock URL controls
    if (!empty($_GET['name']) && !empty($_GET['message'])) {
        $stmt = $db->prepare("INSERT INTO messages (name, message, created_at) VALUES (:name, :message, :created_at)");
        $stmt->execute([
            ':name' => htmlspecialchars($_GET['name']),
            ':message' => htmlspecialchars($_GET['message']),
            ':created_at' => date("Y-m-d H:i:s")
        ]);
        echo "<div style='background: #065f46; border: 1px solid #047857; color: #a7f3d0; padding: 10px; border-radius: 6px; margin-bottom: 12px;'>";
        echo "✔ Entry written to VFS SQLite DB! Click \"Execute Run\" again to query the updated table state.";
        echo "</div>";
    }

    // Render entries
    $result = $db->query("SELECT * FROM messages ORDER BY id DESC");
    echo "<h3 style='color: #818cf8; margin-bottom: 8px;'>👥 Registered Messages in VFS Database:</h3>";
    echo "<table border='1' cellpadding='8' style='border-collapse: collapse; width: 100%; border-color: #374151;'>";
    echo "<tr style='background: #1f2937; color: #818cf8;'><th>ID</th><th>Author Name</th><th>Message Body</th><th>Timestamp</th></tr>";
    
    foreach ($result as $row) {
        echo "<tr style='border-bottom: 1px solid #374151;'>";
        echo "<td>{$row['id']}</td>";
        echo "<td style='color: #fbbf24; font-weight: bold;'>{$row['name']}</td>";
        echo "<td>{$row['message']}</td>";
        echo "<td style='font-size: 11px; color:#9ca3af;'>{$row['created_at']}</td>";
        echo "</tr>";
    }
    echo "</table>";

} catch (PDOException $e) {
    echo "<p style='color: #ef4444;'>SQLite PDO Exception: " . $e->getMessage() . "</p>";
}

echo "</div>";
?>`,
    updatedAt: Date.now()
  },
  {
    id: 'database.sqlite',
    name: 'database.sqlite',
    type: 'sqlite',
    content: '', // Automatically created/filled by PHP SQLite
    updatedAt: Date.now()
  }
];

// esbuild initialization cache
let esbuildPromise: Promise<void> | null = null;
function initEsbuild() {
    if (!esbuildPromise) {
        esbuildPromise = esbuild.initialize({
            wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.24.2/esbuild.wasm'
        });
    }
    return esbuildPromise;
}

export default function ReactTranspilerTool() {
  const [files, setFiles] = useState<VFSFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('counter.tsx');
  const [editorVal, setEditorVal] = useState<string>('');
  const [newFileName, setNewFileName] = useState<string>('');
  
  // Execution results
  const [status, setStatus] = useState<'idle' | 'transpiling' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [outputHtml, setOutputHtml] = useState<string>('');
  
  // Custom mock PHP execution parameter states
  const [phpNameParam, setPhpNameParam] = useState<string>('Kamyar Karzan');
  const [phpMsgParam, setPhpMsgParam] = useState<string>('Best greetings from Erbil, Kurdistan!');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentBlobUrlsRef = useRef<string[]>([]);

  // Open-mount loading VFS files
  useEffect(() => {
    loadVFS();
  }, []);

  // Sync editor val when selected file shifts
  useEffect(() => {
    const file = files.find(f => f.id === selectedFileId);
    if (file) {
      setEditorVal(file.content);
    }
  }, [selectedFileId, files]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => clearTemporaryBlobs();
  }, []);

  const clearTemporaryBlobs = () => {
    currentBlobUrlsRef.current.forEach(u => {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {}
    });
    currentBlobUrlsRef.current = [];
  };

  const loadVFS = async (forceReset = false) => {
    try {
      let stored = await getVFSFilesFromDB();
      if (stored.length === 0 || forceReset) {
        // Seed default template files
        for (const f of DEFAULT_FILES) {
          await saveVFSFileToDB(f);
        }
        stored = [...DEFAULT_FILES];
      }
      setFiles(stored);
      // Select first
      if (stored.length > 0) {
        const found = stored.some(f => f.id === selectedFileId) ? selectedFileId : stored[0].id;
        setSelectedFileId(found);
        setEditorVal(stored.find(f => f.id === found)?.content || '');
      }
    } catch (err) {
      console.error("VFS Loading failed", err);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    const cleanName = newFileName.trim().toLowerCase();
    
    // Determine type
    let type: 'tsx' | 'php' | 'sqlite' | 'text' = 'text';
    if (cleanName.endsWith('.tsx') || cleanName.endsWith('.ts')) type = 'tsx';
    else if (cleanName.endsWith('.php')) type = 'php';
    else if (cleanName.endsWith('.sqlite')) type = 'sqlite';

    // Disallow duplicates
    if (files.some(f => f.id === cleanName)) {
      alert("A file with that name already exists in VFS.");
      return;
    }

    const newObj: VFSFile = {
      id: cleanName,
      name: cleanName,
      type,
      content: type === 'sqlite' ? '' : `// Custom virtual ${cleanName} content\n`,
      updatedAt: Date.now()
    };

    await saveVFSFileToDB(newObj);
    setFiles(prev => [...prev, newObj]);
    setSelectedFileId(newObj.id);
    setNewFileName('');
    playSound('click');
  };

  const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert("At least one file must exist in your Virtual File System.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${id}" from VFS?`)) return;

    await deleteVFSFileFromDB(id);
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    if (selectedFileId === id) {
      setSelectedFileId(updated[0].id);
    }
    playSound('pop');
  };

  const saveCurrentProgress = async (newVal: string) => {
    setEditorVal(newVal);
    const file = files.find(f => f.id === selectedFileId);
    if (file) {
      file.content = newVal;
      file.updatedAt = Date.now();
      await saveVFSFileToDB(file);
    }
  };

  // ----------------------------------------------------
  // Run File: Core transpiler engine for `.tsx` & `.php`
  // ----------------------------------------------------
  const runFile = async (selectedId: string) => {
    clearTemporaryBlobs();
    setStatus('transpiling');
    setErrorMsg(null);
    setPreviewSrc('');
    setOutputHtml('');

    const activeFile = files.find(f => f.id === selectedId);
    if (!activeFile) {
      setStatus('error');
      setErrorMsg("File context not found.");
      return;
    }

    try {
      if (activeFile.type === 'tsx') {
        // --- React + TSX transpiler ---
        await initEsbuild();
        
        const transformResult = await esbuild.transform(editorVal, {
          loader: 'tsx',
          target: 'es2020',
          format: 'esm',
          jsx: 'automatic',
        });

        const transpiledJs = transformResult.code;

        // Create modular JS Blob
        const jsBlob = new Blob([transpiledJs], { type: 'application/javascript' });
        const jsBlobUrl = URL.createObjectURL(jsBlob);
        currentBlobUrlsRef.current.push(jsBlobUrl);

        // Standard dynamic loading HTML iframe with React imported from esm.sh
        const iframeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dynamic React Applet</title>
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom": "https://esm.sh/react-dom@18.2.0",
        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client"
      }
    }
    </script>
    <style>
      body, html { margin: 0; padding: 0; overflow: hidden; height: 100%; width: 100%; background: #ffffff; color: #1e1e1e; font-family: system-ui, sans-serif; }
      #root { width: 100%; height: 100%; box-sizing: border-box; padding: 20px; overflow: auto; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module">
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        
        async function run() {
            try {
                const module = await import('${jsBlobUrl}');
                const App = module.default || Object.values(module)[0];
                if (App) {
                    const container = document.getElementById('root');
                    const root = ReactDOM.createRoot(container);
                    root.render(React.createElement(App));
                } else {
                    document.getElementById('root').innerHTML = '<div style="color: #ef4444; font-family: monospace; padding: 12px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px;"><b>No exported React Component found!</b> Please write "export default function ComponentName..." or export your function.</div>';
                }
            } catch (err) {
                document.getElementById('root').innerHTML = '<div style="color: #ef4444; font-family: monospace; padding: 12px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px;"><h3 style="margin-top: 0;">Runtime Execution Error:</h3>' + err.stack + '</div>';
            }
        }
        run();
    </script>
</body>
</html>`;

        const htmlBlob = new Blob([iframeHtml], { type: 'text/html' });
        const htmlBlobUrl = URL.createObjectURL(htmlBlob);
        currentBlobUrlsRef.current.push(htmlBlobUrl);

        setPreviewSrc(htmlBlobUrl);
        setStatus('success');
        playSound('success');

      } else if (activeFile.type === 'php') {
        // --- PHP-WASM Runtime with PDO SQLite Linked ---
        // Locate sqlite db in VFS
        const sqliteDbFile = files.find(f => f.type === 'sqlite');
        const dbBase64 = sqliteDbFile ? sqliteDbFile.content : '';
        const dbName = sqliteDbFile ? sqliteDbFile.name : 'database.sqlite';

        // Prepare post parameters as actual PHP $_GET query args context!
        const queryArgs = `?name=${encodeURIComponent(phpNameParam)}&message=${encodeURIComponent(phpMsgParam)}`;

        // We construct a sandboxed iframe that hosts Sean Morris's PHP VM
        // This isolates esm executions, preventing security CORS locks or global scope polutions!
        const phpRunnerHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PHP Web VM Executer</title>
    <link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.12/PhpWeb.js" as="script" crossorigin="anonymous" />
    <link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.12/php-web.js" as="script" crossorigin="anonymous" />
    <link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.12/php-web.wasm" as="fetch" crossorigin="anonymous" />
    <style>
        body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; background: #111; color: #eee; font-size: 13px; }
        .success-box { background: #065f46; color: #a7f3d0; padding: 8px 12px; border-radius: 6px; font-family: monospace; margin-bottom: 12px; font-size: 11px; }
    </style>
    <script type="module">
        import { PhpWeb } from 'https://cdn.jsdelivr.net/npm/php-wasm@0.0.12/PhpWeb.js';

        // Fake environmental URL so PHP's $_GET parameter binding parses automatically!
        window.location.search = "${queryArgs}";

        async function init() {
            const status = document.getElementById('status');
            status.innerText = '🐘 Initializing PHP WebAssembly Kernel with SQLite drivers...';

            try {
                const php = new PhpWeb();
                let resultBuffer = "";

                php.addEventListener('output', (evt) => {
                    resultBuffer += evt.detail;
                });

                php.addEventListener('ready', () => {
                    try {
                        status.innerText = '🐘 Mount VFS Storage & Executing script...';

                        // Hook sqlite storage file into the PHP VM emscripten kernel memory Space
                        const dbBase64 = "${dbBase64}";
                        const dbName = "${dbName}";
                        
                        if (dbBase64) {
                            const raw = atob(dbBase64);
                            const rawLength = raw.length;
                            const array = new Uint8Array(new ArrayBuffer(rawLength));
                            for(let i = 0; i < rawLength; i++) {
                                array[i] = raw.charCodeAt(i);
                            }
                            php.binary.FS.writeFile(dbName, array);
                        }

                        // Run user written PHP Script
                        php.run(\`${editorVal.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`).then(() => {
                            // Fetch modified SQLite binary database out of PHP VM to writeback modifications to VFS!
                            let finalDbBase64 = null;
                            try {
                                const fileData = php.binary.FS.readFile(dbName);
                                let binary = '';
                                const len = fileData.byteLength;
                                for (let i = 0; i < len; i++) {
                                    binary += String.fromCharCode(fileData[i]);
                                }
                                finalDbBase64 = btoa(binary);
                            } catch (e) {
                                console.warn("Could not retrieve modified sqlite back from Emscripten", e);
                            }

                            window.parent.postMessage({
                                type: 'PHP_VM_COMPLETE',
                                success: true,
                                html: resultBuffer,
                                updatedDbBase64: finalDbBase64
                            }, '*');

                        }).catch(e => {
                            window.parent.postMessage({
                                type: 'PHP_VM_COMPLETE',
                                success: false,
                                error: e.message || String(e)
                            }, '*');
                        });

                    } catch (e) {
                        window.parent.postMessage({
                            type: 'PHP_VM_COMPLETE',
                            success: false,
                            error: 'Initialization Failure: ' + e.message
                        }, '*');
                    }
                });

            } catch (err) {
                window.parent.postMessage({
                    type: 'PHP_VM_COMPLETE',
                    success: false,
                    error: 'PHP-WASM Initialization Error: ' + err.message
                }, '*');
            }
        }
        window.onload = init;
    </script>
</head>
<body>
    <div id="status"> हाथी Checking WebAssembly Virtual Context...</div>
    <div id="logs" style="margin-top: 15px; font-family: monospace; opacity: 0.5; font-size: 11px;">Loading files via secure browser Blob sandboxing...</div>
</body>
</html>`;

        const phpRunnerBlob = new Blob([phpRunnerHtml], { type: 'text/html' });
        const phpRunnerUrl = URL.createObjectURL(phpRunnerBlob);
        currentBlobUrlsRef.current.push(phpRunnerUrl);

        setPreviewSrc(phpRunnerUrl);

        // Register postmessage listener to capture output details returned by child iframe
        const onReceivePhpResult = async (event: MessageEvent) => {
          if (event.data && event.data.type === 'PHP_VM_COMPLETE') {
            window.removeEventListener('message', onReceivePhpResult);
            
            if (event.data.success) {
              setOutputHtml(event.data.html);
              setStatus('success');
              playSound('success');

              // --- Persist the updated SQLite DB back to IndexedDB ---
              if (event.data.updatedDbBase64 && sqliteDbFile) {
                const refreshedFile: VFSFile = {
                  ...sqliteDbFile,
                  content: event.data.updatedDbBase64,
                  updatedAt: Date.now()
                };
                await saveVFSFileToDB(refreshedFile);
                setFiles(prev => prev.map(f => f.id === sqliteDbFile.id ? refreshedFile : f));
              }
            } else {
              setStatus('error');
              setErrorMsg(event.data.error);
              playSound('error');
            }
          }
        };

        window.addEventListener('message', onReceivePhpResult);

      } else {
        setStatus('error');
        setErrorMsg(`Executing files of type "${activeFile.type}" is not supported. Please select a .tsx or .php file.`);
      }

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || String(err));
      playSound('error');
    }
  };

  const downloadSqlite = () => {
    const sqliteFile = files.find(f => f.type === 'sqlite');
    if (!sqliteFile || !sqliteFile.content) {
      alert("SQLite Database file is currently empty or has not been initialized. Execute a database-driven PHP script like guestbook.php to create tables first.");
      return;
    }

    try {
      const raw = atob(sqliteFile.content);
      const rawLength = raw.length;
      const array = new Uint8Array(new ArrayBuffer(rawLength));
      for(let i = 0; i < rawLength; i++) {
          array[i] = raw.charCodeAt(i);
      }
      
      const blob = new Blob([array], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sqliteFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playSound('success');
    } catch (e: any) {
      alert("Failed to export SQLite binary: " + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-gray-200 h-[690px] font-sans">
      <div className="flex justify-between items-center border-b border-[#252526] pb-2">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-indigo-400 animate-pulse" />
          <h2 className="text-sm font-bold tracking-tight uppercase text-gray-200 flex items-center gap-1.5">
            WASM Multilingual Sandbox <span className="text-[10px] text-indigo-400 lowercase border border-indigo-500/30 px-1.5 py-0.5 rounded bg-indigo-950/20">tsx & php-wasm engine v2</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { if (confirm("Restore Virtual File System to initial templates? Current edits will be deleted.")) loadVFS(true); }}
            className="text-[10px] bg-[#222] hover:bg-[#333] border border-[#444] text-gray-400 hover:text-white px-2.5 py-1 rounded transition flex items-center gap-1"
          >
            <RotateCcw size={11} /> Restore VFS Defaults
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        
        {/* VFS File Tree Explorer Panel */}
        <div className="col-span-3 flex flex-col gap-2 bg-[#121212] p-2.5 rounded-lg border border-[#222] min-h-0">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pb-1 border-b border-gray-800 flex justify-between items-center">
            <span>💾 VFS Files (IndexedDB)</span>
            <span className="text-[9px] text-[#00ffcc] animate-pulse">sync active</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 py-1 max-h-[440px]">
            {files.map((file) => {
              const isSelected = file.id === selectedFileId;
              const isSqlite = file.type === 'sqlite';
              const isPhp = file.type === 'php';
              const isTsx = file.type === 'tsx';

              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`group flex justify-between items-center px-2.5 py-1.5 rounded text-xs cursor-pointer transition ${
                    isSelected ? 'bg-indigo-950/50 text-indigo-200 border border-indigo-500/40' : 'bg-[#181818] text-gray-400 hover:bg-[#202020] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden truncate">
                    {isSqlite ? (
                      <Database size={13} className="text-yellow-500 shrink-0" />
                    ) : isPhp ? (
                      <span className="text-[10px] font-bold text-[#777bb3] bg-[#777bb3]/10 px-1 rounded font-mono border border-[#777bb3]/30 shrink-0">PHP</span>
                    ) : isTsx ? (
                      <FileCode size={13} className="text-blue-400 shrink-0" />
                    ) : (
                      <FileCode size={13} className="text-gray-500 shrink-0" />
                    )}
                    <span className="truncate text-[11px] font-mono">{file.name}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteFile(file.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 rounded transition"
                    title="Delete File"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-800 space-y-1.5">
            <div className="text-[9px] uppercase font-bold text-gray-500">Add New VFS File :</div>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="app.tsx or guest.php..."
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); }}
                className="flex-1 bg-[#1a1a1a] border border-[#333] text-[11px] font-mono px-2 py-1 rounded text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 leading-tight"
              />
              <button 
                onClick={handleCreateFile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition text-xs shrink-0 flex items-center justify-center"
              >
                <Plus size={13} />
              </button>
            </div>
            {selectedFileId.endsWith('.sqlite') && (
              <button
                onClick={downloadSqlite}
                className="w-full bg-amber-950/20 text-amber-400 border border-amber-800/40 hover:bg-amber-950/50 p-1.5 rounded text-[10px] font-semibold transition flex items-center justify-center gap-1.5 mt-2"
              >
                <Download size={11} /> Download SQLite binary
              </button>
            )}
          </div>
        </div>

        {/* Editor Middle Panel */}
        <div className="col-span-5 flex flex-col gap-2 bg-[#121212] p-2.5 rounded-lg border border-[#222] min-h-0">
          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 font-mono">
              ⚡ Selected: {selectedFileId}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
              {files.find(f => f.id === selectedFileId)?.type || 'text'}
            </span>
          </div>

          {selectedFileId && files.find(f => f.id === selectedFileId)?.type === 'sqlite' ? (
            <div className="flex-1 flex flex-col justify-center items-center p-4 text-center text-xs text-gray-400 bg-[#161616] border border-[#2a2a2a] rounded space-y-2">
              <Database size={40} className="text-yellow-500 animate-pulse" />
              <p className="font-semibold text-gray-300">SQLite Database Binary File</p>
              <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                Persistent database linked successfully to PHP PDO SQLite driver. Table queries completed natively inside WebAssembly with bidirectional saves to your IndexedDB VFS store.
              </p>
              <button
                onClick={downloadSqlite}
                className="bg-[#242424] hover:bg-[#333] border border-[#444] text-[11px] px-3 py-1.5 rounded transition flex items-center gap-1.5 text-gray-300"
              >
                <Download size={12} /> Export Current database.sqlite
              </button>
            </div>
          ) : (
            <div className="flex-1 w-full relative min-h-0 border border-[#252526] rounded overflow-hidden">
              <MonacoEditor
                height="100%"
                language={selectedFileId.endsWith('.php') ? 'php' : (selectedFileId.endsWith('.tsx') || selectedFileId.endsWith('.ts') ? 'typescript' : 'plaintext')}
                value={editorVal}
                theme="vs-dark"
                onChange={(val) => saveCurrentProgress(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 11,
                  fontFamily: '"JetBrains Mono", Courier, monospace',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  tabSize: 4,
                  insertSpaces: true,
                  padding: { top: 8, bottom: 8 }
                }}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button 
              onClick={() => runFile(selectedFileId)}
              disabled={status === 'transpiling'}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs flex items-center justify-center gap-2 font-bold cursor-pointer flex-1 disabled:opacity-50 transition"
            >
              {status === 'transpiling' ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Compiling WASM Kernel...
                </>
              ) : (
                <>
                  <Play size={13} /> Run Code File (runFile)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview / Logs Right Panel */}
        <div className="col-span-4 flex flex-col gap-2 bg-[#121212] p-2.5 rounded-lg border border-[#222] min-h-0">
          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
              <Eye size={12}/> Live Execution Sandbox
            </span>
            <span className="text-[9px] text-gray-500 font-mono">Blob URL Container</span>
          </div>

          {selectedFileId.endsWith('.php') && (
            <div className="bg-[#181818] border border-indigo-950/50 p-2 rounded-lg text-xs space-y-1.5">
              <div className="text-[9px] font-bold uppercase text-indigo-400">Mock PHP Form Params ($_GET) :</div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[8px] text-gray-500 block uppercase font-bold">Name</label>
                  <input 
                    type="text" 
                    value={phpNameParam} 
                    onChange={e => setPhpNameParam(e.target.value)}
                    className="w-full bg-[#111] border border-[#2c2c2c] text-[10px] px-1.5 py-0.5 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-gray-500 block uppercase font-bold">Message</label>
                  <input 
                    type="text" 
                    value={phpMsgParam} 
                    onChange={e => setPhpMsgParam(e.target.value)}
                    className="w-full bg-[#111] border border-[#2c2c2c] text-[10px] px-1.5 py-0.5 rounded text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 bg-white rounded-md overflow-hidden relative border border-[#252526] flex flex-col">
            {previewSrc ? (
              <div className="w-full h-full relative flex flex-col">
                <iframe 
                  ref={iframeRef}
                  src={previewSrc}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-modals"
                  style={{ display: selectedFileId.endsWith('.php') ? 'none' : 'block' }}
                />
                
                {/* For PHP files we render the returned HTML buffer beautifully in container directly to retain styling! */}
                {selectedFileId.endsWith('.php') && (
                  <div className="flex-1 p-3 overflow-y-auto text-black bg-white select-text font-sans h-full">
                    {outputHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-400">
                        <div className="text-center">
                          <RefreshCw className="animate-spin text-indigo-500 mx-auto mb-2" size={24} />
                          <p>Ready to initialize PHP WebAssembly Sandbox Virtual Machine.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#555] text-xs font-sans p-4 text-center">
                <span className="mb-2 font-semibold text-gray-400">Preview Container Empty</span>
                <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                  Select either **counter.tsx** or **guestbook.php** and click **Run Code File** to compile & execute natively via WebAssembly and SQLite VFS.
                </p>
              </div>
            )}
          </div>

          {status === 'error' && (
            <div className="bg-red-950/40 border border-red-900 text-red-200 text-[10px] p-2 rounded font-mono flex items-start gap-2 max-h-24 overflow-y-auto">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <div>{errorMsg}</div>
            </div>
          )}
          {status === 'success' && (
            <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-200 text-[10px] p-2 rounded flex items-center gap-2">
              <CheckCircle size={13} className="text-emerald-400" />
              <span>Compilation and execution was compiled successfully!</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
