const workerCode = `
self.onmessage = function(e) {
    const code = e.data;
    try {
        const result = obfuscateCode(code);
        self.postMessage({ success: true, result });
    } catch (err) {
        self.postMessage({ success: false, error: err.message });
    }
};

const obfuscateCode = (code) => {
    try {
        let processed = code;

        // --- 1. Strip comments safely ---
        processed = processed.replace(/\\/\\*[\\s\\S]*?\\*\\/|([^\\\\:]|^)\\/\\/.*$/gm, '$1');

        // --- 2. String Extraction & Safe Encryption ---
        const stringArray = [];
        const stringMap = new Map();
        
        const arrayName = '_0x' + Math.random().toString(16).slice(2, 6);
        const decoderName = '_0x' + Math.random().toString(16).slice(2, 8);
        const rotationValue = Math.floor(Math.random() * 100) + 50;
        
        const encode = (str) => {
            try {
                return btoa(unescape(encodeURIComponent(str)));
            } catch(e) {
                return str;
            }
        };

        // Encrypt string literals safely (excluding prop lookups)
        processed = processed.replace(/(['"])(.*?)\\1/g, (match, quote, content) => {
            if (content.length < 1 || content.startsWith('use strict')) return match;
            
            let index;
            if (stringMap.has(content)) {
                index = stringMap.get(content);
            } else {
                index = stringArray.length;
                stringArray.push(encode(content));
                stringMap.set(content, index);
            }
            
            const rotatedIndex = index + rotationValue;
            return decoderName + "(0x" + rotatedIndex.toString(16) + ")";
        });

        // --- 3. Number to Hex Conversion ---
        processed = processed.replace(/\\b(\\d+)\\b/g, (match, num) => {
            const parsed = parseInt(num, 10);
            if (parsed > 10 && parsed < 100000) {
                return '0x' + parsed.toString(16);
            }
            return match;
        });

        const decoderScript = \`
        const \${arrayName} = \${JSON.stringify(stringArray)};
        (function(_0x1, _0x2){const _0x3 = function(_0x4){while(--_0x4){_0x1['push'](_0x1['shift']());}};_0x3(++_0x2);}(\${arrayName}, 0x\${(rotationValue % stringArray.length || 1).toString(16)}));
        function \${decoderName}(_0x1){
            _0x1 = _0x1 - \${rotationValue};
            const _0x2 = \${arrayName}[_0x1];
            try {
                return decodeURIComponent(escape(atob(_0x2)));
            } catch(e) {
                return _0x2;
            }
        }
        \`;

        const deadCode = "const _0xdead = function(){if(0x1 > 0x2){return 'dead';}else{return 0x42;}};_0xdead();";

        let result = decoderScript + deadCode + processed;

        // --- 5. Clean Spaces and Minify safely ---
        result = result.replace(/\\s+/g, ' ');

        return result.trim();
    } catch (e) {
        return '/* Obfuscation Failed: ' + e + ' */\\n' + code;
    }
};
`;

export const createObfuscatorWorker = (): Worker => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
