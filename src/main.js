
const path = require('path');
const {app, BrowserWindow, Menu, ipcMain: ipc, session} = require('electron');
const openAboutWindow = require('about-window').default;
const ElectronPreferences = require('electron-preferences');

let mainWindow, windows = [], preferencesWindow;

const notFirstInst = app.makeSingleInstance((commandLine, workingDirectory) => {
  if (/new-window/i.test(commandLine.join(' '))) {
    mainWindow = windowConstructor();
  } else if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

if (notFirstInst) {
  app.quit()
}

app
  .on('ready', () => {
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = app.getName() + ' ' + app.getVersion();
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    app.setUserTasks([
      {
        program: process.execPath,
        arguments: process.env.NODE_ENV === 'debug' ?
          [path.resolve(process.argv[1]), '--new-window'].join(' ') :
          '--new-window',
        iconPath: process.execPath,
        iconIndex: 0,
        title: 'New Window',
        description: 'Create a new window'
      }
    ]);
    app.dock && app.dock.setMenu(Menu.buildFromTemplate([
      { label: 'New Window', click: () => mainWindow = windowConstructor() }
    ]));

    mainWindow = windowConstructor();

    // Preferences Window
    preferencesWindow = preferencesWindowConstructor();
  })
  .on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

ipc.on('window', function(e, arg) {
  if (arg === 'new') {
    mainWindow = windowConstructor();
  } else if (arg === 'showOpenTheLastHistory') {
    e.sender.send('history', windows.length <= 1);
  }
});
ipc.on('about', function(e, arg) {
  if (arg === 'open') {
    about();
  }
});
ipc.on('preferences', function(e, arg) {
  if (arg === 'open') {
    preferences();
  }
});

function windowConstructor(notFirst) {
  let mWindow = new BrowserWindow({
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
  mWindow.loadURL(`file://${__dirname}/play/index.html`);
  mWindow.setMenu(null);
  mWindow.webContents.on('did-finish-load', () => {
    preferencesWindow && preferencesWindow.broadcast();
    process.env.NODE_ENV === 'debug' && mWindow.openDevTools();
  });
  mWindow.on('focus', () => {
    mainWindow = mWindow;
  });
  mWindow.on('closed', () => {
    mWindow === mainWindow && (mainWindow = null);
    let i = windows.length;
    while (i--) {
      if (windows[i] === mWindow) {
        windows.splice(i, 1);
      }
    }
  });
  windows.push(mWindow);
  return mWindow;
}

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

function preferences() {
  if (preferencesWindow.prefsWindow) {
    if (preferencesWindow.prefsWindow.isMinimized()) {
      preferencesWindow.prefsWindow.restore();
    }
    preferencesWindow.prefsWindow.focus();
  } else {
    preferencesWindow.show();
  }
}
function preferencesWindowConstructor() {
  let preferencesWindow = new ElectronPreferences({
    dataStore: path.resolve(app.getPath('userData'), 'preferences.json'),
    defaults: {},
    onLoad: preferences => preferences,
    sections: [
      {
        id: 'editor',
        label: 'Editor',
        icon: 'edit-78',
        form: {
          groups: [
            {
              label: 'Normal',
              fields: [
                {
                  label: 'Show Invisibles',
                  key: 'showInvisibles',
                  type: 'dropdown',
                  options: [
                    {label: 'False', value: false},
                    {label: 'True', value: true}
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  });
  preferencesWindow.show = function() {
    if (this.prefsWindow) {
        return;
    }

    this.prefsWindow = new BrowserWindow({
      // parent: mainWindow,
      modal: true,
      icon: path.join(__dirname, '../../res/image/icon.ico'),
      transparent: false,
      autoHideMenuBar: true,
      webPreferences: {
        devTools: true,
        webSecurity: false
      },
      titleBarStyle: process.platform === 'darwin' ? 'default' : 'hidden-inset',
      frame: true,
      title: 'Preferences',
      width: 800,
      height: 600,
      acceptFirstMouse: true,
      resizable: false,
      maximizable: false,
      backgroundColor: '#E7E7E7',
      show: true
    });

    this.prefsWindow.loadURL(`file://${path.join(__dirname, '../node_modules/electron-preferences/build/index.html')}`);
    this.prefsWindow.setMenu(null);
    process.env.NODE_ENV === 'debug' && this.prefsWindow.openDevTools();

    this.prefsWindow.on('closed', () => {
      this.prefsWindow = null;
    });
  }
  return preferencesWindow;
}