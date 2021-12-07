const getSelection = function() {
  const sel = window.getSelection().toString();
  console.log('get selection', sel);
  return sel;
}

chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
  const tab = tabs[0];
  const url = tab.url || tab.pendingUrl;
  if (!url) {
    return;
  }

  let title = tab.title;

  const getRef = function() {
    const ref = `[${title}](${url})`;
    document.querySelector('#d-ref').value = ref;
  }

  // promise
  chrome.scripting.executeScript(
    {
      target: {tabId: tab.id},
      func: getSelection,
    },
    (results) => {
      // console.log('results', results);
      const sel = results[0].result
      if (sel) {
        title = sel;
      }

      // continue logic
      getRef();
    });
});
