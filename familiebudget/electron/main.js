'use strict';

/**
 * FamilieBudget – Electron main process
 *
 * Starts the Express/SQLite backend then opens a BrowserWindow that loads
 * the app from http://127.0.0.1:3001.  SQLite data is stored in the OS
 * user-data folder (e.g. %APPDATA%/FamilieBudget on Windows).
 */

const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');

const PORT = 3001;
let mainWindow = null;

// ── Must be set before any backend module is imported ──
process.env.DATA_DIR = path.join(app.getPath('userData'), 'data');
process.env.PORT = String(PORT);

// ── Resolve backend path ──
// asar is disabled so all files are real paths on disk.
// app.getAppPath() returns the app directory in both dev and packaged builds.
function getServerPath() {
  return path.join(app.getAppPath(), 'backend', 'server.js');
}

// ── Start Express server (ESM module via dynamic import) ──
async function startServer() {
  const serverPath = getServerPath();
  // file:// URL is required for ESM imports on Windows too
  await import('file://' + serverPath.replace(/\\/g, '/'));
}

// ── Poll /api/health until the server is accepting connections ──
function waitForServer(retries = 30) {
  return new Promise((resolve, reject) => {
    function attempt(n) {
      const req = http.request(
        { hostname: '127.0.0.1', port: PORT, path: '/api/health', method: 'GET' },
        () => resolve()
      );
      req.on('error', () => {
        if (n <= 0) return reject(new Error('Backend server did not start in time'));
        setTimeout(() => attempt(n - 1), 300);
      });
      req.end();
    }
    attempt(retries);
  });
}

// ── Create the main window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'FamilieBudget',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // Open external links in the default browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App lifecycle ──
app.whenReady().then(async () => {
  try {
    await startServer();
    await waitForServer();
    createWindow();
  } catch (err) {
    console.error('[Electron] Startup failed:', err.message);
    dialog.showErrorBox(
      'FamilieBudget kon niet starten',
      `De backend server kon niet worden gestart.\n\n${err.message}\n\nServer pad: ${getServerPath()}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS apps stay open until Cmd+Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
