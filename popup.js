const QS = document.querySelector.bind(document)
const QSA = document.querySelectorAll.bind(document)
const S_KEY = {
  defaultFormat: "defaultFormat",
}


/* Class definition */

class App {
  constructor() {
    this.data = {
      title: null,
      url: null,
    }
    this.settings = {}

    /* Main pane */

    this.elContent = QS('#d-content')
    this.elContent.addEventListener("keydown", (e) => {
      console.log('keydown')
      if (e.ctrlKey && e.metaKey && e.key === "c") {
        console.log('key combo: ctrl+meta+c')
        this.copyContentAsHTML()
        this.elCopyHTMLBtn.focus()
        return
      }
    });
    this.elContent.addEventListener("keyup", () => {
      console.log('keyup')
      this.renderPreview()
    });

    /* Action pane */

    this.elFormat = QS('#d-format')
    this.elFormat.addEventListener('change', () => {
      this.render()
    })

    this.elCopyBtn = QS('#f-copy')
    this.elCopyBtn.addEventListener('click', () => {
      this.copyContent()
    });

    this.elCopyHTMLBtn = QS("#f-copy-html")
    this.elCopyHTMLBtn.addEventListener('click', () => {
      this.copyContentAsHTML()
    });

    /* Settings pane */

    // when click #f-settings, toggle #settings-pane display
    QS('#f-settings').addEventListener('click', () => {
      const el = QS('#settings-pane')
      console.log('click #f-settings', el.style.display)
      if (el.offsetParent === null) {
        el.style.display = 'block'
      } else {
        el.style.display = 'none'
      }
    })

    QSA('input[name="default-format"]').forEach(el => {
      el.addEventListener('change', (e) => {
        console.log('change input default-format', e)
        const defaultFormat = e.target.value
        this.elFormat.value = defaultFormat
        // dispatch change event on elFormat
        this.elFormat.dispatchEvent(new Event('change'))

        // save settings
        const d = {}
        d[S_KEY.defaultFormat] = defaultFormat
        this.saveSettings(d).then(() => {
          console.log('saveSettings done')
        })
      })
    })

    /* Preview pane */

    this.elPreview = QS('#preview-pane')
  }

  getDefaultFormat() {
    return QS('input[name="default-format":checked]').value
  }

  getFormat() {
    // get the option of <select> from this.elFormat
    return this.elFormat.options[this.elFormat.selectedIndex].value
  }

  getFormatter() {
    switch (this.getFormat()) {
      case 'markdown':
        return new MarkdownFormatter()
      case 'asciidoc':
        return new AsciidocFormatter()
      case 'rst':
        return new RSTFormatter()
      case 'html':
        return new HTMLFormatter()
    }
  }

  handleTab(tab) {
    const url = tab.url || tab.pendingUrl;
    if (!url) {
      return;
    }
    // ignore chrome internal urls (chrome://...)
    if (url.startsWith('chrome')) {
      return;
    }
    const self = this
    this.data.url = url
    this.data.title = tab.title.trim()

    let canGetSelection = true;
    if (url.startsWith('https://chrome.google.com/webstore')) {
      canGetSelection = false;
    }

    if (canGetSelection) {
      // promise
      chrome.scripting.executeScript(
        {
          target: {tabId: tab.id},
          func: getSelection,
        },
        (results) => {
          // console.log('results', results);
          const text = results[0].result.trim()
          if (text) {
            self.data.title = text;
          }

          self.render();
        });
    } else {
      self.render();
    }
  }

  render() {
    this.renderContent()
    this.renderPreview()
  }

  renderContent() {
    const formatter = this.getFormatter()
    const text = formatter.renderLink(this.data.title, this.data.url)
    this.elContent.value = text;
    this.elContent.select();
  }

  copyContent() {
    this.elContent.select();
    document.execCommand('copy');
  }

  copyContentAsHTML() {
    const link = this.createLinkFromContent()
    if (!link) {
      return
    }
    const mark = wrapMarkForEl(link);
    document.body.appendChild(mark);
    copyEl(mark);
  }

  createLinkFromContent() {
    const text = this.elContent.value
    const format = this.getFormat()
    const formatter = this.getFormatter()
    if (format === 'html') {
      return formatter.createLink(text)
    } else {
      const matched = formatter.parseLink(text)
      // console.log('createLinkFromContent', text, matched)
      if (matched) {
        return createLink(matched.title, matched.url)
      }
    }
  }

