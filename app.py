# app.py - Standalone Python Flask Local Preview Server (NO CDN CALLS)
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
    # NO EXTERNAL CDN CALLS - Uses pure JavaScript inline
    # This provides React-like functionality without any network requests
    
    inline_react = """
    <!-- No CDN - Pure inline JavaScript for preview -->
    <script>
    // Simple React-like implementation (no external calls)
    window.React = {
      createElement: function(type, props, ...children) {
        return { type, props: props || {}, children: children.flat() };
      }
    };
    
    window.ReactDOM = {
      render: function(element, container) {
        function renderElement(el) {
          if (typeof el === 'string' || typeof el === 'number') {
            return document.createTextNode(String(el));
          }
          if (Array.isArray(el)) {
            const fragment = document.createDocumentFragment();
            el.forEach(item => fragment.appendChild(renderElement(item)));
            return fragment;
          }
          const domElement = document.createElement(el.type);
          if (el.props) {
            for (let [key, value] of Object.entries(el.props)) {
              if (key === 'className') {
                domElement.className = value;
              } else if (key === 'style' && typeof value === 'object') {
                Object.assign(domElement.style, value);
              } else if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.substring(2).toLowerCase();
                domElement.addEventListener(eventName, value);
              } else if (key === 'dangerouslySetInnerHTML') {
                domElement.innerHTML = value.__html;
              } else {
                domElement.setAttribute(key, value);
              }
            }
          }
          if (el.children) {
            el.children.forEach(child => {
              domElement.appendChild(renderElement(child));
            });
          }
          return domElement;
        }
        const rendered = renderElement(element);
        container.innerHTML = '';
        container.appendChild(rendered);
      }
    };
    
    // JSX-like helper
    window.h = window.React.createElement;
    </script>
    """
    
    # Add simple Babel-like JSX transformer (no network)
    jsx_transformer = """
    <script>
    // Simple JSX transformer for basic components (no external babel)
    function transformJSX(code) {
      // Convert <div className="x"> to React.createElement
      code = code.replace(/<(\w+)([^>]*)>([\\s\\S]*?)<\\/\\1>/g, function(match, tag, attrs, content) {
        let props = {};
        const attrRegex = /(\\w+)=["']([^"']*)["']/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
          props[attrMatch[1]] = attrMatch[2];
        }
        if (props.className) {
          props.className = props.className;
        }
        const propsStr = JSON.stringify(props);
        return `React.createElement('${tag}', ${propsStr}, ${content.trim()})`;
      });
      return code;
    }
    
    // Auto-execute scripts with type="text/babel"
    setTimeout(() => {
      document.querySelectorAll('script[type="text/babel"]').forEach(script => {
        try {
          const code = transformJSX(script.textContent);
          const func = new Function('React', 'ReactDOM', code);
          func(window.React, window.ReactDOM);
        } catch(e) {
          console.error('JSX transform error:', e);
        }
      });
    }, 100);
    </script>
    """
    
    # Inject everything into HTML
    if '</head>' in html_content:
        html_content = html_content.replace('</head>', f'{inline_react}{jsx_transformer}</head>', 1)
    elif '<body>' in html_content:
        html_content = html_content.replace('<body>', f'<body>{inline_react}{jsx_transformer}', 1)
    else:
        html_content = inline_react + jsx_transformer + html_content
        
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
        
    # Serve TypeScript/TSX/JSX files with proper text/plain mime types
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
    print("✓ NO external CDN calls - Fully offline capable")
    app.run(host='0.0.0.0', port=port, debug=True)