const { app, BrowserWindow, dialog, ipcMain } = require('electron');

let browserWindow;

function createWindow() {
    browserWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    browserWindow.loadFile('index.html');

    browserWindow.webContents.openDevTools();

    browserWindow.on('closed', () => {
        browserWindow = null;
    });
}

ipcMain.on('load-file', loadFileHandler);

async function loadFileHandler(event) {
    dialog.showOpenDialog({
        properties: ['openFile']
    }).then((response) => {
        if (response.canceled) {
            return; // User canceled dialog
        }
        if (!response.filePaths) {
            return; // Sanity check
        }
        if (response.filePaths.length === 0) {
            return; // Sanity check
        }
        event.reply('file-loaded', response.filePaths[0]);
    });
}

ipcMain.on('save-file', saveFileHandler);

async function saveFileHandler(event) {
    dialog.showSaveDialog({
        defaultPath: 'image.png',
        filters: [{name: "PNG", extensions: ["png"]}]
    }).then((response) => {
        if (response.canceled) {
            return; // User canceled dialog
        }
        if (response.filePath === undefined) {
            return; // Sanity check
        }
        event.reply('file-saved', response.filePath);
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (browserWindow === null) {
        createWindow();
    }
});