  renderPreview() {
    const link = this.createLinkFromContent()

    if (link) {
      this.elPreview.innerHTML = link.outerHTML
    } else {
      this.elPreview.innerHTML = '<span class="error">Invaild link</span>'
    }
  }

  renderFormat() {
    const v = this.settings[S_KEY.defaultFormat]
    if (v) {
      this.elFormat.value = v
    }
  }

  renderSettings() {
    const defaultFormat = this.settings[S_KEY.defaultFormat]
    if (defaultFormat) {
      QS('input[name="default-format"][value="' + defaultFormat + '"]').checked = true
    }
  }

  loadSettings() {
    const self = this
    return chrome.storage.sync.get(['settings']).then((data) => {
      console.log('loadSettings', data)
      if (data.settings) {
        self.settings = data.settings
      }
      self.renderFormat()
      self.renderSettings()
    })
  }

  saveSettings(data) {
    // loop key value in data
    for (const key in data) {
      this.settings[key] = data[key]
    }
    console.log('save settings', this.settings)

    return chrome.storage.sync.set({
      settings: this.settings,
    })
  }
}


/* Main execution */

const app = new App()

app.loadSettings().then(() => {
  chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
    const tab = tabs[0];
    app.handleTab(tab)
  });
})


/* Functions */

const getSelection = function() {
  const sel = window.getSelection().toString();
  return sel;
}

const wrapMarkForEl = function(el) {
  const mark = document.createElement("div");
  // Reset box model
  mark.style.border = "0";
  mark.style.padding = "0";
  mark.style.margin = "0";
  // Move element out of screen
  mark.style.position = "fixed";
  mark.style["right"] = "-9999px";
  mark.style.top =
    (window.pageYOffset || document.documentElement.scrollTop) + "px";
  // more hiding
  mark.setAttribute("readonly", "");
  mark.style.opacity = 0;
  mark.style.pointerEvents = "none";
  mark.style.zIndex = -1;
  mark.setAttribute("tabindex", "0"); // so it can be focused
  //mark.innerHTML = html;
  mark.appendChild(el);
  return mark;
}

const wrapMarkForElNoHide = function(el) {
  const mark = document.createElement("div");
  mark.appendChild(el);
  return mark;
}

const createLink = function(title, url) {
  const a = document.createElement("a");
  a.textContent = title;
  a.href = url;
  return a;
}

const copyEl = function(el) {
  range = document.createRange();
  selection = document.getSelection();
  range.selectNode(el);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("copy");
}

class MarkdownFormatter {
  renderLink(title, url) {
    return `[${title}](${url})`
  }

  parseLink(text) {
    // regex parse [title](url) from text
    const regex = /\[([^\]]+)\]\(([^\)]+)\)/g;

    let match = regex.exec(text);
    // if match, return first and second group
    if (match) {
      return {
        title: match[1],
        url: match[2],
      };
    }
  }
}

class AsciidocFormatter {
  renderLink(title, url) {
    return `${url}[${title}]`
  }

  parseLink(text) {
    // regex parse url[title] from text
    const regex = /([^\)]+)\[([^\]]+)\]/g;

    let match = regex.exec(text);
    // if match, return first and second group
    if (match) {
      return {
        title: match[2],
        url: match[1],
      };
    }
  }
}

class RSTFormatter {
  renderLink(title, url) {
    return `\`${title} <${url}>\`_`
  }

  parseLink(text) {
    // regex parse `url <title>`_ from text
    const regex = /\`([^<]+)\s<([^>]+)>\`_/g;

    let match = regex.exec(text);
    // if match, return first and second group
    if (match) {
      return {
        title: match[1],
        url: match[2],
      };
    }
  }
}

class MediaWikiFormatter {
  renderLink(title, url) {
    return `[${url} ${title}]`
  }

  parseLink(text) {
    // regex parse [url title] from text
    const regex = /\[([^\]]+)\s([^\]]+)\]/g;

    let match = regex.exec(text);
    // if match, return first and second group
    if (match) {
      return {
        title: match[2],
        url: match[1],
      };
    }
  }
}

class HTMLFormatter {
  renderLink(title, url) {
    return `<a href="${url}">${title}</a>`
  }

  createLink(text) {
    const div = document.createElement('div')
    div.innerHTML = text
    return div.firstChild
  }
}
