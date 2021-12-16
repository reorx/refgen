const QS = document.querySelector.bind(document)


/* Class definition */

class App {
  constructor() {
    this.elContent = QS('#d-content')
    this.data = {
      title: null,
      url: null,
    }

    this.elCopyBtn = QS('#f-copy')
    this.elCopyBtn.addEventListener('click', () => {
      this.copyContent()
    });

    this.elCopyHTMLBtn = QS("#f-copy-html")
    this.elCopyHTMLBtn.addEventListener("click", () => {
      this.copyContentAsHTML()
    });

    this.elContent.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.metaKey && e.key === "c") {
        this.copyContentAsHTML()
        this.elCopyHTMLBtn.focus()
      }
    });
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

          self.renderContent();
        });
    } else {
      self.renderContent();
    }
  }

  renderContent() {
    const text = `[${this.data.title}](${this.data.url})`;
    this.elContent.value = text;
    this.elContent.select();
  }

  copyContent() {
    this.elContent.select();
    document.execCommand('copy');
  }

  copyContentAsHTML() {
    const mark = wrapMarkForEl(createLink(this.data.title, this.data.url));
    document.body.appendChild(mark);
    copyEl(mark);
  }
}


/* Main execution */

const app = new App()

chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
  const tab = tabs[0];
  app.handleTab(tab)
});


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
