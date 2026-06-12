const htmlString = `
<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="style.css">
<script src="script.js"></script>
</head>
<body>
<img src="image.svg">
</body>
</html>
`;

let html = htmlString;
const FILES = [
    { id: '1', name: 'style.css', content: 'body { color: red; }', parentId: 'root' },
    { id: '2', name: 'script.js', content: 'console.log("hello");', parentId: 'root' },
    { id: '3', name: 'image.svg', content: '<svg></svg>', isBinary: false, parentId: 'root' },
    { id: '4', name: 'index.html', content: htmlString, parentId: 'root' }
];

function resolveFile(files, currentFile, pathStr) {
    return files.find(f => f.name === pathStr);
}

const entryFile = FILES[3];
const replaceResource = (path) => resolveFile(FILES, entryFile, path);
function resolveCssUrls(content) { return content; }
function transformJs(content) { return content; }

html = html.replace(/<link\s+[^>]*>/gi, (match) => { 
    if (!match.match(/rel=["']stylesheet["']/i)) return match; 
    const hrefMatch = match.match(/href=["'](.+?)["']/i); 
    if (hrefMatch && !hrefMatch[1].includes('://')) { 
        const file = replaceResource(hrefMatch[1]); 
        if (file && file.content) { 
            const cssContent = resolveCssUrls(file.content, file, FILES); 
            return '<style>' + cssContent + '</style>'; 
        } 
    } 
    return match; 
});

html = html.replace(/<script(\s[^>]*)?src=["'](.+?)["']([^>]*)>\s*<\/script>/gi, (match, attrs1, src, attrs2) => { 
    const a1 = attrs1 || ''; const a2 = attrs2 || '';
    if (!src.includes('://')) { 
        const file = replaceResource(src); 
        if (file && file.content) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            let typeAttr = '';
            if (ext === 'ts' || ext === 'tsx' || ext === 'jsx') typeAttr = ' type="text/babel" data-presets="react,typescript"';
            return '<script' + a1 + a2 + typeAttr + '>' + transformJs(file.content) + '\n//# sourceURL=' + file.name + '\n<\/script>'; 
        }
    } 
    return match; 
});

console.log(html);
