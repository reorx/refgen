const QS = document.querySelector.bind(document)
const QSA = document.querySelectorAll.bind(document)
const STORAGE_KEYS = ['settings', 'siteSettingsMap']
const S_KEY = {
  // global settings
  defaultFormat: "defaultFormat",
  // site settings
  alwaysUseCanonicalUrl: "canonicalUrl",
  urlParams: "urlParams",
}


/* Class definition */

class App {
  constructor() {
    this.data = {
      title: null,
      url: null,
      canonicalUrl: null,
      displayUrl: null,
    }
    this.domain = null
    this.settings = {}
    this.siteSettingsMap = {}

    /* Content pane */

    this.elRef = QS('#d-ref')
    this.elRef.addEventListener("keydown", (e) => {
      console.log('keydown')
      if (e.ctrlKey && e.metaKey && e.key === "c") {
        console.log('key combo: ctrl+meta+c')
        this.copyRefAsHTML()
        this.elCopyHTMLBtn.focus()
        return
      } else if (e.ctrlKey && e.metaKey && e.key === "u") {
        console.log('key combo: ctrl+meta+l')
        this.copyURL()
        this.elCopyURLBtn.focus()
        return
      }
    });
    this.elRef.addEventListener("keyup", () => {
      console.log('keyup')
      this.renderPreview()
    });
    this.elRef.addEventListener("focus", () => {
      this.elRef.select()
    })
    const selectRefOnEnter = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.elRef.select()
      }
    }

    this.elTitle = QS('#d-title')
    this.elTitle.addEventListener('input', () => {
      this.data.title = this.elTitle.value
      this.renderRef()
      this.renderPreview()
    })
    this.elTitle.addEventListener('keydown', selectRefOnEnter)
    this.elUrl = QS('#d-url')
    this.elUrl.addEventListener('input', () => {
      this.data.displayUrl = this.elUrl.value
      this.renderRef()
    })
    this.elUrl.addEventListener('keydown', selectRefOnEnter)

    /* Action pane */

    this.elCanonicalUrl = QS('#d-canonical-url')

    this.elCanonicalUrlBtn = QS('#f-canonical-url')
    this.elCanonicalUrlBtn.addEventListener('click', () => {
      this.data.displayUrl = this.data.canonicalUrl
      this.renderRef()
    })
    this.elCanonicalUrlCheckbox = QS('#f-canonical-url-always')
    this.elCanonicalUrlCheckbox.addEventListener('change', () => {
      console.log('elCanonicalUrlCheckbox change')
      this.updateSiteSettings(S_KEY.alwaysUseCanonicalUrl, this.elCanonicalUrlCheckbox.checked)
    })

    this.elParamsContent = QS('#section-params .content')

    this.elFormat = QS('#d-format')
    this.elFormat.addEventListener('change', () => {
      this.renderRef()
    })

    this.elCopyBtn = QS('#f-copy')
    this.elCopyBtn.addEventListener('click', () => {
      this.copyRef()
    });

    this.elCopyHTMLBtn = QS("#f-copy-html")
    this.elCopyHTMLBtn.addEventListener('click', () => {
      this.copyRefAsHTML()
    });

    this.elCopyURLBtn = QS("#f-copy-url")
    this.elCopyURLBtn.addEventListener('click', () => {
      this.copyURL()
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

    this.elPreview = QS('#html-preview')
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
      case 'mediawiki':
        return new MediaWikiFormatter()
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
    this.domain = new URL(url).hostname
    this.data.url = url
    this.data.title = tab.title.trim()

    let canExecuteScript = true;
    if (url.startsWith('https://chrome.google.com/webstore')) {
      canExecuteScript = false;
    }

    if (canExecuteScript) {
      // promise
      chrome.scripting.executeScript(
        {
          target: {tabId: tab.id},
          func: executeInTab,
        },
        (results) => {
          console.log('results', results);
          const data = results[0].result

          // selection
          const title = normalizeTitle(data.selection)
          if (title) {
            self.data.title = title;
          }

          // canonical url
          if (data.canonicalUrl)
            self.data.canonicalUrl = data.canonicalUrl

          self.render();
        });
    } else {
      self.render();
    }
  }

  render() {
    this.renderData()
    this.renderSettings()
  }

  renderRef() {
    const formatter = this.getFormatter()
    const refUrl = this.getRefUrl()
    const text = formatter.renderLink(this.data.title, refUrl)
    this.elRef.value = text
    this.elUrl.value = refUrl
  }

  renderData() {
    const site = this.getSiteSettings()

    // content
    this.renderRef()
    this.renderPreview()
    this.elRef.select()

    // title
    this.elTitle.value = this.data.title

    // cannonical url
    const canonicalUrl = this.data.canonicalUrl
    if (canonicalUrl) {
      QS('#section-canonical-url').style.display = 'block'
      this.elCanonicalUrl.innerHTML = canonicalUrl
      this.elCanonicalUrl.classList.remove('muted-text')
      this.elCanonicalUrlBtn.disabled = false
      this.elCanonicalUrlCheckbox.disabled = false
    } else {
      QS('#section-canonical-url').style.display = 'none'
      this.elCanonicalUrl.innerHTML = 'No Canonical URL'
      this.elCanonicalUrl.classList.add('muted-text')
      this.elCanonicalUrlBtn.disabled = true
      this.elCanonicalUrlCheckbox.disabled = true
    }
    this.elCanonicalUrlCheckbox.checked = site[S_KEY.alwaysUseCanonicalUrl] || false

    // url params
    const parsedUrl = new URL(this.data.url)
    const params = parsedUrl.searchParams
    const siteUrlParams = site[S_KEY.urlParams] || {}
    let hasParams = false
    for (const [key, value] of params) {
      hasParams = true
      const div = createElement('div', 'input-group')
      const elId = `url-param-${key}`
      // create checkbox input for each key value pair
      const el = document.createElement('input')
      el.type = 'checkbox'
      el.name = key
      el.value = value
      el.id = elId
      el.checked = siteUrlParams[key] || false
      el.addEventListener('change', (e) => {
        siteUrlParams[e.target.name] = e.target.checked
        this.updateSiteSettings(S_KEY.urlParams, siteUrlParams)
        this.renderRef()
      })
      div.appendChild(el)
      div.appendChild(
        createElement('label', '', key, {
          'for': elId
        })
      )

      // append div to this.elParamsContent
      this.elParamsContent.appendChild(div)
    }
    if (hasParams)
      QS('#section-params').style.display = 'block'

    // format
    const v = this.settings[S_KEY.defaultFormat]
    if (v) {
      this.elFormat.value = v
    }
  }

  renderPreview() {
    const link = this.createLinkElement()

    if (link) {
      this.elPreview.innerHTML = link.outerHTML
    } else {
      this.elPreview.innerHTML = '<span class="error">Invaild link</span>'
    }
  }

  renderSettings() {
    const defaultFormat = this.settings[S_KEY.defaultFormat]
    if (defaultFormat) {
      QS('input[name="default-format"][value="' + defaultFormat + '"]').checked = true
    }
  }

  /* Actions */

  cleanUrlParams(url) {
    const parsedUrl = new URL(url)
    const params = parsedUrl.searchParams
    const siteUrlParams = this.getSiteSettings()[S_KEY.urlParams]
    console.log('cleanUrlParams', params, siteUrlParams)
    if (siteUrlParams) {
      for (const key of Object.keys(siteUrlParams)) {
        if (siteUrlParams[key] && params.has(key)) {
          params.delete(key)
        }
      }
    }
    return parsedUrl.toString()
  }

  getRefUrl() {
    const site = this.getSiteSettings()

    let url = this.data.displayUrl
    if (!url) {
      url = this.data.url
      if (site[S_KEY.alwaysUseCanonicalUrl] && this.data.canonicalUrl)
        url = this.data.canonicalUrl
    }
    url = this.cleanUrlParams(url)
    return url
  }

  copyRef() {
    this.elRef.select();
    document.execCommand('copy');
  }

  copyURL() {
    this.elUrl.select()
    document.execCommand('copy')
  }

  copyRefAsHTML() {
    const link = this.createLinkElement()
    if (!link) {
      return
    }
    const mark = wrapMarkForEl(link);
    document.body.appendChild(mark);
    copyEl(mark);
  }

  createLinkElement() {
    return createLink(this.data.title, this.getRefUrl())
  }

  /* Storage */

  loadSettings() {
    const self = this
    return chrome.storage.sync.get(STORAGE_KEYS).then((data) => {
      console.log('loadSettings', JSON.stringify(data))
      if (data.settings)
        self.settings = data.settings
      if (data.siteSettingsMap)
        self.siteSettingsMap = data.siteSettingsMap
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

  getSiteSettings() {
    let siteSettings = this.siteSettingsMap[this.domain]
    if (!siteSettings) {
      siteSettings = {}
      this.siteSettingsMap[this.domain] = siteSettings
    }
    return siteSettings
  }

  updateSiteSettings(k, v) {
    const siteSettings = this.getSiteSettings()
    siteSettings[k] = v
    // console.log('updateSiteSettings', this.siteSettingsMap)

    return chrome.storage.sync.set({
      siteSettingsMap: this.siteSettingsMap,
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

const executeInTab = function() {
  const data = {}

  // get selection
  data.selection = window.getSelection().toString();

  // get canonical url
  const canonicalLink = document.querySelector('link[rel="canonical"]')
  if (canonicalLink)
    data.canonicalUrl = canonicalLink.href;
  return data
}

const normalizeTitle = function(title) {
  return title.replace(/\n/g, ' ').trim()
}

const createElement = function(tagName, className, text, attrs) {
  const el = document.createElement(tagName)
  if (className)
    el.className = className
  if (text)
    el.textContent = text
  if (attrs) {
    for (const key in attrs) {
      el.setAttribute(key, attrs[key])
    }
  }
  return el
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
