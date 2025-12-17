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

import * as vscode from 'vscode'
import fs from 'fs'
import path from 'path'
import sharp, { type Sharp } from 'sharp'

type Formats = 'jpeg' | 'png' | 'webp' | 'raw'

interface ExportData {
  svgContent: string;
  density: number;
  quality: number;
  output: {
    fileName: string;
    path: string;
    override: boolean;
  };
  format: Formats;
  fit: keyof sharp.FitEnum
  resolution: {
    imgHeight: number;
    imgWidth: number;
  };
}
const avalibleFitModes = ['cover', 'contain', 'fill', 'inside', 'outside']
const avalibleFormats = ['jpeg', 'png', 'webp', 'raw']
const jpegOptions: sharp.JpegOptions = {
  optimizeScans: true,
  optimiseCoding: true,
  progressive: true,
  quality: 80,
  chromaSubsampling: '4:4:4',
  trellisQuantisation: true,
  overshootDeringing: true,
}
const pngOptions: sharp.PngOptions = {
  adaptiveFiltering: true,
  compressionLevel: 5,
  progressive: true,
  quality: 80,
  palette: true,
}
const webpOptions: sharp.WebpOptions = {
  alphaQuality: 80,
  lossless: true,
  nearLossless: true,
  quality: 80
}

export function getWebViewHtml (
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  svgContent: string
) {
  try {
    // Get URIs for webview resources
    const exportScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'src',
        'webview',
        'export-to-image',
        'export.js'
      )
    )
    const moduleScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'src',
        'webview',
        'export-to-image',
        'select_component.js'
      )
    )

    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'src',
        'webview',
        'export-to-image',
        'styles.css'
      )
    )

    const faviconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'static',
        'favicon.ico'
      )
    )

    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'static',
        'better-svg.webp'
      )
    )
    // Read HTML template
    const htmlUri = vscode.Uri.joinPath(
      extensionUri,
      'src',
      'webview',
      'export-to-image',
      'export-view.html'
    )
    const htmlPath = htmlUri.fsPath

    if (!htmlPath) {
      vscode.window.showErrorMessage(
        `Better SVG: export_view.html htmlPath is undefined! URI: ${htmlUri.toString()}`
      )
      throw new Error('export_view.html htmlPath is undefined')
    }

    let html: string

    try {
      html = fs.readFileSync(htmlPath, 'utf8')
    } catch (readError: any) {
      vscode.window.showErrorMessage(
        'Better SVG: Failed to read export_view.html file!\n' +
        `Path: ${htmlPath}\n` +
        `Error: ${readError.message}`
      )
      throw readError
    }

    // Replace placeholders
    html = html
      .replace(/{{favicon}}/g, faviconUri.toString())
      .replace(/{{iconUri}}/g, iconUri.toString())
      .replace(/{{stylesUri}}/g, stylesUri.toString())
      .replace(/{{moduleScriptUri}}/g, moduleScriptUri.toString())
      .replace(/{{exportScriptUri}}/g, exportScriptUri.toString())
      .replace(/{{svgContent}}/g, () => svgContent)

    return html
  } catch (error: any) {
    vscode.window.showErrorMessage(
      'Better SVG: Error in getHtmlForWebview!\n' +
      `Message: ${error.message}\n` +
      `Stack: ${error.stack?.substring(0, 200)}`
    )
    throw error
  }
}
// This class manages the resources and event handlers of the web view, here it also handles communication with the webview
class PanelManager {
  private static currentPanel: vscode.WebviewPanel | undefined
  private static currentState: string | undefined

  static getCurrentPanel (): vscode.WebviewPanel | undefined {
    return PanelManager.currentPanel
  }

  static setCurrentPanel (panel: vscode.WebviewPanel) {
    PanelManager.currentPanel = panel
  }

  static saveState (state: string) {
    PanelManager.currentState = state
  }

  static getState () {
    return PanelManager.currentState
  }

  static clear () {
    PanelManager.currentPanel = undefined
  }

  static async onDidChangeViewState (e: vscode.WebviewPanelOnDidChangeViewStateEvent) {
    if (!PanelManager.currentPanel) return
    if (!PanelManager.currentPanel.visible) return
    // In this context, a message is sent to the WebView to restore its last saved state before closing the WebView
    PanelManager.currentPanel.webview.postMessage({
      type: 'setState',
      state: PanelManager.getState()
    })
  }

