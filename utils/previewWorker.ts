
// --- HELPER FUNCTIONS (Serialized to Worker) ---

function getFileFullPath(files: any[], file: any): string {
    if (!file) return '';
    if (file.parentId === 'root' || !file.parentId) return '/' + file.name;
    const parent = files.find((f: any) => f.id === file.parentId);
    if (!parent) return '/' + file.name;
    return getFileFullPath(files, parent) + '/' + file.name;
}

function resolveFile(files: any[], currentFile: any, pathStr: string, fileMap?: Map<string, any>) {
    if (!currentFile) return null;
    let targetPath = pathStr;
    let currentFolderId = targetPath.startsWith('/') ? 'root' : currentFile.parentId;
    const parts = targetPath.split('/').filter((p: string) => p !== '' && p !== '.');
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === '..') {
            if (currentFolderId === 'root' || !currentFolderId) {
                currentFolderId = 'root';
            } else {
                const parent = files.find((f: any) => f.id === currentFolderId);
                currentFolderId = parent ? parent.parentId : 'root';
            }
            continue;
        }
        
        // Use pre-indexed map if available for O(1) lookup
        let item;
        if (fileMap) {
            item = fileMap.get(`${currentFolderId}:${part}`);
        } else {
            item = files.find((f: any) => f.name === part && f.parentId === currentFolderId);
        }

        if (!item) return null;
        if (i === parts.length - 1) return item;
        else {
            if (item.type !== 'folder') return null;
            currentFolderId = item.id;
        }
    }
    return null;
}

// Transform JS Code to intercept common navigation patterns
function transformJs(code: string) {
    if (!code) return '';
    
    let transformed = code.replace(
        /(^|[\s{};])(window\.)?location\.href\s*=\s*([^;\n]+)(;?)/g, 
        '$1window.parent.postMessage({type:"navigate", path: $3}, "*");$4'
    );
    
    transformed = transformed.replace(
        /(^|[\s{};])(window\.)?location\s*=\s*([^;\n]+)(;?)/g, 
        '$1window.parent.postMessage({type:"navigate", path: $3}, "*");$4'
    );

    return transformed;
}

function resolveCssUrls(cssContent: string, currentFile: any, files: any[], fileMap?: Map<any, any>) {
    if (!cssContent) return '';
    return cssContent.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, path) => {
        if (path.includes('://') || path.startsWith('//') || path.startsWith('data:')) return match;
        const file = resolveFile(files, currentFile, path, fileMap);
        if (file && file.content) {
            if (file.isBinary) {
                return `url(${quote || '"'}${file.content}${quote || '"'})`;
            } else {
                let mimeType = 'text/plain';
                const lowerName = file.name.toLowerCase();
                if (lowerName.endsWith('.svg')) mimeType = 'image/svg+xml';
                else if (lowerName.endsWith('.json')) mimeType = 'application/json';
                else if (lowerName.endsWith('.css')) mimeType = 'text/css';
                
                return `url(${quote || '"'}data:${mimeType};charset=utf-8,${encodeURIComponent(file.content)}${quote || '"'})`;
            }
        }
        return match;
    });
}

