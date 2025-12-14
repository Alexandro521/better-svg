/**
 * Copyright 2025 Miguel Ángel Durán
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
/**
 * @type {HTMLInputElement}
*/
const pixelDensity = $('#pixel-density')
const qualityPercent = $('#quality-percent')
const imgHeight = $('#img-height')
const imgWidth = $('#img-width')
const setDirBtn = $('#btn-set-dir')
const fileName = $('#filename')
const inputs = document.querySelectorAll('input')
/**
 * @type {HTMLButtonElement}
 */
const exportBtn = $('#export-btn')
const disposeBtn = $('#dispose-btn')

injectSelectComponent(exportFormats, sendState)
injectSelectComponent(fitOptions, sendState)
injectSelectComponent(resolutionOptions, (_, value) => {
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

setDirBtn.addEventListener('click', (e) => {
  vscode.postMessage({
    type: 'openFileDialog',
  })
})

disposeBtn.addEventListener('click', (e) => {
  vscode.postMessage({
    type: 'dispose',
  })
})
exportBtn.addEventListener('click', (e) => {
  const exportData = {
    svgContent: svgContainer.querySelector('svg').outerHTML,
    density: Number(pixelDensity.value) ?? 300,
    quality: Number(qualityPercent.value) ?? 80,
    output: {
      fileName: fileName.value,
      path: outpath.getAttribute('value') ?? './',
      override: true, // TODO: Implement this later
    },
    format: exportFormats.querySelector('.current-value').getAttribute('value') ?? 'webp',
    fit: fitOptions.querySelector('.current-value').getAttribute('value') ?? 'cover',
    resolution: {
      imgHeight: Number(imgHeight.value) ?? 64,
      imgWidth: Number(imgWidth.value) ?? 64,
    },
  }
  vscode.postMessage({
    type: 'export',
    data: JSON.stringify(exportData)
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
      type: 'input',
      elementId: fileName.id,
      state: fileName.value
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
