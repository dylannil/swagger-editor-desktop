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
          React.createElement('span', {
            key: 'name',
            ref: 'file',
            title: 'untitled.yaml',
            className: 'topbar-name',
            onClick: () => this.save()
          }, 'untitled.yaml')
        ])
      )
    );
  }
  async open() {
    dialog.showOpenDialog({
      buttonLabel: '打开',
      properties: ['openFile', 'createDirectory'],
      filters: [{name: 'yml', extensions: ['yaml']}],
      message: '打开本地SWAGGER配置文件'
    }, filePaths => {
      let file = filePaths[0];
      if (file) {
        this.file = file;
        file = path.resolve(file);
        let basename = path.basename(file);
        fs.readFile(file, (err, data) => {
          this.refs.file.innerHTML = basename;
          this.refs.file.title = file;
          document.title = file;
          var code = data.toString();
          this.props.specActions.updateSpec(YAML.safeDump(YAML.safeLoad(code)));
        });
      }
    })
  }
  async save() {
    let editorContent = this.props.specSelectors.specStr();
    let jsContent = YAML.safeLoad(editorContent);
    let yamlContent = YAML.safeDump(jsContent);
    this.file && fs.writeFile(this.file, yamlContent, (err) => {
      if (err) {
        alert(err);
      }
    });
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