export function processHtml(htmlContent: string, currentFile: any, files: any[], fileMap?: Map<any, any>): string {
      let processed = htmlContent;
      
      // Tag inline style tags for fast updates
      let styleIndex = 0;
      processed = processed.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, content) => {
          if (attrs.includes('id="custom-cursor"')) return match;
          const resolvedContent = resolveCssUrls(content, currentFile, files, fileMap);
          return `<style${attrs} id="inline-style-${styleIndex++}">${resolvedContent}</style>`;
      });

      const replaceResource = (path: string) => resolveFile(files, currentFile, path, fileMap);

      // 1. Resolve CSS
      processed = processed.replace(/<link\s+[^>]*>/gi, (match: string) => {
        if (!match.match(/rel=["']stylesheet["']/i)) return match;
        const hrefMatch = match.match(/href=["'](.+?)["']/i);
        if (!hrefMatch) return match;
        const href = hrefMatch[1];
        if (href.includes('://') || href.startsWith('//') || href.startsWith('data:') || href.includes('www.')) return match;

        const file = replaceResource(href);
        if (file && file.content) {
            let cssContent = resolveCssUrls(file.content, file, files, fileMap);
            return `<style id="style-${file.name}">\n${cssContent}\n</style>`;
        }
        return match;
      });

      // 2. Resolve JS/TS/JSX
      processed = processed.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match: string, attrs: string, content: string) => {
          if (attrs && attrs.match(/type=["'](?:application\/json|x-shader|importmap)["']/i)) return match;
          
          let srcMatch = attrs ? attrs.match(/src=["'](.+?)["']/i) : null;
          let src = srcMatch ? srcMatch[1] : null;
          let isExternal = src && (src.includes('://') || src.startsWith('//') || src.startsWith('data:') || src.includes('www.'));
          if (isExternal) return match;

          let finalContent = content || '';
          let ext = 'js';

          if (src) {
              const file = replaceResource(src);
              if (file && file.content) {
                  finalContent = file.content;
                  ext = file.name.split('.').pop()?.toLowerCase() || 'js';
              } else {
                  return match;
              }
          }

          let cleanAttrs = (attrs || '').replace(/src=["'][^"']*["']/gi, '').replace(/type=["'][^"']*["']/gi, '').replace(/data-presets=["'][^"']*["']/gi, '');

          let typeAttr = ' type="text/javascript"';
          if (ext === 'ts' || ext === 'tsx' || ext === 'jsx' || ext === 'cjs' || ext === 'mjs' || (finalContent && finalContent.includes('</')) || (attrs && attrs.includes('text/babel')) || (attrs && attrs.includes('module'))) {
              typeAttr = ' type="text/babel" data-presets="react,typescript,env" data-plugins="transform-modules-commonjs"';
          }
          
          if (typeAttr.includes('text/babel')) {
              finalContent = transformJs(finalContent);
          }

          return `<script${cleanAttrs}${typeAttr}>\n${finalContent}\n//# sourceURL=${src || 'inline.js'}\n</script>`;
      });
      
      // 3. Resolve Images/Media
      processed = processed.replace(/(src|href)=["'](.+?)["']/gi, (match: string, attr: string, path: string) => {
        if (path.includes('://') || path.startsWith('//') || path.startsWith('data:') || path.startsWith('#') || path.startsWith('javascript:') || path.includes('www.')) return match;
        if (path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.html')) return match;

        const file = replaceResource(path);
        if (file && file.content) {
          if (file.isBinary) {
              return attr + '="' + file.content + '"';
          } else {
              let mimeType = 'text/plain';
              const lowerName = file.name.toLowerCase();
              if (lowerName.endsWith('.svg')) mimeType = 'image/svg+xml';
              else if (lowerName.endsWith('.json')) mimeType = 'application/json';
              return attr + '="data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(file.content) + '"';
          }
        }
        return match;
      });
      
      // 3.5. Resolve Iframes
      processed = processed.replace(/(<iframe[^>]*?\s)src=["']([^"']+)["']/gi, (match: string, tag: string, src: string) => {
        if (src.includes('://') || src.startsWith('//') || src.startsWith('data:') || src.startsWith('blob:') || src.includes('www.')) return match;
        const file = replaceResource(src);
        if (!file || !file.content) return match;
        
        const innerProcessed = processHtml(file.content, file, files, fileMap);
        const escaped = innerProcessed.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        return `${tag}srcdoc="${escaped}"`;
      });

      // 4. Link Interceptor
      const anchorRegex = /<a\s+([^>]*?\s+)?href=["']([^"']*)["']([^>]*)>/gi;
      processed = processed.replace(anchorRegex, (match: string, prefix: string, href: string, suffix: string) => {
        if (!href) return match;
        const isExternal = href.includes('://') || href.startsWith('//') || href.includes('www.');
        if (isExternal || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return match;
        const safeHref = href.replace(/'/g, "\\'"); 
        return '<a href="javascript:void(0)" onclick="event.preventDefault(); window.parent.postMessage({type:\'navigate\', path:\'' + safeHref + '\'}, \'*\');" ' + (prefix || '') + ' ' + (suffix || '') + '>';
      });

      return processed;
}

export function bundleProject(files: any[], activeFileId: string, previewFileId: string, clearData: boolean, cursorCSS: string) {
  // Pre-index files for faster lookups
  const fileMap = new Map();
  files.forEach(f => {
      fileMap.set(`${f.parentId}:${f.name}`, f);
  });

  let entryFile = null;
  
  if (previewFileId) {
      entryFile = files.find((f: any) => f.id === previewFileId);
  }
  
  if (!entryFile) {
     entryFile = files.find((f: any) => f.name === 'index.html' && f.parentId === 'root');
  }

  if (!entryFile) {
      entryFile = files.find((f: any) => f.name.endsWith('.html'));
  }

  if (!entryFile) {
      entryFile = files.find((f: any) => f.name.endsWith('.php'));
  }

  if (!entryFile) {
      entryFile = files.find((f: any) => f.name.endsWith('.py'));
  }

  if (!entryFile || (!entryFile.content && entryFile.type === 'file')) {
      return '<html><body style="background:#1e1e1e;color:#888;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><h3>No previewable entry point file found.</h3></body></html>';
  }

  const filesJson = JSON.stringify(files.map((f: any) => ({
      id: f.id, name: f.name, type: f.type, parentId: f.parentId, content: f.content, isBinary: f.isBinary,
      fullPath: getFileFullPath(files, f)
  }))).replace(/<\/(script)/ig, "<\\\\/$1");

  const entryFileJson = JSON.stringify({
      id: entryFile.id, name: entryFile.name, type: entryFile.type, parentId: entryFile.parentId,
      fullPath: getFileFullPath(files, entryFile)
  }).replace(/<\/(script)/ig, "<\\\\/$1");

  const systemScript = '<script>' +
      'window.__FILES__ = ' + filesJson + ';' +
      'window.__ENTRY_FILE__ = ' + entryFileJson + ';' +
      resolveFile.toString() + ';' +
      '(function(){' +
        'const oldLog = console.log;' +
        'const oldError = console.error;' +
        'const oldWarn = console.warn;' +
        'const oldInfo = console.info;' +
        
        'const oldFetch = window.fetch;' +
        'window.fetch = async function(resource, init) {' +
        '    let urlStr = typeof resource === "string" ? resource : (resource ? resource.url : "");' +
        '    if (urlStr && !urlStr.startsWith("http") && !urlStr.startsWith("data:") && !urlStr.startsWith("blob:")) {' +
        '        if (urlStr.startsWith("./")) urlStr = urlStr.slice(2);' +
        '        const file = resolveFile(window.__FILES__, window.__ENTRY_FILE__, urlStr);' +
        '        if (file) {' +
        '            let content = file.content || "";' +
        '            if (file.name.endsWith(".json")) content = content.replace(/[\\u0660-\\u0669\\u06f0-\\u06f9]/g, c => c.charCodeAt(0) & 15);' +
        '            return new Response(content, { status: 200, headers: { "Content-Type": file.name.endsWith(".json") ? "application/json" : "text/plain" } });' +
        '        } else {' +
        '            return Promise.reject(new TypeError("Failed to execute \'fetch\' on \'Window\': Failed to parse URL from " + urlStr));' +
        '        }' +
        '    }' +
        '    return oldFetch.apply(this, arguments);' +
        '};' +
        
        // Storage & Cookie Fallbacks for Sandboxed/Blocked iframe environments
        'var inMemoryCookieStore = {}; ' +
        'try { ' +
            'var testCookie = document.cookie; ' +
        '} catch(e) { ' +
            'console.warn("[Preview System] Cookies blocked in sandbox, using fallback in-memory cookies."); ' +
            'Object.defineProperty(document, "cookie", { ' +
                'get: function() { ' +
                    'return Object.keys(inMemoryCookieStore).map(function(k) { return k + "=" + inMemoryCookieStore[k]; }).join("; "); ' +
                '}, ' +
                'set: function(val) { ' +
                    'if (!val) return; ' +
                    'var firstPart = val.split(";")[0]; ' +
                    'var eqIndex = firstPart.indexOf("="); ' +
                    'if (eqIndex !== -1) { ' +
                        'var k = firstPart.substring(0, eqIndex).trim(); ' +
                        'var v = firstPart.substring(eqIndex + 1).trim(); ' +
                        'inMemoryCookieStore[k] = v; ' +
                    '} ' +
                '}, ' +
                'configurable: true ' +
            '}); ' +
        '} ' +

        'try { ' +
            'var testLocalStorage = window.localStorage; ' +
        '} catch(e) { ' +
            'console.warn("[Preview System] localStorage blocked in sandbox, using in-memory mock."); ' +
            'var makeStorageMock = function() { ' +
                'var store = {}; ' +
                'return { ' +
                    'getItem: function(key) { return store[key] !== undefined ? store[key] : null; }, ' +
                    'setItem: function(key, value) { store[key] = String(value); }, ' +
                    'removeItem: function(key) { delete store[key]; }, ' +
                    'clear: function() { store = {}; }, ' +
                    'key: function(index) { return Object.keys(store)[index] || null; }, ' +
                    'get length() { return Object.keys(store).length; } ' +
                '}; ' +
            '}; ' +
            'Object.defineProperty(window, "localStorage", { value: makeStorageMock(), configurable: true }); ' +
            'Object.defineProperty(window, "sessionStorage", { value: makeStorageMock(), configurable: true }); ' +
        '} ' +

        // Handle one-time Clear Storage requests from the master page
        (clearData ? 
        'try { ' +
            'localStorage.clear(); ' + 
            'sessionStorage.clear(); ' +
            'inMemoryCookieStore = {}; ' +
            'try { ' +
                'document.cookie.split(";").forEach(function(c) { ' +
                    'document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); ' +
                '}); ' +
            '} catch(err) {} ' +
            'console.log("🧹 [Preview System] Browser LocalStorage, SessionStorage, and Cookies cleared successfully!"); ' +
        '} catch(e) { console.warn("[Preview System] Clear failed: " + e.message); }' 
        : '') +

        // Setup CommonJS environment for transformed modules
        'window.exports = window.exports || {};' +
        'window.module = window.module || { exports: window.exports };' +
        'window.moduleCache = {};' +
        'window.require = window.require || function(modPath) {' +
        '    if (modPath === "react") return window.React;' +
        '    if (modPath === "react-dom" || modPath === "react-dom/client" || modPath === "react-dom/server") return window.ReactDOM;' +
        '    if (modPath === "lucide-react" || modPath === "lucide") return window.lucideReact || window.lucide;' +
        '    if (modPath === "recharts") return window.Recharts;' +
        '    if (modPath.startsWith(".") || modPath.startsWith("/")) {' +
                 // Remove .js or .ts extension from import if we need to fall back
        '        let cleanPath = modPath;' +
        '        if (cleanPath.startsWith("./")) cleanPath = cleanPath.slice(2);' +
        '        let file = window.resolveFile(window.__FILES__, window.__ENTRY_FILE__, modPath);' +
        '        if (!file) file = window.resolveFile(window.__FILES__, window.__ENTRY_FILE__, cleanPath + ".ts") || window.resolveFile(window.__FILES__, window.__ENTRY_FILE__, cleanPath + ".tsx") || window.resolveFile(window.__FILES__, window.__ENTRY_FILE__, cleanPath + ".js") || window.resolveFile(window.__FILES__, window.__ENTRY_FILE__, cleanPath + ".jsx");' +
        '        if (!file) throw new Error("Module not found: " + modPath);' +
        '        if (window.moduleCache[file.id]) return window.moduleCache[file.id].exports;' +
        '        let ext = file.name.split(".").pop().toLowerCase();' +
        '        if (ext === "css") {' +
        '            var style = document.createElement("style");' +
        '            style.textContent = window.resolveCssUrls ? window.resolveCssUrls(file.content, file, window.__FILES__) : file.content;' +
        '            document.head.appendChild(style);' +
        '            return {};' +
        '        }' +
        '        let code = file.content;' +
        '        if (window.Babel && (ext === "ts" || ext === "tsx" || ext === "jsx" || ext === "js")) {' +
        '            try {' +
        '                code = window.Babel.transform(code, {presets: ["react", "typescript", "env"], plugins: ["transform-modules-commonjs"]}).code;' +
        '                if (window.transformJs) code = window.transformJs(code);' +
        '            } catch(e) { console.error("Transpile error in " + file.name, e.message || e); }' +
        '        }' +
        '        let module = { exports: {} };' +
        '        window.moduleCache[file.id] = module;' +
        '        try {' +
        '            let fn = new Function("exports", "require", "module", code + "\\n//# sourceURL=" + file.name);' +
        '            fn(module.exports, window.require, module);' +
        '        } catch(e) { console.error("Evaluation error in " + file.name, e); }' +
        '        return module.exports;' +
        '    }' +
        '    return window.exports;' +
        '};' +

        // Helper to extract file:line from stack trace
        'function cleanSource(stackLine) {' +
            'if (!stackLine) return "";' +
            // Regex to find "filename:line:col" pattern
            'var match = stackLine.match(/([^/(\\s]+):(\\d+):(\\d+)/);' + 
            'if (match) {' +
                'var name = match[1];' +
                'if (stackLine.includes("blob:")) name = "' + entryFile.name + '";' +
                'return name + ":" + match[2] + ":" + match[3];' +
            '}' +
            'return "";' +
        '}' +
 
        'function send(type, args, explicitSource) {' +
            'let source = explicitSource || "";' +
            'if (!source) {' +
                'try { throw new Error(); } catch(e) {' +
                   'var lines = e.stack.split("\\n");' +
                   'if(lines[3]) source = cleanSource(lines[3]);' +
                '}' +
            '}' +
            'try {' +
                'window.parent.postMessage({' +
                    'type: "console", ' +
                    'method: type, ' +
                    'args: args.map(a => {' +
                        'try { return typeof a === "object" ? JSON.stringify(a) : String(a); } catch(e) { return String(a); }' +
                    '}),' +
                    'source: source' +
                '}, "*");' +
            '} catch(e) {}' +
        '}' +
        
        'console.log = function(...args) { send("log", args); oldLog.apply(console, args); };' +
        'console.error = function(...args) { send("error", args); oldError.apply(console, args); };' +
        'console.warn = function(...args) { send("warn", args); oldWarn.apply(console, args); };' +
        'console.info = function(...args) { send("info", args); oldInfo.apply(console, args); };' +
        'window.onerror = function(msg, url, line, col, error) { ' +
            'var sourceName = url ? url.split("/").pop() : "script";' +
            'if (url && url.startsWith("blob:")) sourceName = "' + entryFile.name + '";' +
            'send("error", [msg], sourceName + ":" + line + ":" + col); ' +
        '};' +
        'window.addEventListener("unhandledrejection", function(e) { ' +
            'send("error", ["Uncaught (in promise): " + (e.reason && e.reason.message ? e.reason.message : e.reason)], ""); ' +
        '});' +
        
        'window.open = function(url) { window.parent.postMessage({type:"navigate", path: url}, "*"); return null; };' +
        'window.addEventListener("click", function(e) { window.parent.postMessage({type: "global-click", x: e.clientX, y: e.clientY}, "*"); });' +
        'window.addEventListener("message", function(e) { ' +
            'if (e.data.type === "update-css") { ' +
                'var styleEl = document.getElementById("style-" + e.data.fileName); ' +
                'if (styleEl) styleEl.textContent = e.data.content; ' +
            '} else if (e.data.type === "update-inline-style") { ' +
                'var styleEl = document.getElementById("inline-style-" + e.data.index); ' +
                'if (styleEl) styleEl.textContent = e.data.content; ' +
            '} ' +
        '});' +
      '})();' +
    '</script>';

  const babelScript = '<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.js"></script><script src="https://unpkg.com/lucide-react@latest"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.8/babel.min.js"></script>';

  const cursorStyle = cursorCSS ? `<style id="custom-cursor">${cursorCSS}</style>` : '';

  let html = entryFile.content;

  if (entryFile.name.endsWith('.php')) {
      const dbFile = files.find(f => f.name.endsWith('.sqlite') || f.name.endsWith('.db') || f.type === 'sqlite');
      const dbBase64 = dbFile ? dbFile.content || '' : '';
      const dbName = dbFile ? dbFile.name : 'database.sqlite';
      
      const resolveFileCode = resolveFile.toString();
      const transformJsCode = transformJs.toString();
      const resolveCssUrlsCode = resolveCssUrls.toString();
      const processHtmlCode = processHtml.toString();

      return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>PHP WebAssembly Preview</title>
<link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/PhpWeb.js" as="script" crossorigin="anonymous" />
<link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/php-web.js" as="script" crossorigin="anonymous" />
<link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/php-web.js.wasm" as="fetch" crossorigin="anonymous" />
<style>
body { margin: 0; background: #16161a; color: #f3f4f6; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; height: 100vh; }
.header { background: #1f1f23; padding: 10px 16px; border-bottom: 1px solid #2d2d34; display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.title-area { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #a5b4fc; }
.status-badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.status-badge.info { background: #312e81; color: #c7d2fe; }
.status-badge.success { background: #064e4b; color: #a7f3d0; }
.status-badge.error { background: #7f1d1d; color: #fca5a5; }
.actions { display: flex; gap: 8px; }
.btn { background: #2d2d34; color: #f3f4f6; border: 1px solid #3f3f46; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500; transition: all 0.15s; }
.btn:hover { background: #3f3f46; border-color: #52525b; }
.console-wrapper { flex: 1; display: flex; flex-direction: column; min-height: 0; position: relative; }
#php-output-iframe { flex: 1; border: none; width: 100%; height: 100%; background: #ffffff; }
#php-error-container { display: none; flex: 1; overflow: auto; padding: 20px; font-family: monospace; background: #0c0a09; color: #fca5a5; }
.loader-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: #a1a1aa; position: absolute; inset: 0; background: #16161a; z-index: 10; }
.spinner { width: 24px; height: 24px; border: 2px solid #3f3f46; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="header">
  <div class="title-area">
    <span>🐘 PHP 8.2 WebAssembly Preview</span>
    <span id="status" class="status-badge info">Booting...</span>
  </div>
  <div class="actions">
    <button class="btn" id="run-btn" style="display:none; background: #4338ca; border-color: #4f46e5;">Run Script</button>
  </div>
</div>
<div class="console-wrapper">
  <div id="loader" class="loader-msg">
    <div class="spinner"></div>
    <div style="font-size: 12px; font-weight: 500;">Initializing WebAssembly Kernel...</div>
  </div>
  <iframe id="php-output-iframe" style="display: none;"></iframe>
  <div id="php-error-container"></div>
</div>

<script type="module">
import { PhpWeb } from 'https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/PhpWeb.js';

const statusEl = document.getElementById("status");
const runBtn = document.getElementById("run-btn");
const loaderEl = document.getElementById("loader");
const iframeEl = document.getElementById("php-output-iframe");
const errorContainer = document.getElementById("php-error-container");

let files = ${filesJson};
let entryFile = ${entryFileJson};
const dbBase64 = "${dbBase64}";
const dbName = "${dbName}";

${resolveFileCode}
${transformJsCode}
${resolveCssUrlsCode}
${processHtmlCode}

let php = null;

// Forward messages from output iframe to editor parent (grandparent)
window.addEventListener('message', (e) => {
    if (e.data && (e.data.type === 'console' || e.data.type === 'navigate' || e.data.type === 'global-click')) {
        window.parent.postMessage(e.data, '*');
    }
});

// Port external files hot update to running instance
window.addEventListener('message', async (e) => {
    if (e.data && e.data.type === 'update-php-project') {
        console.log('🐘 Hot updated PHP workspace without reloading WASM kernel!');
        await startAndRunPhp(e.data.files, e.data.entryFile);
    }
});

async function startAndRunPhp(updatedFiles = null, updatedEntryFile = null) {
    if (updatedFiles) {
        files = updatedFiles;
    }
    if (updatedEntryFile) {
        entryFile = updatedEntryFile;
    }
    
    statusEl.textContent = "Running";
    statusEl.className = "status-badge info";
    loaderEl.style.display = "flex";
    iframeEl.style.display = "none";
    errorContainer.style.display = "none";

    try {
        php = new PhpWeb();
        let output = "";
        
        php.addEventListener('output', (evt) => {
            output += evt.detail;
        });
        
        php.addEventListener('ready', async () => {
            try {
                // Mount project VFS in php-wasm FS
                for (const f of files) {
                    if (f.type === 'file' && f.content !== undefined) {
                        const path = f.fullPath || ('/' + f.name);
                        const parts = path.split('/').filter(p => p);
                        if (parts.length > 1) {
                            let currentDir = "";
                            for (let i = 0; i < parts.length - 1; i++) {
                                currentDir += '/' + parts[i];
                                try {
                                    php.binary.FS.mkdir(currentDir);
                                } catch (e) {}
                            }
                        }
                        
                        try {
                            if (f.isBinary && f.content.startsWith('data:')) {
                                const base64Data = f.content.split(',')[1];
                                const binaryStr = atob(base64Data);
                                const array = new Uint8Array(binaryStr.length);
                                for (let i = 0; i < binaryStr.length; i++) {
                                    array[i] = binaryStr.charCodeAt(i);
                                }
                                php.binary.FS.writeFile(path, array);
                            } else {
                                php.binary.FS.writeFile(path, f.content);
                            }
                        } catch (err) {
                            console.error("FS Error: " + path, err);
                        }
                    }
                }
                
                // Write DB if has one
                if (dbBase64) {
                    try {
                        const binaryStr = atob(dbBase64);
                        const array = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                            array[i] = binaryStr.charCodeAt(i);
                        }
                        php.binary.FS.writeFile(dbName, array);
                    } catch (err) {
                        console.error("DB Initialization error:", err);
                    }
                }
                
                // Execute entry file
                const scriptPath = entryFile.fullPath || ('/' + entryFile.name);
                await php.runCode("include '" + scriptPath.replace(/'/g, "\\\\'") + "';");
                
                statusEl.textContent = "Success";
                statusEl.className = "status-badge success";
                loaderEl.style.display = "none";
                iframeEl.style.display = "block";
                
                // Process output HTML with identical HTML injection assets pipeline
                let processedHtml = processHtml(output, entryFile, files);
                
                // Append libraries inside the output document
                const babelScriptStr = ${JSON.stringify(babelScript).replace(/<\/(script)/ig, "<\\\\/$1")};
                const systemScriptStr = ${JSON.stringify(systemScript).replace(/<\/(script)/ig, "<\\\\/$1")};
                const cursorStyleStr = ${JSON.stringify(cursorStyle).replace(/<\/(script)/ig, "<\\\\/$1")};

                if (processedHtml.includes('<head>')) {
                    processedHtml = processedHtml.replace('<head>', '<head>' + babelScriptStr + systemScriptStr + cursorStyleStr);
                } else if (processedHtml.includes('<body>')) {
                    processedHtml = processedHtml.replace('<body>', '<body>' + babelScriptStr + systemScriptStr + cursorStyleStr);
                } else {
                    processedHtml = babelScriptStr + systemScriptStr + cursorStyleStr + processedHtml;
                }

                // Render into child iframe to support dynamic script execution & sandbox
                const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(processedHtml);
                iframeDoc.close();
                
                runBtn.style.display = "inline-block";
                runBtn.onclick = () => startAndRunPhp();
            } catch (err) {
                showError(err);
            }
        });
    } catch (err) {
        showError(err);
    }
}

function showError(err) {
    statusEl.textContent = "Error";
    statusEl.className = "status-badge error";
    loaderEl.style.display = "none";
    iframeEl.style.display = "none";
    errorContainer.style.display = "block";
    errorContainer.innerHTML = "<h3>PHP Script Execution Error</h3><pre>" + err.toString() + "\\n" + (err.stack || "") + "</pre>";
}

startAndRunPhp();
</script>
</body>
</html>`;
  }


  if (entryFile.name.endsWith('.php')) {
      const filesJson = JSON.stringify(files.map((f: any) => ({
          id: f.id, name: f.name, type: f.type, parentId: f.parentId, content: f.content, isBinary: f.isBinary,
          fullPath: getFileFullPath(files, f)
      }))).replace(/<\/(script)/ig, "<\\\\/$1");

      const entryFileJson = JSON.stringify({
          id: entryFile.id, name: entryFile.name, type: entryFile.type, parentId: entryFile.parentId,
          fullPath: getFileFullPath(files, entryFile)
      }).replace(/<\/(script)/ig, "<\\\\/$1");

      const dbFile = files.find(f => f.name.endsWith('.sqlite') || f.name.endsWith('.db') || f.type === 'sqlite');
      const dbBase64 = dbFile ? dbFile.content || '' : '';
      const dbName = dbFile ? dbFile.name : 'database.sqlite';
      
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>PHP WebAssembly Preview</title>
<link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/PhpWeb.js" as="script" crossorigin="anonymous" />
<link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/php-web.js" as="script" crossorigin="anonymous" />
<link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/php-web.js.wasm" as="fetch" crossorigin="anonymous" />
<style>
body { margin: 0; background: #16161a; color: #f3f4f6; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; height: 100vh; }
.header { background: #1f1f23; padding: 10px 16px; border-bottom: 1px solid #2d2d34; display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.title-area { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #a5b4fc; }
.status-badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.status-badge.info { background: #312e81; color: #c7d2fe; }
.status-badge.success { background: #064e4b; color: #a7f3d0; }
.status-badge.error { background: #7f1d1d; color: #fca5a5; }
.actions { display: flex; gap: 8px; }
.btn { background: #2d2d34; color: #f3f4f6; border: 1px solid #3f3f46; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500; transition: all 0.15s; }
.btn:hover { background: #3f3f46; border-color: #52525b; }
.console-wrapper { flex: 1; display: flex; flex-direction: column; min-height: 0; }
#php-output-container { flex: 1; overflow: auto; background: #fff; color: #000; box-sizing: border-box; }
#php-output-container.has-error { background: #0c0a09; color: #fca5a5; padding: 20px; font-family: monospace; }
.loader-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: #a1a1aa; }
.spinner { width: 24px; height: 24px; border: 2px solid #3f3f46; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="header">
  <div class="title-area">
    <span>🐘 PHP 8.2 WebAssembly Preview</span>
    <span id="status" class="status-badge info">Booting...</span>
  </div>
  <div class="actions">
    <button class="btn" id="run-btn" style="display:none; background: #4338ca; border-color: #4f46e5;">Run Script</button>
  </div>
</div>
<div class="console-wrapper">
  <div id="php-output-container">
    <div class="loader-msg">
      <div class="spinner"></div>
      <div style="font-size: 12px; font-weight: 500;">Initializing WebAssembly Kernel...</div>
    </div>
  </div>
</div>

<script type="module">
import { PhpWeb } from 'https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/PhpWeb.js';

const statusEl = document.getElementById("status");
const runBtn = document.getElementById("run-btn");
const outputContainer = document.getElementById("php-output-container");

const files = ${filesJson};
const entryFile = ${entryFileJson};
const dbBase64 = "${dbBase64}";
const dbName = "${dbName}";

let php = null;

async function initPhp() {
    try {
        php = new PhpWeb();
        let output = "";
        
        php.addEventListener('output', (evt) => {
            output += evt.detail;
        });
        
        php.addEventListener('ready', async () => {
            try {
                statusEl.textContent = "Running";
                statusEl.className = "status-badge info";
                
                // Mount project VFS in php-wasm FS
                for (const f of files) {
                    if (f.type === 'file' && f.content !== undefined) {
                        const path = f.fullPath || ('/' + f.name);
                        const parts = path.split('/').filter(p => p);
                        if (parts.length > 1) {
                            let currentDir = "";
                            for (let i = 0; i < parts.length - 1; i++) {
                                currentDir += '/' + parts[i];
                                try {
                                    php.binary.FS.mkdir(currentDir);
                                } catch (e) {}
                            }
                        }
                        
                        try {
                            if (f.isBinary && f.content.startsWith('data:')) {
                                const base64Data = f.content.split(',')[1];
                                const binaryStr = atob(base64Data);
                                const array = new Uint8Array(binaryStr.length);
                                for (let i = 0; i < binaryStr.length; i++) {
                                    array[i] = binaryStr.charCodeAt(i);
                                }
                                php.binary.FS.writeFile(path, array);
                            } else {
                                php.binary.FS.writeFile(path, f.content);
                            }
                        } catch (err) {
                            console.error("FS Error: " + path, err);
                        }
                    }
                }
                
                // Write DB if has one
                if (dbBase64) {
                    try {
                        const binaryStr = atob(dbBase64);
                        const array = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                            array[i] = binaryStr.charCodeAt(i);
                        }
                        php.binary.FS.writeFile(dbName, array);
                    } catch (err) {
                        console.error("DB Initialization error:", err);
                    }
                }
                
                // Execute entry file
                const scriptPath = entryFile.fullPath || ('/' + entryFile.name);
                await php.runCode("include '" + scriptPath + "';");
                
                statusEl.textContent = "Success";
                statusEl.className = "status-badge success";
                
                outputContainer.innerHTML = "";
                outputContainer.classList.remove("has-error");
                
                // Sandbox postMessage navigation and link interception
                const parser = new DOMParser();
                const doc = parser.parseFromString(output || "<span style='color:#a1a1aa;font-family:monospace;padding:12px;display:block;'>Script executed with empty output.</span>", "text/html");
                
                // Intercept anchor navigation inside output
                doc.querySelectorAll("a").forEach(a => {
                    const href = a.getAttribute("href");
                    if (href && !href.includes("://") && !href.startsWith("//") && !href.startsWith("#") && !href.startsWith("javascript:")) {
                        a.setAttribute("href", "javascript:void(0)");
                        a.addEventListener("click", (e) => {
                            e.preventDefault();
                            window.parent.postMessage({ type: "navigate", path: href }, "*");
                        });
                    }
                });
                
                // Render the output cleanly!
                outputContainer.appendChild(doc.documentElement);
                runBtn.style.display = "inline-block";
                runBtn.onclick = runPhp;
            } catch (err) {
                showError(err);
            }
        });
    } catch (err) {
        showError(err);
    }
}

async function runPhp() {
    if (!php) return;
    statusEl.textContent = "Running";
    statusEl.className = "status-badge info";
    outputContainer.innerHTML = '<div class="loader-msg"><div class="spinner"></div><div>Executing Script...</div></div>';
    
    setTimeout(async () => {
        try {
            let output = "";
            php.addEventListener('output', (evt) => {
                output += evt.detail;
            });
            const scriptPath = entryFile.fullPath || ('/' + entryFile.name);
            await php.runCode("include '" + scriptPath + "';");
            
            statusEl.textContent = "Success";
            statusEl.className = "status-badge success";
            outputContainer.innerHTML = "";
            outputContainer.classList.remove("has-error");
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(output || "<span style='color:#a1a1aa;font-family:monospace;padding:12px;display:block;'>Script executed with empty output.</span>", "text/html");
            doc.querySelectorAll("a").forEach(a => {
                const href = a.getAttribute("href");
                if (href && !href.includes("://") && !href.startsWith("//") && !href.startsWith("#") && !href.startsWith("javascript:")) {
                    a.setAttribute("href", "javascript:void(0)");
                    a.addEventListener("click", (e) => {
                        e.preventDefault();
                        window.parent.postMessage({ type: "navigate", path: href }, "*");
                    });
                }
            });
            outputContainer.appendChild(doc.documentElement);
        } catch (err) {
            showError(err);
        }
    }, 50);
}

function showError(err) {
    statusEl.textContent = "Error";
    statusEl.className = "status-badge error";
    outputContainer.classList.add("has-error");
    outputContainer.innerHTML = "<h3>PHP Script Execution Error</h3><pre>" + err.toString() + "\\n" + (err.stack || "") + "</pre>";
}

initPhp();
</script>
</body>
</html>`;
  }

  if (entryFile.name.endsWith('.py')) {
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Python Code</title>
<script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"></script>
<style>
body { background: #1e1e1e; color: #e0e0e0; font-family: monospace; margin: 0; padding: 0; box-sizing: border-box; display: flex; flex-direction: column; height: 100vh; }
.header { background: #252526; padding: 10px 16px; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.title-area { display: flex; align-items: center; gap: 8px; font-weight: bold; color: #3b82f6; }
.status-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; background: #334155; color: #cbd5e1; }
.status-badge.info { background: #1e3a8a; color: #93c5fd; }
.status-badge.success { background: #065f46; color: #a7f3d0; }
.status-badge.error { background: #7f1d1d; color: #fca5a5; }
.actions { display: flex; gap: 8px; }
.btn { background: #333; color: #fff; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; }
.btn:hover { background: #444; }
.console { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.5; }
.output-line { white-space: pre-wrap; word-break: break-all; }
.output-line.system { color: #888; font-style: italic; }
.output-line.stdout { color: #4ade80; }
.output-line.stderr { color: #f87171; }
.output-line.result { color: #60a5fa; border-top: 1px dashed #333; padding-top: 4px; margin-top: 4px; }
</style>
</head>
<body>
<div class="header">
  <div class="title-area">
    <span>🐍 Python 3 WEB Runtime</span>
    <span id="status" class="status-badge info">Loading Environment...</span>
  </div>
  <div class="actions">
    <button class="btn" id="clear-btn">Clear Console</button>
    <button class="btn" id="run-btn" style="display:none; background: #059669;">Run Script</button>
  </div>
</div>
<div class="console" id="console">
  <div class="output-line system">[System] Initializing WebAssembly-powered Python interpreter (Pyodide)...</div>
  <div class="output-line system">[System] This runs completely in your browser — zero requests to Netlify servers!</div>
</div>
<script>
const consoleEl = document.getElementById("console");
const statusEl = document.getElementById("status");
const clearBtn = document.getElementById("clear-btn");
const runBtn = document.getElementById("run-btn");

function logToScreen(text, type = "system") {
    const line = document.createElement("div");
    line.className = "output-line " + type;
    line.replaceChildren(document.createTextNode(text));
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
    if (type === "stdout") console.log(text);
    else if (type === "stderr") console.error(text);
    else console.info(text);
}

clearBtn.addEventListener("click", () => {
    consoleEl.replaceChildren();
    logToScreen("[System] Console cleared.", "system");
});

let pyodideInstance = null;
const pythonCode = window.__FILES__ && window.__ENTRY_FILE__ ? (window.__FILES__.find(f => f.id === window.__ENTRY_FILE__.id)?.content || "") : \`\`;

async function main() {
    try {
        pyodideInstance = await loadPyodide({
            stdout: (text) => logToScreen(text, "stdout"),
            stderr: (text) => logToScreen(text, "stderr")
        });
        statusEl.textContent = "Ready";
        statusEl.className = "status-badge success";
        logToScreen("[System] Pyodide initialized successfully.", "system");
        runBtn.style.display = "inline-block";
        runBtn.addEventListener("click", runPython);
        await runPython();
    } catch (err) {
        statusEl.textContent = "Load Failed";
        statusEl.className = "status-badge error";
        logToScreen("[System Error] Failed to load Pyodide: " + err.toString(), "stderr");
    }
}

async function runPython() {
    if (!pyodideInstance) return;
    statusEl.textContent = "Running...";
    statusEl.className = "status-badge info";
    logToScreen("[System] Running python script...", "system");
    const startTime = performance.now();
    try {
        const rawResult = await pyodideInstance.runPythonAsync(pythonCode || \`\`);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(3);
        statusEl.textContent = "Success";
        statusEl.className = "status-badge success";
        logToScreen("[System] Compilation finished in " + duration + " seconds.", "system");
        if (rawResult !== undefined) logToScreen("Output value: " + rawResult, "result");
    } catch (err) {
        statusEl.textContent = "Runtime Error";
        statusEl.className = "status-badge error";
        logToScreen(err.toString(), "stderr");
    }
}

main();
</script>
</body>
</html>`;
  }

  if (entryFile.name.endsWith('.tsx') || entryFile.name.endsWith('.jsx')) {
      let code = entryFile.content;
      if (!code.includes('createRoot') && !code.includes('ReactDOM.render')) {
          code += "\\n\\nif (typeof exports !== 'undefined' && exports.default) { const root = window.ReactDOM.createRoot(document.getElementById('root')); root.render(window.React.createElement(exports.default)); }";
      }
      html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react,typescript,env" data-plugins="transform-modules-commonjs">
${code}
//# sourceURL=${entryFile.name}
</script>
</body>
</html>`;
  } else if (entryFile.name.endsWith('.json')) {
      html = `<!DOCTYPE html><html><body style="background:#1e1e1e;color:#d4d4d4;font-family:monospace;white-space:pre-wrap;padding:20px;margin:0;">${entryFile.content}</body></html>`;
  } else if (entryFile.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      const fontName = 'PreviewFont_' + entryFile.id.replace(/[^a-zA-Z0-9]/g, '');
      html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
@font-face { font-family: '${fontName}'; src: url(${entryFile.content}); }
body { background: #1e1e1e; display: flex; flex-direction: column; gap: 24px; padding: 24px; color: white; justify-content: center; align-items: center; min-height: 100vh; margin: 0; font-family: '${fontName}', sans-serif; }
.card { background: #252526; padding: 24px; border-radius: 8px; border: 1px solid #333; width: 100%; max-width: 800px; }
.label { font-family: sans-serif; font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 8px; }
.text { font-size: 36px; word-break: break-all; line-height: 1.5; }
</style>
</head>
<body>
<div class="card"><div class="label">English</div><div class="text">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>abcdefghijklmnopqrstuvwxyz<br/>0123456789 !@#$%^&*()</div></div>
<div class="card"><div class="label">Kurdish Sorani</div><div class="text" dir="rtl">بژی کورد و کوردستان</div></div>
</body>
</html>`;
  }

  // Run resource processor on output HTML
  html = processHtml(html, entryFile, files, fileMap);

  if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + babelScript + systemScript + cursorStyle);
  } else if (html.includes('<body>')) {
      html = html.replace('<body>', '<body>' + babelScript + systemScript + cursorStyle);
  } else {
      html = babelScript + systemScript + cursorStyle + html;
  }

  return html;
}

export function generateStandaloneRunner(files: any[], entryId: string) {
    const filesJson = JSON.stringify(files.map((f: any) => ({
        id: f.id, name: f.name, type: f.type, parentId: f.parentId, content: f.content, isBinary: f.isBinary
    }))).replace(/<\/(script)/ig, "<\\\\/$1");

    let startId = entryId;
    let title = "Project Preview";
    
    const findEntry = files.find((f: any) => f.id === entryId) || files.find((f: any) => f.name === 'index.html');
    if (findEntry) {
        startId = findEntry.id;
        const titleMatch = findEntry.content.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) title = titleMatch[1];
    }

    // @ts-ignore
    const resolveFileCode = resolveFile.toString();
    // @ts-ignore
    const transformJsCode = transformJs.toString();
    // @ts-ignore
    const resolveCssUrlsCode = resolveCssUrls.toString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/lucide-react@latest"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.8/babel.min.js"></script>
    <style>body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; } iframe { width: 100%; height: 100%; border: none; }</style>
</head>
<body>
    <iframe id="app-frame" sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin allow-pointer-lock allow-presentation"></iframe>
    <script>
        const FILES = ${filesJson};
        let currentFileId = "${startId}";
        ${resolveFileCode}
        ${transformJsCode}
        ${resolveCssUrlsCode}
        window.FILES = FILES;
        window.resolveFile = resolveFile;
        window.currentFileId = currentFileId;
        function bundle(fileId) {
            const entryFile = FILES.find(f => f.id === fileId);
            if (!entryFile) return '<h1>404 Not Found</h1>';
            
            let html = entryFile.content || '';

            if (entryFile.name.endsWith('.php')) {
                return '<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>PHP WebAssembly Preview</title><link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/PhpWeb.js" as="script" crossorigin="anonymous" /><link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/php-web.js" as="script" crossorigin="anonymous" /><link rel="preload" href="https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/php-web.js.wasm" as="fetch" crossorigin="anonymous" /><style>body { margin: 0; background: #1e1e1e; color: #e0e0e0; font-family: monospace; display: flex; flex-direction: column; height: 100vh; }</style></head><body><div id="php-output-container" style="padding:16px;">Initializing WebAssembly Kernel...</div><script type="module">import { PhpWeb } from "https://cdn.jsdelivr.net/npm/php-wasm@0.0.8/PhpWeb.js"; const outputContainer = document.getElementById("php-output-container"); const files = window.parent && window.parent.FILES ? window.parent.FILES : []; const entryFileId = window.parent ? window.parent.currentFileId : null; const entryFile = files.find(f => f.id === entryFileId); let php = null; async function initPhp() { try { php = new PhpWeb(); let output = ""; php.addEventListener("output", (evt) => { output += evt.detail; }); php.addEventListener("ready", async () => { try { for (const f of files) { if (f.type === "file" && f.content !== undefined) { const path = f.fullPath || ("/" + f.name); const parts = path.split("/").filter(p => p); if (parts.length > 1) { let currentDir = ""; for (let i = 0; i < parts.length - 1; i++) { currentDir += "/" + parts[i]; try { php.binary.FS.mkdir(currentDir); } catch(e){} } } try { if (f.isBinary && f.content.startsWith("data:")) { const base64Data = f.content.split(",")[1]; const binaryStr = atob(base64Data); const array = new Uint8Array(binaryStr.length); for (let i=0; i<binaryStr.length; i++) array[i] = binaryStr.charCodeAt(i); php.binary.FS.writeFile(path, array); } else { php.binary.FS.writeFile(path, f.content); } } catch(err) { console.error("FS Error: "+path, err); } } } const scriptPath = entryFile ? (entryFile.fullPath || ("/" + entryFile.name)) : ""; await php.runCode("include \\"" + scriptPath + "\\";"); outputContainer.innerHTML = output || "Script executed with empty output."; } catch(err) { outputContainer.innerHTML = "Error: " + err.toString(); } }); } catch(err) { outputContainer.innerHTML = "Error: " + err.toString(); } } initPhp();<\\/script></body></html>';
            }

            if (entryFile.name.endsWith('.py')) {
                return '<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Python Code</title><script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"><\\/script><style>body { background: #1e1e1e; color: #e0e0e0; font-family: monospace; margin: 0; padding: 0; box-sizing: border-box; display: flex; flex-direction: column; height: 100vh; } .header { background: #252526; padding: 10px 16px; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; font-size: 13px; } .title-area { display: flex; align-items: center; gap: 8px; font-weight: bold; color: #3b82f6; } .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; background: #334155; color: #cbd5e1; } .status-badge.info { background: #1e3a8a; color: #93c5fd; } .status-badge.success { background: #065f46; color: #a7f3d0; } .status-badge.error { background: #7f1d1d; color: #fca5a5; } .actions { display: flex; gap: 8px; } .btn { background: #333; color: #fff; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; } .btn:hover { background: #444; } .console { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.5; } .output-line { white-space: pre-wrap; word-break: break-all; } .output-line.system { color: #888; font-style: italic; } .output-line.stdout { color: #4ade80; } .output-line.stderr { color: #f87171; } .output-line.result { color: #60a5fa; border-top: 1px dashed #333; padding-top: 4px; margin-top: 4px; }</style></head><body><div class="header"><div class="title-area"><span>\uD83D\uDC0D Python 3 WEB Runtime</span><span id="status" class="status-badge info">Loading Environment...</span></div><div class="actions"><button class="btn" id="clear-btn">Clear Console</button><button class="btn" id="run-btn" style="display:none; background: #059669;">Run Script</button></div></div><div class="console" id="console"><div class="output-line system">[System] Initializing WebAssembly-powered Python interpreter (Pyodide)...</div><div class="output-line system">[System] This runs completely in your browser \u2014 zero requests to Netlify servers!</div></div><script>const consoleEl = document.getElementById("console"); const statusEl = document.getElementById("status"); const clearBtn = document.getElementById("clear-btn"); const runBtn = document.getElementById("run-btn"); function logToScreen(text, type = "system") { const line = document.createElement("div"); line.className = "output-line " + type; line.replaceChildren(document.createTextNode(text)); consoleEl.appendChild(line); consoleEl.scrollTop = consoleEl.scrollHeight; if (type === "stdout") console.log(text); else if (type === "stderr") console.error(text); else console.info(text); } clearBtn.addEventListener("click", () => { consoleEl.replaceChildren(); logToScreen("[System] Console cleared.", "system"); }); let pyodideInstance = null; const pythonCode = window.parent && window.parent.FILES ? (window.parent.FILES.find(f => f.id === window.parent.currentFileId)?.content || "") : ""; async function main() { try { pyodideInstance = await loadPyodide({ stdout: (text) => logToScreen(text, "stdout"), stderr: (text) => logToScreen(text, "stderr") }); statusEl.textContent = "Ready"; statusEl.className = "status-badge success"; logToScreen("[System] Pyodide initialized successfully.", "system"); runBtn.style.display = "inline-block"; runBtn.addEventListener("click", runPython); await runPython(); } catch (err) { statusEl.textContent = "Load Failed"; statusEl.className = "status-badge error"; logToScreen("[System Error] Failed to load Pyodide: " + err.toString(), "stderr"); } } async function runPython() { if (!pyodideInstance) return; statusEl.textContent = "Running..."; statusEl.className = "status-badge info"; logToScreen("[System] Running python script...", "system"); const startTime = performance.now(); try { const rawResult = await pyodideInstance.runPythonAsync(pythonCode); const endTime = performance.now(); const duration = ((endTime - startTime) / 1000).toFixed(3); statusEl.textContent = "Success"; statusEl.className = "status-badge success"; logToScreen("[System] Compilation finished in " + duration + " seconds.", "system"); if (rawResult !== undefined) logToScreen("Output value: " + rawResult, "result"); } catch (err) { statusEl.textContent = "Runtime Error"; statusEl.className = "status-badge error"; logToScreen(err.toString(), "stderr"); } } main();<\/script></body></html>';
            }
            
            function processHtml(htmlContent, currentFile) {
                let processed = htmlContent;
                const replaceResource = (path) => { const file = resolveFile(FILES, currentFile, path); return file; };
                
                // Inline CSS resolution
                processed = processed.replace(/<style([^>]*)>([\\s\\S]*?)<\\/style>/gi, (match, attrs, content) => {
                    const resolvedContent = resolveCssUrls(content, currentFile, FILES);
                    return '<style' + attrs + '>' + resolvedContent + '<\\/style>';
                });
                
                // CSS
                processed = processed.replace(/<link\\s+[^>]*>/gi, (match) => { if (!match.match(/rel=["']stylesheet["']/i)) return match; const hrefMatch = match.match(/href=["'](.+?)["']/i); if (hrefMatch && !hrefMatch[1].includes('://')) { const file = replaceResource(hrefMatch[1]); if (file && file.content) { const cssContent = resolveCssUrls(file.content, file, FILES); return '<style>' + cssContent + '</style>'; } } return match; });
                
                // JS/TS
                processed = processed.replace(/<script([^>]*)>([\\s\\S]*?)<\\/script>/gi, (match, attrs, content) => { 
                    if (attrs && attrs.match(/type=["'](?:application\\/json|x-shader|importmap)["']/i)) return match;
                    let srcMatch = attrs ? attrs.match(/src=["'](.+?)["']/i) : null;
                    let src = srcMatch ? srcMatch[1] : null;
                    let isExternal = src && (src.includes('://') || src.startsWith('//') || src.startsWith('data:') || src.includes('www.'));
                    if (isExternal) return match;

                    let finalContent = content || '';
                    let ext = 'js';

                    if (src) {
                        const file = replaceResource(src); 
                        if (file && file.content) {
                            finalContent = file.content;
                            ext = file.name.split('.').pop()?.toLowerCase() || 'js';
                        } else {
                            return match;
                        }
                    }

                    let cleanAttrs = (attrs || '').replace(/src=["'][^"']*["']/gi, '').replace(/type=["'][^"']*["']/gi, '').replace(/data-presets=["'][^"']*["']/gi, '');

                    let typeAttr = ' type="text/javascript"';
                    if (ext === 'ts' || ext === 'tsx' || ext === 'jsx' || ext === 'cjs' || ext === 'mjs' || (finalContent && finalContent.includes('</')) || (attrs && attrs.includes('text/babel')) || (attrs && attrs.includes('module'))) {
                        typeAttr = ' type="text/babel" data-presets="react,typescript,env" data-plugins="transform-modules-commonjs"';
                    }

                    if (typeAttr.includes('text/babel')) {
                        finalContent = transformJs(finalContent);
                    }

                    return '<script' + cleanAttrs + typeAttr + '>\\n' + finalContent + '\\n//# sourceURL=' + (src || 'inline.js') + '\\n<\\/script>'; 
                });
                
                // Media
                processed = processed.replace(/(src|href)=["'](.+?)["']/gi, (match, attr, path) => { 
                    if (!path.includes('://') && !path.startsWith('data:') && !path.startsWith('#') && !path.startsWith('javascript:')) { 
                        if (attr === 'href' && (path.endsWith('.html') || path.indexOf('.') === -1)) return match; 
                        const file = resolveFile(FILES, currentFile, path); 
                        if (file && file.content) {
                            if (file.isBinary) return attr + '="' + file.content + '"';
                            else {
                                let mimeType = 'text/plain';
                                const lowerName = file.name.toLowerCase();
                                if (lowerName.endsWith('.svg')) mimeType = 'image/svg+xml';
                                else if (lowerName.endsWith('.json')) mimeType = 'application/json';
                                return attr + '="data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(file.content) + '"';
                            }
                        } 
                    } 
                    return match; 
                });
                
                // Iframes
                processed = processed.replace(/(<iframe[^>]*?\\s)src=["']([^"']+)["']/gi, (match, tag, src) => {
                    if (src.includes('://') || src.startsWith('//') || src.startsWith('data:') || src.startsWith('blob:') || src.includes('www.')) return match;
                    const file = replaceResource(src);
                    if (!file || !file.content) return match;
                    const innerProcessed = processHtml(file.content, file);
                    const escaped = innerProcessed.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                    return tag + 'srcdoc="' + escaped + '"';
                });
                
                return processed;
            }

            html = processHtml(html, entryFile);

            // TSX Wrapper
            if (entryFile.name.endsWith('.tsx') || entryFile.name.endsWith('.jsx')) {
                let code = entryFile.content;
                if (!code.includes('createRoot') && !code.includes('ReactDOM.render')) {
                    code += "\\n\\nif (typeof exports !== 'undefined' && exports.default) { const root = window.ReactDOM.createRoot(document.getElementById('root')); root.render(window.React.createElement(exports.default)); }";
                }
                html = '<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><div id="root"></div><script type="text/babel" data-presets="react,typescript,env" data-plugins="transform-modules-commonjs">' + code + '<\\/script></body></html>';
            } else if (entryFile.name.endsWith('.json')) {
                html = '<!DOCTYPE html><html><body style="background:#1e1e1e;color:#d4d4d4;font-family:monospace;white-space:pre-wrap;padding:20px;margin:0;">' + entryFile.content + '</body></html>';
            } else if (entryFile.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
                const fontName = 'PreviewFont_' + entryFile.id.replace(/[^a-zA-Z0-9]/g, '');
                html = '<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>@font-face { font-family: "' + fontName + '"; src: url(' + entryFile.content + '); } body { background: #1e1e1e; display: flex; flex-direction: column; gap: 24px; padding: 24px; color: white; justify-content: center; align-items: center; min-height: 100vh; margin: 0; font-family: "' + fontName + '", sans-serif; } .card { background: #252526; padding: 24px; border-radius: 8px; border: 1px solid #333; width: 100%; max-width: 800px; } .label { font-family: sans-serif; font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 8px; } .text { font-size: 36px; word-break: break-all; line-height: 1.5; }</style></head><body><div class="card"><div class="label">English</div><div class="text">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>abcdefghijklmnopqrstuvwxyz<br/>0123456789 !@#$%^&*()</div></div><div class="card"><div class="label">Kurdish Sorani</div><div class="text" dir="rtl">بژی کورد و کوردستان</div></div></body></html>';
            }
            
            const interceptor = \`<script>
            document.addEventListener('click', e => { const a = e.target.closest('a'); if (a) { const href = a.getAttribute('href'); if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#') && !href.startsWith('javascript:')) { e.preventDefault(); window.parent.postMessage({ type: 'navigate', path: href }, '*'); } } });
            window.open = function(url) { window.parent.postMessage({type:'navigate', path: url}, '*'); return null; };
            
            window.exports = window.exports || {};
            window.module = window.module || { exports: window.exports };
            window.moduleCache = {};
            window.require = window.require || function(mod) {
                if (mod === "react") return window.React;
                if (mod === "react-dom" || mod === "react-dom/client" || mod === "react-dom/server") return window.ReactDOM;
                if (mod === "lucide-react" || mod === "lucide") return window.lucideReact || window.lucide;
                if (mod === "recharts") return window.Recharts;
                if (mod.startsWith(".") || mod.startsWith("/")) {
                    let cleanPath = mod;
                    if (cleanPath.startsWith("./")) cleanPath = cleanPath.slice(2);
                    let file = window.resolveFile(window.FILES, { parentId: 'root' }, mod);
                    if (!file) file = window.resolveFile(window.FILES, { parentId: 'root' }, cleanPath + ".ts") || window.resolveFile(window.FILES, { parentId: 'root' }, cleanPath + ".tsx") || window.resolveFile(window.FILES, { parentId: 'root' }, cleanPath + ".js") || window.resolveFile(window.FILES, { parentId: 'root' }, cleanPath + ".jsx");
                    if (!file) throw new Error("Module not found: " + mod);
                    if (window.moduleCache[file.id]) return window.moduleCache[file.id].exports;
                    let ext = file.name.split(".").pop().toLowerCase();
                    if (ext === "css") {
                        var style = document.createElement("style");
                        style.textContent = window.resolveCssUrls ? window.resolveCssUrls(file.content, file, window.FILES) : file.content;
                        document.head.appendChild(style);
                        return {};
                    }
                    let code = file.content;
                    if (window.Babel && (ext === "ts" || ext === "tsx" || ext === "jsx" || ext === "js")) {
                        try {
                            code = window.Babel.transform(code, {presets: ["react", "typescript", "env"], plugins: ["transform-modules-commonjs"]}).code;
                            if (window.transformJs) code = window.transformJs(code);
                        } catch(e) { console.error("Transpile error in " + file.name, e.message || e); }
                    }
                    let module = { exports: {} };
                    window.moduleCache[file.id] = module;
                    try {
                        let fn = new Function("exports", "require", "module", code + "\\n//# sourceURL=" + file.name);
                        fn(module.exports, window.require, module);
                    } catch(e) { console.error("Evaluation error in " + file.name, e); }
                    return module.exports;
                }
                return window.exports;
            };

            const oldFetch = window.fetch;
            window.fetch = async function(resource, init) {
                let urlStr = typeof resource === "string" ? resource : (resource ? resource.url : "");
                if (urlStr && !urlStr.startsWith("http") && !urlStr.startsWith("data:") && !urlStr.startsWith("blob:")) {
                    if (urlStr.startsWith("./")) urlStr = urlStr.slice(2);
                    if (window.parent && window.parent.FILES && window.parent.resolveFile) {
                        const currentFile = window.parent.FILES.find(f => f.id === window.parent.currentFileId);
                        const file = window.parent.resolveFile(window.parent.FILES, currentFile, urlStr);
                        if (file) {
                            let content = file.content || "";
                            if (file.name.endsWith(".json")) {
                                content = content.replace(/[\\\\u0660-\\\\u0669\\\\u06f0-\\\\u06f9]/g, c => c.charCodeAt(0) & 15);
                            }
                            return new Response(content, {
                                status: 200,
                                headers: { "Content-Type": file.name.endsWith(".json") ? "application/json" : "text/plain" }
                            });
                        }
                    }
                    return Promise.reject(new TypeError("Failed to execute 'fetch': Failed to parse URL from " + urlStr));
                }
                return oldFetch.apply(this, arguments);
            };
            <\\/script>\`;
            
            if (html.includes('<head>')) {
                return html.replace('<head>', '<head>' + interceptor);
            } else if (html.includes('<body>')) {
                return html.replace('<body>', '<body>' + interceptor);
            }
            return interceptor + html;
        }
        const frame = document.getElementById("app-frame");
        if (!currentFileId || !FILES.find(f => f.id === currentFileId)) { const index = FILES.find(f => f.name === "index.html"); if (index) currentFileId = index.id; else { const anyHtml = FILES.find(f => f.name.endsWith(".html")); if(anyHtml) currentFileId = anyHtml.id; } }
        function navigate(fileId) { currentFileId = fileId; window.currentFileId = fileId; frame.srcdoc = bundle(fileId); }
        window.addEventListener("message", (e) => { 
            if (e.data.type === "navigate") { 
                if (e.data.path.startsWith('http') || e.data.path.startsWith('//')) {
                    if (window.parent !== window) window.parent.postMessage(e.data, '*');
                    else window.open(e.data.path, '_blank');
                    return;
                }
                const currentFile = FILES.find(f => f.id === currentFileId); 
                const nextFile = resolveFile(FILES, currentFile, e.data.path); 
                if (nextFile) {
                    navigate(nextFile.id); 
                } else if (window.parent !== window) {
                    window.parent.postMessage(e.data, '*');
                }
            } else if (window.parent !== window) {
                // Forward console, logs, error, etc to the Studio editor
                window.parent.postMessage(e.data, '*');
            }
        });
        if (currentFileId) navigate(currentFileId); else frame.srcdoc = "<h1>No index.html found</h1>";
    </script>
</body>
</html>`;
}

function workerHandler() {
    self.onmessage = function(e: MessageEvent) {
        const { files, activeFileId, previewFileId, clearData, mode, cursorCSS } = e.data;
        if (mode === 'export') {
            const entryId = previewFileId || activeFileId;
            // @ts-ignore
            const runner = generateStandaloneRunner(files, entryId);
            self.postMessage({ type: 'exportBundle', content: runner });
            return;
        }
        // @ts-ignore
        const result = bundleProject(files, activeFileId, previewFileId, clearData, cursorCSS);
        self.postMessage(result);
    };
}

const workerBody = `
${getFileFullPath.toString()}
${resolveFile.toString()}
${transformJs.toString()}
${resolveCssUrls.toString()}
${processHtml.toString().replace(/^export\s+/, '')}
${bundleProject.toString().replace(/^export\s+/, '')}
${generateStandaloneRunner.toString().replace(/^export\s+/, '')}
(${workerHandler.toString()})();
`;

export const createPreviewWorker = (): Worker => {
  const blob = new Blob([workerBody], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
