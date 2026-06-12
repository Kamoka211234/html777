const fs = require('fs');

let content = fs.readFileSync('utils/previewWorker.ts', 'utf8');

const injectionCode = `
  const filesJson = JSON.stringify(files.map((f: any) => ({
      id: f.id, name: f.name, type: f.type, parentId: f.parentId, content: f.content, isBinary: f.isBinary
  }))).replace(/<\\/script>/g, '<\\\\/script>');

  const entryFileJson = JSON.stringify({
      id: entryFile.id, name: entryFile.name, type: entryFile.type, parentId: entryFile.parentId
  }).replace(/<\\/script>/g, '<\\\\/script>');

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
        '            return new Response(file.content || "", { status: 200, headers: { "Content-Type": file.name.endsWith(".json") ? "application/json" : "text/plain" } });' +
        '        } else {' +
        '            return Promise.reject(new TypeError("Failed to execute \\'fetch\\' on \\'Window\\': Failed to parse URL from " + urlStr));' +
        '        }' +
        '    }' +
        '    return oldFetch.apply(this, arguments);' +
        '};' +
`;

content = content.replace(
  "  // System Script (Console Bridge & Navigation & Storage Shim)\n  const systemScript = '<script>' +\n      '(function(){' +\n        'const oldLog = console.log;' +\n        'const oldError = console.error;' +\n        'const oldWarn = console.warn;' +\n        'const oldInfo = console.info;' +",
  injectionCode.trim()
);

fs.writeFileSync('utils/previewWorker.ts', content);
