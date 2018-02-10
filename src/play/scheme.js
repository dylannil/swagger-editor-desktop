const {ipcRenderer: ipc} = require('electron');
const storage = require('electron-json-storage');
const {guid} = require('./util');

const acts = window.acts = {};
class Schemes extends React.Component {

  componentWillMount() {
    let { schemes } = this.props

    //fire 'change' event to set default 'value' of select
    this.setScheme(schemes.first())

    window.rewrite = undefined;

    // 
    this.getRewriteRules();
    acts.refreshRules = () => this.getRewriteRules();
  }

  componentWillReceiveProps(nextProps) {
    if ( !this.props.currentScheme || !nextProps.schemes.includes(this.props.currentScheme) ) {
      // if we don't have a selected currentScheme or if our selected scheme is no longer an option,
      // then fire 'change' event and select the first scheme in the list of options
      this.setScheme(nextProps.schemes.first())
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.rules) {
      try {
        this.rewriteCode = [];
        for (let i = 0; i < this.rules.length; i++) {
          let rule = this.rules[i];
          if (rule.code && rule.used) {
            this.rewriteCode.push(rule.code);
          }
        }
        eval('window.rewrite = function(req) {\n' + this.rewriteCode.join(';\n') + ';\n  return req;\n}');
      } catch (e) {
        window.rewrite = undefined;
      }
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
        React.createElement('button', {
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
              (this.rules || []).map((r, i) => React.createElement('div', {
                key: r.desc + i,
                className: 'rewrite-rule' + (r.used ? ' inuse' : ''),
                onClick: e => this.useRewriteRule(r, i)
              }, [
                React.createElement('div', {className: 'rewrite-rule-head'}, [
                  React.createElement('button', {className: 'rewrite-rule-fold', onClick: e => {e.stopPropagation(); this.foldRewriteRule(r, i)}},
                    React.createElement('svg', {className: 'arrow', width: 20, height: 20}, 
                      React.createElement('use', {href: r.fold === false ? '#large-arrow-down' : '#large-arrow'})
                    ),
                  ),
                  React.createElement('input', {
                    ref: r => {
                      this.descareas || (this.descareas = {});
                      this.descareas[i] = r;
                    },
                    className: 'rewrite-rule-desc',
                    type: 'text',
                    placeholder: 'Description here',
                    disabled: !r.edit,
                    defaultValue: r.desc,
                    onClick: e => {r.edit && e.stopPropagation()}
                  }),
                  r.fold === false && React.createElement('button', {
                    className: 'rewrite-rule-btn' + (r.edit ? ' inedit' : '') + (r.legal === false ? ' error' : ''),
                    onClick: e => {e.stopPropagation(); !r.edit ? this.editRewriteRule(r, i) : this.saveRewriteRule(r, i)}
                  }, r.edit ? 'save' : 'edit'),
                  r.fold === false && React.createElement('button', {
                    className: 'rewrite-rule-btn remove',
                    onClick: e => {e.stopPropagation(); this.removeRewriteRule(r, i)}
                  }, 'remove'),
                ]),
                (r.fold === false) && (r.edit ? React.createElement('textarea', {
                  ref: r => {
                    this.textareas || (this.textareas = {});
                    this.textareas[i] = r;
                  },
                  className: "rewrite-textarea",
                  placeholder: "e.g.\n\nconsole.log(req);\nreq.url += '?foo=bar';\nreq.body = JSON.stringify(JSON.parse(req.body));",
                  defaultValue: r.code || '',
                  disabled: !r.edit,
                  onChange: e => this.validRewriteRule(r, i, e.target.value || ''),
                  onClick: e => e.stopPropagation()
                }) : React.createElement('div', {
                  className: "rewrite-codeshow"
                }, r.code || '// No code here...'))
              ])),
              React.createElement('div', {
                className: 'rewrite-rule new',
                onClick: e => this.newRewriteRule()
              }, 'New Rule ...')
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
    // 
    this.saveToStore();
  }

  getRewriteRules() {
    storage.get('rewrite_rules', (err, data) => {
      this.uses = data && data.uses || {};
      let ids = window.file && this.uses[window.file] || [];
      this.rules = (data && data.rules || [
        {
          id: "2baf110a-aa45-c688-de3c-67f2d66795eb",
          desc: 'Do log',
          code: 'console.log(req)',
          legal: true
        }
      ]).map(r => {
        r.fold = true;
        r.edit = false;
        r.used = (ids.indexOf(r.id) !== -1);
        return r;
      });
      this.setState();
    });
  }
  newRewriteRule() {
    let rule = {
      id: guid(),
      desc: '',
      code: '',
      edit: true,
      fold: false
    };
    this.rules.push(rule);
    this.setState();
  }
  removeRewriteRule(r, i) {
    this.rules.splice(i, 1);
    this.setState();
    // 
    this.saveToStore();
  }
  foldRewriteRule(r, i) {
    if (r.edit) {
      r = this.saveRewriteRule(r, i);
    }
    this.rules.splice(i, 1, Object.assign({}, r, {fold: !r.fold}));
    this.setState();
  }
  editRewriteRule(r, i) {
    this.rules.splice(i, 1, Object.assign({}, r, {edit: true}));
    this.setState();
    setTimeout(() => this.textareas[i].focus());
  }
  saveRewriteRule(r, i) {
    this.rules.splice(i, 1, r = Object.assign({}, r, {
      edit: false,
      code: this.textareas[i].value || '',
      desc: this.descareas[i].value || ''
    }));
    this.setState();
    // 
    this.saveToStore();
    // 
    return r;
  }
  validRewriteRule(r, i, code) {
    try {
      eval('function rewrite(req) { ' + code + '; return req; }');
      r.legal || (this.rules.splice(i, 1, Object.assign({}, r, {legal: true})), this.setState());
    } catch (e) {
      r.legal && (this.rules.splice(i, 1, Object.assign({}, r, {legal: false})), this.setState());
    }
  }
  useRewriteRule(r, i) {
    this.rules.splice(i, 1, Object.assign({}, r, {used: !r.used}));
    this.setState();
  }

  saveToStore() {
    const uses = this.uses || {};
    let ids = uses[window.file] = [];
    storage.set('rewrite_rules', {rules: this.rules.map(it => {
      it.used && ids.push(it.id);
      return {
        id: it.id,
        desc: it.desc,
        code: it.code,
        legal: it.legal
      };
    }), uses});
  }
}

module.exports = Schemes;