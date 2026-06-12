export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'id' | 'selector';
  line: number;
  content: string; // The full block of code
  fileId?: string;
  fileName?: string;
}

// Helper to find the matching closing brace
const findBlockEnd = (lines: string[], startLine: number): number => {
  let braceCount = 0;
  let foundStart = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const openMatches = (line.match(/{/g) || []).length;
    const closeMatches = (line.match(/}/g) || []).length;

    if (openMatches > 0) foundStart = true;
    
    braceCount += openMatches;
    braceCount -= closeMatches;

    if (foundStart && braceCount === 0) {
      return i;
    }
  }
  return startLine; // Fallback if no block found
};

export const extractSymbols = (code: string, language: string): CodeSymbol[] => {
  const lines = code.split('\n');
  const symbols: CodeSymbol[] = [];

  lines.forEach((line, index) => {
    let match;
    
    // JS Functions (Standard, Async, Exported)
    if ((match = line.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)/))) {
       const endLine = findBlockEnd(lines, index);
       const content = lines.slice(index, endLine + 1).join('\n');
       symbols.push({ name: match[1], type: 'function', line: index, content });
    }
    // Arrow Functions (const name = ... =>)
    else if ((match = line.match(/(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(?.*?\)?\s*=>/))) {
       const endLine = findBlockEnd(lines, index);
       const content = lines.slice(index, endLine + 1).join('\n');
       symbols.push({ name: match[1], type: 'function', line: index, content });
    }
    // JS Classes
    else if ((match = line.match(/(?:export\s+)?class\s+([a-zA-Z0-9_]+)/))) {
       const endLine = findBlockEnd(lines, index);
       const content = lines.slice(index, endLine + 1).join('\n');
       symbols.push({ name: match[1], type: 'class', line: index, content });
    }
    // TypeScript Interfaces
    else if ((match = line.match(/(?:export\s+)?interface\s+([a-zA-Z0-9_]+)/))) {
       const endLine = findBlockEnd(lines, index);
       const content = lines.slice(index, endLine + 1).join('\n');
       symbols.push({ name: match[1], type: 'class', line: index, content });
    }
    // TypeScript Types
    else if ((match = line.match(/(?:export\s+)?type\s+([a-zA-Z0-9_]+)\s*=/))) {
       const endLine = findBlockEnd(lines, index);
       const content = lines.slice(index, endLine + 1).join('\n');
       symbols.push({ name: match[1], type: 'class', line: index, content });
    }
    // CSS IDs
    else if (language === 'css' && (match = line.match(/(#[a-zA-Z0-9_-]+)\s*{/))) {
       const endLine = findBlockEnd(lines, index);
       const content = lines.slice(index, endLine + 1).join('\n');
       symbols.push({ name: match[1], type: 'id', line: index, content });
    }
    // CSS Classes (Selectors)
    else if (language === 'css' && (match = line.match(/(\.[a-zA-Z0-9_-]+)\s*{/))) {
       const endLine = findBlockEnd(lines, index);
       const content = lines.slice(index, endLine + 1).join('\n');
       symbols.push({ name: match[1], type: 'selector', line: index, content });
    }
  });

  return symbols;
};
