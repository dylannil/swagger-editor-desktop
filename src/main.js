
const path = require('path');
const {app, BrowserWindow, Menu, ipcMain: ipc, session, net, dialog, shell} = require('electron');
const openAboutWindow = require('about-window').default;
const ElectronPreferences = require('electron-preferences');
const storage = require('electron-json-storage');

let mainWindow, windows = [], preferencesWindow, latestTag;

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

    const proxy = preferencesWindow.value('default.proxy');
    setProxy(proxy);

    checkForUpdate();
  })
  .on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

ipc.on('window', function(e, arg) {
  if (arg === 'new') {
    mainWindow = windowConstructor();
  } else if (arg === 'shouldOpenTheLastHistory') {
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
ipc.on('setPreferences', function(e, arg) {
  setProxy(arg.default.proxy);
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
  const desc = [
    'Based on <a href="https://editor.swagger.io">Swagger Editor Online</a>',
    'Using <a href="https://electronjs.org/">Electron</a> technology',
    'Enhanced by <a href="https://github.com/muhonglong">DYLAN</a>'
  ];
  latestTag && desc.push('<a href="https://github.com/muhonglong/swagger-editor-desktop/releases/latest"><button class="upgrade-btn">Upgrade to ' + latestTag + '</button></a>');
  openAboutWindow({
    icon_path: path.join(__dirname, './play/file/icon.png'),
    css_path: path.join(__dirname, './play/index.css'),
    copyright: 'Copyright (c) 2018 Li Xiao-Bo',
    description: desc.join('<br/>'),
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
        id: 'default',
        label: 'Default',
        icon: 'compass-05',
        form: {
          groups: [
            {
              label: 'Network',
              fields: [
                {
                  label: 'Proxy',
                  key: 'proxy',
                  type: 'text',
                  help: 'e.g. 127.0.0.1:8888; http=127.0.0.1:9999'
                }
              ]
            }
          ]
        }
      },
      {
        id: 'editor',
        label: 'Editor',
        icon: 'pencil',
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

async function checkForUpdate() {
  if (process.env.NODE_ENV === 'debug') {
    return ;
  }
  let tag = await new Promise((resolve, reject) => {
    storage.get('updater', (err, data = {}) => {
      if (err) {
        reject(err);
        return ;
      }
      resolve(!data.stamp || (Date.now() / 1000 - data.stamp > 162000) ? '' : data.tag);
    });
  });
  tag || (tag = await getLatestTag());
  if (tag) {
    const curr = app.getVersion();
    const tagList = tag.replace(/^[^\d]*/, '').split(/\.|-/).map(v => parseInt(v));
    const currList = curr.replace(/^[^\d]*/, '').split(/\.|-/).map(v => parseInt(v));
    for (var i = 0; i < tagList.length; i++) {
      if (tagList[i] > currList[i]) {
        latestTag = tag;
        dialog.showMessageBox({
          title: 'Info',
          message: 'New edition is available, would you like to upgrade it now?',
          buttons: ['Later', 'Upgrade']
        }, sn => {
          if (sn === 1) {
            shell.openExternal('https://github.com/muhonglong/swagger-editor-desktop/releases');
          }
        });
        break;
      }
    }
  }
  function getLatestTag() {
    return new Promise((resolve, reject) => {
      const req = net.request({
        method: 'GET',
        protocol: 'https:',
        hostname: 'api.github.com',
        port: 443,
        path: '/repos/muhonglong/swagger-editor-desktop/releases/latest'
      });
      req.on('response', res => {
        let str = '';
        res.on('data', (chunk) => {
          str += chunk;
        });
        res.on('end', () => {
          const {tag_name: tag} = JSON.parse(str);
          storage.set('updater', {tag, stamp: Math.round(Date.now() / 1000)}, err => err && console.log(err));
          resolve(tag);
        });
      });
      req.end();
    });
  }
}

function setProxy(proxy) {
  session.defaultSession.setProxy({
    proxyRules: proxy || 'direct://'
  }, () => {
    session.defaultSession.resolveProxy('https://github.com', p => {
      if (!p) {
        console.warn(`Fail proxy: ${proxy}`);
      }
    });
  });
}