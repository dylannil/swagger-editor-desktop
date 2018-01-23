/**
 * YioLayout
 */

class Topbar extends React.Component {
  render() {
    return React.createElement('div', null, [
      React.createElement('div', {
        key: 'topbar',
        className: 'topbar'
      }, [
        React.createElement('div', {
          key: 'topbar-wrapper',
          className: 'topbar-wrapper'
        }, [
          React.createElement('span', {
            key: 'name',
            className: 'topbar-name'
          }, 'Swagger Editor')
        ])
      ])
    ]);
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