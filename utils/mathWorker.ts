
const workerCode = `
// Handles Heavy Math and Stats to keep Main Thread at 60fps

self.onmessage = function(e) {
    const { type, data, id } = e.data;

    if (type === 'stats') {
        const files = data;
        let count = 0;
        let lineCount = 0;
        let wordCount = 0;
        
        if (Array.isArray(files)) {
            // Process in chunks to avoid freezing even the worker
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                if (f.content && typeof f.content === 'string' && !f.isBinary) {
                    count += f.content.length;
                    lineCount += f.content.split('\\n').length;
                    wordCount += f.content.trim().split(/\\s+/).length;
                }
            }
        }
        
        self.postMessage({ 
            id, 
            type: 'stats_result', 
            result: { chars: count, lines: lineCount, words: wordCount } 
        });
    }
    else if (type === 'heavy_math') {
        // Example of offloading complex logic
        const { value } = data;
        // Simulate heavy work
        let result = 0;
        for(let i=0; i<1000000; i++) {
            result += Math.sqrt(i * value);
        }
        self.postMessage({ id, type: 'math_result', result });
    }
};
`;

export const createMathWorker = (): Worker => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
