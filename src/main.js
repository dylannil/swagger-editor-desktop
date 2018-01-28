
const path = require('path');
const {app, BrowserWindow, Menu, ipcMain: ipc} = require('electron');
const openAboutWindow = require('about-window').default;

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
      titleBarStyle: process.platform === 'darwin' ? 'default' : 'hidden-inset',
      frame: true
    });
    mainWindow.loadURL(`file://${__dirname}/play/index.html`);
    mainWindow.setMenu(null);
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.show();
      process.env.NODE_ENV === 'debug' && mainWindow.openDevTools();
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

ipc.on('about', function(e, arg) {
  if (arg === 'open') {
    about();
  }
});

function about() {
  const desc = ([
    'Based on <a href="https://editor.swagger.io">Swagger Editor Online</a>',
    'Using <a href="https://electronjs.org/">Electron</a> technology',
    'Enhanced by <a href="https://github.com/muhonglong">DYLAN</a>'
  ]).join('<br/>');
  openAboutWindow({
    icon_path: path.join(__dirname, './play/file/icon.png'),
    copyright: 'Copyright (c) 2018 Li Xiao-Bo',
    description: desc,
    open_devtools: process.env.NODE_ENV === 'debug',
    package_json_dir: path.join(__dirname, '../'),
    bug_report_url: 'https://github.com/muhonglong/swagger-editor-desktop/issues',
    homepage: 'https://www.yearnio.com',
    license: 'Apache 2.0',
    adjust_window_size: true,
    use_inner_html: true
  });
}
