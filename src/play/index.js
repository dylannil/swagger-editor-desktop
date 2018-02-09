/**
 * YioLayout
 */

const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const {dialog} = require('electron').remote;
const {ipcRenderer: ipc} = require('electron');
const mousetrap = require('mousetrap');
const storage = require('electron-json-storage');
const schemes = require('./scheme');
const untitled = YAML.safeDump(YAML.safeLoad(require('./default.js')));
const editAction = {};

document.ondragover =
document.ondrop = e => e.preventDefault();
document.body.ondrop = e => {
  e.preventDefault();
  const f = e.dataTransfer.files[0].path;
  editAction.open(f);
}

class Topbar extends React.Component {
  componentDidMount() {
    this.changed = false;
    this.props.specActions.updateSpec(untitled);
    // 
    mousetrap.bind(['command+o', 'ctrl+o'], () => this.open());
    mousetrap.bind(['command+s', 'ctrl+s'], () => this.save());
    mousetrap.bind(['command+shift+s', 'ctrl+shift+s'], () => this.save(true));
    mousetrap.bind(['command+shift+d', 'ctrl+shift+d'], () => this.dump());
    editAction.open = f => this.open(f);
    editAction.save = resave => this.save(resave)
    editAction.dump = () => this.dump();
    // 
    ipc.send('window', 'shouldOpenTheLastHistory');
    editAction.openLast = () => storage.get('history', (err, data) => {
      if (err) {
        console.log(err);
        return ;
      }
      if (data && data.list && data.list.length) {
        this.open(data.list[0]);
      }
    });
    // rewrite
    const fetch = this.props.fn.fetch;
    if (!fetch.newer) {
      this.props.fn.fetch = req => fetch(window.rewrite ? window.rewrite(req) : req);
      this.props.fn.fetch.newer = true;
    }
  }
  render() {
    let yaml = this.props.specSelectors.specStr();
    if (!this.yaml) {
      this.yaml = yaml;
    } else if (yaml !== this.yaml) {
      this.yaml && (this.changed = true);
    }
    return React.createElement('div', null,
      React.createElement('div', {
        key: 'topbar',
        className: 'topbar'
      }, [
        React.createElement('div', {
          key: 'topbar-right',
          className: 'topbar-right'
        }, [
          React.createElement('div', {
            key: 'btns',
            className: 'topbar-name-btns inline'
          }, [
            React.createElement('div', {
              key: 'Dump',
              className: 'topbar-name-btn',
              onClick: () => this.dump()
            }, 'Dump'),
            process.env.NODE_ENV === 'debug' && React.createElement('div', {
              key: 'CodeGen',
              className: 'topbar-name-btn border-left',
              onClick: () => this.gen()
            }, 'Gen'),
            React.createElement('div', {
              key: 'Preferences',
              className: 'topbar-name-btn border-left',
              onClick: () => this.config()
            }, 'Preferences'),
            React.createElement('div', {
              key: 'NewWindow',
              className: 'topbar-name-btn border-left',
              onClick: () => this.win()
            }, 'New Window')
          ]),
          React.createElement('div', {
            key: 'about',
            className: 'topbar-name-about',
            title: 'About',
            onClick: () => this.about()
          }, React.createElement('svg', {
            key: 'about',
            className: 'topbar-name-about-svg'
          }, React.createElement('use', {
            key: 'yyyy',
            href: '#about'
          })))
        ]),
        React.createElement('div', {
          key: 'topbar-wrapper',
          className: 'topbar-wrapper'
        }, [
          React.createElement('div', {
            key: 'xxxx',
            className: 'topbar-file',
            title: 'Open File',
            onClick: () => this.open()
          }, [
            React.createElement('svg', {
              width: 30,
              height: 30
            }, [
              React.createElement('use', {
                key: 'yyyy',
                href: '#openfile'
              })
            ])
          ]),
          React.createElement('div', {
            className: 'topbar-name'
          }, [
            React.createElement('div', {
              className: 'topbar-name-btns abs'
            }, [
              !!this.file && React.createElement('div', {
                className: 'topbar-name-btn border-right',
                onClick: () => this.save()
              }, 'Save'),
              React.createElement('div', {
                className: 'topbar-name-btn',
                onClick: () => this.save(true)
              }, 'Save as ...'),
              (!!this.file || !!this.changed) && React.createElement('div', {
                className: 'topbar-name-btn border-left',
                onClick: () => this.close()
              }, '×')
            ]),
            React.createElement('span', {
              key: 'text',
              ref: 'file',
              title: 'untitled.yaml',
              className: 'topbar-name-text'
            }, 'untitled.yaml'),
            !!this.changed && React.createElement('span', {
              key: 'changed',
              className: 'topbar-name-flag'
            })
          ])
        ])
      ])
    );
  }
  async open(file) {
    if (this.changed) {
      let ret = await this.close(true);
      if (ret === -1) {
        return ;
      }
      setTimeout(() => {
        dialog.showMessageBox({
          title: 'Info',
          message: 'You can click the file icon to open a new file now.',
          buttons: ['OK']
        });
      }, 300);
    } else {
      if (!file) {
        file = await new Promise((resolve, reject) => {
          dialog.showOpenDialog({
            buttonLabel: 'open',
            properties: ['openFile', 'createDirectory'],
            filters: [{name: 'yaml', extensions: ['yaml']}],
            message: 'open a swagger file to read & edit'
          }, filePaths => resolve((filePaths || [])[0]));
        });
      }
      if (file) {
        file = await new Promise((resolve, reject) => {
          fs.access(file, fs.constants.R_OK | fs.constants.W_OK, err => {
            if (err) {
              resolve();
            } else {
              resolve(file);
            }
          })
        });
      }
      if (file) {
        file = path.resolve(file);
        fs.readFile(file, (err, data) => {
          var code = data.toString();
          this.yaml = code;
          this.props.specActions.updateSpec(this.yaml);
          storage.get('history', (err, data) => {
            if (err) {
              console.log(err);
              return ;
            }
            const list = data.list || [];
            let i = list.length;
            while (i--) {
              if (list[i] === file) {
                list.splice(i, 1);
              }
            }
            list.unshift(file);
            if (list.length > 10) {
              list = list.slice(0, 10);
            }
            data.list = list;
            storage.set('history', data, err => {
              if (err) {
                console.log(err);
              }
            });
          });
          this.showfile(file);
        });
      }
    }
  }
  async save(resave) {
    let yamlContent = this.props.specSelectors.specStr();
    let file = this.file;
    if (resave || !file) {
      file = await new Promise((resolve, reject) => {
        dialog.showSaveDialog({
          buttonLabel: 'save',
          properties: ['openFile', 'createDirectory'],
          filters: [{name: 'yaml', extensions: ['yaml']}],
          message: 'save as ...'
        }, file => {
          resolve(file);
        });
      })
    }
    if (file) {
      await new Promise((resolve, reject) => fs.writeFile(file, yamlContent, err => {
        if (err) {
          reject(err);
        }
        this.yaml = yamlContent;
        this.showfile(file);
        resolve();
      }));
    }
  }
  async close(keep) {
    if (this.changed) {
      let sn = await new Promise((resolve, reject) => {
        dialog.showMessageBox({
          title: 'Info',
          message: 'The current file has been modified, do you want to save it?',
          buttons: ['Cancel', 'Unsave', 'Save']
        }, sn => {
          resolve(sn);
        });
      });
      if (sn === 1) {
        this.props.specActions.updateSpec(this.yaml);
        this.showfile(this.file);
      } else if (sn === 2) {
        await this.save();
      } else {
        return -1;
      }
    }
    if (!keep) {
      this.yaml = untitled;
      this.props.specActions.updateSpec(untitled);
      this.showfile();
    }
  }
  showfile(file = '') {
    this.file = file;
    let basename = path.basename(file);
    this.refs.file.innerHTML = basename || 'untitled.yaml';
    this.refs.file.title = file || 'untitled.yaml';
    document.title = file || 'Swagger Editor';
    this.changed = false;
    this.setState(); // rerender
  }

