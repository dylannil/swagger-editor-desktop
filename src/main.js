
const path = require('path');
const {app, BrowserWindow} = require('electron');

let mainWindow;

app
  .on('ready', () => {
    mainWindow = new BrowserWindow({
      show: false,
      width: 1024,
      height: 728,
      icon: path.join(__dirname, '../../res/image/icon.ico'),
      transparent: false,
      autoHideMenuBar: true,
      webPreferences: {
        devTools: true,
        webSecurity: false
      },
      titleBarStyle: 'hidden-inset',
      frame: true
    });
    mainWindow.loadURL(`file://${__dirname}/play/index.html`);
    mainWindow.setMenu(null);
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.show();
      mainWindow.openDevTools();
    });
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  })
  .on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });