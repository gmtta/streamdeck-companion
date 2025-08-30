const { app, BrowserWindow, ipcMain } = require('electron');
const http = require('http');
const url = require('url');

// Add multiple compatibility flags
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-gpu-compositing');
app.commandLine.appendSwitch('--disable-gpu-rasterization');
app.commandLine.appendSwitch('--disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('--ignore-gpu-blacklist');

let mainWindow;
let httpServer;
let pendingCommands = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');
}

function startHttpServer() {
  httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/commands') {
      const commands = [...pendingCommands];
      pendingCommands = [];
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        commands: commands,
        count: commands.length
      }));
      
    } else if (parsedUrl.pathname === '/trigger') {
      const soundId = parsedUrl.query.id;
      const sceneName = parsedUrl.query.scene;
      const loadpadName = parsedUrl.query.loadpad;
      const cmd = parsedUrl.query.cmd || 'toggle';
      
      if (soundId) {
        // Handle individual sound commands
        pendingCommands.push({
          type: 'sound',
          id: soundId,
          cmd: cmd,
          timestamp: Date.now()
        });
        
        console.log(`Command queued: sound ${soundId} ${cmd}`);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: `Sound ${soundId} queued`}));
        
      } else if (sceneName) {
        // Handle scene commands
        pendingCommands.push({
          type: 'scene',
          name: sceneName,
          cmd: cmd,
          timestamp: Date.now()
        });
        
        console.log(`Command queued: scene ${sceneName} ${cmd}`);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: `Scene ${sceneName} queued`}));
        
      } else if (loadpadName) {
        // Handle load pad commands
        pendingCommands.push({
          type: 'loadpad',
          name: loadpadName,
          cmd: cmd,
          timestamp: Date.now()
        });
        
        console.log(`Command queued: load pad ${loadpadName}`);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: `Load pad ${loadpadName} queued`}));
        
      } else if (cmd === 'stopall') {
        // Handle stop all commands
        pendingCommands.push({
          type: 'stopall',
          cmd: cmd,
          timestamp: Date.now()
        });
        
        console.log('Command queued: stop all');
        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: 'Stop all queued'}));
        
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({success: false, message: 'Missing sound ID, scene name, load pad name, or stop all command'}));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({success: false, message: 'Not found'}));
    }
  });
  
  httpServer.listen(3001, () => {
    console.log('HTTP server running on http://localhost:3001');
  });
}

ipcMain.on('test-sound', (event, soundId) => {
  console.log('MAIN: Received test-sound for ID:', soundId);
  
  pendingCommands.push({
    type: 'sound',
    id: soundId,
    cmd: 'toggle',
    timestamp: Date.now()
  });
  
  console.log('MAIN: Test command added - sound', soundId);
  event.reply('command-queued', { type: 'sound', id: soundId });
});

ipcMain.on('test-scene', (event, sceneName) => {
  console.log('MAIN: Received test-scene for name:', sceneName);
  
  pendingCommands.push({
    type: 'scene',
    name: sceneName,
    cmd: 'toggle',
    timestamp: Date.now()
  });
  
  console.log('MAIN: Test command added - scene', sceneName);
  event.reply('command-queued', { type: 'scene', name: sceneName });
});

ipcMain.on('test-stopall', (event) => {
  console.log('MAIN: Received test-stopall');
  
  pendingCommands.push({
    type: 'stopall',
    cmd: 'stopall',
    timestamp: Date.now()
  });
  
  console.log('MAIN: Test command added - stopall');
  event.reply('command-queued', { type: 'stopall' });
});

ipcMain.on('test-loadpad', (event, padName) => {
  console.log('MAIN: Received test-loadpad for name:', padName);
  
  pendingCommands.push({
    type: 'loadpad',
    name: padName,
    cmd: 'load',
    timestamp: Date.now()
  });
  
  console.log('MAIN: Test command added - loadpad', padName);
  event.reply('command-queued', { type: 'loadpad', name: padName });
});

app.whenReady().then(() => {
  createWindow();
  startHttpServer();
});