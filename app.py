# app.py - Standalone Python Flask Local Preview Server
import os
import sys
import re
import json
import shutil
from flask import Flask, request, jsonify, send_from_directory, make_response

app = Flask(__name__, static_folder=None)
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'workspace'))

# Cache files in-memory as well as on disk
PROJECT_FILES = []

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

@app.route('/api/preview/update', methods=['POST', 'OPTIONS'])
def update_preview():
    if request.method == 'OPTIONS':
        return '', 200
        
    global PROJECT_FILES
    data = request.json
    if not data or 'files' not in data:
        return jsonify({'error': 'No files provided'}), 400
        
    PROJECT_FILES = data['files']
    
    # Write to local workspace directory
    if os.path.exists(WORKSPACE_DIR):
        try:
            shutil.rmtree(WORKSPACE_DIR)
        except Exception as e:
            print(f"Error clearing workspace: {e}")
            
    os.makedirs(WORKSPACE_DIR, exist_ok=True)
    
    for f in PROJECT_FILES:
        if f.get('type') == 'folder':
            continue
        # Get full path relative to workspace
        full_path = f.get('fullPath', f.get('name', ''))
        if not full_path:
            continue
            
        # Clean leading slash if any
        if full_path.startswith('/'):
            full_path = full_path[1:]
            
        target_path = os.path.join(WORKSPACE_DIR, full_path)
        # Create parent directories if needed
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        content = f.get('content', '')
        is_binary = f.get('isBinary', False)
        
        try:
            if is_binary and isinstance(content, str) and content.startswith('data:'):
                # decode base64 binary content
                import base64
                header, encoded = content.split(',', 1)
                file_bytes = base64.b64decode(encoded)
                with open(target_path, 'wb') as file_out:
                    file_out.write(file_bytes)
            else:
                if isinstance(content, bytes):
                    with open(target_path, 'wb') as file_out:
                        file_out.write(content)
                else:
                    with open(target_path, 'w', encoding='utf-8') as file_out:
                        file_out.write(content)
        except Exception as e:
            print(f"Failed to write file {full_path}: {e}")
            
    return jsonify({'status': 'success', 'count': len(PROJECT_FILES)}), 200

# Helper to find entry html
def get_entry_html():
    for name in ['index.html', 'main.html']:
        p = os.path.join(WORKSPACE_DIR, name)
        if os.path.exists(p):
            return p
    # Search for any html
    for root, dirs, files in os.walk(WORKSPACE_DIR):
        for file in files:
            if file.endswith('.html'):
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
      // Configure Babel Standalone to support module resolving or direct imports
      window.process = { env: { NODE_ENV: 'development' } };
    </script>
    """
    
    # Rewrite any script tags pointing to JSX, TSX, TS, JS to be loaded as text/babel
    # For example: <script src="index.tsx"></script> -> <script type="text/babel" data-presets="react,typescript,env" src="index.tsx"></script>
    # Match script with src ending in .ts, .tsx, .jsx, .js
    def rewrite_script_tag(match):
        attrs = match.group(1) or ""
        src_match = re.search(r'src=["\']([^"\']+)["\']', attrs)
        if src_match:
            src = src_match.group(1)
            # Only rewrite local files (not remote cdns)
            if not src.startswith(('http://', 'https://', '//')):
                # Check extension
                ext = src.split('.')[-1].lower() if '.' in src else ''
                if ext in ['ts', 'tsx', 'jsx', 'js']:
                    # Reconstruct script tag as text/babel
                    clean_attrs = re.sub(r'type=["\']([^"\']+)["\']', '', attrs)
                    clean_attrs = re.sub(r'\bmodule\b', '', clean_attrs)
                    return f'<script {clean_attrs.strip()} type="text/babel" data-presets="react,typescript,env" data-plugins="transform-modules-commonjs"></script>'
        return match.group(0)

    html_content = re.sub(r'<script\b([^>]*)>([\s\S]*?)</script>', rewrite_script_tag, html_content)
    
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
    if not os.path.exists(WORKSPACE_DIR):
        return '<html><body style="background:#1e1e1e;color:#888;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><h3>No files in workspace yet. Please run preview in IDE first.</h3></body></html>', 404
        
    if not path or path.endswith('/'):
        # Try to serve entry html
        entry_html = get_entry_html()
        if not entry_html:
            return '<html><body style="background:#1e1e1e;color:#888;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><h3>No HTML entry files found. Please create an index.html.</h3></body></html>', 404
        path = os.path.relpath(entry_html, WORKSPACE_DIR)
        
    filepath = os.path.join(WORKSPACE_DIR, path)
    if not os.path.exists(filepath):
        # Fallback to serve index.html for SPA client routing if file doesn't exist
        entry_html = get_entry_html()
        if entry_html and not path.startswith('api/'):
            filepath = entry_html
            path = os.path.relpath(entry_html, WORKSPACE_DIR)
        else:
            return f'File not found: {path}', 404
            
    # Serve file
    if filepath.endswith('.html'):
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        # Inject React and Babel Standalone
        modified_content = inject_react_babel(content)
        response = make_response(modified_content)
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
        return response
        
    # Serve TypeScript/TSX/JSX files with proper text/plain mime types so Babel standalone can fetch them
    mime_type = None
    if filepath.endswith(('.ts', '.tsx', '.jsx')):
        mime_type = 'text/plain'
        
    response = make_response(send_from_directory(WORKSPACE_DIR, path, mimetype=mime_type))
    # Disable caching for preview files so updates show immediately
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Local Python Flask Preview Backend on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
