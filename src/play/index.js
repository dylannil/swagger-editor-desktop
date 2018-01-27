/**
 * YioLayout
 */

const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const {dialog} = require('electron').remote;

class Topbar extends React.Component {
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
      }, React.createElement('div', {
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
              className: 'topbar-name-btns'
            }, [
              !!this.file && React.createElement('div', {
                className: 'topbar-name-btn border-right',
                onClick: () => this.save()
              }, 'save'),
              React.createElement('div', {
                className: 'topbar-name-btn',
                onClick: () => this.save(true)
              }, 'save as ...')
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
      )
    );
  }
  async open() {
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
      dialog.showOpenDialog({
        buttonLabel: 'open',
        properties: ['openFile', 'createDirectory'],
        filters: [{name: 'yaml', extensions: ['yaml']}],
        message: 'open a swagger file to read & edit'
      }, filePaths => {
        let file = (filePaths || [])[0];
        if (file) {
          file = path.resolve(file);
          fs.readFile(file, (err, data) => {
            var code = data.toString();
            this.yaml = YAML.safeDump(YAML.safeLoad(code));
            this.props.specActions.updateSpec(this.yaml);
            this.showfile(file);
          });
        }
      })
    }
  }
  async save(resave) {
    let editorContent = this.props.specSelectors.specStr();
    let jsContent = YAML.safeLoad(editorContent);
    let yamlContent = YAML.safeDump(jsContent);
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
  showfile(file = '') {
    this.file = file;
    let basename = path.basename(file);
    this.refs.file.innerHTML = basename || 'untitled.yaml';
    this.refs.file.title = file || 'untitled.yaml';
    document.title = file || 'Swagger Editor';
    this.changed = false;
    this.setState(); // rerender
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
          YioLayout
        }
      }
    }
  ]
};