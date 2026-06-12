
import { FileSystemItem } from '../types';
import { generateId } from '../constants';

export type ProjectTemplate = 'blank' | 'html5' | 'calculator' | 'todo' | 'clock' | 'weather' | 'php-db';

export const TEMPLATES_INFO = [
    { id: 'blank', name: 'Blank Project', desc: 'Empty workspace', icon: 'file' },
    { id: 'html5', name: 'HTML5 Boilerplate', desc: 'Standard HTML/CSS/JS structure', icon: 'layout' },
    { id: 'php-db', name: 'PHP SQLite Tracker', desc: 'PHP script with a live SQLite database', icon: 'database' },
    { id: 'calculator', name: 'Glass Calculator', desc: 'Modern glassmorphism calculator', icon: 'calculator' },
    { id: 'todo', name: 'To-Do List', desc: 'Simple task manager with local storage', icon: 'list-todo' },
    { id: 'clock', name: 'Digital Clock', desc: 'Real-time clock with neon effects', icon: 'clock' },
    { id: 'weather', name: 'Weather App', desc: 'Clean weather dashboard UI', icon: 'cloud-sun' },
    { id: 'iframe', name: 'Iframe Project', desc: 'Two HTML files, one in an iframe', icon: 'monitor' },
    { id: 'webgpu', name: 'WebGPU Triangle', desc: 'Modern high-performance graphics', icon: 'zap' },
];

