const { app, BrowserWindow, screen,ipcMain } = require('electron');
const path = require('path');
require('dotenv').config();

require('./server.js');

let win;
function createWindow () {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const dmSafeZone = 400; // Space for Instagram DMs
  const maxSidebarWidth = 500;
  const sidebarWidth = Math.min(maxSidebarWidth, width - dmSafeZone);

   win = new BrowserWindow({
    x: width - sidebarWidth, // Push right up to DMs
    y: 0,
    width: sidebarWidth,
    height: height,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    titleBarOverlay: false,
        // focusable: false,
    webPreferences: {
      nodeIntegration: false,
 
      contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
ipcMain.on('minimize-window', () => {
   win.minimize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
