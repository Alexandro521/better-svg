import { injectSelectComponent } from './select_component.js'

// const vscode = acquireVsCodeApi()

const $ = (id) => document.querySelector(id)

/**
 * @type {HTMLDivElement}
 */

const exportOptions = $('#format-export')
const resolutionOptions = $('#resolutions')
const fitContentOptions = $('#image-fit')
// const exportBtn = $('#btn-select-dir')

injectSelectComponent(exportOptions)
injectSelectComponent(fitContentOptions)
injectSelectComponent(resolutionOptions, (option, value) => {
  console.log('holla')
})
/*
exportBtn.addEventListener('click', (e) => {
    vscode.postMessage({
        command: 'fileSystem',
    })
})

window.addEventListener('message', (e) => {
    const message = e.data
    switch (message.command) {
        case 'fileSystem': {
            document.getElementById('outFs').textContent = 'hola mundo'
        }
    }
})
*/
