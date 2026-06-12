// This file contains the worker source code as a string to be blobbed.

const workerCode = `
self.onmessage = function(e) {
  const { files, mode } = e.data;
  
  if (mode === 'parseAll') {
      const allSymbols = [];
      files.forEach(file => {
          if (file.type === 'file' && file.content && !file.isBinary) {
              const fileExt = file.name.split('.').pop();
              
              // JS/TS Functions (Standard, Async, Exported)
              const functionRegex = /(?:export\\s+)?(?:async\\s+)?function\\s+([a-zA-Z0-9_]+)/g;
              let match;
              while ((match = functionRegex.exec(file.content)) !== null) {
                  allSymbols.push({
                      fileId: file.id,
                      fileName: file.name,
                      name: match[1],
                      type: 'function',
                      line: getLineNumber(file.content, match.index),
                      content: match[0]
                  });
              }

              // Arrow Functions (const name = ... =>)
              const arrowRegex = /(?:export\\s+)?(?:const|let|var)\\s+([a-zA-Z0-9_]+)\\s*=\\s*(?:async\\s*)?\\(?.*?\\)?\\s*=>/g;
              while ((match = arrowRegex.exec(file.content)) !== null) {
                  allSymbols.push({
                      fileId: file.id,
                      fileName: file.name,
                      name: match[1],
                      type: 'function',
                      line: getLineNumber(file.content, match.index),
                      content: match[0]
                  });
              }
              
              // JS/TS Classes
              const classRegex = /(?:export\\s+)?class\\s+([a-zA-Z0-9_]+)/g;
              while ((match = classRegex.exec(file.content)) !== null) {
                   allSymbols.push({
                      fileId: file.id,
                      fileName: file.name,
                      name: match[1],
                      type: 'class',
                      line: getLineNumber(file.content, match.index),
                      content: match[0]
                  });
              }

              // TS Interfaces
              const interfaceRegex = /(?:export\\s+)?interface\\s+([a-zA-Z0-9_]+)/g;
              while ((match = interfaceRegex.exec(file.content)) !== null) {
                   allSymbols.push({
                      fileId: file.id,
                      fileName: file.name,
                      name: match[1],
                      type: 'class',
                      line: getLineNumber(file.content, match.index),
                      content: match[0]
                  });
              }

              // TS Types
              const typeRegex = /(?:export\\s+)?type\\s+([a-zA-Z0-9_]+)\\s*=/g;
              while ((match = typeRegex.exec(file.content)) !== null) {
                   allSymbols.push({
                      fileId: file.id,
                      fileName: file.name,
                      name: match[1],
                      type: 'class',
                      line: getLineNumber(file.content, match.index),
                      content: match[0]
                  });
              }

              // Extract IDs (CSS/HTML)
              if (fileExt === 'css' || fileExt === 'html') {
                  const idRegex = /(#[a-zA-Z0-9_-]+)\\s*{/g;
                  while ((match = idRegex.exec(file.content)) !== null) {
                       allSymbols.push({
                          fileId: file.id,
                          fileName: file.name,
                          name: match[1],
                          type: 'id',
                          line: getLineNumber(file.content, match.index),
                          content: match[0]
                      });
                  }

                  const classSelectorRegex = /(\\.[a-zA-Z0-9_-]+)\\s*{/g;
                  while ((match = classSelectorRegex.exec(file.content)) !== null) {
                       allSymbols.push({
                          fileId: file.id,
                          fileName: file.name,
                          name: match[1],
                          type: 'selector',
                          line: getLineNumber(file.content, match.index),
                          content: match[0]
                      });
                  }
              }
          }
      });
      self.postMessage(allSymbols);
  }
};

function getLineNumber(content, index) {
    return content.substring(0, index).split('\\n').length - 1;
}
`;

export const createSymbolWorker = (): Worker => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
