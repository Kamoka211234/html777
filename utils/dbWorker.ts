
const workerCode = `
// This worker handles all IndexedDB operations to prevent UI freezing
const DB_NAME = 'VS_HTML5_Studio_DB_V2';
const DB_VERSION = 3;

// Helper to generate IDs inside the worker
const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_FILES = [
  { id: 'root', name: 'root', type: 'folder', parentId: null, depth: 0, isOpen: true },
  { id: 'index', name: 'index.html', type: 'file', parentId: 'root', depth: 1, content: \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebGPU Example</title>
    <style>
        body { margin: 0; overflow: hidden; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; color: white; font-family: sans-serif; }
        canvas { width: 100%; height: 100%; }
        #error { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
    </style>
</head>
<body>
    <canvas id="gpuCanvas"></canvas>
    <div id="error" style="display: none;">
        <h2>WebGPU not supported</h2>
        <p>Your browser does not support WebGPU or it is not enabled.</p>
    </div>
    <script src="main.js"></script>
</body>
</html>\` },
  { id: 'main', name: 'main.js', type: 'file', parentId: 'root', depth: 1, content: \`async function initWebGPU() {
    if (!navigator.gpu) {
        document.getElementById('error').style.display = 'block';
        document.getElementById('gpuCanvas').style.display = 'none';
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        document.getElementById('error').style.display = 'block';
        document.getElementById('gpuCanvas').style.display = 'none';
        return;
    }

    const device = await adapter.requestDevice();
    const canvas = document.getElementById('gpuCanvas');
    const context = canvas.getContext('webgpu');

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
        alphaMode: 'premultiplied',
    });

    const shaderCode = \\\`
        @vertex
        fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> @builtin(position) vec4<f32> {
            let x = f32(1 - i32(in_vertex_index)) * 0.5;
            let y = f32(i32(in_vertex_index & 1u) * 2 - 1) * 0.5;
            return vec4<f32>(x, y, 0.0, 1.0);
        }

        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
            return vec4<f32>(1.0, 0.0, 0.0, 1.0);
        }
    \\\`;

    const shaderModule = device.createShaderModule({ code: shaderCode });

    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [
                {
                    format: presentationFormat,
                },
            ],
        },
        primitive: {
            topology: 'triangle-list',
        },
    });

    function frame() {
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor = {
            colorAttachments: [
                {
                    view: textureView,
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.draw(3, 1, 0, 0);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

initWebGPU();\` }
];

let dbPromise = null;

const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' }); 
      if (!db.objectStoreNames.contains('obfuscation_history')) db.createObjectStore('obfuscation_history', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('bookmarks')) db.createObjectStore('bookmarks', { keyPath: 'projectId' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

const handlers = {
    getProjects: async () => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('projects', 'readonly');
            const req = tx.objectStore('projects').getAll();
            req.onsuccess = () => resolve(req.result.sort((a, b) => b.lastModified - a.lastModified));
            req.onerror = () => reject(req.error);
        });
    },
    createProject: async ({ name, initialFiles }) => {
        const db = await openDB();
        const projectId = generateId();
        const project = {
            id: projectId,
            name,
            created: Date.now(),
            lastModified: Date.now(),
            fileCount: initialFiles ? initialFiles.length : DEFAULT_FILES.length
        };
        
        // Save Project Meta
        await new Promise((resolve, reject) => {
            const tx = db.transaction('projects', 'readwrite');
            tx.objectStore('projects').add(project);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        // Save Files
        await new Promise((resolve, reject) => {
            const tx = db.transaction('files', 'readwrite');
            tx.objectStore('files').put({ id: projectId, files: initialFiles || DEFAULT_FILES });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        return projectId;
    },
    saveProjectFiles: async ({ projectId, files }) => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['files', 'projects'], 'readwrite');
            
            // Save Files
            tx.objectStore('files').put({ id: projectId, files });
            
            // Update Meta
            const pStore = tx.objectStore('projects');
            const req = pStore.get(projectId);
            req.onsuccess = () => {
                const p = req.result;
                if (p) {
                    p.lastModified = Date.now();
                    p.fileCount = files.length;
                    pStore.put(p);
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
    getProjectFiles: async ({ projectId }) => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('files', 'readonly');
            const req = tx.objectStore('files').get(projectId);
            req.onsuccess = () => resolve(req.result?.files || DEFAULT_FILES);
            req.onerror = () => reject(req.error);
        });
    },
    deleteProject: async ({ projectId }) => {
        const db = await openDB();
        const tx = db.transaction(['projects', 'files', 'bookmarks'], 'readwrite');
        tx.objectStore('projects').delete(projectId);
        tx.objectStore('files').delete(projectId);
        if(db.objectStoreNames.contains('bookmarks')) tx.objectStore('bookmarks').delete(projectId);
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    },
    renameProject: async ({ projectId, newName }) => {
        const db = await openDB();
        const tx = db.transaction('projects', 'readwrite');
        const store = tx.objectStore('projects');
        const req = store.get(projectId);
        req.onsuccess = () => {
            const data = req.result;
            if (data) {
                data.name = newName;
                data.lastModified = Date.now();
                store.put(data);
            }
        };
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    },
    duplicateProject: async ({ projectId }) => {
        const db = await openDB();
        // Get original data
        const filesReq = await new Promise((res) => {
             const tx = db.transaction('files', 'readonly');
             tx.objectStore('files').get(projectId).onsuccess = (e) => res(e.target.result?.files || []);
        });
        const projectReq = await new Promise((res) => {
             const tx = db.transaction('projects', 'readonly');
             tx.objectStore('projects').get(projectId).onsuccess = (e) => res(e.target.result);
        });

        if (projectReq) {
            const newId = generateId();
            const newProject = { 
                ...projectReq, 
                id: newId, 
                name: \`\${projectReq.name} (Copy)\`, 
                created: Date.now(), 
                lastModified: Date.now() 
            };
            
            const tx = db.transaction(['projects', 'files'], 'readwrite');
            tx.objectStore('projects').add(newProject);
            tx.objectStore('files').add({ id: newId, files: filesReq });
            return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
        }
    },
    calculateProjectSize: async ({ projectId }) => {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction('files', 'readonly');
            const req = tx.objectStore('files').get(projectId);
            req.onsuccess = () => {
                const files = req.result?.files || [];
                let size = 0;
                files.forEach((f) => {
                    if (f.content) size += f.content.length;
                });
                resolve(size);
            };
            req.onerror = () => resolve(0);
        });
    },
    // Bookmarks & Obfuscation
    saveBookmarks: async ({ projectId, bookmarks }) => {
        const db = await openDB();
        const tx = db.transaction('bookmarks', 'readwrite');
        tx.objectStore('bookmarks').put({ projectId, bookmarks });
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    },
    getBookmarks: async ({ projectId }) => {
        const db = await openDB();
        return new Promise((resolve) => {
            if (!db.objectStoreNames.contains('bookmarks')) { resolve([]); return; }
            const tx = db.transaction('bookmarks', 'readonly');
            const req = tx.objectStore('bookmarks').get(projectId);
            req.onsuccess = () => resolve(req.result?.bookmarks || []);
            req.onerror = () => resolve([]);
        });
    },
    saveObfuscation: async ({ original, obfuscated }) => {
        const db = await openDB();
        const item = { id: generateId(), original, obfuscated, timestamp: Date.now() };
        const tx = db.transaction('obfuscation_history', 'readwrite');
        tx.objectStore('obfuscation_history').add(item);
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    },
    getObfuscationHistory: async () => {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction('obfuscation_history', 'readonly');
            const req = tx.objectStore('obfuscation_history').getAll();
            req.onsuccess = () => resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
        });
    },
    clearObfuscationHistory: async () => {
        const db = await openDB();
        const tx = db.transaction('obfuscation_history', 'readwrite');
        tx.objectStore('obfuscation_history').clear();
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    }
};

self.onmessage = async (e) => {
    const { id, type, payload } = e.data;
    if (handlers[type]) {
        try {
            const result = await handlers[type](payload);
            self.postMessage({ id, success: true, result });
        } catch (error) {
            self.postMessage({ id, success: false, error: error.message });
        }
    } else {
        self.postMessage({ id, success: false, error: \`Unknown method \${type}\` });
    }
};
`;

export const createDbWorker = (): Worker => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
