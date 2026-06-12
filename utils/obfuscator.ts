
export const obfuscateCode = (code: string): string => {
    try {
        let processed = code;

        // --- 1. String Extraction & Encryption ---
        const stringArray: string[] = [];
        const stringMap = new Map<string, number>();
        
        const arrayName = `_0x${Math.random().toString(16).slice(2, 6)}`;
        const decoderName = `_0x${Math.random().toString(16).slice(2, 8)}`;
        const rotationValue = Math.floor(Math.random() * 100) + 50;
        
        // Helper to encode strings
        const encode = (str: string) => {
            try {
                return btoa(unescape(encodeURIComponent(str)));
            } catch(e) {
                return str;
            }
        };

        // Replace member expressions: obj.prop -> obj['prop']
        // This allows them to be caught by the string obfuscator
        processed = processed.replace(/\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, prop) => {
            // Avoid keywords and common properties that might break if obfuscated
            const reserved = ['length', 'prototype', 'call', 'apply', 'bind', 'map', 'filter', 'reduce', 'forEach'];
            if (reserved.includes(prop)) return match;
            return `['${prop}']`;
        });

        // Replace strings with decoder calls
        processed = processed.replace(/(['"])(.*?)\1/g, (match, quote, content) => {
            if (content.length < 1) return match;
            
            let index: number;
            if (stringMap.has(content)) {
                index = stringMap.get(content)!;
            } else {
                index = stringArray.length;
                stringArray.push(encode(content));
                stringMap.set(content, index);
            }
            
            // Use rotated index
            const rotatedIndex = index + rotationValue;
            return `${decoderName}(0x${rotatedIndex.toString(16)})`;
        });

        // --- 2. Variable Renaming ---
        const varMap = new Map<string, string>();
        let varCounter = 0;
        
        const generateVarName = () => {
            varCounter++;
            return `_0x${varCounter.toString(16).padStart(4, '0')}`;
        };

        // Find variable declarations (var, let, const, function, class)
        const varRegex = /\b(var|let|const|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        processed = processed.replace(varRegex, (match, type, name) => {
            // Don't rename common or global-looking names
            if (name.length < 3 || name.startsWith('on') || ['App', 'React', 'useState', 'useEffect'].includes(name)) return match;
            if (!varMap.has(name)) {
                varMap.set(name, generateVarName());
            }
            return `${type} ${varMap.get(name)}`;
        });

        const sortedVars = Array.from(varMap.keys()).sort((a, b) => b.length - a.length);
        sortedVars.forEach(oldName => {
             const newName = varMap.get(oldName);
             const regex = new RegExp(`\\b${oldName}\\b`, 'g');
             processed = processed.replace(regex, newName!);
        });

        // --- 3. Number to Hex ---
        processed = processed.replace(/\b(\d+)\b/g, (match, num) => {
            if (parseInt(num) > 10) {
                return `0x${parseInt(num).toString(16)}`;
            }
            return match;
        });

        // --- 4. Construct the Payload ---
        
        // Self-defending: checks if the code is beautified
        const selfDefending = `(function(){const _0x1=function(){const _0x2=new RegExp('\\\\w+ \\\\(\\\\)\\\\s*{\\\\s*\\\\w+ [\\\\\'|\\\\"].+[\\\\\'|\\\\"]+;?}\\\\s*');return _0x2['test'](_0x1['toString']());};if(!_0x1()){while(true){}}})();`;

        // Rotated string array
        const rotatedArray = [...stringArray];
        // We don't actually rotate the array physically here to keep it simple, 
        // but the decoder handles the offset.

        const decoderScript = `
        const ${arrayName} = ${JSON.stringify(rotatedArray)};
        (function(_0x1, _0x2){const _0x3 = function(_0x4){while(--_0x4){_0x1['push'](_0x1['shift']());}};_0x3(++_0x2);}(${arrayName}, 0x${(rotationValue % stringArray.length || 1).toString(16)}));
        function ${decoderName}(_0x1){
            _0x1 = _0x1 - ${rotationValue};
            const _0x2 = ${arrayName}[_0x1];
            try {
                return decodeURIComponent(escape(atob(_0x2)));
            } catch(e) {
                return _0x2;
            }
        }
        `;

        // Dead code injection
        const deadCode = `const _0xdead = function(){if(0x1 > 0x2){console.log('dead');}else{return 0x42;}};_0xdead();`;

        // Combine
        let result = selfDefending + decoderScript + deadCode + processed;

        // --- 5. Minification ---
        result = result.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        result = result.replace(/\s+/g, ' ');
        result = result.replace(/\s?([=+\-*/{}();,<>:|&])\s?/g, '$1');

        return result.trim();
    } catch (e) {
        return `/* Obfuscation Failed: ${e} */\n` + code;
    }
};
