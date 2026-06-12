import { FileSystemItem } from '../types';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

// Helper to resolve paths like "css/style.css" to the file content
export const bundleProject = (files: FileSystemItem[]): string => {
  const indexFile = files.find(f => f.name === 'index.html' && f.parentId === 'root');
  if (!indexFile || !indexFile.content) return '<h1>No index.html found in root</h1>';

  let html = indexFile.content;

  // Simple heuristic for basic relative path replacement to make preview work without a service worker
  // 1. Find CSS links
  const cssRegex = /<link\s+rel=["']stylesheet["']\s+href=["'](.+?)["']\s*\/?>/g;
  html = html.replace(cssRegex, (match, href) => {
    const file = findFileByPath(files, href);
    if (file && file.content) {
      return `<style>${file.content}</style>`;
    }
    return match;
  });

  // 2. Find JS scripts
  const jsRegex = /<script\s+src=["'](.+?)["']\s*><\/script>/g;
  html = html.replace(jsRegex, (match, src) => {
    const file = findFileByPath(files, src);
    if (file && file.content) {
      return `<script>${file.content}</script>`;
    }
    return match;
  });

  return html;
};

// Very basic path resolver "folder/file.ext"
const findFileByPath = (files: FileSystemItem[], path: string): FileSystemItem | undefined => {
  const parts = path.split('/');
  const fileName = parts.pop();
  
  // Try to find the file with the matching name
  // This is a simplified lookup that assumes unique filenames or simple structures for the demo
  // A robust system would traverse the tree properly
  return files.find(f => f.name === fileName && f.type === 'file');
};

export const downloadProjectAsZip = async (files: FileSystemItem[]) => {
  const zip = new JSZip();

  // Helper to build folder structure in zip
  const addToZip = (parentId: string | null, folder: any) => {
    const children = files.filter(f => f.parentId === parentId);
    
    children.forEach(child => {
      if (child.type === 'folder') {
        const newFolder = folder.folder(child.name);
        addToZip(child.id, newFolder);
      } else {
        if (child.content !== undefined) {
          folder.file(child.name, child.content);
        }
      }
    });
  };

  addToZip('root', zip);

  // Add python local preview server helper
  const appPyContent = `# app.py - Standalone Python Flask Local Preview Server
import os
import sys
import re
import json
import shutil
from flask import Flask, request, jsonify, send_from_directory, make_response

app = Flask(__name__)

# Server files directly from the current folder (which acts as the workspace)
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# Helper to find entry html
def get_entry_html():
    for name in ['index.html', 'main.html']:
        p = os.path.join(WORKSPACE_DIR, name)
        if os.path.exists(p):
            return p
    # Search for any html
    for root, dirs, files_list in os.walk(WORKSPACE_DIR):
        for file in files_list:
            if file.endswith('.html') and 'node_modules' not in root:
                return os.path.join(root, file)
    return None

def inject_react_babel(html_content):
    # Inject React & Babel Standalone scripts into head or body
    babel_script = """
    <!-- React & Babel Standalone Injected by Python Flask Preview Backend -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js" crossorigin></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/lucide-react@latest" crossorigin></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.8/babel.min.js" crossorigin></script>
    <script>
      window.process = { env: { NODE_ENV: 'development' } };
    </script>
    """
    
    def rewrite_script_tag(match):
        attrs = match.group(1) or ""
        src_match = re.search(r'src=["\\']([^"\\']+)["\\']', attrs)
        if src_match:
            src = src_match.group(1)
            if not src.startswith(('http://', 'https://', '//')):
                ext = src.split('.')[-1].lower() if '.' in src else ''
                if ext in ['ts', 'tsx', 'jsx', 'js']:
                    clean_attrs = re.sub(r'type=["\\']([^"\\']+)["\\']', '', attrs)
                    clean_attrs = re.sub(r'\\bmodule\\b', '', clean_attrs)
                    return f'<script {clean_attrs.strip()} type="text/babel" data-presets="react,typescript,env" data-plugins="transform-modules-commonjs"></script>'
        return match.group(0)

    html_content = re.sub(r'<script\\b([^>]*)>([\\s\\S]*?)</script>', rewrite_script_tag, html_content)
    
    if '</head>' in html_content:
        html_content = html_content.replace('</head>', f'{babel_script}</head>', 1)
    elif '<body>' in html_content:
        html_content = html_content.replace('<body>', f'<body>{babel_script}', 1)
    else:
        html_content = babel_script + html_content
        
    return html_content

@app.route('/')
@app.route('/<path:path>')
def serve_preview(path=''):
    if not path or path.endswith('/'):
        entry_html = get_entry_html()
        if not entry_html:
            return '<html><body style="background:#1e1e1e;color:#888;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><h3>No HTML entry files found. Please create an index.html.</h3></body></html>', 404
        path = os.path.relpath(entry_html, WORKSPACE_DIR)
        
    filepath = os.path.join(WORKSPACE_DIR, path)
    if not os.path.exists(filepath):
        entry_html = get_entry_html()
        if entry_html and not path.startswith('api/'):
            filepath = entry_html
            path = os.path.relpath(entry_html, WORKSPACE_DIR)
        else:
            return f'File not found: {path}', 404
            
    if filepath.endswith('.html'):
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        modified_content = inject_react_babel(content)
        response = make_response(modified_content)
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
        return response
        
    mime_type = None
    if filepath.endswith(('.ts', '.tsx', '.jsx')):
        mime_type = 'text/plain'
        
    response = make_response(send_from_directory(WORKSPACE_DIR, path, mimetype=mime_type))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Local Python Flask Preview Server on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
`;

  const readmeContent = `# Local Python Flask Preview Server

This folder contains your project files and a local Python Flask server (\`app.py\`) which allows you to run, preview, and test your project locally with full network access (resolving CORS, relative paths, cookies, and localstorage limitations).

## Requirements

Ensure you have Python and Flask installed:

\`\`\`bash
pip install flask
\`\`\`

## How to Run

1. Open your terminal in this directory.
2. Run the preview server:

\`\`\`bash
python app.py
\`\`\`

3. Open your browser and navigate to:

\`\`\`
http://localhost:5000
\`\`\`

## React Support

The Python Flask preview server automatically handles React (\`.jsx\`, \`.tsx\`, \`.ts\`) files and transpiles them on-the-fly using Babel Standalone in the browser. You don't need any complex Node.js setup!
`;

  zip.file('app.py', appPyContent);
  zip.file('README_PREVIEW.md', readmeContent);

  const content = await zip.generateAsync({ type: 'blob' });
  
  // Handle file-saver import variations to ensure compatibility
  // In some ESM environments, saveAs is the default export, in others it's a property.
  const saveAs = (FileSaver as any).saveAs || FileSaver;
  saveAs(content, 'project.zip');
};
