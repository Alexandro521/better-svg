import { injectSelectComponent } from './select_component.js'

const vscode = acquireVsCodeApi()

const $ = document.querySelector.bind(document)

/**
 * @type {HTMLDivElement}
 */

const exportFormats = $('#format-export')
const resolutionOptions = $('#resolutions')
const fitOptions = $('#image-fit')

const svgContainer = $('#previewSvg')
const outpath = $('#outpath')
const inputs = document.querySelectorAll('input[type=number]')
/**
 * @type {HTMLInputElement}
 */
const pixelDensity = $('#pixel-density')
const qualityPercent = $('#quality-percent')
const imgHeight = $('#img-height')
const imgWidth = $('#img-width')
const exportBtn = $('#btn-set-dir')

injectSelectComponent(exportFormats, sendState)
injectSelectComponent(fitOptions, sendState)

injectSelectComponent(resolutionOptions, (option, value) => {
  if (value === 'custom') {
    imgHeight.parentElement.classList.remove('no-user-input')
  } else {
    imgHeight.parentElement.classList.add('no-user-input')
    const [width, height] = value.split(',')
    imgHeight.value = height
    imgWidth.value = width
  }
  sendState()
})

inputs.forEach(input => {
  input.addEventListener('change', sendState)
})

exportBtn.addEventListener('click', (e) => {
  vscode.postMessage({
    type: 'openFileDialog',
  })
})

function saveCurrentState () {
  const state = [
    {
      type: 'select',
      elementId: exportFormats.id,
      state: {
        value: exportFormats.querySelector('.current-value').getAttribute('value'),
        plainText: exportFormats.querySelector('.current-value').textContent
      }
    },
    {
      type: 'select',
      elementId: fitOptions.id,
      state: {
        value: fitOptions.querySelector('.current-value').getAttribute('value'),
        plainText: fitOptions.querySelector('.current-value').textContent
      }
    },
    {
      type: 'select',
      elementId: resolutionOptions.id,
      state: {
        value: resolutionOptions.querySelector('.current-value').getAttribute('value'),
        plainText: resolutionOptions.querySelector('.current-value').textContent
      }
    },
    {
      type: 'input',
      elementId: pixelDensity.id,
      state: pixelDensity.value
    },
    {
      type: 'input',
      elementId: qualityPercent.id,
      state: qualityPercent.value
    },
    {
      type: 'input',
      elementId: imgHeight.id,
      state: imgHeight.value
    },
    {
      type: 'input',
      elementId: imgWidth.id,
      state: imgWidth.value
    },
    {
      type: 'generic',
      elementId: outpath.id,
      state: {
        value: outpath.getAttribute('value'),
        plainText: outpath.textContent
      }
    },
    {
      type: 'generic',
      elementId: outpath.id,
      state: {
        value: outpath.getAttribute('value'),
        plainText: outpath.textContent
      }
    }
  ]
  return JSON.stringify(state)
}

function setCurrentState (state) {
  if (!state) return

  const data = JSON.parse(state)

  data.forEach((e) => {
    /**
     * @type {HTMLElement}
     */

    const element = $(`#${e.elementId}`)
    switch (e.type) {
      case 'select':
        element.querySelector('.current-value').setAttribute('value', e.state.value)
        element.querySelector('.current-value').textContent = e.state.plainText
        break
      case 'input':
        element.value = e.state
        break
      case 'generic':
        element.setAttribute('value', e.state.value)
        element.textContent = e.state.plainText
        break
    }
  })
}

function sendState () {
  vscode.postMessage({
    type: 'sendContext',
    state: saveCurrentState()
  })
}

window.addEventListener('message', (e) => {
  const message = e.data
  switch (message.type) {
    case 'fileSystem':
      outpath.textContent = message.dir.path
      outpath.setAttribute('value', message.dir.path)
      sendState()
      break
    case 'saveState':
      sendState()
      break
    case 'setState':
      setCurrentState(message.state)
      break
    case 'setSvgContent':
      svgContainer.innerHTML = message.svg
      sendState()
      break
  }
})