  static async onDidReceiveMessage (message: any) {
    let uri: vscode.Uri[] | undefined
    switch (message.type) {
      case 'sendContext':
        /*
        In this context we receive an object from the WebView which contains the most recent state of all its elements,
        we will do you the favor of saving it here in our small drawer for when you need it returned later.
        Because he always loses haha
        */
        if (!message.state) return
        PanelManager.saveState(message.state)
        break
      case 'openFileDialog':
        uri = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: false,
        })
        // We receive a request to open for File Explorer, as a response we send a string with the selected path
        if (!uri || !uri[0]) return
        PanelManager.currentPanel?.webview.postMessage({
          type: 'fileSystem',
          dir: uri[0]
        })
        break
      case 'dispose':
        PanelManager.currentPanel?.dispose()
        break
      case 'export':
        try {
          if (!message.data) throw new Error('No data provided from WebView')
          const exportData = dataParser(message.data)
          await SvgToImage(exportData)
          vscode.window.showInformationMessage(`Exported successfully "${exportData.output.fileName}" to ${exportData.output.path}`)
        } catch (error: any) {
          vscode.window.showErrorMessage(
            'Better SVG: Error in export!\n' +
            `Message: ${error.message}\n` +
            `Stack: ${error.stack?.substring(0, 200)}`
          )
        }
        break
    }
  }

  static onDIdDispose (e:any) {
    PanelManager.clear()
  }
}
// This is the main post, here I declare the main logic as well as the triggers events of my webview
export async function exportToImageHandle (context: vscode.ExtensionContext, svgContent: string) {
  if (!svgContent || svgContent.length < 1) throw new Error('SVG is empty')
  let currentPanel = PanelManager.getCurrentPanel()

  const activePanel = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined

  if (currentPanel) {
    currentPanel.reveal(activePanel)
    currentPanel.webview.html = getWebViewHtml(currentPanel.webview, context.extensionUri, svgContent)
    // In this context, a message is sent to the WebView to restore its last saved state before closing the WebView
    currentPanel.webview.postMessage({
      type: 'setState',
      state: PanelManager.getState()
    })
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      'betterSvg.exportToImage',
      'Export to Image',
      activePanel || vscode.ViewColumn.One,
      { enableScripts: true }
    )
    currentPanel.webview.html = getWebViewHtml(currentPanel.webview, context.extensionUri, svgContent)
    currentPanel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'static', 'better-svg.webp')
    PanelManager.setCurrentPanel(currentPanel)
    currentPanel.onDidChangeViewState(PanelManager.onDidChangeViewState, null, context.subscriptions)
    currentPanel.webview.onDidReceiveMessage(PanelManager.onDidReceiveMessage, null, context.subscriptions)
    currentPanel.onDidDispose(PanelManager.onDIdDispose, null, context.subscriptions)
  }
}
// clamp a number between min and max values, inclusive. Min >= Value <= Max
const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value))

// This function is responsible for cleaning the data a bit before it is consumed by the main function
function dataParser (exportData: string) {
  let { fit, format, output, density, quality, resolution, svgContent } = JSON.parse(exportData) as ExportData

  if (typeof quality !== 'number' ||
      typeof density !== 'number' ||
      typeof resolution.imgHeight !== 'number' ||
      typeof resolution.imgWidth !== 'number') throw new Error('Invalid type for export data, expected number')

  // Keep Unicode letters and numbers plus underscore and hyphen. Fallback to a timestamped name when empty.
  const sanitizedFileName = output.fileName.replace(/[^^\p{L}\p{N}_-]+/gu, '')

  output.fileName = sanitizedFileName || `file-${Date.now()}`
  fit = avalibleFitModes.some(e => e === fit) ? fit : 'cover'
  format = avalibleFormats.some(e => e === format) ? format : 'webp'
  quality = clamp(1, 100, quality)
  density = clamp(1, 10000, density)
  resolution.imgHeight = clamp(16, 8192, resolution.imgHeight)
  resolution.imgWidth = clamp(16, 8192, resolution.imgWidth)

  if (svgContent.length < 1) throw new Error('SVG is empty')

  return {
    fit,
    format,
    output,
    density,
    quality,
    resolution,
    svgContent
  }
}

async function SvgToImage (exportData: ExportData) {
  const { svgContent, density, quality, resolution, output, fit, format } = exportData
  const svgData = new Uint8Array(Buffer.from(svgContent))

  const sharpInstance = sharp(svgData, {
    density,
    animated: false,
    svg: { highBitdepth: true },
  }).resize(
    resolution.imgWidth,
    resolution.imgHeight,
    {
      fastShrinkOnLoad: true,
      fit,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  )
  let formatedImage: Sharp
  switch (format) {
    case 'jpeg':
      formatedImage = sharpInstance.jpeg({ ...jpegOptions, quality })
      break
    case 'png':
      formatedImage = sharpInstance.png({ ...pngOptions, quality })
      break
    case 'webp':
      formatedImage = sharpInstance.webp({ ...webpOptions, quality })
      break
    default:
      formatedImage = sharpInstance.raw()
      break
  }

  let fsPath = output.path
  const fileName = `${output.fileName}.${format}`
  if (fsPath === './') {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    if (!workspaceFolder) throw new Error('No workspace folder found, please select a folder')
    fsPath = path.join(workspaceFolder, fileName)
  } else {
    if (!fs.existsSync(output.path)) throw new Error(`Path ${output.path} does not exist`)
    fsPath = path.join(output.path, fileName)
  }
  const buffer = await formatedImage.ensureAlpha().toBuffer()
  fs.writeFileSync(fsPath, buffer)
}
