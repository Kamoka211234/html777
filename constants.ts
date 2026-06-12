
import { FileSystemItem } from './types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export interface SuggestionItem {
  label: string;
  insert: string; // $0 represents final cursor position, $1, $2 are tab stops
  type: 'tag' | 'attr' | 'keyword' | 'snippet' | 'method' | 'property';
}

const COMMON_JS = [
  { label: 'document.getElementById', insert: "document.getElementById('${1:id}')", type: 'method' },
  { label: 'document.querySelector', insert: "document.querySelector('${1:selector}')", type: 'method' },
  { label: 'document.querySelectorAll', insert: "document.querySelectorAll('${1:selector}')", type: 'method' },
  { label: 'document.createElement', insert: "document.createElement('${1:tag}')", type: 'method' },
  { label: 'addEventListener', insert: "addEventListener('${1:event}', (e) => {\n  $0\n});", type: 'method' },
  { label: 'console.log', insert: 'console.log($0);', type: 'method' },
  { label: 'console.error', insert: 'console.error($0);', type: 'method' },
  { label: 'console.warn', insert: 'console.warn($0);', type: 'method' },
  { label: 'setTimeout', insert: 'setTimeout(() => {\n  $0\n}, ${1:1000});', type: 'method' },
  { label: 'setInterval', insert: 'setInterval(() => {\n  $0\n}, ${1:1000});', type: 'method' },
  { label: 'JSON.stringify', insert: 'JSON.stringify($0)', type: 'method' },
  { label: 'JSON.parse', insert: 'JSON.parse($0)', type: 'method' },
  { label: 'localStorage.setItem', insert: "localStorage.setItem('${1:key}', ${2:value})", type: 'method' },
  { label: 'localStorage.getItem', insert: "localStorage.getItem('${1:key}')", type: 'method' },
  { label: 'fetch', insert: "fetch('${1:url}')\n  .then(res => res.json())\n  .then(data => {\n    $0\n  });", type: 'snippet' },
  { label: 'function', insert: 'function ${1:name}() {\n  $0\n}', type: 'keyword' },
  { label: 'const', insert: 'const ', type: 'keyword' },
  { label: 'let', insert: 'let ', type: 'keyword' },
  { label: 'var', insert: 'var ', type: 'keyword' },
  { label: 'if', insert: 'if ($1) {\n  $0\n}', type: 'keyword' },
  { label: 'else', insert: 'else {\n  $0\n}', type: 'keyword' },
  { label: 'for', insert: 'for (let i = 0; i < ${1:length}; i++) {\n  $0\n}', type: 'keyword' },
  { label: 'forEach', insert: 'forEach((${1:item}) => {\n  $0\n});', type: 'method' },
  { label: 'map', insert: 'map((${1:item}) => $0)', type: 'method' },
  { label: 'filter', insert: 'filter((${1:item}) => $0)', type: 'method' },
  { label: 'return', insert: 'return ', type: 'keyword' },
  { label: 'class', insert: 'class ${1:Name} {\n  constructor() {\n    $0\n  }\n}', type: 'keyword' },
  { label: 'import', insert: "import { $1 } from '$2';", type: 'keyword' },
  { label: 'export', insert: 'export const ', type: 'keyword' },
  { label: 'async', insert: 'async ', type: 'keyword' },
  { label: 'await', insert: 'await ', type: 'keyword' },
  { label: 'try', insert: 'try {\n  $0\n} catch (error) {\n  console.error(error);\n}', type: 'snippet' },
];

const COMMON_CSS = [
  { label: 'color', insert: 'color: $0;', type: 'property' },
  { label: 'background', insert: 'background: $0;', type: 'property' },
  { label: 'background-color', insert: 'background-color: $0;', type: 'property' },
  { label: 'font-size', insert: 'font-size: ${1:16}px;', type: 'property' },
  { label: 'font-weight', insert: 'font-weight: ${1:bold};', type: 'property' },
  { label: 'margin', insert: 'margin: $0;', type: 'property' },
  { label: 'margin-top', insert: 'margin-top: $0;', type: 'property' },
  { label: 'margin-bottom', insert: 'margin-bottom: $0;', type: 'property' },
  { label: 'padding', insert: 'padding: $0;', type: 'property' },
  { label: 'display', insert: 'display: flex;', type: 'property' },
  { label: 'flex-direction', insert: 'flex-direction: column;', type: 'property' },
  { label: 'justify-content', insert: 'justify-content: center;', type: 'property' },
  { label: 'align-items', insert: 'align-items: center;', type: 'property' },
  { label: 'gap', insert: 'gap: ${1:10px};', type: 'property' },
  { label: 'border', insert: 'border: 1px solid ${1:#000};', type: 'property' },
  { label: 'border-radius', insert: 'border-radius: ${1:8px};', type: 'property' },
  { label: 'width', insert: 'width: $0;', type: 'property' },
  { label: 'height', insert: 'height: $0;', type: 'property' },
  { label: 'position', insert: 'position: absolute;', type: 'property' },
  { label: 'top', insert: 'top: 0;', type: 'property' },
  { label: 'left', insert: 'left: 0;', type: 'property' },
  { label: 'z-index', insert: 'z-index: 10;', type: 'property' },
  { label: 'cursor', insert: 'cursor: pointer;', type: 'property' },
  { label: 'transition', insert: 'transition: all 0.3s ease;', type: 'property' },
  { label: 'transform', insert: 'transform: translate(-50%, -50%);', type: 'property' },
  { label: 'opacity', insert: 'opacity: 0.5;', type: 'property' },
  { label: 'box-shadow', insert: 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);', type: 'property' },
  { label: '@media', insert: '@media (max-width: ${1:768px}) {\n  $0\n}', type: 'snippet' },
  { label: '@keyframes', insert: '@keyframes ${1:anim} {\n  0% { $0 }\n  100% { }\n}', type: 'snippet' },
];

