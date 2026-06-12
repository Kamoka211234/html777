import { generateStandaloneRunner } from './utils/previewWorker.ts';

const files = [
    { id: '1', name: 'style.css', content: 'body { color: red; }', parentId: 'root', type: 'file' },
    { id: '2', name: 'script.js', content: 'console.log("hello");', parentId: 'root', type: 'file' },
    { id: '3', name: 'image.svg', content: '<svg></svg>', isBinary: false, parentId: 'root', type: 'file' },
    { id: '4', name: 'index.html', content: `<!DOCTYPE html><html><head><link rel="stylesheet" href="style.css"><script src="script.js"></script></head><body><img src="image.svg"></body></html>`, parentId: 'root', type: 'file' }
];

console.log(generateStandaloneRunner(files, '4'));
