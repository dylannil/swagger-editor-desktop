/**
 * YioLayout
 */

const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const {dialog} = require('electron').remote;

class Topbar extends React.Component {
  render() {
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
            title: '打开文件',
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
            }, 'untitled.yaml')
          ])
        ])
      )
    );
  }
  async open() {
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
          this.showfile(file);
          var code = data.toString();
          this.props.specActions.updateSpec(YAML.safeDump(YAML.safeLoad(code)));
        });
      }
    })
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
      fs.writeFile(file, yamlContent, err => {
        this.showfile(file);
        if (err) {
          alert(err);
        }
      });
    }
  }
  showfile(file) {
    this.file = file;
    let basename = path.basename(file);
    this.refs.file.innerHTML = basename;
    this.refs.file.title = file;
    document.title = file;
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