const COMMON_HTML = [
  { label: '!', insert: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${1:Document}</title>\n</head>\n<body>\n    $0\n</body>\n</html>', type: 'snippet' },
  { label: 'html:5', insert: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${1:Document}</title>\n</head>\n<body>\n    $0\n</body>\n</html>', type: 'snippet' },
  { label: 'div', insert: '<div>$0</div>', type: 'tag' },
  { label: 'div.class', insert: '<div class="${1:class}">$0</div>', type: 'snippet' },
  { label: 'div#id', insert: '<div id="${1:id}">$0</div>', type: 'snippet' },
  { label: 'span', insert: '<span>$0</span>', type: 'tag' },
  { label: 'h1', insert: '<h1>$0</h1>', type: 'tag' },
  { label: 'h2', insert: '<h2>$0</h2>', type: 'tag' },
  { label: 'h3', insert: '<h3>$0</h3>', type: 'tag' },
  { label: 'p', insert: '<p>$0</p>', type: 'tag' },
  { label: 'a', insert: '<a href="${1:#}">$0</a>', type: 'tag' },
  { label: 'button', insert: '<button>$0</button>', type: 'tag' },
  { label: 'input', insert: '<input type="text" placeholder="${1:placeholder}">', type: 'tag' },
  { label: 'form', insert: '<form action="">\n  $0\n</form>', type: 'tag' },
  { label: 'img', insert: '<img src="${1:src}" alt="${2:alt}">', type: 'tag' },
  { label: 'ul', insert: '<ul>\n  <li>$0</li>\n</ul>', type: 'tag' },
  { label: 'ol', insert: '<ol>\n  <li>$0</li>\n</ol>', type: 'tag' },
  { label: 'li', insert: '<li>$0</li>', type: 'tag' },
  { label: 'table', insert: '<table>\n  <thead>\n    <tr>\n      <th>$1</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>$0</td>\n    </tr>\n  </tbody>\n</table>', type: 'tag' },
  { label: 'script:src', insert: '<script src="${1:script.js}"></script>', type: 'snippet' },
  { label: 'link:css', insert: '<link rel="stylesheet" href="${1:style.css}">', type: 'snippet' },
  { label: 'style', insert: '<style>\n  $0\n</style>', type: 'tag' },
  { label: 'script', insert: '<script>\n  $0\n</script>', type: 'tag' },
  { label: 'class', insert: 'class="$0"', type: 'attr' },
  { label: 'id', insert: 'id="$0"', type: 'attr' },
  { label: 'style', insert: 'style="$0"', type: 'attr' },
  { label: 'src', insert: 'src="$0"', type: 'attr' },
  { label: 'href', insert: 'href="$0"', type: 'attr' },
  { label: 'placeholder', insert: 'placeholder="$0"', type: 'attr' },
  { label: 'type', insert: 'type="$0"', type: 'attr' },
];

export const SUGGESTIONS = {
    JS: COMMON_JS as SuggestionItem[],
    CSS: COMMON_CSS as SuggestionItem[],
    HTML: COMMON_HTML as SuggestionItem[]
};

export const DEFAULT_FILES: FileSystemItem[] = [
  {
    id: 'root',
    name: 'root',
    type: 'folder',
    parentId: null,
    depth: 0,
    isOpen: true
  },
  {
    id: 'index-html',
    name: 'index.html',
    type: 'file',
    parentId: 'root',
    depth: 1,
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Store Search</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header class="search-header">
            <h1>Store Finder</h1>
            <div class="search-bar">
                <input type="text" id="searchInput" placeholder="Search for products..." />
                <button id="searchBtn" class="button">Search</button>
            </div>
        </header>
        
        <div class="grid">
            <!-- 12 Sample Items -->
            <div class="card">
                <div class="icon">🍎</div>
                <h3>Apple</h3>
            </div>
            <div class="card">
                <div class="icon">🍌</div>
                <h3>Banana</h3>
            </div>
            <div class="card">
                <div class="icon">🍇</div>
                <h3>Grapes</h3>
            </div>
            <div class="card">
                <div class="icon">🍊</div>
                <h3>Orange</h3>
            </div>
            <div class="card">
                <div class="icon">🍓</div>
                <h3>Strawberry</h3>
            </div>
            <div class="card">
                <div class="icon">🍍</div>
                <h3>Pineapple</h3>
            </div>
            <div class="card">
                <div class="icon">🥝</div>
                <h3>Kiwi</h3>
            </div>
            <div class="card">
                <div class="icon">🍉</div>
                <h3>Watermelon</h3>
            </div>
            <div class="card">
                <div class="icon">🥭</div>
                <h3>Mango</h3>
            </div>
            <div class="card">
                <div class="icon">🍑</div>
                <h3>Peach</h3>
            </div>
            <div class="card">
                <div class="icon">🍒</div>
                <h3>Cherry</h3>
            </div>
            <div class="card">
                <div class="icon">🍋</div>
                <h3>Lemon</h3>
            </div>
        </div>
    </div>
    <script src="logic.js"></script>
</body>
</html>`
  },
  {
    id: 'search-html',
    name: 'search.html',
    type: 'file',
    parentId: 'root',
    depth: 1,
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search Results</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container center-view">
        <h1 class="fade-in">Search Results</h1>
        <p class="fade-in delay">You searched for:</p>
        <h2 id="resultText" class="highlight scale-in">...</h2>
        <button id="backBtn" class="primary-btn fade-in delay button">Back to Store</button>
    </div>
    <script src="logic.js"></script>
</body>
</html>`
  },
  {
    id: 'logic-js',
    name: 'logic.js',
    type: 'file',
    parentId: 'root',
    depth: 1,
    content: `document.addEventListener('DOMContentLoaded', () => {
    
    // --- Index Page Logic ---
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const cards = document.querySelectorAll('.card');

    if (searchBtn && searchInput) {
        
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (!query) return alert("Please enter a search term!");
            
            // Save query to mimic URL params since we are in a static preview
            localStorage.setItem('lastSearchQuery', query);
            
            // Navigate with visual query param (App handles this by cleaning URL)
            window.location.href = 'search.html?q=' + encodeURIComponent(query);
        };

        searchBtn.addEventListener('click', performSearch);
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        // Click on item to auto-fill
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const text = card.querySelector('h3').innerText;
                searchInput.value = text;
                performSearch();
            });
        });
    }

    // --- Search Page Logic ---
    const resultText = document.getElementById('resultText');
    const backBtn = document.getElementById('backBtn');

    if (resultText) {
        const query = localStorage.getItem('lastSearchQuery');
        if (query) {
            resultText.innerText = query;
            console.log("Current simulated route: search/" + query);
        } else {
            resultText.innerText = "Unknown";
        }
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});`
  },
  {
    id: 'style-css',
    name: 'style.css',
    type: 'file',
    parentId: 'root',
    depth: 1,
    content: `body {
    background-color: #121212;
    color: #e0e0e0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    min-height: 100vh;
}

.container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
}

/* Header & Search */
.search-header {
    text-align: center;
    margin-bottom: 3rem;
}

.search-bar {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 1.5rem;
}

input {
    padding: 12px 20px;
    width: 300px;
    border-radius: 50px;
    border: 1px solid #333;
    background: #1e1e1e;
    color: white;
    font-size: 1rem;
    outline: none;
    transition: all 0.3s;
}

input:focus {
    border-color: #007acc;
    box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
    width: 320px;
}

button {
    padding: 12px 24px;
    border-radius: 50px;
    border: none;
    background: #007acc;
    color: white;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.1s, background 0.2s;
}

button:hover {
    background: #005fa3;
}

button:active {
    transform: scale(0.95);
}

/* Button Ripple Effect */
.button {
    position: relative;
    overflow: hidden;
}

.button::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
}

.button:active::after {
    animation: ripple 0.6s ease-out;
}

@keyframes ripple {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.5;
    }
    100% {
        transform: translate(-50%, -50%) scale(15);
        opacity: 0;
    }
}

/* Grid Layout */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 20px;
}

.card {
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 16px;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
}

.card:hover {
    transform: translateY(-8px);
    background: #252526;
    border-color: #007acc;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
}

.icon {
    font-size: 3rem;
    margin-bottom: 10px;
}

.card h3 {
    margin: 0;
    font-size: 1rem;
    color: #ccc;
}

/* Search Result Page */
.center-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 80vh;
    text-align: center;
}

.highlight {
    color: #007acc;
    font-size: 3.5rem;
    margin: 1rem 0 2rem 0;
    text-shadow: 0 0 20px rgba(0, 122, 204, 0.3);
}

/* Animations */
.fade-in {
    animation: fadeIn 0.8s ease-out forwards;
    opacity: 0;
}

.scale-in {
    animation: scaleIn 0.5s ease-out forwards;
    opacity: 0;
    transform: scale(0.5);
}

.delay {
    animation-delay: 0.2s;
}

@keyframes fadeIn {
    to { opacity: 1; }
}

@keyframes scaleIn {
    to { opacity: 1; transform: scale(1); }
}`
  }
];
