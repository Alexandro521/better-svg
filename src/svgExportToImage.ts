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
import sharp, { type Sharp } from 'sharp'

type formatOptions = 'jpeg' | 'png' | 'webp' | 'raw'

interface ExportData {
  svgContent: string;
  pixelDensity: number;
  qualityPercent: number;
  output: {
    fileName: string;
    path: string;
    override: boolean;
  };
  format: formatOptions;
  fit: keyof sharp.FitEnum
  resolution: {
    imgHeight: number;
    imgWidth: number;
  };
}

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

class PanelManager {
  private static currentPanel: vscode.WebviewPanel | undefined
  private static currentState: string | undefined

  static getCurrentPanel (): vscode.WebviewPanel | undefined {
    return PanelManager.currentPanel
  }

  static setCurrentPnael (panel: vscode.WebviewPanel) {
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
    PanelManager.currentPanel.webview.postMessage({
      type: 'setState',
      state: PanelManager.getState()
    })
  }

  static async onDidReceiveMessage (message: any) {
    let uri: vscode.Uri[] | undefined
    switch (message.type) {
      case 'sendContext':
        PanelManager.saveState(message.state)
        break
      case 'openFileDialog':
        uri = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: false,
        })
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
          const exportData = parseExportData(message.data)
          await SvgToImage(exportData)
          vscode.window.showInformationMessage('Exported image successfully to ' + exportData.output.path)
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

export async function exportToImage (context: vscode.ExtensionContext, svgContent: string) {
  let currentPanel = PanelManager.getCurrentPanel()
  // If there is no current panel, create one
  const activePanel = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined

  if (currentPanel) {
    currentPanel.reveal(activePanel)
    currentPanel.webview.html = getWebViewHtml(currentPanel.webview, context.extensionUri, svgContent)
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
    // Set icon
    currentPanel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'static', 'better-svg.webp')
    PanelManager.setCurrentPnael(currentPanel)
    currentPanel.onDidChangeViewState(PanelManager.onDidChangeViewState, null, context.subscriptions)
    currentPanel.webview.onDidReceiveMessage(PanelManager.onDidReceiveMessage, null, context.subscriptions)
    currentPanel.onDidDispose(PanelManager.onDIdDispose, null, context.subscriptions)
  }
}

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value))

function parseExportData (exportData: string) {
  let { fit, format, output, pixelDensity, qualityPercent, resolution, svgContent } = JSON.parse(exportData) as ExportData
  const fitOptions = ['cover', 'contain', 'fill', 'inside', 'outside']
  const formatOptions = ['jpeg', 'png', 'webp', 'raw']

  if (typeof qualityPercent !== 'number' ||
      typeof pixelDensity !== 'number' ||
      typeof resolution.imgHeight !== 'number' ||
      typeof resolution.imgWidth !== 'number') throw new Error('Invalid type for export data, expected number')

  fit = fitOptions.some(e => e === fit) ? fit : 'cover'
  format = formatOptions.some(e => e === format) ? format : 'webp'
  qualityPercent = clamp(0, 100, qualityPercent)
  pixelDensity = clamp(1, 10000, pixelDensity)
  resolution.imgHeight = clamp(16, 8192, resolution.imgHeight)
  resolution.imgWidth = clamp(16, 8192, resolution.imgWidth)

  if (svgContent.length > 1024 * 1024) throw new Error('SVG is too large to export')
  else if (svgContent.length < 1) throw new Error('SVG is empty')

  return {
    fit,
    format,
    output,
    pixelDensity,
    qualityPercent,
    resolution,
    svgContent
  }
}

async function SvgToImage (exportData: ExportData) {
  const svgData = new Uint8Array(Buffer.from(exportData.svgContent))
  const sharpInstance = sharp(svgData, {
    density: exportData.pixelDensity,
    animated: false,
    svg: {
      highBitdepth: true,
    },
  }).resize(
    exportData.resolution.imgWidth,
    exportData.resolution.imgHeight,
    {
      fastShrinkOnLoad: true,
      fit: exportData.fit,
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 0,
      }
    }
  )
  let formatedImage: Sharp
  let extension: string
  switch (exportData.format) {
    case 'jpeg':
      formatedImage = sharpInstance.jpeg({ ...jpegOptions, quality: exportData.qualityPercent })
      extension = '.jpg'
      break
    case 'png':
      formatedImage = sharpInstance.png({ ...pngOptions, quality: exportData.qualityPercent })
      extension = '.png'
      break
    case 'webp':
      formatedImage = sharpInstance.webp({ ...webpOptions, quality: exportData.qualityPercent })
      extension = '.webp'
      break
    case 'raw':
      formatedImage = sharpInstance
      extension = '.raw'
      break
    default:
      formatedImage = sharpInstance
      extension = '.raw'
      break
  }
  const outputPath = exportData.output.path.split('/')
  outputPath.push(exportData.output.fileName + extension)
  const buffer = await formatedImage.ensureAlpha().toBuffer()
  fs.writeFileSync(outputPath.join('//'), buffer)
}
