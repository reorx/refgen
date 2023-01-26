const QS = document.querySelector.bind(document)
const STORAGE_KEYS = ['settings', 'siteSettingsMap']
const store = {}

function loadSettingsJSON() {
  return chrome.storage.sync.get(STORAGE_KEYS).then((data) => {
    const elJSON = QS('textarea')
    store.settingsJSON = JSON.stringify(data, null, 2)
    elJSON.value = store.settingsJSON
  })
}

loadSettingsJSON()

const exportBth = QS('#f-export')
const importBth = QS('#f-import')
const importMessage = QS('#import-message')

exportBth.addEventListener('click', () => {
  // get datetime in format YYYYMMDD
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  downloadContent(`refgen-settings-export-${dateStr}.json`, store.settingsJSON)
})

importBth.addEventListener('click', () => {
  // get content from file input: input[name="import-file"]
  const elFile = QS('input[name="import-file"]')
  if (elFile.files.length === 0) {
    importMessage.innerHTML = 'No file chosen'
    importMessage.classList.add('error')
    return
  }
  const file = elFile.files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    let data
    try {
      data = JSON.parse(e.target.result)
    } catch (e) {
      importMessage.innerHTML = 'Invalid JSON file: ' + new String(e).toString()
      importMessage.classList.add('error')
      throw e
    }
    console.log('import data', data)
    for (const key of STORAGE_KEYS) {
      if (data[key]) {
        chrome.storage.sync.set({ [key]: data[key] })
      }
    }
    loadSettingsJSON()
    importMessage.innerHTML = 'Import success!'
    importMessage.classList.add('success')
  }
  reader.readAsText(file)
})

function downloadContent(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
