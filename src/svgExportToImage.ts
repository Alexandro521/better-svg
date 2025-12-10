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
  static currentPanel: vscode.WebviewPanel | undefined
  static currentState: string | undefined

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