export const getTemplateFiles = (template: string): FileSystemItem[] => {
  const root = { id: 'root', name: 'root', type: 'folder' as const, parentId: null, depth: 0, isOpen: true };
  const files: FileSystemItem[] = [root];

  const addFile = (name: string, content: string) => {
    files.push({
      id: generateId(),
      name,
      type: 'file',
      parentId: 'root',
      depth: 1,
      content,
      isBinary: false,
      mimeType: 'text/plain'
    });
  };

  switch (template) {
    case 'html5':
      addFile('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello World</h1>
    <p>Welcome to your HTML5 project.</p>
    <script src="script.js"></script>
</body>
</html>`);
      addFile('style.css', `body {
    font-family: system-ui, sans-serif;
    padding: 2rem;
    background-color: #f0f0f0;
    color: #333;
}`);
      addFile('script.js', `console.log("Hello from script.js");`);
      break;

    case 'calculator':
        addFile('index.html', `<!DOCTYPE html>
<html>
<head>
    <title>Glass Calculator</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="calculator">
        <div class="display" id="display">0</div>
        <div class="buttons">
            <button class="btn clear" onclick="clearDisplay()">C</button>
            <button class="btn" onclick="append('/')">/</button>
            <button class="btn" onclick="append('*')">×</button>
            <button class="btn" onclick="deleteLast()">DEL</button>
            <button class="btn" onclick="append('7')">7</button>
            <button class="btn" onclick="append('8')">8</button>
            <button class="btn" onclick="append('9')">9</button>
            <button class="btn" onclick="append('-')">-</button>
            <button class="btn" onclick="append('4')">4</button>
            <button class="btn" onclick="append('5')">5</button>
            <button class="btn" onclick="append('6')">6</button>
            <button class="btn" onclick="append('+')">+</button>
            <button class="btn" onclick="append('1')">1</button>
            <button class="btn" onclick="append('2')">2</button>
            <button class="btn" onclick="append('3')">3</button>
            <button class="btn equal" onclick="calculate()">=</button>
            <button class="btn zero" onclick="append('0')">0</button>
            <button class="btn" onclick="append('.')">.</button>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`);
        addFile('style.css', `body {
    background: linear-gradient(45deg, #0f0c29, #302b63, #24243e);
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0;
    font-family: 'Segoe UI', sans-serif;
}
.calculator {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 20px;
    border-radius: 20px;
    box-shadow: 0 25px 45px rgba(0,0,0,0.2);
}
.display {
    background: rgba(0, 0, 0, 0.2);
    color: white;
    font-size: 2rem;
    padding: 20px;
    text-align: right;
    border-radius: 10px;
    margin-bottom: 20px;
    min-height: 40px;
}
.buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
}
.btn {
    padding: 20px;
    border: none;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    transition: 0.3s;
}
.btn:hover { background: rgba(255, 255, 255, 0.2); }
.equal { grid-row: span 2; background: #007acc; }
.zero { grid-column: span 2; }
.clear { color: #ff4444; }`);
        addFile('script.js', `let display = document.getElementById('display');
function append(val) {
    if(display.innerText === '0') display.innerText = val;
    else display.innerText += val;
}
function clearDisplay() { display.innerText = '0'; }
function deleteLast() {
    display.innerText = display.innerText.slice(0, -1);
    if(display.innerText === '') display.innerText = '0';
}
function calculate() {
    try { display.innerText = eval(display.innerText); }
    catch { display.innerText = 'Error'; }
}`);
        break;

    case 'todo':
        addFile('index.html', `<!DOCTYPE html>
<html>
<head>
    <title>To-Do List</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Tasks</h1>
        <div class="input-group">
            <input type="text" id="todoInput" placeholder="Add a new task...">
            <button onclick="addTodo()">Add</button>
        </div>
        <ul id="todoList"></ul>
    </div>
    <script src="script.js"></script>
</body>
</html>`);
        addFile('style.css', `body { font-family: sans-serif; background: #f4f4f9; display: flex; justify-content: center; padding-top: 50px; }
.container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 350px; }
h1 { color: #333; margin-top: 0; }
.input-group { display: flex; gap: 10px; margin-bottom: 20px; }
input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
button { padding: 10px 15px; background: #007acc; color: white; border: none; border-radius: 6px; cursor: pointer; }
ul { list-style: none; padding: 0; }
li { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
li:last-child { border-bottom: none; }
.delete-btn { color: #ff4444; cursor: pointer; font-weight: bold; }`);
        addFile('script.js', `function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (!text) return;
    const li = document.createElement('li');
    li.innerHTML = \`<span>\${text}</span><span class="delete-btn" onclick="this.parentElement.remove()">×</span>\`;
    document.getElementById('todoList').appendChild(li);
    input.value = '';
}`);
        break;

    case 'clock':
        addFile('index.html', `<!DOCTYPE html>
<html>
<head>
    <title>Neon Clock</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="clock" id="clock">00:00:00</div>
    <script src="script.js"></script>
</body>
</html>`);
        addFile('style.css', `body { background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
.clock { font-family: 'Courier New', monospace; font-size: 5rem; color: #00ff00; text-shadow: 0 0 20px #00ff00; }`);
        addFile('script.js', `function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').innerText = \`\${h}:\${m}:\${s}\`;
}
setInterval(updateClock, 1000);
updateClock();`);
        break;

    case 'weather':
        addFile('index.html', `<!DOCTYPE html>
<html>
<head>
    <title>Weather UI</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="card">
        <div class="city">London</div>
        <div class="temp">18°C</div>
        <div class="desc">Cloudy</div>
        <div class="details">
            <div>Humidity: 65%</div>
            <div>Wind: 12km/h</div>
        </div>
    </div>
</body>
</html>`);
        addFile('style.css', `body { background: #87CEEB; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
.card { background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; text-align: center; color: white; border: 1px solid rgba(255,255,255,0.3); }
.city { font-size: 2rem; font-weight: bold; }
.temp { font-size: 4rem; margin: 10px 0; }
.details { display: flex; gap: 20px; margin-top: 20px; font-size: 0.9rem; opacity: 0.8; }`);
        break;

    case 'iframe':
        addFile('index.html', `<!DOCTYPE html>
<html>
<head>
    <title>Main Page</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        iframe { width: 100%; height: 300px; border: 2px solid #ddd; border-radius: 4px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Main Page</h1>
        <p>This page contains an iframe showing another HTML file.</p>
        <iframe src="child.html"></iframe>
    </div>
</body>
</html>`);
        addFile('child.html', `<!DOCTYPE html>
<html>
<head>
    <title>Child Page</title>
    <style>
        body { background: #e0f7fa; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
        h2 { color: #00796b; }
    </style>
</head>
<body>
    <div>
        <h2>I am the child page!</h2>
        <p>I'm being displayed inside an iframe.</p>
    </div>
</body>
</html>`);
        break;

    case 'webgpu':
        addFile('index.html', `<!DOCTYPE html>
<html>
<head>
    <title>WebGPU Triangle</title>
    <style>
        body { margin: 0; background: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
        canvas { width: 100%; height: 100%; max-width: 800px; max-height: 800px; border-radius: 12px; box-shadow: 0 0 50px rgba(0,255,255,0.2); }
    </style>
</head>
<body>
    <canvas id="gpuCanvas"></canvas>
    <script src="main.js"></script>
</body>
</html>`);
        addFile('main.js', `async function init() {
    if (!navigator.gpu) {
        alert("WebGPU not supported! Use Chrome/Edge/Arc on Desktop.");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const canvas = document.getElementById('gpuCanvas');
    const context = canvas.getContext('webgpu');

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
        alphaMode: 'premultiplied',
    });

    const shaderModule = device.createShaderModule({
        code: \`
            @vertex
            fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> @builtin(position) vec4f {
                var pos = array<vec2f, 3>(
                    vec2f(0.0, 0.5),
                    vec2f(-0.5, -0.5),
                    vec2f(0.5, -0.5)
                );
                return vec4f(pos[VertexIndex], 0.0, 1.0);
            }

            @fragment
            fn fs_main() -> @location(0) vec4f {
                return vec4f(0.0, 1.0, 1.0, 1.0);
            }
        \`
    });

    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [{ format: presentationFormat }],
        },
        primitive: { topology: 'triangle-list' },
    });

    function frame() {
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
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

init();`);
        break;

    case 'php-db':
        addFile('index.php', `<?php
// PHP WebAssembly with SQLite Database Example
echo "<h3 style='font-family:system-ui,sans-serif;color:#4f46e5;margin-bottom:8px;'>🐘 PHP 8.2 & SQLite Virtual Filesystem</h3>";

try {
    // Connect to the SQLite database
    $db = new PDO('sqlite:database.sqlite');
    
    // Create tables if they don't exist
    $db->exec("CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        visits INTEGER,
        last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Process guestbook sign-in if request parameters are provided
    if (isset($_GET['name']) && !empty($_GET['name'])) {
        $name = htmlspecialchars($_GET['name']);
        
        // Check if visitor exists
        $stmt = $db->prepare("SELECT id, visits FROM visitors WHERE name = :name");
        $stmt->execute([':name' => $name]);
        $visitor = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($visitor) {
            $newVisits = $visitor['visits'] + 1;
            $update = $db->prepare("UPDATE visitors SET visits = :visits, last_visit = CURRENT_TIMESTAMP WHERE id = :id");
            $update->execute([':visits' => $newVisits, ':id' => $visitor['id']]);
            echo "<p style='color:#059669;font-weight:bold;'>Welcome back, {$name}! This is your visit #{$newVisits}!</p>";
        } else {
            $insert = $db->prepare("INSERT INTO visitors (name, visits) VALUES (:name, 1)");
            $insert->execute([':name' => $name]);
            echo "<p style='color:#059669;font-weight:bold;'>Hello, {$name}! Thank you for signing the guestbook!</p>";
        }
    }
    
    // Echo a beautiful form
    echo '
    <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;font-family:system-ui,sans-serif;border:1px solid #e5e7eb;max-width:400px;">
        <h4 style="margin-top:0;color:#1f2937;">Sign the Guestbook</h4>
        <form method="GET" action="">
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#4b5563;">Your Name:</label>
            <input type="text" name="name" placeholder="Enter name..." required style="padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;width:100%;box-sizing:border-box;margin-bottom:12px;" />
            <button type="submit" style="background:#4f46e5;color:white;border:none;padding:8px 14px;border-radius:4px;cursor:pointer;font-weight:500;">Submit Query</button>
        </form>
    </div>
    ';
    
    // List all visitors inside SQL database
    echo "<h4 style=\\'font-family:system-ui,sans-serif;color:#1f2937;margin-top:20px;\\'>Visitor Registry:</h4>";
    
    $results = $db->query("SELECT * FROM visitors ORDER BY last_visit DESC");
    echo "<table style='border-collapse:collapse;width:100%;max-width:600px;font-family:system-ui,sans-serif;font-size:14px;'>";
    echo "<tr style='background:#f3f4f6;border-bottom:2px solid #e5e7eb;'><th style='padding:8px;text-align:left;'>ID</th><th style='padding:8px;text-align:left;'>Name</th><th style='padding:8px;text-align:left;'>Visits</th><th style='padding:8px;text-align:left;'>Last Visit</th></tr>";
    
    $hasRows = false;
    while ($row = $results->fetch(PDO::FETCH_ASSOC)) {
        $hasRows = true;
        echo "<tr style='border-bottom:1px solid #e5e7eb;'>";
        echo "<td style='padding:8px;'>" . $row['id'] . "</td>";
        echo "<td style='padding:8px;font-weight:500;'>" . htmlspecialchars($row['name']) . "</td>";
        echo "<td style='padding:8px;'>" . $row['visits'] . "</td>";
        echo "<td style='padding:8px;color:#6b7280;font-size:12px;'>" . $row['last_visit'] . "</td>";
        echo "</tr>";
    }
    
    if (!$hasRows) {
        echo "<tr><td colspan='4' style='padding:12px;text-align:center;color:#9ca3af;'>No visitors registered. Fill the form to add yours!</td></tr>";
    }
    echo "</table>";
    
} catch (PDOException $e) {
    echo "<p style='color:#dc2626;'>Database Error: " . $e->getMessage() . "</p>";
}
?>`);
        addFile('database.sqlite', '');
        break;

    case 'blank':
    default:
        // Just empty root, user will create files
       break;
  }
  return files;
};
