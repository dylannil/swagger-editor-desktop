
class Schemes extends React.Component {

  componentWillMount() {
    let { schemes } = this.props

    //fire 'change' event to set default 'value' of select
    this.setScheme(schemes.first())

    window.rewrite = undefined;
  }

  componentWillReceiveProps(nextProps) {
    if ( !this.props.currentScheme || !nextProps.schemes.includes(this.props.currentScheme) ) {
      // if we don't have a selected currentScheme or if our selected scheme is no longer an option,
      // then fire 'change' event and select the first scheme in the list of options
      this.setScheme(nextProps.schemes.first())
    }
  }

  render() {
    let { schemes } = this.props

    return React.createElement('label', {
      htmlFor: "schemes"
    }, [
      React.createElement('span', {className: "schemes-title"}, "Schemes"),
      React.createElement('div', {}, [
        React.createElement('select', {
          onChange: e => this.onChange(e)
        }, schemes.valueSeq().map(s => {
          return React.createElement('option', {
            value: s,
            key: s
          }, s);
        }).toArray()),
        process.env.NODE_ENV === 'debug' && React.createElement('button', {
          className: 'btn rewrite',
          onClick: e => this.showRewrite(e)
        }, [
          React.createElement('span', null, "Rewrite"),
          React.createElement('svg', {width: "20", height: "20"}, React.createElement('use', {href: '#rewrite'}))
        ])
      ]),
      (this.state || {}).rewrite ? this.renderPopup() : false
    ]);
  }
  renderPopup() {
    const {rewriteCodeIsLegal} = this.state || {};
    return React.createElement('div', {
      className: 'dialog-ux'
    }, [
      React.createElement('div', {className: "backdrop-ux"}),
      React.createElement('div', {className: "modal-ux"},
        React.createElement('div', {className: "modal-dialog-ux"},
          React.createElement('div', {className: "modal-ux-inner"}, [
            React.createElement('div', {className: "modal-ux-header"},[
              React.createElement('h3', null, 'Rewrite requests'),
              React.createElement('button', {
                type: 'button',
                className: 'close-modal',
                onClick: e => this.closeRewrite()
              }, React.createElement('svg', {
                width: "20",
                height: "20"
              }, React.createElement('use', {href: '#close'})))
            ]),
            React.createElement('div', {className: "modal-ux-content"}, [
              React.createElement('p', null, 'Modify requests before sending out to the remote server.'),
              React.createElement('textarea', {
                className: "rewrite-textarea" + (rewriteCodeIsLegal === false ? ' error' : ''),
                placeholder: "req.url += '?x=1'",
                defaultValue: this.rewriteCode || '',
                onChange: e => this.useRewrite(e)
              })
            ])
          ])
        )
      )
    ]);
  }

  onChange(e) {
    this.setScheme(e.target.value);
  }

  setScheme(value) {
    let { path, method, specActions } = this.props

    specActions.setScheme( value, path, method )
  }

  showRewrite() {
    this.setState({rewrite: true});
  }
  closeRewrite() {
    this.setState({rewrite: false});
  }
  useRewrite(e) {
    try {
      this.rewriteCode = e.target.value;
      eval('window.rewrite = function(req) { ' + this.rewriteCode + '; return req; }');
      this.setState({rewriteCodeIsLegal: true});
    } catch (e) {
      this.setState({rewriteCodeIsLegal: false});
      window.rewrite = undefined;
    }
  }
}

module.exports = Schemes;