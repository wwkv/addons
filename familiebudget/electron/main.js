'use strict';

/**
 * Squirrel – Electron main process
 *
 * Starts the Express/SQLite backend then opens a BrowserWindow that loads
 * the app from http://127.0.0.1:3001.  SQLite data is stored in the OS
 * user-data folder (e.g. %APPDATA%/Squirrel on Windows).
 */

const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');

/* The port is CHOSEN, not fixed. 3001 is the preferred one — it is what the
   add-on uses and what any old shortcut expects — but on someone else's
   machine it may well be taken by something unrelated, and the old behaviour
   was to fail binding, throw out of startServer(), and show an error dialog
   with a stack trace. Probing costs milliseconds and turns a dead app into a
   working one on a different port. */
/* app.getName() reads `name` from the packaged package.json, and
   electron-builder does NOT copy `productName` into it — so without this the
   data folder is "squirrel-desktop" (%APPDATA%/squirrel-desktop on Windows),
   not "Squirrel". Cosmetic until you have to talk someone through finding or
   backing up their database over the phone. Must run before any
   app.getPath('userData'). */
app.setName('Squirrel');

const PREFERRED_PORT = 3001;
let PORT = PREFERRED_PORT;
let mainWindow = null;

/* A packaged app has no console. When it fails to start on someone else's
   machine all you get is "it doesn't open", and there is nothing to ask them
   for. So every startup step is appended to a file next to their data, and the
   error dialog says where it is. Truncated each launch: the interesting run is
   always the last one. */
let logPath = null;
function log(msg) {
  const line = `${new Date().toISOString()}  ${msg}`;
  console.log('[Squirrel]', msg);
  try {
    if (logPath) require('fs').appendFileSync(logPath, line + '\n');
  } catch { /* logging must never be the thing that breaks startup */ }
}

/* Probe the SAME interface the backend will bind to. server.js listens on
   0.0.0.0 (it has to: under Home Assistant ingress the request does not arrive
   on loopback), and 127.0.0.1 can bind happily while 0.0.0.0 is already taken.
   Probing loopback therefore reported a busy port as free — and then
   waitForServer got a healthy answer from the OTHER process squatting on it and
   loaded ITS data. Silent, and about as wrong as it gets for a budget app. */
function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '0.0.0.0');
  });
}

async function pickPort(from = PREFERRED_PORT, tries = 20) {
  for (let p = from; p < from + tries; p++) if (await portFree(p)) return p;
  throw new Error(`Geen vrije poort gevonden tussen ${from} en ${from + tries - 1}`);
}

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
    title: 'Squirrel',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // Disable trackpad pinch-to-zoom: it scales the visual viewport independently
  // from the layout viewport, so position:fixed elements placed via
  // getBoundingClientRect() (dropdowns, menus) end up rendered in the wrong
  // spot on screen after an accidental pinch gesture.
  mainWindow.webContents.once('dom-ready', () => {
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
  });

  // Open external links in the default browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ── Auto-update ──
   Checks the GitHub releases this app was published to. Deliberately quiet:
   a failed check means GitHub was unreachable or the machine is offline, and
   neither is the user's problem to solve — showing a dialog for it would be
   noise on someone else's computer. Only the "an update was installed" notice
   is worth surfacing, and electron-updater handles that itself.

   Never runs unpackaged: in development there is no release to compare
   against, and electron-updater throws rather than shrugging. */
function checkForUpdates() {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.on('error', (e) => console.error('[update]', e && e.message));
    autoUpdater.checkForUpdatesAndNotify().catch((e) => console.error('[update]', e && e.message));
  } catch (e) {
    console.error('[update] updater niet beschikbaar:', e && e.message);
  }
}

/* ── Single instance ──
   Two copies cannot share one port or one SQLite file. Without this the second
   launch fails to bind, throws, and greets you with an error dialog — which
   looks like a broken app rather than "it is already running". Take the lock
   first, before any window or server work. */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

// ── App lifecycle ──
app.whenReady().then(async () => {
  try {
    // app.getPath() requires the app to be ready — set env vars here,
    // before startServer() imports db.js which reads them at module load time
    const userData = app.getPath('userData');
    logPath = path.join(userData, 'startup.log');
    try { require('fs').writeFileSync(logPath, ''); } catch { /* ignore */ }
    log(`Squirrel ${app.getVersion()} — userData: ${userData}`);

    process.env.DATA_DIR = path.join(userData, 'data');
    PORT = await pickPort();
    log(`poort ${PORT}${PORT !== PREFERRED_PORT ? ` (${PREFERRED_PORT} was bezet)` : ''}`);
    process.env.PORT = String(PORT);

    log(`backend starten: ${getServerPath()}`);
    await startServer();
    await waitForServer();
    log('backend antwoordt');
    createWindow();
    log('venster geopend');
    checkForUpdates();
  } catch (err) {
    log(`STARTUP MISLUKT: ${(err && err.stack) || err}`);
    console.error('[Electron] Startup failed:', err.message);
    dialog.showErrorBox(
      'Squirrel kon niet starten',
      `De backend server kon niet worden gestart.\n\n${err.message}\n\n` +
      `Server pad: ${getServerPath()}\n` +
      `Logbestand: ${logPath || '(nog niet aangemaakt)'}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

} // end single-instance lock