  async dump() {
    let sn = await new Promise((resolve, reject) => {
      dialog.showMessageBox({
        title: 'Info',
        message: 'Dump will delete all blank lines and comments, do you still want to continue?',
        buttons: ['Cancel', 'Dump']
      }, sn => {
        resolve(sn);
      });
    });
    if (sn === 1) {
      let editorContent = this.props.specSelectors.specStr();
      let jsonContent = YAML.safeLoad(editorContent);
      let yamlContent = YAML.safeDump(jsonContent);
      this.props.specActions.updateSpec(yamlContent);
    }
  }
  async gen() {
    // 
  }
  async config() {
    ipc.send('preferences', 'open');
  }
  about() {
    ipc.send('about', 'open');
  }
  win() {
    if (this.newwindowOpening) {
      return ;
    }
    this.newwindowOpening = true;
    setTimeout(() => this.newwindowOpening = false, 1000);
    ipc.send('window', 'new');
  }
}

class YioLayout extends React.Component {
  render() {
    const { getComponent } = this.props
    const Topbar = getComponent("Topbar", true)
    const EditorLayout = getComponent("EditorLayout", true)
    return React.createElement('div', null, [
      React.createElement(Topbar, {key: 'topbar'}),
      React.createElement(EditorLayout, {key: 'EditorLayout'})
    ]);
  }
}

module.exports = function() {
  return [
    function() {
      return {
        components: {
          Topbar,
          YioLayout,
          schemes
        },
        statePlugins: {
          editor: {
            wrapActions: {
              onLoad: (ori, sys) => (context) => {
                const {editor} = context;
                // ori(context);
                global.editor = editor;
                editor.commands.addCommand({
                  name: 'open',
                  bindKey: {
                      mac: 'Command-O',
                      win: 'Ctrl-O'
                  },
                  exec: function(env, args, request) {
                    editAction.open && editAction.open();
                  }
                });
                editor.commands.addCommand({
                  name: 'save',
                  bindKey: {
                      mac: 'Command-S',
                      win: 'Ctrl-S'
                  },
                  exec: function(env, args, request) {
                    editAction.save && editAction.save();
                  }
                });
                editor.commands.addCommand({
                  name: 'resave',
                  bindKey: {
                      mac: 'Command-Shift-S',
                      win: 'Ctrl-Shift-S'
                  },
                  exec: function(env, args, request) {
                    editAction.save && editAction.save(true);
                  }
                });
                editor.commands.addCommand({
                  name: 'dump',
                  bindKey: {
                      mac: 'Command-Shift-D',
                      win: 'Ctrl-Shift-D'
                  },
                  exec: function(env, args, request) {
                    editAction.dump && editAction.dump();
                  }
                });
                return ;
              }
            },
          }
        }
      }
    }
  ]
};

// accept Preferences Windows message
ipc.on('preferencesUpdated', (e, preferences) => {
  if (editor) {
    const {editor: editorPref = {}} = preferences;
    editor.setOption('showInvisibles', editorPref.showInvisibles === 'true');
  } else {
    console.warn('editor is not able now');
  }
});
ipc.on('history', (e, shouldOpen) => {
  if (shouldOpen) {
    editAction.openLast();
  }
});