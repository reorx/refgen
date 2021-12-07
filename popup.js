const getSelection = function() {
  const sel = window.getSelection().toString();
  return sel;
}

const elRef = document.querySelector('#d-ref')

document.querySelector('#a-copy').addEventListener('click', () => {
  elRef.select();
  document.execCommand('copy');
});

chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
  const tab = tabs[0];
  const url = tab.url || tab.pendingUrl;
  if (!url) {
    return;
  }
  if (url.startsWith('chrome')) {
    return;
  }


  let title = tab.title.trim();

  const getRef = function() {
    const ref = `[${title}](${url})`;
    elRef.value = ref;
  }

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
        title = text;
      }

      // continue logic
      getRef();
      elRef.select();
    });
});
